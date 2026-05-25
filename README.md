# Dentia Server

Backend inicial de **Dentia**, con arquitectura basada en servicios para autenticación y gestión de citas odontológicas.

## Servicios actuales

- **api-gateway**
  - Entrada principal del sistema
  - Expone endpoints REST
  - Valida JWT y roles
  - Reenvía autenticación a `auth-service`
  - Reenvía operaciones de citas a `appointments-service`

- **auth-service**
  - Login
  - JWT
  - Roles
  - Usuarios semilla
  - Hash de contraseñas con `bcrypt`

- **appointments-service**
  - Gestión de citas
  - Disponibilidad
  - Reprogramación
  - Confirmación
  - Cancelación
  - Finalización
  - Regla anti-empalme

- **postgres**
  - Persistencia relacional
  - Base `dentia_auth`
  - Base `dentia_appointments`

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

### Reglas de acceso MVP
- `PATIENT`: solo puede ver sus propias citas y crear, reprogramar o cancelar las suyas
- `DENTIST`: solo puede ver y operar citas asociadas a su `domainId`
- `ADMIN`: acceso total

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