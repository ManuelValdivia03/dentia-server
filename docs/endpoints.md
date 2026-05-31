# Dentia - Endpoints finales

Base URL local:

```txt
http://localhost:3000
```

Todos los endpoints protegidos requieren:

```http
Authorization: Bearer <JWT>
```

---

## Auth

### Registro

```http
POST /auth/register
```

### Login

```http
POST /auth/login
```

Body:

```json
{
  "email": "patient1@dentia.local",
  "password": "Patient123*"
}
```

### Verificar correo

```http
POST /auth/verify-email
```

### Reenviar código de verificación

```http
POST /auth/resend-verification-code
```

### Perfil autenticado

```http
GET /profile
```

Roles permitidos: `ADMIN`, `DENTIST`, `PATIENT`.

---

## Dentists

### Listar dentistas

```http
GET /dentists
```

### Obtener dentista por `domainId`

```http
GET /dentists/:domainId
```

### Resumen de valoraciones por dentista

```http
GET /dentists/:dentistId/ratings/summary
```

Roles permitidos: `ADMIN`, `DENTIST`, `PATIENT`.

Reglas:

* `DENTIST` solo puede consultar su propio resumen.
* `ADMIN` puede consultar cualquier resumen.
* `PATIENT` puede consultar el resumen público de cualquier dentista.

---

## Appointments

### Listar citas

```http
GET /appointments
```

Reglas:

* `PATIENT` solo ve sus propias citas.
* `DENTIST` solo ve citas asignadas a su `domainId`.
* `ADMIN` ve todas las citas.

### Obtener cita por ID

```http
GET /appointments/:id
```

### Consultar disponibilidad

```http
GET /appointments/availability?dentistId=d1&date=2026-05-28
```

### Crear cita

```http
POST /appointments
```

Body:

```json
{
  "patientId": "p1",
  "dentistId": "d1",
  "startAt": "2026-05-28T10:00:00Z",
  "endAt": "2026-05-28T11:00:00Z",
  "reason": "Limpieza dental",
  "notes": "Primera cita"
}
```

### Reprogramar cita

```http
PATCH /appointments/:id/reschedule
```

Body:

```json
{
  "startAt": "2026-05-29T10:00:00Z",
  "endAt": "2026-05-29T11:00:00Z"
}
```

### Cancelar cita

```http
PATCH /appointments/:id/cancel
```

### Confirmar cita

```http
PATCH /appointments/:id/confirm
```

Roles permitidos: `ADMIN`, `DENTIST`.

### Completar cita

```http
PATCH /appointments/:id/complete
```

Roles permitidos: `ADMIN`, `DENTIST`.

### Valorar cita

```http
POST /appointments/:id/rating
```

Roles permitidos: `PATIENT`.

Reglas:

* La cita debe estar en estado `COMPLETED`.
* El paciente solo puede valorar sus propias citas.
* Una cita solo puede tener una valoración.

Body:

```json
{
  "score": 5,
  "comment": "Excelente atención"
}
```

---

## Prescriptions

### Crear receta

```http
POST /prescriptions
```

Roles permitidos: `ADMIN`, `DENTIST`.

Body:

```json
{
  "appointmentId": "appointment-id",
  "patientId": "p1",
  "dentistId": "d1",
  "diagnosis": "Gingivitis leve",
  "indications": "Cepillado tres veces al día y uso de hilo dental.",
  "notes": "Revisión en dos semanas."
}
```

### Obtener receta por ID

```http
GET /prescriptions/:id
```

### Listar recetas por cita

```http
GET /appointments/:appointmentId/prescriptions
```

### Descargar receta en PDF

```http
GET /prescriptions/:id/pdf
```

Devuelve:

```txt
application/pdf
```

Reglas:

* `PATIENT` solo puede descargar sus propias recetas.
* `DENTIST` solo puede descargar recetas emitidas por él.
* `ADMIN` puede descargar todas.

---

## Files

### Subir archivo clínico

```http
POST /files
```

Tipo:

```txt
multipart/form-data
```

Campos:

```txt
file=<archivo>
patientId=p1
```

Tipos permitidos:

* `application/pdf`
* `image/jpeg`
* `image/png`

Reglas:

* `PATIENT` solo sube archivos para sí mismo.
* `DENTIST` solo sube archivos de pacientes con relación válida por cita `CONFIRMED` o `COMPLETED`.
* `ADMIN` puede subir archivos para cualquier paciente.

### Listar archivos

```http
GET /files
```

Opcional para admin/dentista:

```http
GET /files?patientId=p1
```

### Obtener metadata de archivo

```http
GET /files/:id
```

### Descargar archivo

```http
GET /files/:id/download
```

### Eliminar archivo

```http
DELETE /files/:id
```

---

## Chat

### Crear conversación

```http
POST /chat/conversations
```

### Listar conversaciones

```http
GET /chat/conversations
```

### Obtener conversación

```http
GET /chat/conversations/:id
```

### Enviar mensaje

```http
POST /chat/conversations/:id/messages
```

### Listar mensajes

```http
GET /chat/conversations/:id/messages
```

MVP:

* Chat vía REST/polling.
* WebSocket queda fuera del alcance mínimo.

---

## Reports

### Obtener resumen del dashboard

```http
GET /reports/dashboard/summary
```

### Obtener resumen filtrado por dentista

```http
GET /reports/dashboard/summary?doctor_id=d1
```

Roles permitidos: `ADMIN`, `DENTIST`.

Reglas:

* `ADMIN` puede consultar reportes globales o filtrados.
* `DENTIST` solo puede consultar sus propios reportes.
* `PATIENT` no puede acceder a reportes administrativos.

### Obtener citas agrupadas por estado

```http
GET /reports/appointments/by-status
```

### Obtener citas agrupadas por estado filtradas por dentista

```http
GET /reports/appointments/by-status?doctor_id=d1
```

### Exportar citas agrupadas por estado en CSV

```http
GET /reports/export/appointments-by-status?doctor_id=d1
```

Devuelve:

```txt
text/csv
```

Ejemplo de salida:

```csv
status,total
COMPLETED,3
CONFIRMED,1
CANCELLED,1
```

---

## Health checks

```http
GET http://localhost:3000/health
GET http://localhost:3001/health
GET http://localhost:3002/health
GET http://localhost:3003/health
GET http://localhost:3004/health
GET http://localhost:3005/health
GET http://localhost:3006/health
```

---

## Puertos principales

| Servicio              |       Puerto |
| --------------------- | -----------: |
| api-gateway           |         3000 |
| auth-service          |         3001 |
| appointments-service  |         3002 |
| prescriptions-service |         3003 |
| chat-service          |         3004 |
| files-service         |         3005 |
| reports-service       |         3006 |
| PostgreSQL            |         5432 |
| RabbitMQ              | 5672 / 15672 |
| Neo4j                 |  7474 / 7687 |
| MongoDB chat          |        27017 |
| MongoDB files         |        27018 |