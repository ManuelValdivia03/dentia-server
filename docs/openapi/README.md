# Dentia - OpenAPI Specification

Este directorio contiene la especificación OpenAPI inicial del API Gateway de Dentia.

## Archivo principal

- `api-gateway.openapi.yaml`

## Alcance actual

La especificación documenta únicamente los endpoints existentes actualmente:

- Auth
- Profile
- Dentists
- Appointments
- Prescriptions

## Validación

Abrir el archivo en Swagger Editor:

https://editor.swagger.io/

## Nota importante

El endpoint de perfil actual es:

`GET /profile`

No existen actualmente:

`GET /auth/me`
`GET /auth/profile`