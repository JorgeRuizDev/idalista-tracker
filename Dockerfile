# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend with Playwright & Runtime
FROM python:3.11-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    UV_SYSTEM_PYTHON=1 \
    PYTHONPATH=/app

# Install system utilities and SSL certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install UV package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy dependency definition files
COPY pyproject.toml uv.lock ./

# Install python dependencies (skip local wheel packaging)
RUN uv sync --frozen --no-dev --no-install-project

# Install Chromium and system dependencies for Playwright crawler
RUN uv run --no-project playwright install --with-deps chromium

# Copy backend source code
COPY src/ ./src/

# Copy compiled frontend from Stage 1 into frontend/dist
COPY --from=frontend-builder /build/dist ./frontend/dist

# Expose internal API / web port
EXPOSE 8000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Launch application with Uvicorn
CMD ["uv", "run", "--no-project", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
