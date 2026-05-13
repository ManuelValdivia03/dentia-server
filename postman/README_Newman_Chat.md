# Dentia Chat MVP - Postman/Newman

Incluye dos carpetas:

1. `Chat Security MVP - runnable without dentist credentials`
   - Corre con el entorno local actual.
   - Valida health, JWT requerido, registro/login de paciente, cita PENDING, relación interna false, bloqueo de conversación sin cita confirmada y bloqueo de confirmación por paciente.

2. `Chat Full Flow - requires dentist credentials`
   - Requiere `dentistEmail` y `dentistPassword`.
   - Valida flujo completo: paciente crea cita, dentista confirma, relación interna true, creación de conversación, envío/listado de mensajes y leído.

## Ejecutar pruebas de seguridad

```bash
newman run Dentia_Chat_MVP_Newman.postman_collection.json -e Dentia_Local.postman_environment.json --folder "Chat Security MVP - runnable without dentist credentials"
```

## Ejecutar flujo completo

Requiere resolver el pendiente de credenciales reales de dentista/admin.

```bash
newman run Dentia_Chat_MVP_Newman.postman_collection.json -e Dentia_Local.postman_environment.json --folder "Chat Full Flow - requires dentist credentials" --env-var dentistEmail=dentist1@dentia.local --env-var dentistPassword=PASSWORD_REAL
```

## Nota crítica

El flujo completo no debe depender de actualizar la BD manualmente. Para cierre formal, se necesita login real de dentista/admin o un seed controlado con contraseña conocida.
