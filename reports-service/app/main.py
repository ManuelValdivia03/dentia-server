from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import health, reports
from app.db.neo4j import neo4j_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    neo4j_client.close()


openapi_tags = [
    {
        "name": "Health",
        "description": "Verificación de estado del servicio y conexión con Neo4j.",
    },
    {
        "name": "Reports",
        "description": "Indicadores, gráficas y snapshots analíticos de Dentia.",
    },
]

app = FastAPI(
    title="Dentia Reports Service API",
    description=(
        "Servicio analítico de Dentia para reportes, gráficas e indicadores. "
        "Expone endpoints REST documentados con Swagger/OpenAPI."
    ),
    version=settings.app_version,
    openapi_tags=openapi_tags,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(reports.router)