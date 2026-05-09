# Dentia - Postman Evidence

Este directorio almacenará la colección de Postman y el environment local usados para probar los endpoints documentados en OpenAPI.

## Flujo de trabajo

1. Levantar servicios con Docker Compose.
2. Ejecutar requests desde Postman.
3. Guardar respuestas usando `Save Response > Save as Example`.
4. Exportar la colección como JSON.
5. Guardar el archivo exportado en este directorio.

## Archivos esperados

- `dentia-api-gateway-current.postman_collection.json`
- `dentia-local.postman_environment.json`