from fastapi import APIRouter
from app.db.neo4j import neo4j_client

router = APIRouter(tags=["Health"])

@router.get(
    "/health",
    summary="Verificar estado del servicio",
    description="Endpoint público para comprobar que reports-service está levantado.",
)
def health():
    return {
        "service": "reports-service",
        "status": "ok",
    }

@router.get(
    "/health/db",
    summary="Verificar conexión con Neo4j",
    description="Valida que reports-service pueda conectarse a su base de datos Neo4j.",
)
def health_db():
    neo4j_client.verify()

    return {
        "service": "reports-service",
        "database": "neo4j",
        "status": "ok",
    }