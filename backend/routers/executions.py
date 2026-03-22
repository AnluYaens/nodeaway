from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse
from uuid import uuid4

import httpx
from fastapi import APIRouter, HTTPException

from models.database import get_execution, list_history, save_execution
from services.gemini_client import gemini_is_configured, generate_image, generate_text
from services.recipe_loader import get_recipe

router = APIRouter(tags=["executions"])

GITHUB_HEADERS = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "AutoPilot/1.0"
}


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


def _strip_code_fences(value: str) -> str:
    cleaned = value.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
    return cleaned


def _load_json(value: str) -> Any:
    cleaned = _strip_code_fences(value)
    return json.loads(cleaned)


def _extract_github_repo(repo_url: str) -> tuple[str, str]:
    parsed = urlparse(repo_url)
    path_parts = [part for part in parsed.path.split("/") if part]
    if parsed.netloc.lower() != "github.com" or len(path_parts) < 2:
        raise HTTPException(status_code=422, detail="La URL debe apuntar a un repositorio publico de GitHub.")

    owner = path_parts[0]
    repo = path_parts[1].removesuffix(".git")
    return owner, repo


def _safe_number(value: Any, fallback: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _build_mock_result(recipe: dict[str, Any], payload: dict[str, Any], reason: str | None = None) -> dict[str, Any]:
    result_type = recipe["resultTemplate"]["type"]
    fallback_note = "Mock result generado mientras se integra n8n." if not reason else f"Fallback activado: {reason}"

    if result_type == "dashboard":
        return {
            "type": "dashboard",
            "summary": fallback_note,
            "stats": [
                {"label": "Issues abiertos", "value": "18", "trend": "+3 esta semana"},
                {"label": "Alta prioridad", "value": "5", "trend": "+1 hoy"},
                {"label": "Bloqueantes", "value": "2", "trend": "estable"}
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
                    "title": "Calidad general",
                    "score": 82,
                    "content": "La base es prometedora, pero conviene reforzar consistencia y seguimiento."
                },
                {
                    "title": "Riesgos visibles",
                    "score": 68,
                    "content": "Hay espacio para mejorar cobertura, claridad de docs y observabilidad."
                }
            ],
            "recommendations": [
                "Prioriza las acciones de mayor impacto antes de automatizar la siguiente capa.",
                "Reduce friccion en el flujo principal para cuidar la demo.",
                "Documenta claramente inputs, outputs y limitaciones."
            ],
            "context": payload
        }

    if result_type == "social-posts":
        platform = str(payload.get("platform", "Instagram"))
        brand = str(payload.get("brand", "Tu marca"))
        count = _safe_number(payload.get("count", 3), fallback=3)
        return {
            "type": "social-posts",
            "posts": [
                {
                    "platform": platform,
                    "brandName": brand.split(",")[0][:28] or "AutoPilot Studio",
                    "text": f"{brand}: idea {index + 1} para {platform} con tono {payload.get('tone', 'Profesional')}.",
                    "hashtags": ["#autopilot", "#ai", "#marketing"],
                    "imagePrompt": "Lifestyle visual moderno y limpio relacionado con la marca.",
                    "imageBase64": None
                }
                for index in range(count)
            ]
        }

    return {
        "type": "text",
        "content": f"Resultado mock listo para {recipe['title']}. {fallback_note}",
        "context": payload
    }


async def _fetch_json(client: httpx.AsyncClient, url: str, params: dict[str, Any] | None = None) -> Any:
    response = await client.get(url, params=params, headers=GITHUB_HEADERS)
    response.raise_for_status()
    return response.json()


async def _run_social_post_generator(payload: dict[str, Any]) -> dict[str, Any]:
    count = _safe_number(payload.get("count", 3), fallback=3)
    prompt = f"""
Eres un experto en social media marketing. Genera {count} posts para {payload.get("platform", "Instagram")}.

Marca: {payload.get("brand", "")}
Tono: {payload.get("tone", "Profesional")}
Plataforma: {payload.get("platform", "Instagram")}

Responde SOLO con un JSON array:
[
  {{
    "text": "texto del post",
    "hashtags": ["#uno", "#dos"],
    "imagePrompt": "descripcion visual profesional"
  }}
]
"""
    raw_posts = await generate_text(prompt)
    parsed_posts = _load_json(raw_posts)
    if not isinstance(parsed_posts, list):
        raise RuntimeError("Gemini did not return a posts array.")

    posts: list[dict[str, Any]] = []
    for entry in parsed_posts[:count]:
        if not isinstance(entry, dict):
            continue

        image_prompt = str(entry.get("imagePrompt", "")).strip()
        image_base64: str | None = None
        if image_prompt:
            try:
                image_base64 = await generate_image(
                    f"Create a professional social media image for {payload.get('platform', 'Instagram')}: {image_prompt}. Modern, clean, high quality, no text overlay."
                )
            except Exception:
                image_base64 = None

        posts.append(
            {
                "platform": str(payload.get("platform", "Instagram")),
                "brandName": str(payload.get("brand", "AutoPilot Studio")).split(",")[0][:28] or "AutoPilot Studio",
                "text": str(entry.get("text", "")).strip(),
                "hashtags": [str(hashtag) for hashtag in entry.get("hashtags", [])][:8],
                "imagePrompt": image_prompt,
                "imageBase64": image_base64,
            }
        )

    if not posts:
        raise RuntimeError("Gemini did not return valid social posts.")

    return {"type": "social-posts", "posts": posts}


async def _run_review_responder(payload: dict[str, Any]) -> dict[str, Any]:
    prompt = f"""
Redacta una respuesta para una reseña de negocio.

Negocio: {payload.get("businessName", "")}
Tono: {payload.get("tone", "Profesional")}
Reseña:
{payload.get("reviewText", "")}

Entrega una respuesta breve, empatica y lista para copiar.
"""
    content = await generate_text(prompt)
    return {"type": "text", "content": content}


async def _run_news_digest(payload: dict[str, Any]) -> dict[str, Any]:
    prompt = f"""
Crea un digest de noticias breve y util.

Temas: {payload.get("topics", "")}
Idioma: {payload.get("language", "Español")}

Estructura:
- 3 a 5 titulares sinteticos
- por que importan
- una recomendacion accionable al final
"""
    content = await generate_text(prompt)
    return {"type": "text", "content": content}


async def _run_github_issue_summarizer(payload: dict[str, Any]) -> dict[str, Any]:
    owner, repo = _extract_github_repo(str(payload["repoUrl"]))

    async with httpx.AsyncClient(timeout=20.0) as client:
        issues = await _fetch_json(
            client,
            f"https://api.github.com/repos/{owner}/{repo}/issues",
            params={"state": "open", "per_page": 20},
        )

    filtered_issues = [issue for issue in issues if "pull_request" not in issue][:12]
    summary_input = [
        {
            "title": issue.get("title", ""),
            "comments": issue.get("comments", 0),
            "labels": [label.get("name", "") for label in issue.get("labels", [])],
            "url": issue.get("html_url", ""),
        }
        for issue in filtered_issues
    ]

    prompt = f"""
Analiza estos issues abiertos y devuelve SOLO JSON con esta forma:
{{
  "summary": "resumen ejecutivo",
  "stats": [
    {{"label": "Issues abiertos", "value": "0", "trend": "texto breve"}},
    {{"label": "Alta prioridad", "value": "0", "trend": "texto breve"}},
    {{"label": "Con mas comentarios", "value": "0", "trend": "texto breve"}}
  ],
  "items": [
    {{"title": "issue", "priority": "Alta", "reason": "por que importa"}}
  ]
}}

Repositorio: {owner}/{repo}
Issues:
{json.dumps(summary_input, ensure_ascii=False)}
"""
    analysis = _load_json(await generate_text(prompt))
    return {
        "type": "dashboard",
        "summary": analysis.get("summary", f"Resumen de issues de {owner}/{repo}"),
        "stats": analysis.get("stats", []),
        "items": analysis.get("items", []),
    }


async def _run_repo_health_report(payload: dict[str, Any]) -> dict[str, Any]:
    owner, repo = _extract_github_repo(str(payload["repoUrl"]))

    async with httpx.AsyncClient(timeout=20.0) as client:
        repo_data = await _fetch_json(client, f"https://api.github.com/repos/{owner}/{repo}")
        languages = await _fetch_json(client, f"https://api.github.com/repos/{owner}/{repo}/languages")
        contributors = await _fetch_json(
            client,
            f"https://api.github.com/repos/{owner}/{repo}/contributors",
            params={"per_page": 5},
        )
        commits = await _fetch_json(
            client,
            f"https://api.github.com/repos/{owner}/{repo}/commits",
            params={"per_page": 5},
        )

    prompt = f"""
Analiza la salud tecnica de este repositorio y devuelve SOLO JSON con esta forma:
{{
  "headline": "titulo corto",
  "score": 0,
  "sections": [
    {{"title": "Actividad", "score": 0, "content": "texto breve"}},
    {{"title": "Mantenibilidad", "score": 0, "content": "texto breve"}},
    {{"title": "Documentacion", "score": 0, "content": "texto breve"}}
  ],
  "recommendations": ["accion 1", "accion 2", "accion 3"]
}}

Repo:
{json.dumps({
    "name": repo_data.get("full_name"),
    "description": repo_data.get("description"),
    "open_issues": repo_data.get("open_issues_count"),
    "stargazers": repo_data.get("stargazers_count"),
    "forks": repo_data.get("forks_count"),
    "default_branch": repo_data.get("default_branch"),
    "languages": languages,
    "contributors": len(contributors),
    "recent_commits": len(commits)
}, ensure_ascii=False)}
"""
    analysis = _load_json(await generate_text(prompt))
    return {
        "type": "report",
        "headline": analysis.get("headline", f"Estado general de {owner}/{repo}"),
        "score": analysis.get("score", 75),
        "sections": analysis.get("sections", []),
        "recommendations": analysis.get("recommendations", []),
    }


async def _run_price_watcher(payload: dict[str, Any]) -> dict[str, Any]:
    product_url = str(payload["productUrl"])
    target_price = _safe_number(payload.get("targetPrice", 0))

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        response = await client.get(product_url, headers={"User-Agent": "AutoPilot/1.0"})
        response.raise_for_status()

    html_excerpt = re.sub(r"\s+", " ", response.text)[:6000]
    prices = re.findall(r"(?:\$|€|£)\s?\d+(?:[.,]\d{2})?", html_excerpt)
    detected_price = prices[0] if prices else "No detectado"

    prompt = f"""
Analiza esta pagina de producto y devuelve SOLO JSON con esta forma:
{{
  "headline": "titulo corto",
  "score": 0,
  "sections": [
    {{"title": "Precio actual", "score": 0, "content": "texto"}},
    {{"title": "Comparacion", "score": 0, "content": "texto"}},
    {{"title": "Decision", "score": 0, "content": "texto"}}
  ],
  "recommendations": ["accion 1", "accion 2"]
}}

Precio objetivo: {target_price}
Precio detectado: {detected_price}
Contenido de pagina:
{html_excerpt}
"""
    analysis = _load_json(await generate_text(prompt))
    return {
        "type": "report",
        "headline": analysis.get("headline", "Analisis del precio actual"),
        "score": analysis.get("score", 70),
        "sections": analysis.get("sections", []),
        "recommendations": analysis.get("recommendations", []),
    }


async def _run_with_integrations(recipe_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    if recipe_id == "social-post-generator":
        return await _run_social_post_generator(payload)
    if recipe_id == "review-responder":
        return await _run_review_responder(payload)
    if recipe_id == "news-digest-ai":
        return await _run_news_digest(payload)
    if recipe_id == "github-issue-summarizer":
        return await _run_github_issue_summarizer(payload)
    if recipe_id == "repo-health-report":
        return await _run_repo_health_report(payload)
    if recipe_id == "price-watcher":
        return await _run_price_watcher(payload)

    raise RuntimeError("Recipe integration not implemented.")


async def _resolve_result(recipe: dict[str, Any], payload: dict[str, Any]) -> tuple[dict[str, Any], str | None]:
    if not gemini_is_configured():
        return _build_mock_result(recipe, payload, reason="GEMINI_API_KEY no configurada."), "mock"

    try:
        return await _run_with_integrations(recipe["id"], payload), None
    except Exception as error:
        return _build_mock_result(recipe, payload, reason=str(error)), "fallback"


@router.post("/run/{recipe_id}")
async def run_automation(recipe_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    recipe = get_recipe(recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")

    validated_payload = validate_payload(recipe, payload)
    execution_id = str(uuid4())
    created_at = datetime.now(UTC).isoformat()
    result, mode = await _resolve_result(recipe, validated_payload)

    execution = {
        "executionId": execution_id,
        "recipeId": recipe["id"],
        "recipeTitle": recipe["title"],
        "status": "success",
        "input": validated_payload,
        "result": result,
        "createdAt": created_at,
        "mode": mode or "live",
    }

    await save_execution(
        execution_id=execution_id,
        recipe_id=recipe["id"],
        recipe_title=recipe["title"],
        status="success",
        input_data=validated_payload,
        result_data={**result, "mode": mode or "live"},
        created_at=created_at,
    )

    return execution


@router.get("/history")
async def read_history() -> list[dict[str, Any]]:
    return await list_history()


@router.get("/history/{execution_id}")
async def read_execution(execution_id: str) -> dict[str, Any]:
    execution = await get_execution(execution_id)
    if execution is None:
        raise HTTPException(status_code=404, detail="Execution not found")

    return execution
