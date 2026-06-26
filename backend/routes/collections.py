import json
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

_STORE = Path(__file__).parent.parent.parent / "Config" / "collections.json"


def _load() -> dict:
    try:
        return json.loads(_STORE.read_text()) if _STORE.exists() else {"collections": []}
    except Exception:
        return {"collections": []}


def _save(data: dict) -> None:
    _STORE.write_text(json.dumps(data, indent=2))


class CollectionCreate(BaseModel):
    name: str
    color: str = "#7C3AED"


class CollectionUpdate(BaseModel):
    name: str
    color: str
    game_ids: list[str]


@router.get("")
def get_collections():
    return _load()["collections"]


@router.post("")
def create_collection(body: CollectionCreate):
    data = _load()
    c = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "color": body.color,
        "game_ids": [],
    }
    data["collections"].append(c)
    _save(data)
    return c


@router.put("/{collection_id}")
def update_collection(collection_id: str, body: CollectionUpdate):
    data = _load()
    for c in data["collections"]:
        if c["id"] == collection_id:
            c["name"] = body.name.strip()
            c["color"] = body.color
            c["game_ids"] = body.game_ids
            _save(data)
            return c
    raise HTTPException(status_code=404, detail="Collection not found")


@router.delete("/{collection_id}")
def delete_collection(collection_id: str):
    data = _load()
    original_len = len(data["collections"])
    data["collections"] = [c for c in data["collections"] if c["id"] != collection_id]
    if len(data["collections"]) == original_len:
        raise HTTPException(status_code=404, detail="Collection not found")
    _save(data)
    return {"status": "deleted"}
