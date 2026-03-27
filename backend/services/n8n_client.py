from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx


ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
N8N_TIMEOUT_SECONDS = 60.0


@lru_cache(maxsize=1)
def _read_dotenv_values() -> dict[str, str]:
    if not ENV_FILE.exists():
        return {}

    values: dict[str, str] = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip("\"'")

    return values


def _get_n8n_api_url() -> str:
    env_value = os.getenv("N8N_API_URL", "").strip()
    if env_value:
        return env_value

    return _read_dotenv_values().get("N8N_API_URL", "").strip()


def _normalize_base_url(base_url: str) -> str:
    normalized = base_url.strip().rstrip("/")
    if not normalized:
        raise RuntimeError("N8N_API_URL no está configurada.")

    if "://" not in normalized:
        normalized = f"http://{normalized}"

    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise RuntimeError("N8N_API_URL no es una URL válida.")

    return normalized


def _normalize_webhook_path(webhook_path: str) -> str:
    normalized = webhook_path.strip().strip("/")
    if not normalized:
        raise RuntimeError("n8nWebhookPath no está configurado.")

    if normalized.startswith("webhook/"):
        return normalized

    return f"webhook/{normalized}"


def _build_webhook_url(webhook_path: str) -> str:
    base_url = _normalize_base_url(_get_n8n_api_url())
    normalized_path = _normalize_webhook_path(webhook_path)
    return f"{base_url}/{normalized_path}"


async def trigger_workflow(webhook_path: str, payload: dict[str, Any]) -> dict[str, Any]:
    webhook_url = _build_webhook_url(webhook_path)

    async with httpx.AsyncClient(timeout=N8N_TIMEOUT_SECONDS, follow_redirects=True) as client:
        response = await client.post(webhook_url, json=payload)
        response.raise_for_status()

    try:
        data = response.json()
    except ValueError as error:
        raise RuntimeError("n8n no devolvió JSON válido.") from error

    if not isinstance(data, dict):
        raise RuntimeError("n8n devolvió una respuesta JSON no compatible.")

    return data
