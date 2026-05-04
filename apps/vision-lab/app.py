from __future__ import annotations

import json
import tempfile
from datetime import datetime
from pathlib import Path

import streamlit as st
from PIL import Image, ImageColor, ImageDraw

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
from chef_vision.segmentation import (
    draw_segmentation_results,
    run_yolo_segmentation,
    segmentation_crop,
    segmentation_masked_crop,
)
from chef_vision.session_summary import best_detections_by_label, summarize_scan_labels
from chef_vision.tracking import build_provisional_tracks, estimate_distinct_instances
from chef_vision.video import extract_sampled_frames
from sample_frames import SAMPLE_FRAME_REFS, SAMPLE_SCENARIOS


APP_DIR = Path(__file__).resolve().parent
INVENTORY_PATH = ensure_inventory_store(APP_DIR / "data" / "runtime_inventory.json")
CLASSIFIER_RUNS_DIR = APP_DIR / "data" / "ingredient_classifier_runs"
DEFAULT_CLASSIFIER_RUN = "resnet18_ingredient_crops_5000_modal_frozen_v2"
TRAINED_FOODSEG_SEGMENTER = (
    APP_DIR
    / "data"
    / "foodseg103_segmenter_runs"
    / "yolo11n_foodseg103_segmenter_modal"
    / "weights"
    / "best.pt"
)
DEFAULT_SEGMENTATION_MODEL = (
    str(TRAINED_FOODSEG_SEGMENTER)
    if TRAINED_FOODSEG_SEGMENTER.exists()
    else "yolo11n-seg.pt"
)

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


def available_classifier_runs() -> list[Path]:
    if not CLASSIFIER_RUNS_DIR.exists():
        return []
    return [
        path
        for path in sorted(CLASSIFIER_RUNS_DIR.iterdir())
        if path.is_dir() and (path / "best_model.pt").exists()
    ]


def crop_detection(image: Image.Image, detection) -> Image.Image:
    width, height = image.size
    left = max(0, int(detection.bbox.x * width))
    top = max(0, int(detection.bbox.y * height))
    right = min(width, int((detection.bbox.x + detection.bbox.width) * width))
    bottom = min(height, int((detection.bbox.y + detection.bbox.height) * height))
    return image.crop((left, top, right, bottom))


def generate_grid_crops(
    image: Image.Image,
    crop_fraction: float,
    stride_fraction: float,
    max_crops: int,
) -> list[dict]:
    width, height = image.size
    crop_size = max(64, int(min(width, height) * crop_fraction))
    stride = max(32, int(crop_size * stride_fraction))
    boxes = []

    y = 0
    while y + crop_size <= height:
        x = 0
        while x + crop_size <= width:
            boxes.append((x, y, x + crop_size, y + crop_size))
            x += stride
        y += stride

    if width > crop_size and all(box[2] < width for box in boxes):
        for y1 in range(0, max(1, height - crop_size + 1), stride):
            boxes.append((width - crop_size, y1, width, y1 + crop_size))
    if height > crop_size and all(box[3] < height for box in boxes):
        for x1 in range(0, max(1, width - crop_size + 1), stride):
            boxes.append((x1, height - crop_size, x1 + crop_size, height))

    center_box = (
        max(0, (width - crop_size) // 2),
        max(0, (height - crop_size) // 2),
        min(width, (width + crop_size) // 2),
        min(height, (height + crop_size) // 2),
    )
    boxes.append(center_box)

    unique_boxes = list(dict.fromkeys(boxes))
    return [
        {
            "box": box,
            "crop": image.crop(box),
        }
        for box in unique_boxes[:max_crops]
    ]


def draw_classifier_result(
    image: Image.Image,
    detection,
    prediction: dict[str, float | str],
) -> Image.Image:
    rendered = image.copy()
    draw = ImageDraw.Draw(rendered)
    width, height = rendered.size
    left = max(0, int(detection.bbox.x * width))
    top = max(0, int(detection.bbox.y * height))
    right = min(width, int((detection.bbox.x + detection.bbox.width) * width))
    bottom = min(height, int((detection.bbox.y + detection.bbox.height) * height))
    color = ImageColor.getrgb("#16a34a")
    label = f"{prediction['label']} {prediction['probability']:.2f}"

    draw.rectangle((left, top, right, bottom), outline=color, width=5)
    text_top = max(0, top - 26)
    draw.rectangle((left, text_top, min(width, left + 320), top), fill=color)
    draw.text((left + 6, text_top + 5), label, fill=(255, 255, 255))
    return rendered


def draw_classifier_results(
    image: Image.Image,
    crop_results: list[dict],
) -> Image.Image:
    rendered = image.copy()
    draw = ImageDraw.Draw(rendered)
    width, height = rendered.size
    colors = ["#16a34a", "#2563eb", "#ca8a04", "#dc2626", "#7c3aed", "#0891b2"]

    for index, item in enumerate(crop_results, start=1):
        detection = item.get("detection")
        grid_box = item.get("grid_box")
        predictions = item.get("predictions") or []
        if detection is None or not predictions:
            if grid_box is None or not predictions:
                continue
            left, top, right, bottom = grid_box
        else:
            left = max(0, int(detection.bbox.x * width))
            top = max(0, int(detection.bbox.y * height))
            right = min(width, int((detection.bbox.x + detection.bbox.width) * width))
            bottom = min(height, int((detection.bbox.y + detection.bbox.height) * height))

        color = ImageColor.getrgb(colors[(index - 1) % len(colors)])
        top_prediction = predictions[0]
        label = f"{index}. {top_prediction['label']} {top_prediction['probability']:.2f}"

        draw.rectangle((left, top, right, bottom), outline=color, width=5)
        text_top = max(0, top - 26)
        draw.rectangle((left, text_top, min(width, left + 340), top), fill=color)
        draw.text((left + 6, text_top + 5), label, fill=(255, 255, 255))

    return rendered


@st.cache_resource(show_spinner=False)
def load_ingredient_classifier(checkpoint_path: str):
    import torch
    from torchvision import transforms
    from torchvision.models import resnet18

    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    class_names = checkpoint["class_names"]
    model = resnet18(weights=None)
    model.fc = torch.nn.Linear(model.fc.in_features, len(class_names))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    transform = transforms.Compose(
        [
            transforms.Resize((256, 256)),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    return model, class_names, transform


def classify_ingredient_image(
    image: Image.Image,
    checkpoint_path: Path,
    top_k: int,
) -> list[dict[str, float | str]]:
    import torch

    model, class_names, transform = load_ingredient_classifier(str(checkpoint_path))
    tensor = transform(image.convert("RGB")).unsqueeze(0)
    with torch.no_grad():
        probabilities = torch.softmax(model(tensor), dim=1).squeeze(0)
        values, indices = probabilities.topk(min(top_k, len(class_names)))

    return [
        {
            "label": class_names[class_index],
            "probability": round(float(probability), 6),
        }
        for probability, class_index in zip(values.tolist(), indices.tolist())
    ]

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


tab_single, tab_classifier, tab_segmentation, tab_live, tab_video, tab_batch = st.tabs(
    [
        "Single Frame",
        "Ingredient Classifier",
        "Segmentation",
        "Live Camera",
        "Video Scan",
        "Scenario Scan",
    ]
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

with tab_classifier:
    runs = available_classifier_runs()
    if not runs:
        st.info(
            "No local classifier checkpoints found. Train or download a run into "
            "`apps/vision-lab/data/ingredient_classifier_runs/<run-name>/best_model.pt`."
        )
    else:
        left, right = st.columns([1, 1.2])

        with left:
            default_run_index = next(
                (
                    index
                    for index, run in enumerate(runs)
                    if run.name == DEFAULT_CLASSIFIER_RUN
                ),
                0,
            )
            selected_run = st.selectbox(
                "Classifier checkpoint",
                options=runs,
                index=default_run_index,
                format_func=lambda path: path.name,
                help="Local checkpoint folder. This does not call Modal.",
            )
            checkpoint_path = selected_run / "best_model.pt"
            metrics_path = selected_run / "metrics.json"

            if metrics_path.exists():
                metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
                metric_col_a, metric_col_b, metric_col_c = st.columns(3)
                metric_col_a.metric(
                    "Test top-1",
                    f"{metrics.get('test', {}).get('accuracy', 0):.1%}",
                )
                metric_col_b.metric(
                    "Test top-5",
                    f"{metrics.get('test', {}).get('top5_accuracy', 0):.1%}",
                )
                metric_col_c.metric("Classes", metrics.get("class_count", 0))

            classifier_image = st.file_uploader(
                "Ingredient test image",
                type=["png", "jpg", "jpeg", "webp"],
                key="ingredient_classifier_image",
            )
            source_mode = st.radio(
                "Classification input",
                options=[
                    "YOLO all object crops",
                    "YOLO all + grid fallback",
                    "Grid fallback crops",
                    "YOLO first object crop",
                    "Full image",
                ],
                horizontal=False,
                help="Use grid fallback to diagnose detector misses. Full image tests only the classifier.",
            )
            classifier_top_k = st.slider("Top predictions", 1, 10, 5)
            classifier_max_crops = st.slider(
                "Max YOLO crops to classify",
                1,
                30,
                12,
                disabled=source_mode in {"Full image", "Grid fallback crops"},
            )
            classifier_max_grid_crops = st.slider(
                "Max grid fallback crops",
                1,
                80,
                24,
                disabled=source_mode not in {"YOLO all + grid fallback", "Grid fallback crops"},
            )
            classifier_grid_fraction = st.slider(
                "Grid crop size",
                0.15,
                0.75,
                0.35,
                0.05,
                disabled=source_mode not in {"YOLO all + grid fallback", "Grid fallback crops"},
                help="Fraction of the smaller image dimension. Smaller crops can find small foods but create more noise.",
            )
            classifier_grid_stride = st.slider(
                "Grid overlap",
                0.25,
                1.0,
                0.5,
                0.05,
                disabled=source_mode not in {"YOLO all + grid fallback", "Grid fallback crops"},
                help="Lower values create more overlap and more crops.",
            )
            classifier_min_probability = st.slider(
                "Minimum displayed probability",
                0.0,
                1.0,
                0.0,
                0.05,
                help="Hide low-confidence crop results from the table and overlay.",
            )
            classifier_confidence_threshold = st.slider(
                "YOLO crop confidence threshold",
                0.05,
                0.95,
                0.20,
                0.05,
                disabled=source_mode in {"Full image", "Grid fallback crops"},
            )
            classifier_nms_iou = st.slider(
                "YOLO crop NMS IoU threshold",
                0.1,
                0.95,
                0.7,
                0.05,
                disabled=source_mode in {"Full image", "Grid fallback crops"},
            )
            run_classifier = st.button("Test Ingredient Classifier", use_container_width=True)

        with right:
            if run_classifier:
                if classifier_image is None:
                    st.error("Upload an image first.")
                    st.stop()

                image_bytes = classifier_image.getvalue()
                image = load_image_from_bytes(image_bytes)
                detection_result = None
                crop_results = []

                if source_mode in {"YOLO all object crops", "YOLO all + grid fallback", "YOLO first object crop"}:
                    suffix = Path(classifier_image.name).suffix or ".jpg"
                    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as handle:
                        handle.write(image_bytes)
                        image_path = handle.name

                    try:
                        classifier_pipeline = VisionPipeline(
                            detector_name="yolo",
                            model_name=model_name,
                        )
                        detection_result = classifier_pipeline.analyze_scan(
                            scan_session_id=f"ingredient_classifier_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                            frames=[
                                FrameInput(
                                    frame_id=1,
                                    frame_ref=classifier_image.name,
                                    image_path=image_path,
                                )
                            ],
                            options=ScanOptions(
                                include_ignored=True,
                                confidence_threshold=classifier_confidence_threshold,
                                nms_iou_threshold=classifier_nms_iou,
                                max_detections_per_frame=20,
                            ),
                        )
                    except Exception as exc:
                        st.error(str(exc))
                        st.stop()

                    detections = sorted(
                        detection_result.frames[0].detections,
                        key=lambda detection: detection.confidence,
                        reverse=True,
                    )
                    if not detections:
                        st.warning("YOLO did not find an object. Falling back to full-image classification.")
                        predictions = classify_ingredient_image(
                            image,
                            checkpoint_path=checkpoint_path,
                            top_k=classifier_top_k,
                        )
                        crop_results.append(
                            {
                                "crop_id": 1,
                                "crop": image,
                                "detection": None,
                                "detector_label": "full_image_fallback",
                                "detector_confidence": None,
                                "predictions": predictions,
                            }
                        )
                    else:
                        selected_detections = detections[:1] if source_mode == "YOLO first object crop" else detections[:classifier_max_crops]
                        for crop_index, detection in enumerate(selected_detections, start=1):
                            crop = crop_detection(image, detection)
                            try:
                                predictions = classify_ingredient_image(
                                    crop,
                                    checkpoint_path=checkpoint_path,
                                    top_k=classifier_top_k,
                                )
                            except Exception as exc:
                                st.error(str(exc))
                                st.stop()
                            crop_results.append(
                                {
                                    "crop_id": crop_index,
                                    "crop": crop,
                                    "detection": detection,
                                    "detector_label": detection.label,
                                    "detector_confidence": detection.confidence,
                                    "proposal_source": "yolo",
                                    "predictions": predictions,
                                }
                            )

                if source_mode in {"YOLO all + grid fallback", "Grid fallback crops"}:
                    grid_crops = generate_grid_crops(
                        image,
                        crop_fraction=classifier_grid_fraction,
                        stride_fraction=classifier_grid_stride,
                        max_crops=classifier_max_grid_crops,
                    )
                    start_index = len(crop_results) + 1
                    for offset, grid_item in enumerate(grid_crops, start=0):
                        try:
                            predictions = classify_ingredient_image(
                                grid_item["crop"],
                                checkpoint_path=checkpoint_path,
                                top_k=classifier_top_k,
                            )
                        except Exception as exc:
                            st.error(str(exc))
                            st.stop()
                        crop_results.append(
                            {
                                "crop_id": start_index + offset,
                                "crop": grid_item["crop"],
                                "detection": None,
                                "grid_box": grid_item["box"],
                                "detector_label": "grid_crop",
                                "detector_confidence": None,
                                "proposal_source": "grid",
                                "predictions": predictions,
                            }
                        )

                if source_mode == "Full image":
                    try:
                        predictions = classify_ingredient_image(
                            image,
                            checkpoint_path=checkpoint_path,
                            top_k=classifier_top_k,
                        )
                    except Exception as exc:
                        st.error(str(exc))
                        st.stop()
                    crop_results.append(
                            {
                                "crop_id": 1,
                                "crop": image,
                                "detection": None,
                                "detector_label": "full_image",
                                "detector_confidence": None,
                                "proposal_source": "full_image",
                                "predictions": predictions,
                            }
                        )

                display_results = [
                    item
                    for item in crop_results
                    if item["predictions"][0]["probability"] >= classifier_min_probability
                ]

                if any(item.get("detection") is not None or item.get("grid_box") is not None for item in display_results):
                    st.image(
                        draw_classifier_results(image, display_results),
                        caption="Crop proposals with classifier top predictions",
                        use_container_width=True,
                    )
                else:
                    st.image(image, caption="Classifier input image", use_container_width=True)

                summary_rows = []
                for item in display_results:
                    predictions = item["predictions"]
                    top_prediction = predictions[0]
                    summary_rows.append(
                        {
                            "crop": item["crop_id"],
                            "source": item.get("proposal_source"),
                            "detector_label": item["detector_label"],
                            "detector_confidence": item["detector_confidence"],
                            "top_prediction": top_prediction["label"],
                            "top_probability": top_prediction["probability"],
                            "top_k": ", ".join(prediction["label"] for prediction in predictions),
                        }
                    )

                st.subheader("Crop Predictions")
                if summary_rows:
                    st.dataframe(summary_rows, use_container_width=True, hide_index=True)
                else:
                    st.warning("No crop predictions met the minimum displayed probability.")

                for item in display_results:
                    with st.expander(
                        f"Crop {item['crop_id']}: {item['detector_label']} -> {item['predictions'][0]['label']} ({item['predictions'][0]['probability']:.2f})",
                        expanded=item["crop_id"] <= 3,
                    ):
                        preview_col_a, preview_col_b = st.columns(2)
                        with preview_col_a:
                            st.image(
                                item["crop"],
                                caption="Image sent to classifier",
                                use_container_width=True,
                            )
                        with preview_col_b:
                            st.dataframe(item["predictions"], use_container_width=True, hide_index=True)

                st.subheader("Prediction JSON")
                result_payload = {
                    "checkpoint": str(checkpoint_path),
                    "source_mode": source_mode,
                    "crop_count": len(display_results),
                    "raw_crop_count": len(crop_results),
                    "minimum_displayed_probability": classifier_min_probability,
                    "crops": [
                        {
                            "crop_id": item["crop_id"],
                            "proposal_source": item.get("proposal_source"),
                            "detector_label": item["detector_label"],
                            "detector_confidence": item["detector_confidence"],
                            "top_prediction": item["predictions"][0],
                            "predictions": item["predictions"],
                            "bbox": {
                                "x": item["detection"].bbox.x,
                                "y": item["detection"].bbox.y,
                                "width": item["detection"].bbox.width,
                                "height": item["detection"].bbox.height,
                            }
                            if item.get("detection") is not None
                            else {
                                "left": item["grid_box"][0],
                                "top": item["grid_box"][1],
                                "right": item["grid_box"][2],
                                "bottom": item["grid_box"][3],
                            }
                            if item.get("grid_box") is not None
                            else None,
                        }
                        for item in display_results
                    ],
                }
                if detection_result is not None:
                    result_payload["yolo_detection_count"] = detection_result.summary.detection_count
                st.json(result_payload, expanded=2)

with tab_segmentation:
    left, right = st.columns([1, 1.2])

    with left:
        segmentation_image = st.file_uploader(
            "Segmentation test image",
            type=["png", "jpg", "jpeg", "webp"],
            key="segmentation_image",
        )
        segmentation_model_name = st.text_input(
            "YOLO segmentation model",
            value=DEFAULT_SEGMENTATION_MODEL,
            help="Use an Ultralytics segmentation checkpoint. Detection-only models will not return masks.",
        )
        segmentation_confidence = st.slider(
            "Segmentation confidence threshold",
            0.05,
            0.95,
            0.25,
            0.05,
            help="Raise this to reduce weak masks; lower it to inspect missed small objects.",
        )
        segmentation_nms_iou = st.slider(
            "Segmentation NMS IoU threshold",
            0.1,
            0.95,
            0.7,
            0.05,
            help="Higher values preserve more nearby overlapping masks.",
        )
        segmentation_max_masks = st.slider("Max masks", 1, 50, 20)
        min_mask_area_percent = st.slider(
            "Minimum mask area",
            0.0,
            10.0,
            0.0,
            0.1,
            help="Hide tiny masks by approximate percent of model input area.",
        )
        show_masked_crops = st.checkbox(
            "Show transparent masked crops",
            value=True,
            help="Useful for judging whether segmentation is cleaner than box crops.",
        )
        run_segmentation = st.button("Test Segmentation", use_container_width=True)

    with right:
        if run_segmentation:
            if segmentation_image is None:
                st.error("Upload an image first.")
                st.stop()

            image = load_image_from_bytes(segmentation_image.getvalue())

            try:
                segmentations = run_yolo_segmentation(
                    image=image,
                    model_name=segmentation_model_name,
                    confidence_threshold=segmentation_confidence,
                    nms_iou_threshold=segmentation_nms_iou,
                    max_masks=segmentation_max_masks,
                    min_mask_area_percent=min_mask_area_percent,
                )
            except Exception as exc:
                st.error(str(exc))
                st.stop()

            if not segmentations:
                st.warning(
                    "No masks were returned. Check that the model is a segmentation checkpoint, "
                    "or lower the confidence / mask-area threshold."
                )
                st.image(image, caption="Original image", use_container_width=True)
                st.stop()

            metric_a, metric_b, metric_c = st.columns(3)
            metric_a.metric("Masks", len(segmentations))
            metric_b.metric(
                "Avg confidence",
                f"{sum(item['confidence'] for item in segmentations) / len(segmentations):.2f}",
            )
            metric_c.metric(
                "Largest mask",
                f"{max(item['mask_area_percent'] for item in segmentations):.2f}%",
            )

            st.image(
                draw_segmentation_results(image, segmentations),
                caption="Segmentation overlay",
                use_container_width=True,
            )

            st.subheader("Segmentation Results")
            st.dataframe(
                [
                    {
                        "mask": item["index"],
                        "label": item["label"],
                        "confidence": item["confidence"],
                        "mask_area_percent": item["mask_area_percent"],
                        "bbox_pixels": item["bbox_pixels"],
                        "polygon_points": len(item.get("polygon") or []),
                    }
                    for item in segmentations
                ],
                use_container_width=True,
                hide_index=True,
            )

            st.subheader("Instance Crops")
            for row_start in range(0, len(segmentations), 3):
                columns = st.columns(3)
                for column, item in zip(columns, segmentations[row_start : row_start + 3]):
                    with column:
                        st.image(
                            segmentation_crop(image, item),
                            caption=f"{item['index']}. {item['label']} box crop",
                            use_container_width=True,
                        )
                        if show_masked_crops:
                            st.image(
                                segmentation_masked_crop(image, item),
                                caption=f"{item['index']}. masked crop",
                                use_container_width=True,
                            )

            st.subheader("Segmentation JSON")
            st.json(
                {
                    "model": segmentation_model_name,
                    "confidence_threshold": segmentation_confidence,
                    "nms_iou_threshold": segmentation_nms_iou,
                    "mask_count": len(segmentations),
                    "segmentations": [
                        {
                            "index": item["index"],
                            "label": item["label"],
                            "confidence": item["confidence"],
                            "mask_area_percent": item["mask_area_percent"],
                            "bbox_pixels": item["bbox_pixels"],
                            "polygon_points": len(item.get("polygon") or []),
                        }
                        for item in segmentations
                    ],
                },
                expanded=2,
            )

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
