# Dentia Server

Backend de Dentia, plataforma para gestión odontológica con autenticación, agenda de citas, recetas, archivos clínicos, chat, valoraciones y reportes.

El proyecto usa arquitectura de microservicios con API Gateway, persistencia por servicio y ejecución reproducible con Docker Compose.

---

## Servicios

| Servicio              |        Tecnología |          Puerto | Persistencia             | Responsabilidad                                                 |
| --------------------- | ----------------: | --------------: | ------------------------ | --------------------------------------------------------------- |
| api-gateway           |            NestJS |            3000 | Ninguna                  | Entrada única REST, JWT, roles, Swagger y proxy a servicios     |
| auth-service          |            NestJS |            3001 | PostgreSQL               | Registro, login, verificación de correo, JWT, roles y dentistas |
| appointments-service  | C# / ASP.NET Core |            3002 | PostgreSQL               | Citas, disponibilidad, anti-empalme, estados y valoraciones     |
| prescriptions-service |            NestJS | 3003 / TCP 4002 | PostgreSQL               | Recetas, consulta por cita y generación de PDF                  |
| chat-service          | C# / ASP.NET Core |            3004 | MongoDB                  | Chat paciente-dentista con historial                            |
| files-service         | C# / ASP.NET Core |            3005 | MongoDB + volumen Docker | Archivos clínicos, metadata, descargas y control de acceso      |
| reports-service       |           FastAPI |            3006 | Neo4j                    | Dashboard, gráficas, snapshots y exportación CSV                |
| rabbitmq              |          RabbitMQ |    5672 / 15672 | Volumen Docker           | Eventos internos                                                |
| postgres              |     PostgreSQL 16 |            5432 | Volumen Docker           | Bases transaccionales                                           |
| chat-mongo            |         MongoDB 7 |           27019 | Volumen Docker           | Persistencia de chat                                            |
| files-mongo           |         MongoDB 7 |           27018 | Volumen Docker           | Metadata de archivos                                            |
| neo4j                 |           Neo4j 5 |     7474 / 7687 | Volumen Docker           | Reportes analíticos                                             |

---

## Arquitectura

### Comunicación entre componentes

| Origen               | Destino               | Mecanismo        |
| -------------------- | --------------------- | ---------------- |
| Cliente              | api-gateway           | REST             |
| api-gateway          | auth-service          | HTTP             |
| api-gateway          | appointments-service  | HTTP             |
| api-gateway          | prescriptions-service | RPC Nest TCP     |
| api-gateway          | chat-service          | HTTP             |
| api-gateway          | files-service         | HTTP             |
| api-gateway          | reports-service       | HTTP             |
| appointments-service | reports-service       | HTTP interno     |
| appointments-service | RabbitMQ              | Eventos internos |

---

## Seguridad

Seguridad mínima implementada:

* JWT.
* Roles: `ADMIN`, `DENTIST`, `PATIENT`.
* Hash de contraseñas con `bcrypt`.
* Control de acceso por recurso.
* El paciente solo ve/modifica información propia.
* El dentista solo ve información relacionada a su `domainId`.
* Los servicios sensibles validan permisos también del lado del servicio, no solo en gateway.
* Comunicación externa recomendada detrás de Caddy/HTTPS en despliegue.

---

## Requisitos

* Docker Desktop.
* Docker Compose.
* Node.js 20+ para pruebas locales NestJS.
* .NET 8 SDK para pruebas locales C#.
* Python 3.11+ para pruebas locales FastAPI.

---

## Variables de entorno

Crear `.env` desde `.env.example`:

```bash
cp .env.example .env
```

En PowerShell:

```powershell
Copy-Item .env.example .env
```

El `JWT_SECRET` debe tener mínimo 32 caracteres.

Variables críticas esperadas por Docker Compose:

```env
NODE_ENV=development
JWT_SECRET=dentia_dev_jwt_secret_change_me_32_chars_minimum
INTERNAL_API_KEY=dev-internal-key-change-me

API_GATEWAY_PORT=3000
AUTH_SERVICE_PORT=3001

APPOINTMENTS_HTTP_PORT=3002
APPOINTMENTS_SERVICE_URL=http://appointments-service:3002

PRESCRIPTIONS_SERVICE_PORT=3003
PRESCRIPTIONS_TCP_HOST=0.0.0.0
PRESCRIPTIONS_TCP_PORT=4002

CHAT_SERVICE_PORT=3004
CHAT_SERVICE_URL=http://chat-service:3004
CHAT_MONGODB_URI=mongodb://chat-mongo:27017/dentia_chat

FILES_SERVICE_PORT=3005
FILES_SERVICE_URL=http://files-service:8080
FILES_MONGODB_URI=mongodb://files-mongo:27017/dentia_files

REPORTS_SERVICE_PORT=3006
REPORTS_SERVICE_URL=http://reports-service:3006

POSTGRES_USER=dentia
POSTGRES_PASSWORD=change_me
POSTGRES_PORT=5432
POSTGRES_AUTH_DB=dentia_auth
POSTGRES_APPOINTMENTS_DB=dentia_appointments
POSTGRES_PRESCRIPTIONS_DB=dentia_prescriptions

RABBITMQ_URL=amqp://dentia:dentia123@rabbitmq:5672
RABBITMQ_QUEUE_APPOINTMENTS=appointments_events
RABBITMQ_DEFAULT_USER=dentia
RABBITMQ_DEFAULT_PASS=dentia123

NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=dentia_reports_password
NEO4J_AUTH=neo4j/dentia_reports_password

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM="Dentia <no-reply@dentia.local>"

EMAIL_VERIFICATION_TTL_MINUTES=10
EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS=60
EMAIL_VERIFICATION_MAX_ATTEMPTS=5
```

---

## Levantar el proyecto

Desde la raíz:

```bash
docker compose up --build -d
```

Ver contenedores:

```bash
docker ps
```

Bajar contenedores:

```bash
docker compose down --remove-orphans
```

Reiniciar desde cero borrando volúmenes:

```bash
docker compose down -v --remove-orphans
docker compose up --build -d
```

Validar configuración de Compose:

```bash
docker compose config
```

---

## Swagger / documentación interactiva

| Servicio             | URL                           |
| -------------------- | ----------------------------- |
| api-gateway          | http://localhost:3000/docs    |
| auth-service         | http://localhost:3001/docs    |
| appointments-service | http://localhost:3002/swagger |
| prescriptions-service| http://localhost:3003/docs    |
| chat-service         | http://localhost:3004/swagger |
| files-service        | http://localhost:3005/swagger |
| reports-service      | http://localhost:3006/docs    |

Guia de operacion, health checks, metricas, logs y pruebas:
[docs/operations.md](docs/operations.md).

---

## Usuarios seed

| Rol     | Email                                                 | Password    | domainId |
| ------- | ----------------------------------------------------- | ----------- | -------- |
| ADMIN   | [admin@dentia.local](mailto:admin@dentia.local)       | Admin123*   | admin1   |
| PATIENT | [patient1@dentia.local](mailto:patient1@dentia.local) | Patient123* | p1       |
| DENTIST | [dentist1@dentia.local](mailto:dentist1@dentia.local) | Dentist123* | d1       |

---

## Endpoints finales

| Módulo        | Endpoints                                                                                                                                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth          | `/auth/register`, `/auth/login`, `/auth/verify-email`, `/auth/resend-verification-code`, `/profile`                                                                                                                   |
| Dentists      | `/dentists`, `/dentists/:domainId`, `/dentists/:dentistId/ratings/summary`                                                                                                                                            |
| Appointments  | `/appointments`, `/appointments/:id`, `/appointments/availability`, `/appointments/:id/reschedule`, `/appointments/:id/cancel`, `/appointments/:id/confirm`, `/appointments/:id/complete`, `/appointments/:id/rating` |
| Prescriptions | `/prescriptions`, `/prescriptions/:id`, `/appointments/:appointmentId/prescriptions`, `/prescriptions/:id/pdf`                                                                                                        |
| Files         | `/files`, `/files/:id`, `/files/:id/download`                                                                                                                                                                         |
| Chat          | `/chat/conversations`, `/chat/conversations/:id`, `/chat/conversations/:id/messages`                                                                                                                                  |
| Reports       | `/reports/dashboard/summary`, `/reports/appointments/by-status`, `/reports/export/appointments-by-status`                                                                                                             |

---

## Pruebas

### Integracion completa

```powershell
npm.cmd run test:integration
```

Este comando elimina cualquier entorno anterior, reconstruye todos los
servicios, espera a que las dependencias esten saludables, carga datos
deterministas, ejecuta Jest y limpia los contenedores al finalizar.

Para conservar el entorno despues de la ejecucion:

```powershell
$env:KEEP_INTEGRATION_ENV = "1"
npm.cmd run test:integration
```

La misma suite se ejecuta automaticamente en GitHub Actions para cambios en
`main`, pull requests y ejecuciones manuales.

### Rendimiento automatizado

```powershell
npm.cmd run test:performance
```

Hay tres perfiles automatizados:

```powershell
npm.cmd run test:performance:smoke
npm.cmd run test:performance
npm.cmd run test:performance:stress
```

`smoke` hace una comprobacion corta en cada cambio; `load` ejecuta carga
sostenida; y `stress` aumenta la concurrencia por etapas. Los perfiles cubren
health, perfiles, dentistas, citas, disponibilidad, archivos, chat,
prescripciones y reportes. Tambien miden login y escrituras reales de citas,
mensajes, archivos y lecturas de chat.

La prueba falla automaticamente cuando supera los limites de errores o
latencia, o no alcanza el throughput minimo.

El informe se guarda en:

```txt
performance-results/performance-smoke.json
performance-results/performance-load.json
performance-results/performance-stress.json
```

Valores configurables:

```powershell
$env:PERF_DURATION_SECONDS = "60"
$env:PERF_CONCURRENCY = "25"
$env:PERF_MAX_P95_MS = "1000"
$env:PERF_MAX_SCENARIO_P95_MS = "1500"
$env:PERF_MAX_LOGIN_P95_MS = "1500"
$env:PERF_MAX_WRITE_P95_MS = "1800"
$env:PERF_MAX_ERROR_RATE = "0.01"
$env:PERF_MIN_RPS = "10"
$env:PERF_WRITE_REQUESTS = "40"
$env:PERF_WRITE_CONCURRENCY = "6"
$env:PERF_STRESS_STAGES = "5,10,20,40,60"
npm.cmd run test:performance
```

GitHub Actions ejecuta `smoke` despues de las pruebas de integracion. Ademas,
ejecuta `stress` cada lunes y permite lanzar manualmente cualquier perfil,
indicando duracion y concurrencia.

### api-gateway

```bash
cd api-gateway
npm test
```

### auth-service

```bash
cd auth-service
npm test
```

### prescriptions-service

```bash
cd prescriptions-service
npm test
npm run test:cov
```

### appointments-service C#

```bash
cd appointments-service-csharp
dotnet test
dotnet test --collect:"XPlat Code Coverage"
```

### reports-service

Desde raíz:

```bash
py -m pytest reports-service/tests
```

O desde el servicio:

```bash
cd reports-service
py -m pytest
```

### files-service C#

```bash
cd files-service-csharp/FilesService
dotnet build
```

### chat-service C#

```bash
cd chat-service-csharp/ChatService
dotnet build
```

---

## Pruebas funcionales rápidas

### Health checks

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
curl http://localhost:3005/health
curl http://localhost:3006/health
```

### Descargar receta PDF

```bash
curl -L -X GET http://localhost:3000/prescriptions/<PRESCRIPTION_ID>/pdf \
  -H "Authorization: Bearer <TOKEN>" \
  --output prescription.pdf
```

### Exportar reporte CSV

```bash
curl -L -X GET "http://localhost:3000/reports/export/appointments-by-status?doctor_id=d1" \
  -H "Authorization: Bearer <TOKEN>" \
  --output appointments-by-status.csv
```

---

## Funcionalidades cerradas

* Login, registro y verificación de correo.
* JWT + roles.
* Citas con regla anti-empalme.
* Confirmar, completar, cancelar y reprogramar citas.
* Valoraciones de citas completadas.
* Recetas clínicas.
* PDF de receta.
* Archivos clínicos con metadata y control de acceso.
* Chat MVP vía REST.
* Dashboard de reportes.
* Gráfica de citas por estado.
* Exportación CSV de reportes.
* Docker Compose completo.

---

## Pendientes conocidos

* Mejorar pruebas e2e por gateway.
* Evaluar WebSocket para chat si sobra tiempo.
* Reforzar gestión de secretos para producción.
* Sustituir `EnsureCreated`/`synchronize` por migraciones formales donde aplique.
* Mejorar diseño visual de PDFs.
* Corregir valores hardcodeados restantes en `docker-compose.yml`, como credenciales de RabbitMQ/Neo4j en entorno de desarrollo.
