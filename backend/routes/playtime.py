import json
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

_STORE = Path(__file__).parent.parent.parent / "Config" / "playtime.json"


def _load() -> dict:
    try:
        return json.loads(_STORE.read_text()) if _STORE.exists() else {"sessions": []}
    except Exception:
        return {"sessions": []}


def _save(data: dict) -> None:
    _STORE.write_text(json.dumps(data, indent=2))


class Session(BaseModel):
    game_id: str
    platform: str
    game_name: str
    started_at: int
    duration: int  # seconds


@router.post("/session")
def record_session(body: Session):
    data = _load()
    data["sessions"].append(body.model_dump())
    _save(data)
    return {"status": "saved"}


@router.get("")
def get_playtime():
    """Returns total seconds played keyed by 'platform:game_id'."""
    data = _load()
    result: dict[str, int] = {}
    for s in data.get("sessions", []):
        key = f"{s['platform']}:{s['game_id']}"
        result[key] = result.get(key, 0) + s["duration"]
    return result
