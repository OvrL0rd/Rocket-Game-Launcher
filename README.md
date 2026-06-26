# Rocket Game Launcher

A cross-platform game launcher with a React frontend, Python backend, and Tauri shell.

## Stack

- **Tauri 2** — native window, file dialogs, app packaging
- **React + TypeScript + Vite** — frontend UI
- **FastAPI (Python)** — backend; runs as a local sidecar process on startup

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stable)
- Python 3.11+
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS (WebKit on Linux, nothing extra on Windows/macOS)

## Getting started

```bash
# Install all dependencies
make install

# Start the app (backend + Tauri dev window)
make up
```

## Dev commands

| Command | Description |
|---|---|
| `make up` | Start backend + Tauri dev window. Ctrl-C stops both. |
| `make down` | Kill background backend process. |
| `make backend` | Start Python backend only (port 8743). |
| `make frontend` | Start Vite dev server only (browser, no Tauri window). |
| `make tauri` | Start Tauri window only (assumes backend is running). |
| `make build` | Build release bundle. |
| `make check` | TypeScript type-check + cargo check. |
| `make lint` | ruff (Python) + eslint (TypeScript). |
| `make test` | pytest on `backend/tests/`. |
| `make clean` | Remove build artifacts and caches. |

## Configuration

Paths and executables are stored in `Config/config.ini` and can be changed from the in-app Settings menu.

```ini
[Steam]
path1 = /path/to/steamapps        # Linux default: ~/.steam/steam/steamapps
path2 =                            # Optional second drive
executable = /path/to/steam

[Epic Games]
path1 =                            # Path to .item manifest folder
executable =                       # Path to EpicGamesLauncher
```

## Features

- [x] Steam game library (reads `.acf` manifests)
- [x] Game artwork from Steam CDN (local cache preferred)
- [x] Dark / light mode (follows system theme on startup)
- [x] Settings UI with native file browser
- [x] Linux + Windows support
- [ ] Epic Games support
- [ ] Heroic Launcher support
- [ ] System tray

## Project structure

```
src/               React frontend
src-tauri/         Tauri (Rust) shell
backend/           FastAPI Python backend
Config/            config.ini
Icons/             App icons and assets
```

## Credits

- [icons8.com](https://icons8.com)
- [Tauri](https://tauri.app)
- [CustomTkinter](https://github.com/TomSchimansky/CustomTkinter) (v1)
