from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from models.database import list_history, save_execution
from services.recipe_loader import get_recipe

router = APIRouter(tags=["executions"])


def _is_valid_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _coerce_field_value(field: dict[str, Any], value: Any) -> Any:
    field_type = field["type"]

    if field_type == "number":
        try:
            number_value = int(value)
        except (TypeError, ValueError) as error:
            raise HTTPException(status_code=422, detail=f"{field['label']} debe ser un numero.") from error

        minimum = field.get("min")
        maximum = field.get("max")
        if minimum is not None and number_value < minimum:
            raise HTTPException(status_code=422, detail=f"{field['label']} debe ser mayor o igual a {minimum}.")
        if maximum is not None and number_value > maximum:
            raise HTTPException(status_code=422, detail=f"{field['label']} debe ser menor o igual a {maximum}.")
        return number_value

    if field_type == "email":
        if not isinstance(value, str) or "@" not in value:
            raise HTTPException(status_code=422, detail=f"{field['label']} debe ser un email valido.")
        return value.strip()

    if field_type == "url":
        if not isinstance(value, str) or not _is_valid_url(value.strip()):
            raise HTTPException(status_code=422, detail=f"{field['label']} debe ser una URL valida.")
        return value.strip()

    if field_type == "select":
        options = field.get("options", [])
        if value not in options:
            raise HTTPException(status_code=422, detail=f"{field['label']} debe ser una opcion valida.")
        return value

    if not isinstance(value, str):
        raise HTTPException(status_code=422, detail=f"{field['label']} debe ser texto.")

    return value.strip()


def validate_payload(recipe: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    sanitized: dict[str, Any] = {}

    for field in recipe.get("fields", []):
        field_id = field["id"]
        raw_value = payload.get(field_id, field.get("default"))

        if field.get("required") and (raw_value is None or raw_value == ""):
            raise HTTPException(status_code=422, detail=f"{field['label']} es obligatorio.")

        if raw_value in (None, ""):
            continue

        sanitized[field_id] = _coerce_field_value(field, raw_value)

    return sanitized


def _build_mock_result(recipe: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    result_type = recipe["resultTemplate"]["type"]

    if result_type == "dashboard":
        return {
            "type": "dashboard",
            "summary": "Mock result generado mientras se integra n8n.",
            "stats": [
                {"label": "Issues abiertos", "value": "18"},
                {"label": "Alta prioridad", "value": "5"},
                {"label": "Bloqueantes", "value": "2"}
            ],
            "items": [
                {
                    "title": "Reducir fallos del login social",
                    "priority": "Alta",
                    "reason": "Afecta conversion en el flujo principal."
                },
                {
                    "title": "Resolver regressions en mobile",
                    "priority": "Media",
                    "reason": "Impacto visible en la demo y experiencia de uso."
                }
            ],
            "context": payload
        }

    if result_type == "report":
        return {
            "type": "report",
            "headline": f"Analisis preliminar para {recipe['title']}",
            "score": 82,
            "sections": [
                {
                    "title": "Hallazgos",
                    "content": "La base es prometedora, pero conviene reforzar consistencia y seguimiento."
                },
                {
                    "title": "Recomendaciones",
                    "content": "Prioriza las acciones de mas impacto antes de automatizar la siguiente capa."
                }
            ],
            "context": payload
        }

    if result_type == "social-posts":
        platform = payload.get("platform", "Instagram")
        brand = payload.get("brand", "Tu marca")
        count = payload.get("count", 3)
        return {
            "type": "social-posts",
            "posts": [
                {
                    "text": f"{brand}: idea {index + 1} para {platform} con tono {payload.get('tone', 'Profesional')}.",
                    "hashtags": ["#autopilot", "#ai", "#marketing"],
                    "imagePrompt": "Lifestyle visual moderno y limpio relacionado con la marca."
                }
                for index in range(int(count))
            ]
        }

    return {
        "type": "text",
        "content": f"Resultado mock listo para {recipe['title']}.",
        "context": payload
    }


@router.post("/run/{recipe_id}")
async def run_automation(recipe_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    recipe = get_recipe(recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")

    validated_payload = validate_payload(recipe, payload)
    execution_id = str(uuid4())
    created_at = datetime.now(UTC).isoformat()
    result = _build_mock_result(recipe, validated_payload)

    execution = {
        "executionId": execution_id,
        "recipeId": recipe["id"],
        "recipeTitle": recipe["title"],
        "status": "success",
        "input": validated_payload,
        "result": result,
        "createdAt": created_at,
    }

    await save_execution(
        execution_id=execution_id,
        recipe_id=recipe["id"],
        recipe_title=recipe["title"],
        status="success",
        input_data=validated_payload,
        result_data=result,
        created_at=created_at,
    )

    return execution


@router.get("/history")
async def read_history() -> list[dict[str, Any]]:
    return await list_history()
