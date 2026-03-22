from __future__ import annotations

import asyncio
import base64
import os

import google.generativeai as genai


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def gemini_is_configured() -> bool:
    return bool(GEMINI_API_KEY)


def _extract_text(response: object) -> str:
    text = getattr(response, "text", None)
    if isinstance(text, str) and text.strip():
        return text.strip()

    candidates = getattr(response, "candidates", []) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", []) or []
        fragments: list[str] = []
        for part in parts:
            part_text = getattr(part, "text", None)
            if isinstance(part_text, str) and part_text.strip():
                fragments.append(part_text.strip())
        if fragments:
            return "\n".join(fragments)

    raise RuntimeError("Gemini did not return text content.")


async def generate_text(prompt: str) -> str:
    if not gemini_is_configured():
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    model = genai.GenerativeModel("gemini-2.5-flash")
    response = await asyncio.to_thread(model.generate_content, prompt)
    return _extract_text(response)


async def generate_image(prompt: str) -> str:
    if not gemini_is_configured():
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    model = genai.GenerativeModel("gemini-2.5-flash-image")
    response = await asyncio.to_thread(model.generate_content, prompt)

    candidates = getattr(response, "candidates", []) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", []) or []
        for part in parts:
            inline_data = getattr(part, "inline_data", None)
            data = getattr(inline_data, "data", None)
            if data:
                return base64.b64encode(data).decode("utf-8")

    raise RuntimeError("Gemini did not return image content.")
