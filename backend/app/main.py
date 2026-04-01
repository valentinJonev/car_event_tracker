from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown
    from app.database import engine

    await engine.dispose()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Car Event Tracker API",
        description="API for tracking car events - racing, shows, track days, and more.",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.APP_ENABLE_DOCS else None,
        redoc_url="/redoc" if settings.APP_ENABLE_DOCS else None,
    )

    # Trusted hosts
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.allowed_hosts_list,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    from app.api.v1.auth import router as auth_router
    from app.api.v1.events import router as events_router
    from app.api.v1.subscriptions import router as subscriptions_router
    from app.api.v1.notifications import router as notifications_router
    from app.api.v1.organiser_requests import router as organiser_requests_router
    from app.api.v1.admin import router as admin_router
    from app.api.v1.users import router as users_router
    from app.api.v1.calendar import router as calendar_router

    app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
    app.include_router(events_router, prefix="/api/v1/events", tags=["Events"])
    app.include_router(users_router, prefix="/api/v1/users", tags=["Users"])
    app.include_router(
        subscriptions_router, prefix="/api/v1/subscriptions", tags=["Subscriptions"]
    )
    app.include_router(
        notifications_router, prefix="/api/v1/notifications", tags=["Notifications"]
    )
    app.include_router(
        organiser_requests_router,
        prefix="/api/v1/organiser-requests",
        tags=["Organiser Requests"],
    )
    app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])
    app.include_router(
        calendar_router, prefix="/api/v1/calendar", tags=["Personal Calendar"]
    )

    @app.get("/health", tags=["Health"])
    async def health_check():
        return {"status": "healthy"}

    return app


app = create_app()
