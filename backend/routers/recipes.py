from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from services.recipe_loader import get_all_recipes, get_recipe

router = APIRouter(tags=["recipes"])

PRIVATE_RECIPE_KEYS = {"n8nWebhookPath"}


def _sanitize_recipe(recipe: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in recipe.items()
        if key not in PRIVATE_RECIPE_KEYS
    }


@router.get("/recipes")
async def list_recipes() -> list[dict[str, Any]]:
    return [_sanitize_recipe(recipe) for recipe in get_all_recipes()]


@router.get("/recipes/{recipe_id}")
async def read_recipe(recipe_id: str) -> dict[str, Any]:
    recipe = get_recipe(recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")

    return _sanitize_recipe(recipe)
