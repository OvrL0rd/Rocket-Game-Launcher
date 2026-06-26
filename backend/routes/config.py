import configparser
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

CONFIG_PATH = Path(__file__).parent.parent.parent / "Config" / "config.ini"


def _read() -> configparser.ConfigParser:
    cfg = configparser.ConfigParser()
    cfg.read(CONFIG_PATH)
    return cfg


def _parse_paths(raw: str) -> list[str]:
    return [p.strip() for p in raw.splitlines() if p.strip()]


def _serialize_paths(paths: list[str]) -> str:
    cleaned = [p.strip() for p in paths if p.strip()]
    if not cleaned:
        return ""
    return ("\n\t").join(cleaned)


class LauncherConfig(BaseModel):
    steam_paths: list[str]
    steam_executable: str
    epic_paths: list[str]
    epic_executable: str


@router.get("", response_model=LauncherConfig)
def get_config():
    cfg = _read()
    return LauncherConfig(
        steam_paths=_parse_paths(cfg.get("Steam", "paths", fallback="")),
        steam_executable=cfg.get("Steam", "executable", fallback=""),
        epic_paths=_parse_paths(cfg.get("Epic Games", "paths", fallback="")),
        epic_executable=cfg.get("Epic Games", "executable", fallback=""),
    )


@router.put("")
def update_config(body: LauncherConfig):
    if not CONFIG_PATH.exists():
        raise HTTPException(status_code=404, detail="config.ini not found")

    cfg = _read()

    if "Steam" not in cfg:
        cfg["Steam"] = {}
    cfg["Steam"]["paths"] = _serialize_paths(body.steam_paths)
    cfg["Steam"]["executable"] = body.steam_executable

    if "Epic Games" not in cfg:
        cfg["Epic Games"] = {}
    cfg["Epic Games"]["paths"] = _serialize_paths(body.epic_paths)
    cfg["Epic Games"]["executable"] = body.epic_executable

    with open(CONFIG_PATH, "w") as f:
        cfg.write(f)

    return {"status": "saved"}
