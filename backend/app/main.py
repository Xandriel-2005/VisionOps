from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import gpu_profiles, config, runs, models, dataset


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="VisionOps API",
        description="Self-service MLOps platform for computer vision model training",
        version="0.1.0",
    )

    # CORS — allow the local Vite dev server
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(gpu_profiles.router)
    app.include_router(config.router)
    app.include_router(runs.router)
    app.include_router(models.router)
    app.include_router(dataset.router)

    @app.get("/api/health", tags=["Health"])
    async def health_check():
        return {"status": "ok", "service": "visionops-api"}

    return app


app = create_app()
