import argparse
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.collections import router as collections_router
from routes.config import router as config_router
from routes.games import router as games_router
from routes.playtime import router as playtime_router

app = FastAPI(title="Rocket Game Launcher API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "tauri://localhost"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(config_router, prefix="/config")
app.include_router(games_router, prefix="/games")
app.include_router(playtime_router, prefix="/playtime")
app.include_router(collections_router, prefix="/collections")


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8743)
    args = parser.parse_args()
    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="warning")
