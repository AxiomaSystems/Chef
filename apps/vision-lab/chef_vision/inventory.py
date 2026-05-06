from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock


_INVENTORY_LOCK = Lock()


@dataclass(slots=True)
class InventoryItem:
    label: str
    category: str
    inventory_policy: str
    estimated_count: int
    max_confidence: float
    source: str
    first_added_at: str
    last_seen_at: str


def ensure_inventory_store(path: str | Path) -> Path:
    resolved = Path(path)
    resolved.parent.mkdir(parents=True, exist_ok=True)
    if not resolved.exists():
        resolved.write_text("[]", encoding="utf-8")
    return resolved


def load_inventory(path: str | Path) -> list[InventoryItem]:
    resolved = ensure_inventory_store(path)
    with _INVENTORY_LOCK:
        raw = json.loads(resolved.read_text(encoding="utf-8"))

    return [InventoryItem(**item) for item in raw]


def save_inventory(path: str | Path, items: list[InventoryItem]) -> None:
    resolved = ensure_inventory_store(path)
    with _INVENTORY_LOCK:
        resolved.write_text(
            json.dumps([asdict(item) for item in items], indent=2),
            encoding="utf-8",
        )


def clear_inventory(path: str | Path) -> None:
    save_inventory(path, [])


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
