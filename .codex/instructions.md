# Nodeaway — Instrucciones para Codex

## Proyecto

Plataforma de automatizaciones sin workflow. El usuario elige una automatización de un catálogo visual, llena un formulario, y recibe el resultado. n8n es invisible.

## Stack

- Frontend: Next.js 14 + TypeScript + TailwindCSS + Framer Motion
- Backend: FastAPI + SQLite + httpx + google-generativeai
- AI: Gemini 2.5 Flash (texto + imágenes)
- Deploy: Docker Compose en CubePath

## Reglas

- Español con tildes correctas en toda la UI
- UX premium: animaciones, loading states, feedback visual, responsive mobile
- Dark mode obligatorio
- API keys desde .env
- Formularios dinámicos desde backend/recipes/\*.json
- NO usar fuentes genéricas (Inter, Roboto, Arial)
- Colores: Dev=#7F77DD, Life=#1D9E75, Biz=#D85A30

## Automatizaciones

1. social-post-generator → Posts para redes + imagen AI
2. reddit-opinion-radar → Opiniones de Reddit analizadas
3. github-health-auditor → Deuda técnica de repos
4. github-issue-summarizer → Issues categorizados por urgencia
5. rss-news-digest → Boletín de noticias
6. landing-page-analyzer → Análisis de landing pages

## Contexto

Hackathon CubePath x midudev 2026. Criterio #1: UX. El proyecto debe verse profesional.
