CREATE TABLE IF NOT EXISTS "appointment_payments" (
    "id" uuid PRIMARY KEY,
    "appointmentId" uuid NOT NULL UNIQUE,
    "patientId" text NOT NULL,
    "dentistId" text NOT NULL,
    "amount" numeric(12,2) NOT NULL CHECK ("amount" > 0),
    "method" varchar(30) NOT NULL,
    "treatmentDescription" varchar(500) NOT NULL,
    "notes" text NULL,
    "paidAt" timestamp without time zone NOT NULL,
    "createdAt" timestamp without time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS "IX_appointment_payments_dentistId_paidAt"
ON "appointment_payments" ("dentistId", "paidAt");
