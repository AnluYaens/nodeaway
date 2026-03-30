from __future__ import annotations

import json
import re
from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime
from html import unescape
from typing import Any
from urllib.parse import urlparse
from uuid import uuid4
from xml.etree import ElementTree

import httpx
from fastapi import APIRouter, HTTPException

from models.database import get_execution, list_history, save_execution
from services.n8n_client import trigger_workflow
from services.recipe_loader import get_recipe

router = APIRouter(tags=["executions"])

DEFAULT_USER_AGENT = "Nodeaway/1.0"
SOCIAL_PLATFORMS = ["Instagram", "Twitter/X", "LinkedIn"]
REDDIT_HEADERS = {
    "Accept": "application/json",
    "User-Agent": DEFAULT_USER_AGENT,
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
    if not _is_valid_url(repo_url):
        raise HTTPException(status_code=422, detail="La URL del repositorio debe ser valida.")

    parsed = urlparse(repo_url)
    path_parts = [part for part in parsed.path.split("/") if part]
    if parsed.netloc.lower() != "github.com" or len(path_parts) < 2:
        raise HTTPException(status_code=422, detail="La URL debe apuntar a un repositorio de GitHub.")

    owner = path_parts[0]
    repo = path_parts[1].removesuffix(".git")
    return owner, repo


def _safe_number(value: Any, fallback: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _github_headers(token: str | None = None) -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": DEFAULT_USER_AGENT,
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _extract_brand_name(product: str) -> str:
    words = re.findall(r"[A-Za-z0-9][A-Za-z0-9&+\-]*", product)
    if not words:
        return "Tu producto"
    return " ".join(words[:3])[:28]


def _truncate(value: str, limit: int = 320) -> str:
    cleaned = re.sub(r"\s+", " ", value).strip()
    if len(cleaned) <= limit:
        return cleaned
    return f"{cleaned[: limit - 1].rstrip()}..."


def _strip_html_tags(value: str) -> str:
    without_scripts = re.sub(r"(?is)<script.*?>.*?</script>", " ", value)
    without_styles = re.sub(r"(?is)<style.*?>.*?</style>", " ", without_scripts)
    without_tags = re.sub(r"(?is)<[^>]+>", " ", without_styles)
    return re.sub(r"\s+", " ", unescape(without_tags)).strip()


def _extract_meta_content(html: str, name: str) -> str:
    pattern = re.compile(
        rf'<meta[^>]+(?:name|property)=["\']{re.escape(name)}["\'][^>]+content=["\']([^"\']+)["\']',
        re.IGNORECASE,
    )
    match = pattern.search(html)
    return match.group(1).strip() if match else ""


def _extract_tag_texts(html: str, tag: str, limit: int = 8) -> list[str]:
    matches = re.findall(rf"(?is)<{tag}\b[^>]*>(.*?)</{tag}>", html)
    results: list[str] = []
    for match in matches:
        cleaned = _strip_html_tags(match)
        if cleaned:
            results.append(_truncate(cleaned, 120))
        if len(results) >= limit:
            break
    return results


def _language_config(language: str) -> dict[str, str]:
    configs = {
        "Español": {"hl": "es-419", "gl": "ES", "ceid": "ES:es-419"},
        "English": {"hl": "en-US", "gl": "US", "ceid": "US:en-US"},
        "Deutsch": {"hl": "de", "gl": "DE", "ceid": "DE:de"},
        "Français": {"hl": "fr", "gl": "FR", "ceid": "FR:fr"},
    }
    return configs.get(language, configs["English"])


def _parse_rss_items(xml_text: str) -> list[dict[str, str]]:
    root = ElementTree.fromstring(xml_text)
    items: list[dict[str, str]] = []

    for node in root.iter():
        if not str(node.tag).endswith("item"):
            continue

        item: dict[str, str] = {}
        for child in list(node):
            tag_name = str(child.tag).split("}")[-1]
            text = (child.text or "").strip()
            if text:
                item[tag_name] = text

        if item.get("title") and item.get("link"):
            items.append(item)

    return items


def _recent_rss_items(items: list[dict[str, str]], limit: int = 10) -> list[dict[str, str]]:
    now = datetime.now(UTC)
    recent_items: list[dict[str, str]] = []

    for item in items:
        pub_date = item.get("pubDate")
        if not pub_date:
            recent_items.append(item)
            continue

        try:
            published_at = parsedate_to_datetime(pub_date)
            if published_at.tzinfo is None:
                published_at = published_at.replace(tzinfo=UTC)
            if now - published_at.astimezone(UTC) <= timedelta(hours=24):
                recent_items.append(item)
        except (TypeError, ValueError):
            recent_items.append(item)

    return (recent_items or items)[:limit]


def _normalize_n8n_social_posts(result: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    raw_posts = result.get("posts", [])
    brand_name = _extract_brand_name(str(payload.get("product", "")))
    posts: list[dict[str, Any]] = []

    if isinstance(raw_posts, list):
        for entry in raw_posts:
            if not isinstance(entry, dict):
                continue
            hashtags = entry.get("hashtags", [])
            posts.append(
                {
                    "platform": str(entry.get("platform", "")).strip() or "Instagram",
                    "brandName": str(entry.get("brandName", "")).strip() or brand_name,
                    "text": str(entry.get("text", "")).strip(),
                    "hashtags": [str(hashtag).strip() for hashtag in hashtags if str(hashtag).strip()] if isinstance(hashtags, list) else [],
                    "imagePrompt": str(entry.get("imagePrompt", "")).strip(),
                    "imageBase64": entry.get("imageBase64"),
                }
            )

    return {"type": "social-posts", "posts": posts}


def _normalize_n8n_reddit_report(result: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    pros = result.get("pros", [])
    cons = result.get("cons", [])
    summary = str(result.get("summary", "")).strip()
    sentiment = str(result.get("sentiment", "mixed")).strip()

    def _lines(value: Any) -> str:
        if isinstance(value, list):
            items = [str(item).strip() for item in value if str(item).strip()]
            return "\n".join(f"- {item}" for item in items)
        return str(value).strip()

    return {
        "type": "report",
        "headline": str(result.get("headline", f"Radar de opiniones para {payload.get('topic', 'tu tema')}")).strip(),
        "score": _safe_number(result.get("score"), 75),
        "sections": [
            {"title": "Pros recurrentes", "score": 80, "content": _lines(pros) or "Sin pros claros en la respuesta."},
            {"title": "Contras recurrentes", "score": 65, "content": _lines(cons) or "Sin contras claros en la respuesta."},
            {
                "title": "Sentimiento general",
                "score": _safe_number(result.get("score"), 72),
                "content": summary or f"Sentimiento detectado: {sentiment}.",
            },
        ],
        "recommendations": result.get("recommendations", []),
    }


def _normalize_n8n_github_health(result: dict[str, Any]) -> dict[str, Any]:
    metrics = result.get("metrics", {}) if isinstance(result.get("metrics"), dict) else {}
    recommendations = result.get("recommendations", [])
    items = []
    if isinstance(recommendations, list):
        items = [
            {"title": str(item).strip(), "priority": "Media", "reason": "Recomendación generada por el workflow."}
            for item in recommendations
            if str(item).strip()
        ]

    return {
        "type": "dashboard",
        "summary": str(result.get("summary", result.get("analysis", ""))).strip() or "Auditoría completada.",
        "stats": [
            {"label": "Score salud", "value": f"{_safe_number(result.get('score'), 0)}/100", "trend": "Evaluación generada por n8n"},
            {"label": "Issues abiertos", "value": str(_safe_number(metrics.get("openIssues"), 0)), "trend": "Dato del repositorio"},
            {"label": "Contribuidores", "value": str(_safe_number(metrics.get("contributorsCount"), 0)), "trend": "Top contributors analizados"},
        ],
        "items": items,
    }


def _normalize_n8n_issue_summary(result: dict[str, Any]) -> dict[str, Any]:
    categories = result.get("categories", {}) if isinstance(result.get("categories"), dict) else {}
    high_items = categories.get("high", []) if isinstance(categories.get("high"), list) else []
    medium_items = categories.get("medium", []) if isinstance(categories.get("medium"), list) else []
    low_items = categories.get("low", []) if isinstance(categories.get("low"), list) else []

    items: list[dict[str, Any]] = []
    for priority, entries in (("Alta", high_items), ("Media", medium_items), ("Baja", low_items)):
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            items.append(
                {
                    "title": str(entry.get("title", "")).strip() or f"Issue #{entry.get('number', '?')}",
                    "priority": priority,
                    "reason": str(entry.get("reason", "Priorizado por el workflow.")).strip(),
                }
            )

    return {
        "type": "dashboard",
        "summary": str(result.get("summary", "")).strip() or "Resumen de issues generado por n8n.",
        "stats": [
            {"label": "Issues abiertos", "value": str(_safe_number(result.get("totalIssues"), len(items))), "trend": "Backlog analizado"},
            {"label": "Urgencia alta", "value": str(len(high_items)), "trend": "Issues con mayor prioridad"},
            {"label": "Sin etiquetar", "value": "0", "trend": "No informado por n8n"},
        ],
        "items": items,
    }


def _normalize_n8n_rss_digest(result: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "text",
        "content": str(result.get("content", result.get("digest", ""))).strip() or "Boletín generado por n8n.",
        "context": {"sources": result.get("sources", []), "articlesFound": result.get("articlesFound")},
    }


def _normalize_n8n_landing_report(result: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    analysis = result.get("analysis", {}) if isinstance(result.get("analysis"), dict) else {}
    sections = [
        {"title": "Copy", "score": _safe_number(result.get("score"), 78), "content": str(analysis.get("copy", "")).strip()},
        {"title": "Estructura y CTA", "score": _safe_number(result.get("score"), 78), "content": str(analysis.get("structure", "")).strip()},
        {
            "title": "Propuesta de valor",
            "score": _safe_number(result.get("score"), 78),
            "content": str(analysis.get("valueProposition", analysis.get("cta", ""))).strip(),
        },
    ]

    return {
        "type": "report",
        "headline": str(result.get("headline", f"Análisis de landing page para {payload.get('url', 'la landing')}")).strip(),
        "score": _safe_number(result.get("score"), 78),
        "sections": sections,
        "recommendations": result.get("recommendations", []),
    }


def _normalize_n8n_result(recipe_id: str, result: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    result_type = result.get("type")
    if result_type in {"dashboard", "social-posts", "report", "text"}:
        return result

    if recipe_id == "social-post-generator":
        return _normalize_n8n_social_posts(result, payload)
    if recipe_id == "reddit-opinion-radar":
        return _normalize_n8n_reddit_report(result, payload)
    if recipe_id == "github-health-auditor":
        return _normalize_n8n_github_health(result)
    if recipe_id == "github-issue-summarizer":
        return _normalize_n8n_issue_summary(result)
    if recipe_id == "rss-news-digest":
        return _normalize_n8n_rss_digest(result)
    if recipe_id == "landing-page-analyzer":
        return _normalize_n8n_landing_report(result, payload)

    return result


async def _resolve_result(recipe: dict[str, Any], payload: dict[str, Any]) -> tuple[dict[str, Any], str]:
    webhook_path = str(recipe.get("n8nWebhookPath", "")).strip()
    if not webhook_path:
        raise HTTPException(status_code=400, detail="El flujo (n8nWebhookPath) no está configurado para esta receta.")

    try:
        live_result = await trigger_workflow(webhook_path, payload)
        return _normalize_n8n_result(recipe["id"], live_result, payload), "live"
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Error en la ejecución de n8n: {error}")


def _is_sensitive_input_key(key: str) -> bool:
    normalized = key.lower().replace("-", "").replace("_", "")
    markers = ("token", "apikey", "secret", "password", "authorization", "bearer")
    return any(marker in normalized for marker in markers)


def _redact_sensitive_payload(payload: dict[str, Any]) -> dict[str, Any]:
    sanitized: dict[str, Any] = {}
    for key, value in payload.items():
        if _is_sensitive_input_key(key) and str(value).strip():
            sanitized[key] = "[REDACTED]"
        else:
            sanitized[key] = value
    return sanitized


@router.post("/run/{recipe_id}")
async def run_automation(recipe_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    recipe = get_recipe(recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")

    validated_payload = validate_payload(recipe, payload)
    sanitized_payload = _redact_sensitive_payload(validated_payload)
    execution_id = str(uuid4())
    created_at = datetime.now(UTC).isoformat()
    result, mode = await _resolve_result(recipe, validated_payload)

    execution = {
        "executionId": execution_id,
        "recipeId": recipe["id"],
        "recipeTitle": recipe["title"],
        "status": "success",
        "input": sanitized_payload,
        "result": result,
        "createdAt": created_at,
        "mode": mode,
    }

    await save_execution(
        execution_id=execution_id,
        recipe_id=recipe["id"],
        recipe_title=recipe["title"],
        status="success",
        input_data=sanitized_payload,
        result_data={**result, "mode": mode},
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
