from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models.database import init_database
from routers import executions, recipes
from services.recipe_loader import load_recipes


@asynccontextmanager
async def lifespan(_: FastAPI):
    load_recipes()
    await init_database()
    yield


app = FastAPI(title="AutoPilot API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recipes.router, prefix="/api")
app.include_router(executions.router, prefix="/api")


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
