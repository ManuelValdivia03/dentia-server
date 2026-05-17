# Dentia Reports Service

Servicio analítico de Dentia implementado con FastAPI y Neo4j.

## Responsabilidad

- Recibir snapshots de citas desde `appointments-service`.
- Guardar relaciones analíticas en Neo4j.
- Exponer reportes para dashboard clínico.
- Validar JWT y roles.
- Proteger endpoints internos con `x-internal-api-key`.

## Endpoints

### Health

GET /health  
GET /health/db

### Interno

POST /reports/snapshots/appointments

Requiere header:

x-internal-api-key

### Reportes

GET /reports/dashboard/summary  
GET /reports/appointments/by-status

Requiere JWT con rol:

- ADMIN
- DENTIST

## Swagger

http://localhost:3006/docs

## Pruebas

```bash
py -m pytest