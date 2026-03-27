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
from services.gemini_client import gemini_is_configured, generate_image, generate_text
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


def _build_mock_result(recipe: dict[str, Any], payload: dict[str, Any], reason: str | None = None) -> dict[str, Any]:
    note = "Mock result generado mientras se integra el flujo real." if not reason else f"Fallback activado: {reason}"
    recipe_id = recipe["id"]

    if recipe_id == "social-post-generator":
        brand_name = _extract_brand_name(str(payload.get("product", "")))
        return {
            "type": "social-posts",
            "posts": [
                {
                    "platform": platform,
                    "brandName": brand_name,
                    "text": f"{brand_name}: propuesta de post para {platform} con tono {payload.get('tone', 'Profesional')}.",
                    "hashtags": ["#launch", "#product", "#growth"],
                    "imagePrompt": f"Escena editorial moderna para {platform} mostrando {payload.get('product', 'el producto')}.",
                    "imageBase64": None,
                }
                for platform in SOCIAL_PLATFORMS
            ],
        }

    if recipe_id == "reddit-opinion-radar":
        return {
            "type": "report",
            "headline": f"Radar inicial de Reddit para {payload.get('topic', 'tu tema')}",
            "score": 74,
            "sections": [
                {"title": "Pros recurrentes", "score": 80, "content": "Los usuarios destacan facilidad de uso y valor percibido."},
                {"title": "Contras recurrentes", "score": 63, "content": "Se repiten objeciones sobre precio, soporte y consistencia."},
                {"title": "Sentimiento general", "score": 72, "content": f"Conversacion mixta-positiva. {note}"},
            ],
            "recommendations": [
                "Convierte los pros mas repetidos en mensajes de marketing.",
                "Responde con datos a las objeciones mas frecuentes.",
                "Vigila los subreddits donde se concentra el debate.",
            ],
            "context": payload,
        }

    if recipe_id == "github-health-auditor":
        return {
            "type": "dashboard",
            "summary": f"Estado preliminar del repositorio. {note}",
            "stats": [
                {"label": "Score salud", "value": "78/100", "trend": "Actividad estable"},
                {"label": "Issues abiertos", "value": "14", "trend": "4 requieren atencion"},
                {"label": "Contribuidores", "value": "6", "trend": "2 activos esta semana"},
            ],
            "items": [
                {"title": "Reducir deuda en el flujo principal", "priority": "Alta", "reason": "Concentra incidencias y frena entregas."},
                {"title": "Actualizar dependencias criticas", "priority": "Alta", "reason": "Hay riesgo de regresion y seguridad."},
                {"title": "Mejorar documentacion operativa", "priority": "Media", "reason": "Acelera onboarding y mantenimiento."},
            ],
            "context": payload,
        }

    if recipe_id == "github-issue-summarizer":
        return {
            "type": "dashboard",
            "summary": f"Triage preliminar de issues abiertos. {note}",
            "stats": [
                {"label": "Issues abiertos", "value": "18", "trend": "30 revisados"},
                {"label": "Urgencia alta", "value": "5", "trend": "2 bloquean roadmap"},
                {"label": "Sin etiquetar", "value": "7", "trend": "Necesitan triage"},
            ],
            "items": [
                {"title": "Error en autenticacion", "priority": "Alta", "reason": "Impacta acceso de usuarios activos."},
                {"title": "Fallo intermitente en deploy", "priority": "Alta", "reason": "Riesgo directo para releases."},
                {"title": "UX inconsistente en mobile", "priority": "Media", "reason": "Afecta percepcion, no bloquea operacion."},
            ],
            "context": payload,
        }

    if recipe_id == "rss-news-digest":
        return {
            "type": "text",
            "content": (
                f"Boletin matutino ({payload.get('language', 'Español')}) para {payload.get('topics', 'tus temas')}\n\n"
                "1. Panorama rapido: movimientos relevantes de las ultimas 24h.\n"
                "2. Lo importante: senales de mercado, producto y competencia.\n"
                "3. Siguiente accion: revisa las historias con mayor impacto hoy.\n\n"
                f"{note}"
            ),
            "context": payload,
        }

    if recipe_id == "landing-page-analyzer":
        competitor = str(payload.get("competitor", "")).strip()
        competitor_note = f" frente a {competitor}" if competitor else ""
        return {
            "type": "report",
            "headline": f"Analisis preliminar de {payload.get('url', 'la landing')}{competitor_note}",
            "score": 79,
            "sections": [
                {"title": "Propuesta de valor", "score": 81, "content": "Se entiende rapido, pero puede ganar especificidad en beneficios."},
                {"title": "Estructura y CTA", "score": 74, "content": "El recorrido es correcto, aunque los CTA podrian repetirse mejor."},
                {"title": "Recomendaciones prioritarias", "score": 82, "content": f"Hay margen claro para mejorar copy, prueba social y diferenciacion. {note}"},
            ],
            "recommendations": [
                "Reescribe el hero con una promesa mas concreta.",
                "Haz el CTA principal mas visible y repetido.",
                "Incluye evidencia de confianza cerca del primer scroll.",
            ],
            "context": payload,
        }

    return {"type": "text", "content": f"Resultado mock listo para {recipe['title']}. {note}", "context": payload}


async def _fetch_json(
    client: httpx.AsyncClient,
    url: str,
    params: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> Any:
    response = await client.get(url, params=params, headers=headers)
    response.raise_for_status()
    return response.json()


async def _fetch_text(
    client: httpx.AsyncClient,
    url: str,
    params: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> str:
    response = await client.get(url, params=params, headers=headers)
    response.raise_for_status()
    return response.text


async def _run_social_post_generator(payload: dict[str, Any]) -> dict[str, Any]:
    product = str(payload["product"])
    tone = str(payload["tone"])
    brand_name = _extract_brand_name(product)
    prompt = f"""
Eres un copywriter senior y director creativo.
Genera EXACTAMENTE 3 posts, uno para Instagram, uno para Twitter/X y uno para LinkedIn.

Producto:
{product}

Tono:
{tone}

Responde SOLO con un JSON array con esta forma:
[
  {{
    "platform": "Instagram",
    "brandName": "{brand_name}",
    "text": "post completo listo para publicar",
    "hashtags": ["#uno", "#dos", "#tres"],
    "imagePrompt": "prompt visual detallado, sin texto incrustado"
  }}
]
"""
    parsed_posts = _load_json(await generate_text(prompt))
    if not isinstance(parsed_posts, list):
        raise RuntimeError("Gemini no devolvio un array de posts.")

    posts: list[dict[str, Any]] = []
    for index, platform in enumerate(SOCIAL_PLATFORMS):
        entry = parsed_posts[index] if index < len(parsed_posts) and isinstance(parsed_posts[index], dict) else {}
        image_prompt = str(entry.get("imagePrompt", "")).strip()
        image_base64: str | None = None
        if image_prompt:
            try:
                image_base64 = await generate_image(
                    f"Create a polished social media visual for {platform}. Product context: {product}. {image_prompt}"
                )
            except Exception:
                image_base64 = None

        posts.append(
            {
                "platform": str(entry.get("platform", platform)).strip() or platform,
                "brandName": str(entry.get("brandName", brand_name)).strip() or brand_name,
                "text": str(entry.get("text", "")).strip(),
                "hashtags": [str(hashtag).strip() for hashtag in entry.get("hashtags", []) if str(hashtag).strip()][:8],
                "imagePrompt": image_prompt,
                "imageBase64": image_base64,
            }
        )

    if any(not post["text"] for post in posts):
        raise RuntimeError("Gemini no devolvio texto valido para los 3 posts.")

    return {"type": "social-posts", "posts": posts}


async def _run_reddit_opinion_radar(payload: dict[str, Any]) -> dict[str, Any]:
    topic = str(payload["topic"])
    subreddits_raw = str(payload.get("subreddits", "")).strip()
    subreddit_tokens = [token.strip().lstrip("r/") for token in subreddits_raw.split(",") if token.strip()]
    subreddit_query = " OR ".join(f"subreddit:{subreddit}" for subreddit in subreddit_tokens)
    search_query = f"{topic} {subreddit_query}".strip()

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        reddit_data = await _fetch_json(
            client,
            "https://www.reddit.com/search.json",
            params={"q": search_query, "sort": "top", "t": "week", "limit": 20},
            headers=REDDIT_HEADERS,
        )

    children = reddit_data.get("data", {}).get("children", [])
    posts = [
        {
            "title": _truncate(str(child.get("data", {}).get("title", "")), 180),
            "subreddit": child.get("data", {}).get("subreddit", ""),
            "score": _safe_number(child.get("data", {}).get("score")),
            "comments": _safe_number(child.get("data", {}).get("num_comments")),
            "url": child.get("data", {}).get("url", ""),
            "selftext": _truncate(str(child.get("data", {}).get("selftext", "")), 360),
        }
        for child in children
    ]
    posts = [post for post in posts if post["title"]]
    if not posts:
        raise RuntimeError("No se encontraron posts de Reddit para analizar.")

    prompt = f"""
Analiza estas opiniones de Reddit sobre el tema indicado y responde SOLO con JSON.

Tema: {topic}
Subreddits filtrados: {", ".join(subreddit_tokens) if subreddit_tokens else "sin filtro"}
Posts:
{json.dumps(posts[:12], ensure_ascii=False)}

Devuelve exactamente esta estructura:
{{
  "headline": "titulo corto",
  "score": 0,
  "sections": [
    {{"title": "Pros recurrentes", "score": 0, "content": "texto"}},
    {{"title": "Contras recurrentes", "score": 0, "content": "texto"}},
    {{"title": "Sentimiento general", "score": 0, "content": "texto"}}
  ],
  "recommendations": ["accion 1", "accion 2", "accion 3"]
}}
"""
    analysis = _load_json(await generate_text(prompt))
    return {
        "type": "report",
        "headline": str(analysis.get("headline", f"Radar de opiniones para {topic}")),
        "score": _safe_number(analysis.get("score"), 75),
        "sections": analysis.get("sections", []),
        "recommendations": analysis.get("recommendations", []),
    }


async def _run_github_health_auditor(payload: dict[str, Any]) -> dict[str, Any]:
    owner, repo = _extract_github_repo(str(payload["repo"]))
    headers = _github_headers(str(payload.get("token", "")).strip() or None)

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        repo_data = await _fetch_json(client, f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
        languages = await _fetch_json(client, f"https://api.github.com/repos/{owner}/{repo}/languages", headers=headers)
        contributors = await _fetch_json(client, f"https://api.github.com/repos/{owner}/{repo}/contributors", params={"per_page": 10}, headers=headers)
        issues = await _fetch_json(client, f"https://api.github.com/repos/{owner}/{repo}/issues", params={"state": "open", "per_page": 30}, headers=headers)
        commits = await _fetch_json(client, f"https://api.github.com/repos/{owner}/{repo}/commits", params={"per_page": 10}, headers=headers)

    open_issues = [issue for issue in issues if "pull_request" not in issue]
    snapshot = {
        "full_name": repo_data.get("full_name"),
        "description": repo_data.get("description"),
        "stars": repo_data.get("stargazers_count"),
        "forks": repo_data.get("forks_count"),
        "subscribers": repo_data.get("subscribers_count"),
        "open_issues": len(open_issues),
        "languages": languages,
        "contributors_count": len(contributors),
        "top_contributors": [contributor.get("login") for contributor in contributors[:5]],
        "recent_commits": [
            {
                "message": _truncate(str(commit.get("commit", {}).get("message", "")), 140),
                "author": commit.get("commit", {}).get("author", {}).get("name", ""),
                "date": commit.get("commit", {}).get("author", {}).get("date", ""),
            }
            for commit in commits[:5]
        ],
        "recent_issues": [
            {
                "title": _truncate(str(issue.get("title", "")), 160),
                "comments": issue.get("comments", 0),
                "labels": [label.get("name", "") for label in issue.get("labels", [])],
            }
            for issue in open_issues[:10]
        ],
    }

    prompt = f"""
Eres un auditor tecnico senior. Analiza la salud general y deuda tecnica del repositorio.
Responde SOLO con JSON usando exactamente esta estructura:
{{
  "summary": "resumen ejecutivo",
  "stats": [
    {{"label": "Score salud", "value": "0/100", "trend": "texto breve"}},
    {{"label": "Issues abiertos", "value": "0", "trend": "texto breve"}},
    {{"label": "Contribuidores", "value": "0", "trend": "texto breve"}}
  ],
  "items": [
    {{"title": "accion prioritaria", "priority": "Alta|Media|Baja", "reason": "por que importa"}}
  ]
}}

Datos:
{json.dumps(snapshot, ensure_ascii=False)}
"""
    analysis = _load_json(await generate_text(prompt))
    return {
        "type": "dashboard",
        "summary": str(analysis.get("summary", f"Salud general de {owner}/{repo}")),
        "stats": analysis.get("stats", []),
        "items": analysis.get("items", []),
    }


async def _run_github_issue_summarizer(payload: dict[str, Any]) -> dict[str, Any]:
    owner, repo = _extract_github_repo(str(payload["repo"]))
    headers = _github_headers(str(payload.get("token", "")).strip() or None)

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        issues = await _fetch_json(
            client,
            f"https://api.github.com/repos/{owner}/{repo}/issues",
            params={"state": "open", "per_page": 30},
            headers=headers,
        )

    filtered_issues = [issue for issue in issues if "pull_request" not in issue][:30]
    if not filtered_issues:
        return {
            "type": "dashboard",
            "summary": f"No hay issues abiertos en {owner}/{repo}.",
            "stats": [
                {"label": "Issues abiertos", "value": "0", "trend": "Sin backlog"},
                {"label": "Urgencia alta", "value": "0", "trend": "Sin bloqueantes"},
                {"label": "Sin etiquetar", "value": "0", "trend": "Triage al dia"},
            ],
            "items": [],
        }

    summary_input = [
        {
            "title": _truncate(str(issue.get("title", "")), 160),
            "comments": issue.get("comments", 0),
            "labels": [label.get("name", "") for label in issue.get("labels", [])],
            "created_at": issue.get("created_at", ""),
            "url": issue.get("html_url", ""),
        }
        for issue in filtered_issues
    ]

    prompt = f"""
Categoriza estos issues por urgencia y responde SOLO con JSON.

Repositorio: {owner}/{repo}
Issues:
{json.dumps(summary_input, ensure_ascii=False)}

Usa exactamente esta estructura:
{{
  "summary": "resumen ejecutivo",
  "stats": [
    {{"label": "Issues abiertos", "value": "0", "trend": "texto breve"}},
    {{"label": "Urgencia alta", "value": "0", "trend": "texto breve"}},
    {{"label": "Sin etiquetar", "value": "0", "trend": "texto breve"}}
  ],
  "items": [
    {{"title": "issue", "priority": "Alta|Media|Baja", "reason": "por que importa"}}
  ]
}}
"""
    analysis = _load_json(await generate_text(prompt))
    return {
        "type": "dashboard",
        "summary": str(analysis.get("summary", f"Resumen de issues de {owner}/{repo}")),
        "stats": analysis.get("stats", []),
        "items": analysis.get("items", []),
    }


async def _run_rss_news_digest(payload: dict[str, Any]) -> dict[str, Any]:
    topics = str(payload["topics"])
    language = str(payload["language"])
    config = _language_config(language)
    query = " OR ".join([topic.strip() for topic in topics.split(",") if topic.strip()]) or topics

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        feed_xml = await _fetch_text(
            client,
            "https://news.google.com/rss/search",
            params={"q": query, "hl": config["hl"], "gl": config["gl"], "ceid": config["ceid"]},
            headers={"User-Agent": DEFAULT_USER_AGENT},
        )

    rss_items = _recent_rss_items(_parse_rss_items(feed_xml), limit=10)
    if not rss_items:
        raise RuntimeError("No se encontraron noticias RSS para resumir.")

    content = await generate_text(
        f"""
Redacta un boletin matutino listo para leer en {language}.
Debe cubrir SOLO noticias de las ultimas 24h cuando existan en la muestra.

Temas: {topics}
Noticias:
{json.dumps(rss_items, ensure_ascii=False)}

Formato:
- Titulo corto
- 4 a 6 bullets con noticias clave
- Por que importa hoy
- Cierre con una recomendacion accionable
"""
    )
    return {"type": "text", "content": content}


async def _run_landing_page_analyzer(payload: dict[str, Any]) -> dict[str, Any]:
    target_url = str(payload["url"])
    if not _is_valid_url(target_url):
        raise HTTPException(status_code=422, detail="La URL de la landing page debe ser valida.")

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        html = await _fetch_text(client, target_url, headers={"User-Agent": DEFAULT_USER_AGENT})

    title_matches = _extract_tag_texts(html, "title", limit=1)
    snapshot = {
        "url": target_url,
        "title": title_matches[0] if title_matches else "",
        "meta_description": _extract_meta_content(html, "description"),
        "og_description": _extract_meta_content(html, "og:description"),
        "headings": _extract_tag_texts(html, "h1", limit=3) + _extract_tag_texts(html, "h2", limit=5),
        "ctas": _extract_tag_texts(html, "button", limit=6) + _extract_tag_texts(html, "a", limit=8),
        "visible_text_excerpt": _truncate(_strip_html_tags(html), 5000),
        "competitor": str(payload.get("competitor", "")).strip(),
    }

    prompt = f"""
Analiza esta landing page como experto en conversion y copywriting.
Evalua propuesta de valor, estructura, CTA, claridad del copy y diferenciales.
Responde SOLO con JSON usando exactamente esta estructura:
{{
  "headline": "titulo corto",
  "score": 0,
  "sections": [
    {{"title": "Propuesta de valor", "score": 0, "content": "texto"}},
    {{"title": "Estructura y CTA", "score": 0, "content": "texto"}},
    {{"title": "Recomendaciones prioritarias", "score": 0, "content": "texto"}}
  ],
  "recommendations": ["accion 1", "accion 2", "accion 3"]
}}

Datos:
{json.dumps(snapshot, ensure_ascii=False)}
"""
    analysis = _load_json(await generate_text(prompt))
    return {
        "type": "report",
        "headline": str(analysis.get("headline", f"Analisis de landing page para {target_url}")),
        "score": _safe_number(analysis.get("score"), 78),
        "sections": analysis.get("sections", []),
        "recommendations": analysis.get("recommendations", []),
    }


async def _run_with_integrations(recipe_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    if recipe_id == "social-post-generator":
        return await _run_social_post_generator(payload)
    if recipe_id == "reddit-opinion-radar":
        return await _run_reddit_opinion_radar(payload)
    if recipe_id == "github-health-auditor":
        return await _run_github_health_auditor(payload)
    if recipe_id == "github-issue-summarizer":
        return await _run_github_issue_summarizer(payload)
    if recipe_id == "rss-news-digest":
        return await _run_rss_news_digest(payload)
    if recipe_id == "landing-page-analyzer":
        return await _run_landing_page_analyzer(payload)

    raise RuntimeError("Recipe integration not implemented.")


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


async def _resolve_direct_result(
    recipe: dict[str, Any],
    payload: dict[str, Any],
    upstream_error: Exception | None = None,
) -> tuple[dict[str, Any], str]:
    if not gemini_is_configured():
        reason = "GEMINI_API_KEY no configurada."
        if upstream_error is not None:
            reason = f"n8n: {upstream_error}; {reason}"
        return _build_mock_result(recipe, payload, reason=reason), "mock"

    try:
        return await _run_with_integrations(recipe["id"], payload), "fallback"
    except Exception as error:
        reason = str(error)
        if upstream_error is not None:
            reason = f"n8n: {upstream_error}; integración directa: {error}"
        return _build_mock_result(recipe, payload, reason=reason), "mock"


async def _resolve_result(recipe: dict[str, Any], payload: dict[str, Any]) -> tuple[dict[str, Any], str | None]:
    webhook_path = str(recipe.get("n8nWebhookPath", "")).strip()
    if webhook_path:
        try:
            live_result = await trigger_workflow(webhook_path, payload)
            return _normalize_n8n_result(recipe["id"], live_result, payload), "live"
        except Exception as error:
            return await _resolve_direct_result(recipe, payload, upstream_error=error)

    return await _resolve_direct_result(
        recipe,
        payload,
        upstream_error=RuntimeError("n8nWebhookPath no configurado para la receta."),
    )


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
