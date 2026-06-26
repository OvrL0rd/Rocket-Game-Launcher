import json
import os
import platform
import re
import subprocess
from pathlib import Path

import darkdetect
import requests
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter()

# ---------------------------------------------------------------------------
# ACF parsing + non-game filter

# Matches Proton, Steam Linux Runtime, SteamVR, redistributables, etc.
_NON_GAME_RE = re.compile(
    r"^(Proton\b|Proton -|Steam Linux Runtime|SteamVR|Steamworks Common"
    r"|Pressure Vessel|Steam Client Runtime|Valve VR|Steam Deck Headphones)",
    re.IGNORECASE,
)


def _parse_acf(filepath: str) -> dict[str, str]:
    """Parse top-level AppState key-value pairs from a Steam .acf file."""
    data: dict[str, str] = {}
    try:
        with open(filepath, encoding="utf-8", errors="replace") as f:
            in_block = False
            depth = 0
            for line in f:
                stripped = line.strip()
                if stripped == '"AppState"':
                    in_block = True
                    continue
                if not in_block:
                    continue
                if stripped == "{":
                    depth += 1
                    continue
                if stripped == "}":
                    depth -= 1
                    if depth <= 0:
                        break
                    continue
                if depth == 1:
                    # Lines look like: \t"key"\t\t"value"
                    parts = [p.strip('"') for p in stripped.split("\t") if p.strip('"')]
                    if len(parts) >= 2:
                        data[parts[0].lower()] = parts[-1]
    except OSError:
        pass
    return data


def _is_game(state: dict[str, str]) -> bool:
    name = state.get("name", "")
    if not name:
        return False
    if _NON_GAME_RE.match(name):
        return False
    # DownloadType 4 = DLC, skip standalone DLC manifests
    if state.get("downloadtype") == "4":
        return False
    return True


# ---------------------------------------------------------------------------
# Steam paths + cover

def _default_steam_paths() -> list[str]:
    if platform.system() == "Windows":
        return [r"C:\Program Files (x86)\Steam\steamapps"]
    return [
        str(Path.home() / ".steam/steam/steamapps"),
        str(Path.home() / ".local/share/Steam/steamapps"),
    ]


def _get_steam_cover(app_id: str) -> str:
    if platform.system() == "Windows":
        local = (
            Path(os.environ.get("PROGRAMFILES(X86)", ""))
            / "Steam" / "appcache" / "librarycache" / app_id / "library_600x900.jpg"
        )
        if local.exists():
            return local.as_uri()
    return f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/library_600x900.jpg"


def _scan_steam_manifests(folder: str) -> list[dict]:
    entries = []
    try:
        for filename in sorted(os.listdir(folder)):
            if not (filename.startswith("appmanifest") and filename.endswith(".acf")):
                continue
            state = _parse_acf(os.path.join(folder, filename))
            if not _is_game(state):
                continue
            app_id = state.get("appid", filename.split("_")[1].split(".")[0])
            name = re.sub(r"[^\w\s:'\-]", "", state["name"]).strip()
            entries.append({
                "name": name,
                "app_id": app_id,
                "last_played": int(state.get("lastplayed", 0)),
                "size_on_disk": int(state.get("sizeondisk", 0)),
                "install_dir": state.get("installdir", ""),
            })
    except FileNotFoundError:
        pass
    return entries


# ---------------------------------------------------------------------------
# Models

class SteamGame(BaseModel):
    name: str
    app_id: str
    cover_url: str
    last_played: int = 0
    size_on_disk: int = 0


class GameDetail(BaseModel):
    app_id: str
    name: str
    cover_url: str
    header_image: str
    short_description: str
    developers: list[str]
    publishers: list[str]
    genres: list[str]
    release_date: str
    screenshots: list[str]
    last_played: int
    size_on_disk: int


# ---------------------------------------------------------------------------
# Routes

@router.get("/steam", response_model=list[SteamGame])
def get_steam_games(paths: list[str] = Query(default=[])):
    active = [p for p in paths if p.strip()]
    if not active:
        active = _default_steam_paths()

    seen: dict[str, dict] = {}
    for p in active:
        for entry in _scan_steam_manifests(p):
            seen[entry["app_id"]] = entry

    result = []
    for entry in sorted(seen.values(), key=lambda e: e["name"].lower()):
        result.append(SteamGame(
            name=entry["name"],
            app_id=entry["app_id"],
            cover_url=_get_steam_cover(entry["app_id"]),
            last_played=entry["last_played"],
            size_on_disk=entry["size_on_disk"],
        ))
    return result


@router.get("/steam/{app_id}/detail", response_model=GameDetail)
def get_game_detail(app_id: str, paths: list[str] = Query(default=[])):
    # Pull local metadata from manifests
    active = [p for p in paths if p.strip()] or _default_steam_paths()
    local: dict = {}
    for p in active:
        for entry in _scan_steam_manifests(p):
            if entry["app_id"] == app_id:
                local = entry
                break
        if local:
            break

    # Fetch store data from Steam API
    store: dict = {}
    try:
        resp = requests.get(
            "https://store.steampowered.com/api/appdetails",
            params={"appids": app_id, "l": "english"},
            timeout=6,
        )
        if resp.status_code == 200:
            payload = resp.json().get(app_id, {})
            if payload.get("success"):
                store = payload.get("data", {})
    except requests.RequestException:
        pass

    name = store.get("name") or local.get("name", "Unknown")
    genres = [g["description"] for g in store.get("genres", [])]
    release = store.get("release_date", {}).get("date", "")
    screenshots = [s["path_thumbnail"] for s in store.get("screenshots", [])[:8]]

    return GameDetail(
        app_id=app_id,
        name=name,
        cover_url=_get_steam_cover(app_id),
        header_image=store.get("header_image", f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg"),
        short_description=store.get("short_description", ""),
        developers=store.get("developers", []),
        publishers=store.get("publishers", []),
        genres=genres,
        release_date=release,
        screenshots=screenshots,
        last_played=local.get("last_played", 0),
        size_on_disk=local.get("size_on_disk", 0),
    )


class LaunchRequest(BaseModel):
    app_id: str
    steam_executable: str
    name: str


@router.post("/steam/launch")
def launch_steam(body: LaunchRequest):
    try:
        subprocess.Popen([body.steam_executable, "-applaunch", body.app_id])
        return {"status": "launched", "game": body.name}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Steam executable not found")


# ---------------------------------------------------------------------------
# Epic Games

class EpicGame(BaseModel):
    app_name: str
    name: str
    executable: str
    launcher_executable: str
    install_size: int = 0
    last_played: int = 0


@router.get("/epic", response_model=list[EpicGame])
def get_epic_games(paths: list[str] = Query(default=[]), launcher_executable: str = ""):
    active = [p for p in paths if p.strip()]
    if not active:
        return []

    games = []
    for path1 in active:
        try:
            for filename in os.listdir(path1):
                if not filename.endswith(".item"):
                    continue
                with open(os.path.join(path1, filename), encoding="utf-8") as f:
                    data = json.load(f)
                display_name = data.get("DisplayName", "")
                app_name = data.get("AppName", filename.replace(".item", ""))
                if not display_name:
                    continue
                install_location = data.get("InstallLocation", "")
                launch_exe = data.get("LaunchExecutable", "")
                if launch_exe == "FortniteGame/Binaries/Win64/FortniteLauncher.exe":
                    launch_exe = "FortniteGame/Binaries/Win64/FortniteClient-Win64-Shipping_EAC_EOS.exe"
                executable = os.path.normpath(os.path.join(install_location, launch_exe)) if launch_exe else ""
                install_size = int(data.get("InstallSize", 0))
                games.append(EpicGame(
                    app_name=app_name,
                    name=display_name,
                    executable=executable,
                    launcher_executable=launcher_executable,
                    install_size=install_size,
                    last_played=0,
                ))
        except (FileNotFoundError, json.JSONDecodeError):
            pass

    return sorted(games, key=lambda g: g.name)


class EpicLaunchRequest(BaseModel):
    executable: str
    launcher_executable: str
    name: str


@router.post("/epic/launch")
def launch_epic(body: EpicLaunchRequest):
    try:
        subprocess.Popen([body.executable])
        return {"status": "launched", "game": body.name}
    except (FileNotFoundError, OSError):
        try:
            subprocess.Popen([body.launcher_executable])
            return {"status": "launched_via_launcher", "game": body.name}
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Executable not found")


# ---------------------------------------------------------------------------
# Theme

@router.get("/theme")
def get_theme():
    theme = darkdetect.theme()
    return {"theme": (theme or "Dark").lower()}


# ---------------------------------------------------------------------------
# System URL opener

class OpenUrlRequest(BaseModel):
    url: str


@router.post("/open-url")
def open_url(body: OpenUrlRequest):
    url = body.url
    if not url.startswith("https://") and not url.startswith("http://"):
        raise HTTPException(status_code=400, detail="Only http/https URLs are allowed")
    try:
        if platform.system() == "Windows":
            os.startfile(url)  # type: ignore[attr-defined]
        elif platform.system() == "Darwin":
            subprocess.Popen(["open", url])
        else:
            subprocess.Popen(["xdg-open", url])
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
