# CLAUDE.md — Instrucciones maestras para Nodeaway

## Proyecto

Nodeaway es una plataforma de automatizaciones sin workflow. El usuario elige una automatización, llena un formulario simple, y recibe el resultado. n8n corre en el backend de forma invisible.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + TailwindCSS + Framer Motion
- **Backend:** FastAPI (Python 3.11+) + SQLite
- **Motor:** n8n self-hosted en CubePath (comunicación via webhooks)
- **AI:** Gemini 2.5 Flash (texto) + Gemini 2.5 Flash Image (imágenes)

## Estructura del proyecto

```
nodeaway/
├── backend/           # FastAPI
│   ├── main.py
│   ├── routers/       # recipes.py, executions.py
│   ├── services/      # gemini_client.py, recipe_loader.py
│   ├── models/        # database.py (SQLite)
│   ├── recipes/       # 6 archivos JSON (una por automatización)
│   └── n8n-workflows/ # Workflows exportados de n8n
├── frontend/          # Next.js
│   ├── src/app/       # Páginas: catalog, run/[id], results/[executionId], history
│   ├── src/components/# CatalogGrid, AutomationCard, DynamicForm, ResultsView, PostPreview, etc.
│   └── src/lib/       # api.ts, types.ts
├── .env               # Keys: GEMINI_API_KEY, N8N_API_URL, N8N_API_KEY
└── docker-compose.yml
```

## Las 6 automatizaciones

1. **social-post-generator** (biz) — Genera 3 posts (IG, Twitter, LinkedIn) con texto + imagen AI
2. **reddit-opinion-radar** (biz) — Raspa Reddit y analiza pros/contras/sentimiento
3. **github-health-auditor** (dev) — Métricas de deuda técnica de un repo
4. **github-issue-summarizer** (dev) — Categoriza issues por urgencia
5. **rss-news-digest** (life) — Boletín de noticias resumido por AI
6. **landing-page-analyzer** (biz) — Analiza copy, CTA, estructura de una landing page

## Colores por categoría

- Dev: purple (#7F77DD)
- Personal/Life: teal (#1D9E75)
- Business/Negocios: coral (#D85A30)

## Reglas de desarrollo

- Todo el texto visible en la app debe estar en **español con tildes correctas**
- NO usar Inter, Roboto ni Arial como fuentes
- UX es el criterio #1 de evaluación — cada interacción debe sentirse premium
- Mobile-first: todo debe funcionar en 375px
- Dark mode obligatorio con toggle
- Las API keys se leen del archivo .env, NUNCA hardcodeadas
- Si GEMINI_API_KEY no está configurada, usar fallback mock
- Los formularios se generan dinámicamente desde los JSON de recetas
- n8n es INVISIBLE para el usuario final

## Infraestructura

- CubePath GP.NANO: Next.js + FastAPI + SQLite (Docker Compose)
- CubePath GP.MICRO: n8n (marketplace 1-click)
- n8n URL: http://vps22998.cubepath.net:5678

## Contexto hackathon

- Hackathon de CubePath x midudev 2026
- 9 días de desarrollo, 2 personas
- Criterios de evaluación (por orden): UX > Creatividad > Utilidad > Implementación técnica
- El README debe incluir: descripción, demo URL, capturas/GIFs, explicación de uso de CubePath
