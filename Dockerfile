# ---- JS builder (builds dist/scripts/cli/plan.js) ----
FROM node:20-bookworm-slim AS jsbuild
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm ci
COPY . .
# If your planner builds via "npm run build", keep this; otherwise comment it.
RUN npm run build || echo "no build step, continuing"

# ---- Runtime (Python + Node) ----
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    REPO_ROOT=/app \
    NODE_BIN=node \
    PAYROX_MANIFEST_URL=http://127.0.0.1:3001 \
    PORT=8000 \
    APP_MODULE=main:app

# System deps + NodeJS (runtime for child node procs)
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
 && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y --no-install-recommends nodejs git \
 && apt-get purge -y gnupg \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps
COPY requirements*.txt pyproject.toml poetry.lock* ./
RUN pip install --upgrade pip setuptools wheel \
 && (test -f requirements.txt && pip install -r requirements.txt || true) \
 && (test -f requirements-prod.txt && pip install -r requirements-prod.txt || true) \
 || true

# App code
COPY . .

# Bring the built JS planner (if present) into final image
COPY --from=jsbuild /app/dist ./dist

# Non-root for safety
RUN useradd -m -u 10001 appuser
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=20s --timeout=3s --retries=5 CMD curl -fsS http://127.0.0.1:8000/health || exit 1

CMD uvicorn ${APP_MODULE} --host 0.0.0.0 --port ${PORT} --workers 2
