from __future__ import annotations

import json
import tempfile
from datetime import datetime
from pathlib import Path

import streamlit as st
from PIL import Image

from chef_vision.contracts import DebugObjectInput, FrameInput, ScanOptions
from chef_vision.inventory import clear_inventory, ensure_inventory_store, load_inventory
from chef_vision.live import LiveSessionBuffer, create_live_video_processor, scan_response_from_live_records
from chef_vision.ontology import ONTOLOGY
from chef_vision.pipeline import VisionPipeline
from chef_vision.render import draw_detections, load_image_from_bytes
from chef_vision.resolver import (
    apply_resolved_items_to_inventory,
    build_label_status_map,
    resolve_single_frame,
    resolve_video_scan,
)
from chef_vision.session_summary import best_detections_by_label, summarize_scan_labels
from chef_vision.tracking import build_provisional_tracks, estimate_distinct_instances
from chef_vision.video import extract_sampled_frames
from sample_frames import SAMPLE_FRAME_REFS, SAMPLE_SCENARIOS


APP_DIR = Path(__file__).resolve().parent
INVENTORY_PATH = ensure_inventory_store(APP_DIR / "data" / "runtime_inventory.json")

st.set_page_config(page_title="Chef Vision Lab", layout="wide")

st.title("Chef Vision Lab")
st.caption(
    "Separate Streamlit sandbox for kitchen CV testing. This is intentionally isolated from the current product frontend."
)

inventory_items = load_inventory(INVENTORY_PATH)
if "live_session_buffer" not in st.session_state:
    st.session_state.live_session_buffer = LiveSessionBuffer()
if "live_session_started_at" not in st.session_state:
    st.session_state.live_session_started_at = None

with st.sidebar:
    st.subheader("Pipeline")
    detector_name = st.selectbox(
        "Detector",
        options=["mock", "yolo"],
        help="Use mock for contract testing and YOLO for basic real image detection.",
    )
    model_name = st.text_input(
        "YOLO model",
        value="yolo11n.pt",
        help="Ultralytics model name or local .pt path. First use may download weights.",
        disabled=detector_name != "yolo",
    )
    pipeline = VisionPipeline(detector_name=detector_name, model_name=model_name)
    pipeline_config = pipeline.describe_pipeline()
    st.code(
        json.dumps(
            {
                "provider": pipeline_config.provider,
                "stage": pipeline_config.stage,
                "tracking_enabled": pipeline_config.tracking_enabled,
                "embeddings_enabled": pipeline_config.embeddings_enabled,
            },
            indent=2,
        ),
        language="json",
    )
    st.write("Notes")
    for note in pipeline_config.notes:
        st.write(f"- {note}")

    st.divider()
    st.subheader("Inventory")
    auto_apply_inventory = st.checkbox(
        "Automatically add new scan results to inventory",
        value=True,
        help="New trackable items are written into the local runtime inventory store.",
    )
    if st.button("Clear runtime inventory", use_container_width=True):
        clear_inventory(INVENTORY_PATH)
        st.rerun()

    if inventory_items:
        st.dataframe(
            [
                {
                    "label": item.label,
                    "count": item.estimated_count,
                    "source": item.source,
                    "last_seen_at": item.last_seen_at,
                }
                for item in inventory_items
            ],
            use_container_width=True,
            hide_index=True,
        )
    else:
        st.caption("Inventory is empty.")


tab_single, tab_live, tab_video, tab_batch = st.tabs(
    ["Single Frame", "Live Camera", "Video Scan", "Scenario Scan"]
)

with tab_single:
    left, right = st.columns([1, 1.2])

    with left:
        uploaded_image = st.file_uploader(
            "Optional frame image",
            type=["png", "jpg", "jpeg", "webp"],
        )
        scan_session_id = st.text_input(
            "Scan session id",
            value=f"scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        )
        frame_ref = st.text_area(
            "Frame notes / prompt",
            value=SAMPLE_FRAME_REFS["Pantry shelf"],
            help="The mock detector can infer detections from this text when debug labels are not supplied.",
        )
        zone_id = st.text_input("Zone id", value="closet_left_top")
        selected_labels = st.multiselect(
            "Debug object labels",
            options=[
                entry["label"] for entry in ONTOLOGY if entry["id"] != "unknown_kitchen_item"
            ],
            default=["olive oil bottle", "spice bottle", "plate"],
            help="These bypass text inference and simulate detections directly.",
            disabled=detector_name != "mock",
        )
        include_ignored = st.checkbox("Include ignored detections", value=False)
        max_detections = st.slider("Max detections per frame", 1, 20, 8)
        confidence_threshold = st.slider("Confidence threshold", 0.05, 0.95, 0.25, 0.05)
        nms_iou_threshold = st.slider(
            "NMS IoU threshold",
            0.1,
            0.95,
            0.7,
            0.05,
            help="Higher values can preserve more nearby same-class boxes, which may help when two identical items sit close together.",
        )
        run_single = st.button("Run Single-Frame Detection", use_container_width=True)

    with right:
        if run_single:
            image_path = None
            image_bytes = None

            if uploaded_image:
                image_bytes = uploaded_image.getvalue()
                suffix = Path(uploaded_image.name).suffix or ".jpg"
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as handle:
                    handle.write(image_bytes)
                    image_path = handle.name

            frame = FrameInput(
                frame_id=1,
                frame_ref=frame_ref,
                image_path=image_path,
                zone_id=zone_id,
                debug_objects=[DebugObjectInput(label=label) for label in selected_labels]
                if detector_name == "mock"
                else [],
            )

            try:
                result = pipeline.analyze_scan(
                    scan_session_id=scan_session_id,
                    frames=[frame],
                    options=ScanOptions(
                        include_ignored=include_ignored,
                        max_detections_per_frame=max_detections,
                        confidence_threshold=confidence_threshold,
                        nms_iou_threshold=nms_iou_threshold,
                    ),
                )
            except Exception as exc:
                st.error(str(exc))
                st.stop()

            st.subheader("Summary")
            metric_a, metric_b, metric_c = st.columns(3)
            metric_a.metric("Detections", result.summary.detection_count)
            metric_b.metric("Track", result.summary.track_candidate_count)
            metric_c.metric("Review", result.summary.review_candidate_count)

            detections = result.frames[0].detections
            resolved_items = resolve_single_frame(detections, inventory_items)
            label_statuses = build_label_status_map(resolved_items)

            if auto_apply_inventory:
                inventory_items = apply_resolved_items_to_inventory(
                    inventory_path=str(INVENTORY_PATH),
                    resolved_items=resolved_items,
                    source="single_frame_scan",
                )
                st.success("Inventory updated from single-frame scan.")

            if image_bytes:
                image = load_image_from_bytes(image_bytes)
                st.image(
                    draw_detections(image, detections, label_statuses=label_statuses),
                    caption="Detections overlay",
                    use_container_width=True,
                )

            st.subheader("Resolved Items")
            st.dataframe(
                [
                    {
                        "label": item.label,
                        "status": item.status,
                        "action": item.action,
                        "likely_count": item.likely_count,
                        "existing_estimated_count": item.existing_estimated_count,
                        "max_confidence": item.max_confidence,
                    }
                    for item in resolved_items
                ],
                use_container_width=True,
            )

            st.subheader("Detections")
            st.dataframe(
                [
                    {
                        "label": detection.label,
                        "status": label_statuses.get(detection.label),
                        "policy": detection.inventory_policy,
                        "category": detection.category,
                        "confidence": detection.confidence,
                        "bbox": (
                            detection.bbox.x,
                            detection.bbox.y,
                            detection.bbox.width,
                            detection.bbox.height,
                        ),
                    }
                    for detection in detections
                ],
                use_container_width=True,
            )

            st.subheader("Response JSON")
            st.json(result.to_dict(), expanded=2)

with tab_video:
    if detector_name != "yolo":
        st.info("Video scan is intended for the `yolo` detector. Switch the detector to `yolo` to test real clips.")
    else:
        left, right = st.columns([1, 1.2])

        with left:
            uploaded_video = st.file_uploader(
                "Kitchen clip",
                type=["mp4", "mov", "avi", "mkv"],
                key="video_uploader",
            )
            video_zone_id = st.text_input("Video zone id", value="kitchen_scan")
            sample_fps = st.slider("Sample frames per second", 0.5, 5.0, 1.0, 0.5)
            max_video_frames = st.slider("Max sampled frames", 1, 60, 12)
            include_ignored_video = st.checkbox(
                "Include ignored detections in video scan",
                value=False,
                key="video_include_ignored",
            )
            confidence_threshold_video = st.slider(
                "Video confidence threshold",
                0.05,
                0.95,
                0.25,
                0.05,
                key="video_confidence_threshold",
            )
            max_detections_video = st.slider(
                "Max detections per sampled frame",
                1,
                20,
                8,
                key="video_max_detections",
            )
            nms_iou_threshold_video = st.slider(
                "Video NMS IoU threshold",
                0.1,
                0.95,
                0.7,
                0.05,
                key="video_nms_iou_threshold",
                help="Raise this when identical nearby items get merged into one box.",
            )
            run_video = st.button("Run Video Detection", use_container_width=True)

        with right:
            if run_video:
                if uploaded_video is None:
                    st.error("Upload a video clip first.")
                    st.stop()

                with tempfile.NamedTemporaryFile(
                    delete=False,
                    suffix=Path(uploaded_video.name).suffix or ".mp4",
                ) as video_handle:
                    video_handle.write(uploaded_video.getvalue())
                    video_path = video_handle.name

                frame_output_dir = tempfile.mkdtemp(prefix="chef_vision_frames_")

                try:
                    extraction = extract_sampled_frames(
                        video_path=video_path,
                        output_dir=frame_output_dir,
                        target_fps=sample_fps,
                        max_frames=max_video_frames,
                    )
                    if not extraction.frames:
                        raise ValueError("No frames were extracted from the uploaded video.")
                    frames = [
                        FrameInput(
                            frame_id=sampled.frame_id,
                            image_path=sampled.image_path,
                            zone_id=video_zone_id,
                            timestamp_ms=sampled.timestamp_ms,
                        )
                        for sampled in extraction.frames
                    ]
                    result = pipeline.analyze_scan(
                        scan_session_id=f"video_scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                        frames=frames,
                        options=ScanOptions(
                            include_ignored=include_ignored_video,
                            max_detections_per_frame=max_detections_video,
                            confidence_threshold=confidence_threshold_video,
                            nms_iou_threshold=nms_iou_threshold_video,
                        ),
                    )
                except Exception as exc:
                    st.error(str(exc))
                    st.stop()

                provisional_tracks = build_provisional_tracks(result)
                instance_estimates = estimate_distinct_instances(provisional_tracks)
                resolved_items = resolve_video_scan(instance_estimates, inventory_items)
                label_statuses = build_label_status_map(resolved_items)

                if auto_apply_inventory:
                    inventory_items = apply_resolved_items_to_inventory(
                        inventory_path=str(INVENTORY_PATH),
                        resolved_items=resolved_items,
                        source="video_scan",
                    )
                    st.success("Inventory updated from video scan.")

                summary_a, summary_b, summary_c, summary_d = st.columns(4)
                summary_a.metric("Sampled frames", extraction.summary.sampled_frame_count)
                summary_b.metric("Total detections", result.summary.detection_count)
                summary_c.metric("Source fps", extraction.summary.source_fps)
                summary_d.metric("Duration ms", extraction.summary.duration_ms)

                st.subheader("Frame Results")
                st.dataframe(
                    [
                        {
                            "frame_id": frame.frame_id,
                            "timestamp_ms": frame.timestamp_ms,
                            "labels": ", ".join(detection.label for detection in frame.detections),
                            "detections": len(frame.detections),
                            "track": sum(
                                detection.inventory_policy == "track"
                                for detection in frame.detections
                            ),
                            "review": sum(
                                detection.inventory_policy == "review"
                                for detection in frame.detections
                            ),
                        }
                        for frame in result.frames
                    ],
                    use_container_width=True,
                )

                st.subheader("Label Persistence Summary")
                label_summaries = summarize_scan_labels(result)
                st.dataframe(
                    [
                        {
                            "label": item.label,
                            "category": item.category,
                            "policy": item.inventory_policy,
                            "frames_seen": item.frames_seen,
                            "detections": item.detections,
                            "max_confidence": item.max_confidence,
                            "first_seen_ms": item.first_seen_ms,
                            "last_seen_ms": item.last_seen_ms,
                            "persistence": item.persistence,
                        }
                        for item in label_summaries
                    ],
                    use_container_width=True,
                )

                st.subheader("Provisional Session Tracks")
                st.dataframe(
                    [
                        {
                            "track_id": track.track_id,
                            "label": track.label,
                            "category": track.category,
                            "policy": track.inventory_policy,
                            "frames_seen": track.frames_seen,
                            "detections": track.detection_count,
                            "max_confidence": round(track.max_confidence, 2),
                            "first_seen_ms": track.first_seen_ms,
                            "last_seen_ms": track.last_seen_ms,
                        }
                        for track in provisional_tracks
                    ],
                    use_container_width=True,
                )

                st.subheader("Distinct Instance Estimates")
                st.dataframe(
                    [
                        {
                            "label": estimate.label,
                            "category": estimate.category,
                            "policy": estimate.inventory_policy,
                            "likely_instances": estimate.likely_instances,
                            "provisional_tracks": estimate.provisional_tracks,
                            "strong_tracks": estimate.strong_tracks,
                            "max_confidence": estimate.max_confidence,
                            "confidence_band": estimate.confidence_band,
                        }
                        for estimate in instance_estimates
                    ],
                    use_container_width=True,
                )

                st.subheader("Resolved Items")
                st.dataframe(
                    [
                        {
                            "label": item.label,
                            "status": item.status,
                            "action": item.action,
                            "likely_count": item.likely_count,
                            "existing_estimated_count": item.existing_estimated_count,
                            "max_confidence": item.max_confidence,
                        }
                        for item in resolved_items
                    ],
                    use_container_width=True,
                )

                st.subheader("Best Detection Thumbnails")
                best_detections = best_detections_by_label(result)
                if best_detections:
                    best_columns = st.columns(min(4, len(best_detections)))
                    frame_lookup = {
                        sampled.frame_id: sampled.image_path for sampled in extraction.frames
                    }
                    for column, best in zip(best_columns, best_detections):
                        with column:
                            image_path = frame_lookup.get(best.frame_id)
                            if image_path:
                                image = Image.open(image_path).convert("RGB")
                                width, height = image.size
                                bbox = best.detection.bbox
                                crop = image.crop(
                                    (
                                        max(0, int(bbox.x * width)),
                                        max(0, int(bbox.y * height)),
                                        min(width, int((bbox.x + bbox.width) * width)),
                                        min(height, int((bbox.y + bbox.height) * height)),
                                    )
                                )
                                st.image(
                                    crop,
                                    caption=f"{best.label} {best.confidence:.2f} [{label_statuses.get(best.label)}]",
                                    use_container_width=True,
                                )
                                st.caption(
                                    f"Frame {best.frame_id} @ {best.timestamp_ms} ms"
                                )

                st.subheader("Preview Frames")
                preview_count = min(4, len(result.frames))
                preview_columns = st.columns(preview_count or 1)
                for column, sampled, frame_result in zip(
                    preview_columns,
                    extraction.frames[:preview_count],
                    result.frames[:preview_count],
                ):
                    with column:
                        image = Image.open(sampled.image_path).convert("RGB")
                        st.image(
                            draw_detections(
                                image,
                                frame_result.detections,
                                label_statuses=label_statuses,
                            ),
                            caption=f"Frame {frame_result.frame_id} @ {frame_result.timestamp_ms} ms",
                            use_container_width=True,
                        )

                st.subheader("Video Response JSON")
                st.json(result.to_dict(), expanded=2)

with tab_live:
    if detector_name != "yolo":
        st.info("Live camera is intended for the `yolo` detector. Switch the detector to `yolo` to test webcam streaming.")
    else:
        st.write("Browser camera -> WebRTC -> YOLO -> overlay")
        session_buffer: LiveSessionBuffer = st.session_state.live_session_buffer
        live_col_a, live_col_b = st.columns(2)
        with live_col_a:
            live_confidence = st.slider(
                "Live confidence threshold",
                0.05,
                0.95,
                0.25,
                0.05,
                key="live_confidence_threshold",
            )
            live_nms_iou = st.slider(
                "Live NMS IoU threshold",
                0.1,
                0.95,
                0.7,
                0.05,
                key="live_nms_iou_threshold",
            )
            live_max_detections = st.slider(
                "Live max detections per frame",
                1,
                20,
                8,
                key="live_max_detections",
            )
        with live_col_b:
            live_include_ignored = st.checkbox(
                "Include ignored detections in live view",
                value=False,
                key="live_include_ignored",
            )
            live_facing_mode = st.selectbox(
                "Camera facing mode",
                options=["environment", "user"],
                help="Use `environment` for rear camera on phones when available.",
            )

        control_col_a, control_col_b, control_col_c = st.columns(3)
        with control_col_a:
            if st.button("Start Scan", use_container_width=True):
                session_buffer.start()
                st.session_state.live_session_started_at = datetime.now().isoformat()
        with control_col_b:
            if st.button("Stop Scan", use_container_width=True):
                session_buffer.stop()
        with control_col_c:
            if st.button("Clear Scan Buffer", use_container_width=True):
                session_buffer.clear()
                st.session_state.live_session_started_at = None

        st.caption(
            f"Live session active: {'yes' if session_buffer.is_active() else 'no'} | "
            f"buffered frames: {len(session_buffer.snapshot())}"
        )

        try:
            from streamlit_webrtc import WebRtcMode, webrtc_streamer
        except Exception as exc:
            st.error(
                "Live camera is unavailable in this environment. "
                "This usually means `av` or `streamlit-webrtc` could not load. "
                f"Details: {exc}"
            )
        else:
            LiveVideoProcessor = create_live_video_processor(
                model_name=model_name,
                confidence_threshold=live_confidence,
                nms_iou_threshold=live_nms_iou,
                include_ignored=live_include_ignored,
                max_detections_per_frame=live_max_detections,
                existing_labels={item.label for item in inventory_items},
                session_buffer=session_buffer,
            )
            webrtc_streamer(
                key="chef-live-camera",
                mode=WebRtcMode.SENDRECV,
                media_stream_constraints={
                    "video": {"facingMode": live_facing_mode},
                    "audio": False,
                },
                rtc_configuration={
                    "iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]
                },
                video_processor_factory=LiveVideoProcessor,
                async_processing=True,
            )
            st.caption(
                "Allow camera access in the browser. This is the first live streaming step, so expect lower fps than the final system."
            )
            st.caption(
                "Box colors: red = already in inventory, green = new item, yellow = review, gray = ignored."
            )

        live_records = session_buffer.snapshot()
        if live_records:
            live_result = scan_response_from_live_records(
                scan_session_id=f"live_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                pipeline_config=pipeline.describe_pipeline(),
                records=live_records,
            )

            live_tracks = build_provisional_tracks(live_result)
            live_instances = estimate_distinct_instances(live_tracks)
            live_resolved = resolve_video_scan(live_instances, inventory_items)

            if not session_buffer.is_active():
                apply_live = st.button(
                    "Apply Live Session To Inventory",
                    use_container_width=True,
                )
                if apply_live and auto_apply_inventory:
                    inventory_items = apply_resolved_items_to_inventory(
                        inventory_path=str(INVENTORY_PATH),
                        resolved_items=live_resolved,
                        source="live_session",
                    )
                    st.success("Inventory updated from live session.")
                    session_buffer.clear()
                    st.session_state.live_session_started_at = None
                    st.rerun()

            st.subheader("Live Session Resolved Items")
            st.dataframe(
                [
                    {
                        "label": item.label,
                        "status": item.status,
                        "action": item.action,
                        "likely_count": item.likely_count,
                        "existing_estimated_count": item.existing_estimated_count,
                        "max_confidence": item.max_confidence,
                    }
                    for item in live_resolved
                ],
                use_container_width=True,
            )

            st.subheader("Live Session Tracks")
            st.dataframe(
                [
                    {
                        "track_id": track.track_id,
                        "label": track.label,
                        "frames_seen": track.frames_seen,
                        "detections": track.detection_count,
                        "max_confidence": round(track.max_confidence, 2),
                        "first_seen_ms": track.first_seen_ms,
                        "last_seen_ms": track.last_seen_ms,
                    }
                    for track in live_tracks
                ],
                use_container_width=True,
            )

with tab_batch:
    if detector_name != "mock":
        st.info(
            "Scenario scan is mock-only right now. Switch the detector to `mock` for canned multi-frame testing."
        )
    else:
        scenario_name = st.selectbox(
            "Scenario",
            options=list(SAMPLE_SCENARIOS.keys()),
            format_func=lambda key: key.replace("_", " ").title(),
        )
        include_ignored_batch = st.checkbox(
            "Include ignored detections in scenario",
            value=False,
        )
        run_scenario = st.button("Run Scenario Scan", use_container_width=True)

        if run_scenario:
            frames = [
                FrameInput(
                    frame_id=frame["frame_id"],
                    frame_ref=frame.get("frame_ref"),
                    zone_id=frame.get("zone_id"),
                )
                for frame in SAMPLE_SCENARIOS[scenario_name]
            ]
            result = pipeline.analyze_scan(
                scan_session_id=f"{scenario_name}_{datetime.now().strftime('%H%M%S')}",
                frames=frames,
                options=ScanOptions(
                    include_ignored=include_ignored_batch,
                    max_detections_per_frame=12,
                ),
            )

            st.subheader("Scenario Summary")
            st.json(result.summary.detected_labels)
            st.dataframe(
                [
                    {
                        "frame_id": frame.frame_id,
                        "zone_id": frame.zone_id,
                        "labels": ", ".join(
                            detection.label for detection in frame.detections
                        ),
                        "track": sum(
                            detection.inventory_policy == "track"
                            for detection in frame.detections
                        ),
                        "review": sum(
                            detection.inventory_policy == "review"
                            for detection in frame.detections
                        ),
                    }
                    for frame in result.frames
                ],
                use_container_width=True,
            )
            st.subheader("Scenario JSON")
            st.json(result.to_dict(), expanded=2)
