from __future__ import annotations

import argparse
import html
import json
import random
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


APP_DIR = Path(__file__).resolve().parent
DEFAULT_BUILD_DIR = APP_DIR / "data" / "training-builds" / "detector" / "chef-detector-v005-openimages"
DEFAULT_OUTPUT_DIR = APP_DIR / "reports" / "vision" / "dataset-qa"
COLORS = [
    "#22c55e",
    "#38bdf8",
    "#f59e0b",
    "#ef4444",
    "#a78bfa",
    "#14b8a6",
    "#f97316",
    "#e879f9",
]


@dataclass(slots=True)
class QaCandidate:
    row_index: int
    split: str
    image_path: Path
    label_path: Path
    source_image: str
    source_label: str
    class_name: str
    line_index: int
    area: float
    box_count: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create visual QA samples for a YOLO detector dataset build.")
    parser.add_argument("--build-dir", type=Path, default=DEFAULT_BUILD_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--mode", choices=("oversized", "tiny", "dense", "random"), default="oversized")
    parser.add_argument("--sample-count", type=int, default=80)
    parser.add_argument("--oversized-area-threshold", type=float, default=0.35)
    parser.add_argument("--tiny-area-threshold", type=float, default=0.002)
    parser.add_argument("--seed", type=int, default=17)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def read_class_names(data_yaml: Path) -> dict[int, str]:
    names: dict[int, str] = {}
    in_names = False
    for line in data_yaml.read_text(encoding="utf-8").splitlines():
        if line.strip() == "names:":
            in_names = True
            continue
        if not in_names or not line.startswith("  "):
            continue
        index, value = line.strip().split(":", 1)
        names[int(index)] = value.strip().strip("'\"")
    return names


def read_label_lines(label_path: Path) -> list[tuple[int, float, float, float, float]]:
    rows = []
    for line in label_path.read_text(encoding="utf-8").splitlines():
        parts = line.split()
        if len(parts) < 5:
            continue
        rows.append((int(float(parts[0])), float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])))
    return rows


def infer_source_id(source_image: str) -> str:
    parts = Path(source_image).parts
    if "sources" in parts:
        index = parts.index("sources")
        if index + 1 < len(parts):
            return parts[index + 1]
    return "unknown"


def collect_candidates(build_dir: Path, class_names: dict[int, str], args: argparse.Namespace) -> list[QaCandidate]:
    rows = json.loads((build_dir / "manifest.json").read_text(encoding="utf-8"))
    candidates: list[QaCandidate] = []

    for row_index, row in enumerate(rows):
        label_path = Path(row["label"])
        image_path = Path(row["image"])
        if not label_path.exists() or not image_path.exists():
            continue
        label_lines = read_label_lines(label_path)
        annotations = row.get("annotations", [])
        for line_index, label_row in enumerate(label_lines):
            class_id, _, _, width, height = label_row
            area = width * height
            if args.mode == "oversized" and area < args.oversized_area_threshold:
                continue
            if args.mode == "tiny" and area > args.tiny_area_threshold:
                continue
            annotation = annotations[line_index] if line_index < len(annotations) else {}
            candidates.append(
                QaCandidate(
                    row_index=row_index,
                    split=row.get("split", "unknown"),
                    image_path=image_path,
                    label_path=label_path,
                    source_image=row.get("source_image", ""),
                    source_label=annotation.get("source_label", class_names.get(class_id, str(class_id))),
                    class_name=annotation.get("class_name", class_names.get(class_id, str(class_id))),
                    line_index=line_index,
                    area=area,
                    box_count=len(label_lines),
                )
            )

    if args.mode == "dense":
        candidates.sort(key=lambda item: (item.box_count, item.area), reverse=True)
    elif args.mode == "random":
        random.Random(args.seed).shuffle(candidates)
    elif args.mode == "tiny":
        candidates.sort(key=lambda item: item.area)
    else:
        candidates.sort(key=lambda item: item.area, reverse=True)

    return candidates


def load_font(size: int) -> ImageFont.ImageFont:
    for font_path in [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ]:
        if Path(font_path).exists():
            return ImageFont.truetype(font_path, size=size)
    return ImageFont.load_default()


def yolo_to_pixels(
    row: tuple[int, float, float, float, float],
    image_width: int,
    image_height: int,
) -> tuple[int, int, int, int]:
    _, x_center, y_center, width, height = row
    x1 = int((x_center - width / 2) * image_width)
    y1 = int((y_center - height / 2) * image_height)
    x2 = int((x_center + width / 2) * image_width)
    y2 = int((y_center + height / 2) * image_height)
    return (
        max(0, min(image_width - 1, x1)),
        max(0, min(image_height - 1, y1)),
        max(0, min(image_width - 1, x2)),
        max(0, min(image_height - 1, y2)),
    )


def draw_label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, color: str, font: ImageFont.ImageFont) -> None:
    left, top = xy
    bbox = draw.textbbox((left, top), text, font=font)
    padding = 5
    text_box = (bbox[0] - padding, bbox[1] - padding, bbox[2] + padding, bbox[3] + padding)
    draw.rectangle(text_box, fill=color)
    draw.text((left, top), text, fill="white", font=font)


def render_candidate(candidate: QaCandidate, output_path: Path, class_names: dict[int, str]) -> None:
    image = Image.open(candidate.image_path).convert("RGB")
    image.thumbnail((1400, 1000))

    original = Image.open(candidate.image_path)
    original_width, original_height = original.size
    scale_x = image.width / original_width
    scale_y = image.height / original_height

    draw = ImageDraw.Draw(image)
    font = load_font(max(18, image.width // 45))
    label_rows = read_label_lines(candidate.label_path)

    for index, label_row in enumerate(label_rows):
        class_id = label_row[0]
        x1, y1, x2, y2 = yolo_to_pixels(label_row, original_width, original_height)
        scaled_box = (int(x1 * scale_x), int(y1 * scale_y), int(x2 * scale_x), int(y2 * scale_y))
        is_target = index == candidate.line_index
        color = "#ef4444" if is_target else COLORS[class_id % len(COLORS)]
        width = 6 if is_target else 3
        draw.rectangle(scaled_box, outline=color, width=width)
        if is_target or index < 20:
            label = class_names.get(class_id, str(class_id))
            if is_target:
                label = f"CHECK: {candidate.source_label} -> {candidate.class_name} area={candidate.area:.3f}"
            draw_label(draw, (scaled_box[0] + 4, max(4, scaled_box[1] + 4)), label, color, font)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, quality=92)


def render_html(
    output_dir: Path,
    build_dir: Path,
    mode: str,
    candidates: list[QaCandidate],
    selected: list[tuple[QaCandidate, Path]],
) -> None:
    source_counts: dict[str, int] = {}
    class_counts: dict[str, int] = {}
    source_label_counts: dict[str, int] = {}
    for candidate in candidates:
        source_counts[infer_source_id(candidate.source_image)] = source_counts.get(infer_source_id(candidate.source_image), 0) + 1
        class_counts[candidate.class_name] = class_counts.get(candidate.class_name, 0) + 1
        source_label_counts[candidate.source_label] = source_label_counts.get(candidate.source_label, 0) + 1

    def render_counts(title: str, counts: dict[str, int], limit: int = 20) -> str:
        items = sorted(counts.items(), key=lambda item: item[1], reverse=True)[:limit]
        lines = [f"<h2>{html.escape(title)}</h2>", "<table><tbody>"]
        for name, count in items:
            lines.append(f"<tr><td>{html.escape(name)}</td><td>{count}</td></tr>")
        lines.append("</tbody></table>")
        return "\n".join(lines)

    cards = []
    for index, (candidate, sample_path) in enumerate(selected, start=1):
        relative = sample_path.relative_to(output_dir).as_posix()
        cards.append(
            "\n".join(
                [
                    "<article>",
                    f"<h3>#{index}: {html.escape(candidate.source_label)} -> {html.escape(candidate.class_name)}</h3>",
                    f"<img src=\"{html.escape(relative)}\" alt=\"QA sample {index}\">",
                    "<dl>",
                    f"<dt>area</dt><dd>{candidate.area:.4f}</dd>",
                    f"<dt>split</dt><dd>{html.escape(candidate.split)}</dd>",
                    f"<dt>boxes in image</dt><dd>{candidate.box_count}</dd>",
                    f"<dt>source</dt><dd>{html.escape(infer_source_id(candidate.source_image))}</dd>",
                    f"<dt>source image</dt><dd>{html.escape(candidate.source_image)}</dd>",
                    f"<dt>training image</dt><dd>{html.escape(str(candidate.image_path))}</dd>",
                    "</dl>",
                    "</article>",
                ]
            )
        )

    page = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Dataset QA: {html.escape(build_dir.name)} {html.escape(mode)}</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 24px; background: #f8fafc; color: #0f172a; }}
    h1, h2, h3 {{ margin: 0 0 10px; }}
    .summary {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: 20px 0; }}
    table {{ width: 100%; border-collapse: collapse; background: white; }}
    td {{ border-bottom: 1px solid #e2e8f0; padding: 6px 8px; }}
    article {{ background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 18px 0; }}
    img {{ width: 100%; max-width: 1400px; height: auto; display: block; border: 1px solid #cbd5e1; }}
    dl {{ display: grid; grid-template-columns: 140px 1fr; gap: 6px 12px; font-size: 13px; }}
    dt {{ font-weight: 700; color: #334155; }}
    dd {{ margin: 0; overflow-wrap: anywhere; }}
  </style>
</head>
<body>
  <h1>Dataset QA: {html.escape(build_dir.name)} / {html.escape(mode)}</h1>
  <p>Total matching candidates: {len(candidates)}. Rendered samples: {len(selected)}.</p>
  <section class="summary">
    <div>{render_counts("By Source", source_counts)}</div>
    <div>{render_counts("By Detector Class", class_counts)}</div>
    <div>{render_counts("By Source Label", source_label_counts)}</div>
  </section>
  {''.join(cards)}
</body>
</html>
"""
    (output_dir / "visual_qa.html").write_text(page, encoding="utf-8")


def main() -> None:
    args = parse_args()
    build_dir = args.build_dir
    if not (build_dir / "manifest.json").exists():
        raise SystemExit(f"Missing manifest.json in {build_dir}")

    output_dir = args.output_dir / build_dir.name / args.mode
    if output_dir.exists() and args.overwrite:
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    samples_dir = output_dir / "samples"
    samples_dir.mkdir(parents=True, exist_ok=True)

    class_names = read_class_names(build_dir / "data.yaml")
    candidates = collect_candidates(build_dir, class_names, args)
    selected_candidates = candidates[: args.sample_count]
    selected = []
    for index, candidate in enumerate(selected_candidates, start=1):
        sample_path = samples_dir / f"{index:03d}_{candidate.split}_{candidate.class_name}_{candidate.area:.3f}.jpg"
        render_candidate(candidate, sample_path, class_names)
        selected.append((candidate, sample_path))

    render_html(output_dir, build_dir, args.mode, candidates, selected)
    summary = {
        "output": str(output_dir / "visual_qa.html"),
        "candidate_count": len(candidates),
        "sample_count": len(selected),
        "mode": args.mode,
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
