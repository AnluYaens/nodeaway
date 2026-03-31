from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from models.database import save_suggestion

router = APIRouter(tags=["suggestions"])


@router.post("/suggestions")
async def create_suggestion(payload: dict[str, Any]) -> dict[str, str]:
    description = str(payload.get("descripcion", "")).strip()
    if not description:
        raise HTTPException(status_code=422, detail="La descripcion es obligatoria.")

    category = payload.get("categoria")
    if category and category not in ("dev", "life", "biz"):
        category = None

    contact = str(payload.get("contacto", "")).strip() or None

    suggestion_id = str(uuid4())
    created_at = datetime.now(UTC).isoformat()

    await save_suggestion(
        id=suggestion_id,
        description=description,
        category=category,
        contact=contact,
        created_at=created_at,
    )

    return {"id": suggestion_id, "message": "Sugerencia recibida"}
