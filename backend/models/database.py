from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import aiosqlite


def _resolve_database_path() -> Path:
    database_url = os.getenv("DATABASE_URL", "sqlite:///./data/autopilot.db")

    if not database_url.startswith("sqlite:///"):
        raise ValueError("Only sqlite DATABASE_URL values are supported.")

    raw_path = database_url.removeprefix("sqlite:///")
    path = Path(raw_path)

    if not path.is_absolute():
        path = (Path(__file__).resolve().parents[1] / path).resolve()

    path.parent.mkdir(parents=True, exist_ok=True)
    return path


DATABASE_PATH = _resolve_database_path()


async def init_database() -> None:
    async with aiosqlite.connect(DATABASE_PATH) as database:
        await database.execute(
            """
            CREATE TABLE IF NOT EXISTS executions (
                execution_id TEXT PRIMARY KEY,
                recipe_id TEXT NOT NULL,
                recipe_title TEXT NOT NULL,
                status TEXT NOT NULL,
                input_data TEXT NOT NULL,
                result_data TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        await database.execute(
            "CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at DESC)"
        )
        await database.commit()


async def save_execution(
    *,
    execution_id: str,
    recipe_id: str,
    recipe_title: str,
    status: str,
    input_data: dict[str, Any],
    result_data: dict[str, Any],
    created_at: str,
) -> None:
    async with aiosqlite.connect(DATABASE_PATH) as database:
        await database.execute(
            """
            INSERT INTO executions (
                execution_id,
                recipe_id,
                recipe_title,
                status,
                input_data,
                result_data,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                execution_id,
                recipe_id,
                recipe_title,
                status,
                json.dumps(input_data),
                json.dumps(result_data),
                created_at,
            ),
        )
        await database.commit()


async def list_history(limit: int = 25) -> list[dict[str, Any]]:
    async with aiosqlite.connect(DATABASE_PATH) as database:
        database.row_factory = aiosqlite.Row
        cursor = await database.execute(
            """
            SELECT execution_id, recipe_id, recipe_title, status, input_data, result_data, created_at
            FROM executions
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = await cursor.fetchall()

    history: list[dict[str, Any]] = []
    for row in rows:
        history.append(
            {
                "executionId": row["execution_id"],
                "recipeId": row["recipe_id"],
                "recipeTitle": row["recipe_title"],
                "status": row["status"],
                "input": json.loads(row["input_data"]),
                "result": json.loads(row["result_data"]),
                "createdAt": row["created_at"],
            }
        )

    return history
