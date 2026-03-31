from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models.database import init_database
from routers import executions, recipes, suggestions
from services.recipe_loader import load_recipes


def _allowed_origins() -> list[str]:
    raw_value = os.getenv("CORS_ALLOW_ORIGINS", "").strip()
    if raw_value:
        return [origin.strip() for origin in raw_value.split(",") if origin.strip()]
    return [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]


@asynccontextmanager
async def lifespan(_: FastAPI):
    load_recipes()
    await init_database()
    yield


app = FastAPI(title="AutoPilot API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(recipes.router, prefix="/api")
app.include_router(executions.router, prefix="/api")
app.include_router(suggestions.router, prefix="/api")


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
