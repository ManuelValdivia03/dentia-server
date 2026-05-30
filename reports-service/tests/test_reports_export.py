from app.services.reports_service import ReportsService


def test_export_appointments_by_status_csv(monkeypatch):
    service = ReportsService()

    def fake_get_appointments_by_status(doctor_id=None):
        assert doctor_id == "d1"

        return {
            "data": [
                {"status": "completed", "total": 3},
                {"status": "cancelled", "total": 1},
            ]
        }

    monkeypatch.setattr(
        service,
        "get_appointments_by_status",
        fake_get_appointments_by_status,
    )

    csv_content = service.export_appointments_by_status_csv("d1")

    assert "status,total" in csv_content
    assert "completed,3" in csv_content
    assert "cancelled,1" in csv_content