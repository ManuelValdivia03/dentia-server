# Dentia Server

Backend distribuido de Dentia basado en NestJS, API Gateway, microservicios, PostgreSQL, MongoDB, RabbitMQ y Docker Compose.

## Documentación

- OpenAPI JSON: `docs/openapi/api-gateway-openapi.json`
- OpenAPI YAML: `docs/openapi/api-gateway.openapi.yaml`
- Contratos RPC: `docs/rpc/rpc-contracts.md`

## Pruebas automatizadas con Newman

Las colecciones de Postman se encuentran en:

- `postman/collections/`
- `postman/environments/`
- `postman/reports/`

Ejecutar pruebas de chat:

```bash
npm run test:newman:chat