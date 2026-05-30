from app.db.neo4j import neo4j_client
from app.schemas.reports import AppointmentSnapshotRequest
import csv
import io


class ReportsService:
    def upsert_appointment_snapshot(self, payload: AppointmentSnapshotRequest):
        query = """
        MERGE (d:Doctor {id: $doctor_id})
        MERGE (p:Patient {id: $patient_id})
        MERGE (a:Appointment {id: $appointment_id})
        SET a.status = $status,
            a.scheduledAt = datetime($scheduled_at),
            a.durationMinutes = $duration_minutes
        MERGE (d)-[:HAS_APPOINTMENT]->(a)
        MERGE (p)-[:BOOKED]->(a)
        RETURN a.id AS appointment_id
        """

        with neo4j_client.session() as session:
            result = session.run(
                query,
                appointment_id=payload.appointment_id,
                doctor_id=payload.doctor_id,
                patient_id=payload.patient_id,
                status=payload.status.value,
                scheduled_at=payload.scheduled_at,
                duration_minutes=payload.duration_minutes,
            )

            record = result.single()
            return {"appointment_id": record["appointment_id"]}

    def get_dashboard_summary(self, doctor_id: str | None = None):
        where_clause = "WHERE d.id = $doctor_id" if doctor_id else ""

        query = f"""
        MATCH (d:Doctor)-[:HAS_APPOINTMENT]->(a:Appointment)
        {where_clause}
        RETURN
            count(a) AS total,
            count(CASE WHEN a.status = 'scheduled' THEN 1 END) AS scheduled,
            count(CASE WHEN a.status = 'confirmed' THEN 1 END) AS confirmed,
            count(CASE WHEN a.status = 'completed' THEN 1 END) AS completed,
            count(CASE WHEN a.status = 'cancelled' THEN 1 END) AS cancelled,
            count(CASE WHEN a.status = 'no_show' THEN 1 END) AS no_show
        """

        with neo4j_client.session() as session:
            record = session.run(query, doctor_id=doctor_id).single()

            total = record["total"] or 0
            completed = record["completed"] or 0

            return {
                "total_appointments": total,
                "scheduled": record["scheduled"] or 0,
                "confirmed": record["confirmed"] or 0,
                "completed": completed,
                "cancelled": record["cancelled"] or 0,
                "no_show": record["no_show"] or 0,
                "completion_rate": round((completed / total) * 100, 2) if total > 0 else 0,
            }

    def get_appointments_by_status(self, doctor_id: str | None = None):
        where_clause = "WHERE d.id = $doctor_id" if doctor_id else ""

        query = f"""
        MATCH (d:Doctor)-[:HAS_APPOINTMENT]->(a:Appointment)
        {where_clause}
        RETURN a.status AS status, count(a) AS total
        ORDER BY total DESC
        """

        with neo4j_client.session() as session:
            result = session.run(query, doctor_id=doctor_id)

            return {
                "data": [
                    {
                        "status": record["status"],
                        "total": record["total"],
                    }
                    for record in result
                ]
            }
    
    def export_appointments_by_status_csv(self, doctor_id: str | None = None):
        report = self.get_appointments_by_status(doctor_id)

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["status", "total"])

        for item in report["data"]:
            writer.writerow([item["status"], item["total"]])

        return output.getvalue()