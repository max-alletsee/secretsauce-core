FROM node:22-bookworm-slim AS shell-build

WORKDIR /src
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
COPY . .
RUN pnpm --prefix shell install --frozen-lockfile \
    && pnpm --prefix shell build

FROM python:3.12-slim AS runtime

COPY --from=ghcr.io/astral-sh/uv:0.7.12 /uv /uvx /bin/
WORKDIR /app

COPY pyproject.toml uv.lock README.md ./
COPY secretsauce ./secretsauce
RUN uv sync --frozen --no-dev --no-editable
COPY --from=shell-build /src/secretsauce/static ./secretsauce/static

RUN groupadd --gid 10001 secretsauce \
    && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin secretsauce \
    && mkdir -p /data \
    && chown 10001:10001 /data

ENV PATH="/app/.venv/bin:${PATH}" \
    PYTHONUNBUFFERED=1 \
    DATA_DIR=/data \
    COOKIE_SECURE=true \
    FORWARDED_ALLOW_IPS=10.88.0.1

USER 10001:10001
EXPOSE 8080
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/api/health', timeout=3)"]

ENTRYPOINT ["secretsauce", "serve", "--host", "0.0.0.0", "--port", "8080", "--data-dir", "/data"]
