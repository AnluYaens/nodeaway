from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any

RECIPE_DIRECTORY = Path(__file__).resolve().parents[1] / "recipes"

_recipe_cache: dict[str, dict[str, Any]] = {}


def _read_recipe(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as recipe_file:
        recipe = json.load(recipe_file)

    if "id" not in recipe:
        raise ValueError(f"Recipe file {path.name} is missing an id")

    return recipe


def load_recipes(recipe_dir: Path | None = None) -> dict[str, dict[str, Any]]:
    directory = recipe_dir or RECIPE_DIRECTORY
    recipes = {
        recipe["id"]: recipe
        for recipe in (_read_recipe(path) for path in sorted(directory.glob("*.json")))
    }

    _recipe_cache.clear()
    _recipe_cache.update(recipes)
    return deepcopy(_recipe_cache)


def get_all_recipes() -> list[dict[str, Any]]:
    if not _recipe_cache:
        load_recipes()

    return [deepcopy(recipe) for recipe in _recipe_cache.values()]


def get_recipe(recipe_id: str) -> dict[str, Any] | None:
    if not _recipe_cache:
        load_recipes()

    recipe = _recipe_cache.get(recipe_id)
    if recipe is None:
        return None

    return deepcopy(recipe)
