# Dentia - Guia Operativa

## Levantar el entorno local

```powershell
cd C:\Users\manit\Documents\Dentia\dentia-server
docker compose up --build
```

Servicios principales:

| Servicio | Puerto local | Health | Swagger |
| --- | ---: | --- | --- |
| API Gateway | 3000 | `GET /health` | `GET /docs` |
| Auth Service | 3001 | `GET /health` | `GET /docs` |
| Appointments Service | 3002 | `GET /health` | `GET /swagger` |
| Prescriptions Service | 3003 | `GET /health` | `GET /docs` |
| Chat Service | 3004 | `GET /health` | `GET /swagger` |
| Files Service | 3005 | `GET /health` | `GET /swagger` |
| Reports Service | 3006 | `GET /health` | `GET /docs` |

## Variables obligatorias

Configurar al menos:

```env
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_AUTH_DB=
POSTGRES_APPOINTMENTS_DB=
POSTGRES_PRESCRIPTIONS_DB=
JWT_SECRET=
INTERNAL_API_KEY=
RABBITMQ_URL=
RABBITMQ_QUEUE_APPOINTMENTS=
```

Para correo real:

```env
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
```

Si SMTP no esta configurado, `auth-service` queda en modo desarrollo y escribe los codigos en logs.

## Health checks

API Gateway:

```powershell
curl http://localhost:3000/health
```

El gateway revisa configuracion y dependencias HTTP: auth, appointments, prescriptions, chat, files y reports.
Si alguna dependencia o variable critica falta, responde `503` con `status: "degraded"`.

Auth Service:

```powershell
curl http://localhost:3001/health
```

Auth revisa base de datos, JWT y estado de configuracion de email.
Si la base de datos no responde, devuelve `503` con `status: "degraded"`.

## Produccion

En `NODE_ENV=production`:

- `auth-service` no crea usuarios demo aunque la base este vacia.
- `auth-service` y `prescriptions-service` no ejecutan `synchronize` de TypeORM.

Los cambios de esquema deben aplicarse de forma controlada antes del despliegue.

## Metricas

Los servicios NestJS principales exponen metricas basicas en formato Prometheus text:

```powershell
curl http://localhost:3000/metrics
curl http://localhost:3001/metrics
```

Metricas incluidas:

- `dentia_service_uptime_seconds`
- `dentia_http_requests_total`
- `dentia_http_request_errors_total`
- `dentia_http_request_duration_ms_avg`

## Logs estructurados

Los servicios NestJS registran eventos en JSON para facilitar busqueda:

- `http_request`: metodo, ruta, estado y latencia.
- `service_call_failed`: fallos entre gateway y servicios internos.
- `email_send_failed`: fallos SMTP en auth-service.
- Eventos de auth ya existentes: login, refresh, logout, verificacion y recuperacion.

Ejemplo:

```json
{"event":"http_request","service":"api-gateway","method":"POST","route":"/auth/login","statusCode":200,"durationMs":34}
```

## Pruebas

Auth Service:

```powershell
cd auth-service
npm.cmd run build
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
```

API Gateway:

```powershell
cd api-gateway
npm.cmd run build
npm.cmd test -- auth --runInBand
```

## Flujo operativo recomendado

1. Levantar infraestructura con `docker compose up --build`.
2. Revisar `http://localhost:3000/health`.
3. Revisar `http://localhost:3001/health` si hay problemas de login/correo.
4. Revisar `/metrics` para latencia y errores.
5. Revisar logs por `event` cuando haya fallos.
6. Correr pruebas unitarias y E2E antes de subir cambios.
