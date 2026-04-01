# Production Deployment Guide

## 1) Prepare environment

1. Copy the production env template:

```bash
cp .env.production.example .env.production
```

2. Edit `.env.production` and set real values for:
- DB password
- JWT secret
- Admin password
- OAuth credentials
- SMTP credentials
- VAPID keys
- domain/hosts/CORS

## 2) Start production stack

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Services:
- `web` (Nginx + static frontend) on port `80`
- `api` (FastAPI + Alembic migration on startup)
- `celery-worker`
- `db` (PostgreSQL + PostGIS)
- `redis`

## 3) Verify health

```bash
curl http://localhost/health
```

Expected response:

```json
{"status":"healthy"}
```

## 4) Seed first admin (one-time)

If needed, run your existing seed admin command in the API container (using values from `.env.production`).

## 5) HTTPS (recommended)

For production internet traffic, place this stack behind TLS termination (for example:
- cloud load balancer + managed certs, or
- reverse proxy like Caddy/Traefik/Nginx with Let's Encrypt).

## Notes

- API docs are disabled in production via `APP_ENABLE_DOCS=false`.
- Allowed hostnames are restricted with `APP_ALLOWED_HOSTS`.
- Frontend uses `/api` and Nginx proxies to the internal API service.
