from __future__ import annotations

import io
import json
from pathlib import Path
from pathlib import PurePosixPath

import modal


APP_NAME = "chef-ingredient-inference"
VOLUME_NAME = "chef-ingredient-vision-data"
VOL_MOUNT = PurePosixPath("/mnt/chef-vision")
DEFAULT_RUN_NAME = "resnet18_ingredient_crops_5000_modal_frozen_v2"


volume = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "pillow>=11.3,<12.0",
        "torch>=2.5,<3.0",
        "torchvision>=0.20,<1.0",
    )
)

app = modal.App(APP_NAME, image=image)


def checkpoint_path(run_name: str) -> Path:
    return Path(str(VOL_MOUNT / "ingredient_classifier_runs" / run_name / "best_model.pt"))


@app.function(
    gpu="A10G",
    timeout=10 * 60,
    volumes={str(VOL_MOUNT): volume},
)
def predict_image_remote(image_bytes: bytes, run_name: str, top_k: int) -> dict:
    import torch
    from PIL import Image
    from torchvision import transforms
    from torchvision.models import resnet18

    checkpoint = torch.load(checkpoint_path(run_name), map_location="cuda")
    class_names = checkpoint["class_names"]

    model = resnet18(weights=None)
    model.fc = torch.nn.Linear(model.fc.in_features, len(class_names))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to("cuda")
    model.eval()

    transform = transforms.Compose(
        [
            transforms.Resize((256, 256)),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = transform(image).unsqueeze(0).to("cuda")

    with torch.no_grad():
        probabilities = torch.softmax(model(tensor), dim=1).squeeze(0)
        values, indices = probabilities.topk(min(top_k, len(class_names)))

    return {
        "run_name": run_name,
        "top_predictions": [
            {
                "label": class_names[class_index],
                "probability": round(float(probability), 6),
            }
            for probability, class_index in zip(values.cpu().tolist(), indices.cpu().tolist())
        ],
    }


@app.local_entrypoint()
def main(
    image_path: str,
    run_name: str = DEFAULT_RUN_NAME,
    top_k: int = 5,
) -> None:
    path = Path(image_path)
    result = predict_image_remote.remote(path.read_bytes(), run_name=run_name, top_k=top_k)
    print(json.dumps({"image": str(path), **result}, indent=2), flush=True)
