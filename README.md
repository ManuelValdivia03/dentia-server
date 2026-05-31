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

### Decisiones técnicas

* REST es la interfaz principal del sistema.
* RPC se mantiene solo donde ya aporta valor o existe integración interna, como `prescriptions-service`.
* Chat MVP usa REST/polling; WebSocket queda fuera del alcance mínimo.
* Valoraciones viven dentro de `appointments-service`; no se abre microservicio adicional.
* Cada microservicio conserva su propia persistencia.
* Los archivos se guardan en volumen Docker y MongoDB conserva metadata/auditoría.
* Reportes usa Neo4j para snapshots e indicadores analíticos.

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

---

## Arquitectura actual

### Comunicación
- **Cliente → api-gateway:** REST
- **api-gateway → auth-service:** HTTP
- **api-gateway → appointments-service:** TCP (Nest microservice)

### Persistencia
- **auth-service** usa PostgreSQL con la base `dentia_auth`
- **appointments-service** usa PostgreSQL con la base `dentia_appointments`

### Seguridad
- JWT
- Roles:
  - `ADMIN`
  - `DENTIST`
  - `PATIENT`

---

## Requisitos

- Docker Desktop
- Docker Compose

---

## Variables de entorno

Crear un archivo `.env` en la raíz del proyecto tomando como base `.env.example`.

### `.env.example`

```env
POSTGRES_USER=dentia
POSTGRES_PASSWORD=dentia123
POSTGRES_APPOINTMENTS_DB=dentia_appointments
POSTGRES_AUTH_DB=dentia_auth
POSTGRES_PORT=5432

JWT_SECRET=dentia-dev-secret

API_GATEWAY_PORT=3000
AUTH_SERVICE_PORT=3001
APPOINTMENTS_HTTP_PORT=3002
APPOINTMENTS_SERVICE_URL=http://appointments-service:3002

Cómo levantar el proyecto

Desde la raíz:

docker compose up --build

Para bajar contenedores:

docker compose down --remove-orphans

Para reiniciar desde cero borrando volúmenes:

docker compose down -v --remove-orphans
docker compose up --build
Puertos
3000 → api-gateway
3001 → auth-service
3002 → appointments-service
4001 → puerto TCP interno de appointments-service
5432 → postgres
Credenciales seed
Admin
email: admin@dentia.local
password: Admin123*
Paciente
email: patient1@dentia.local
password: Patient123*
Dentista
email: dentist1@dentia.local
password: Dentist123*
Endpoints mínimos
Auth
Login
POST /auth/login

Body:

{
  "email": "patient1@dentia.local",
  "password": "Patient123*"
}
Appointments
Listar citas
GET /appointments
Obtener cita por id
GET /appointments/:id
Consultar disponibilidad
GET /appointments/availability?dentistId=d1&date=2026-04-21
Crear cita
POST /appointments
Reprogramar cita
PATCH /appointments/:id/reschedule
Cancelar cita
PATCH /appointments/:id/cancel
Confirmar cita
PATCH /appointments/:id/confirm
Completar cita
PATCH /appointments/:id/complete
Health checks
Auth service
GET http://localhost:3001/health
Appointments service
GET http://localhost:3002/health
Tests
api-gateway
cd api-gateway
npm test
auth-service
cd auth-service
npm test
appointments-service
cd appointments-service
npm test
Estado actual del proyecto

Actualmente el proyecto ya cuenta con:

autenticación real
JWT y roles
control de acceso básico
gestión real de citas
validación anti-empalme
pruebas unitarias
despliegue reproducible con Docker
Pendientes técnicos
mover secretos reales fuera de configuración de desarrollo
reemplazar synchronize: true por migraciones
mejorar manejo de warnings del driver pg
mover parte del filtrado por rol del gateway hacia el servicio correspondiente
agregar pruebas e2e
continuar con siguientes servicios del MVP