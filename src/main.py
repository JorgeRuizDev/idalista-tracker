"""FastAPI application entry point."""
from contextlib import asynccontextmanager
from datetime import datetime
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.crawler.scheduler import init_scheduler, start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager.

    Handles startup and shutdown events.
    """
    # Startup
    import logging

    logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL))
    logger = logging.getLogger(__name__)
    logger.info("Starting Gmail Property Crawler API...")

    # Initialize and start scheduler
    init_scheduler()
    start_scheduler()

    yield

    # Shutdown
    logger.info("Shutting down Gmail Property Crawler API...")
    stop_scheduler()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    Returns:
        Configured FastAPI application instance.
    """
    app = FastAPI(
        title="Gmail Property Crawler",
        description="API for crawling Gmail and tracking idealista property listings",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Health check endpoint
    @app.get("/health", tags=["health"])
    async def health_check() -> dict:
        """Health check endpoint."""
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "0.1.0",
        }

    # Add API routers
    from src.api.routes import crawl, properties, searches, stats

    app.include_router(crawl.router, prefix="/api/v1")
    app.include_router(properties.router, prefix="/api/v1")
    app.include_router(searches.router, prefix="/api/v1")
    app.include_router(stats.router, prefix="/api/v1")

    return app


# Create the application instance
app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True,
        log_level=settings.LOG_LEVEL.lower(),
    )
