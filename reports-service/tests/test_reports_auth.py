from fastapi.testclient import TestClient
import jwt

from app.main import app
from app.core.config import settings
from app.routers import reports as reports_router


client = TestClient(app)


def make_token(role: str, domain_id: str = "d1"):
    return jwt.encode(
        {
            "sub": "user-test",
            "role": role,
            "domainId": domain_id,
            "email": f"{role.lower()}@dentia.local",
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def test_patient_cannot_access_dashboard():
    token = make_token("PATIENT", "p1")

    response = client.get(
        "/reports/dashboard/summary",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Insufficient permissions"


def test_dentist_can_access_own_dashboard(monkeypatch):
    token = make_token("DENTIST", "d1")

    def fake_summary(doctor_id=None):
        assert doctor_id == "d1"
        return {
            "total_appointments": 2,
            "scheduled": 1,
            "confirmed": 0,
            "completed": 1,
            "cancelled": 0,
            "no_show": 0,
            "completion_rate": 50,
        }

    monkeypatch.setattr(
        reports_router.service,
        "get_dashboard_summary",
        fake_summary,
    )

    response = client.get(
        "/reports/dashboard/summary",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["total_appointments"] == 2
    assert response.json()["completion_rate"] == 50


def test_dentist_cannot_access_other_doctor_dashboard():
    token = make_token("DENTIST", "d1")

    response = client.get(
        "/reports/dashboard/summary?doctor_id=d2",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Dentists can only access their own reports"


def test_admin_can_access_global_dashboard(monkeypatch):
    token = make_token("ADMIN", "admin1")

    def fake_summary(doctor_id=None):
        assert doctor_id is None
        return {
            "total_appointments": 5,
            "scheduled": 2,
            "confirmed": 1,
            "completed": 2,
            "cancelled": 0,
            "no_show": 0,
            "completion_rate": 40,
        }

    monkeypatch.setattr(
        reports_router.service,
        "get_dashboard_summary",
        fake_summary,
    )

    response = client.get(
        "/reports/dashboard/summary",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["total_appointments"] == 5