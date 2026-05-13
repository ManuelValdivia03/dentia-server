# Contratos RPC y eventos - Dentia

## appointments-service

### TCP RPC: CheckDoctorAvailability
- Transporte: TCP
- Puerto local: 4001
- Entrada:
  - dentistId: string
  - date: string
- Salida:
  - availableSlots: string[]

### RabbitMQ: appointment.created
- Broker: RabbitMQ
- Cola: appointments_events
- Emisor: appointments-service
- Consumidores previstos: chat-service, reports-service
- Payload:
  - appointmentId: string
  - patientId: string
  - dentistId: string
  - startAt: ISODate
  - endAt: ISODate
  - status: string