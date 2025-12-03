import json
from pathlib import Path
from typing import Any


def ensure_file(path: str, default: Any) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    if not p.exists():
        with p.open("w", encoding="utf-8") as f:
            json.dump(default, f, ensure_ascii=False, indent=2)


def load_json(path: str) -> Any:
    p = Path(path)
    if not p.exists():
        # Default to empty list for collections, else empty object
        default = [] if p.suffix == ".json" else {}
        ensure_file(path, default)
    with p.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: str, data: Any) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

