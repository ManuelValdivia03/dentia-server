from app.services.reports_service import ReportsService


class FakeRecord(dict):
    def __getitem__(self, key):
        return self.get(key)


class FakeResult:
    def __init__(self, records):
        self.records = records

    def single(self):
        return self.records[0]

    def __iter__(self):
        return iter(self.records)


class FakeSession:
    def __init__(self, records):
        self.records = records
        self.last_query = None
        self.last_params = None

    def run(self, query, **params):
        self.last_query = query
        self.last_params = params
        return FakeResult(self.records)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False


class FakeNeo4jClient:
    def __init__(self, records):
        self.session_instance = FakeSession(records)

    def session(self):
        return self.session_instance


def test_get_dashboard_summary_calculates_completion_rate(monkeypatch):
    fake_client = FakeNeo4jClient([
        FakeRecord({
            "total": 10,
            "scheduled": 2,
            "confirmed": 1,
            "completed": 5,
            "cancelled": 1,
            "no_show": 1,
        })
    ])

    monkeypatch.setattr(
        "app.services.reports_service.neo4j_client",
        fake_client,
    )

    service = ReportsService()

    result = service.get_dashboard_summary()

    assert result == {
        "total_appointments": 10,
        "scheduled": 2,
        "confirmed": 1,
        "completed": 5,
        "cancelled": 1,
        "no_show": 1,
        "completion_rate": 50.0,
    }


def test_get_dashboard_summary_returns_zero_completion_rate_when_no_appointments(monkeypatch):
    fake_client = FakeNeo4jClient([
        FakeRecord({
            "total": 0,
            "scheduled": 0,
            "confirmed": 0,
            "completed": 0,
            "cancelled": 0,
            "no_show": 0,
        })
    ])

    monkeypatch.setattr(
        "app.services.reports_service.neo4j_client",
        fake_client,
    )

    service = ReportsService()

    result = service.get_dashboard_summary()

    assert result["total_appointments"] == 0
    assert result["completion_rate"] == 0


def test_get_dashboard_summary_applies_doctor_filter(monkeypatch):
    fake_client = FakeNeo4jClient([
        FakeRecord({
            "total": 4,
            "scheduled": 1,
            "confirmed": 1,
            "completed": 2,
            "cancelled": 0,
            "no_show": 0,
        })
    ])

    monkeypatch.setattr(
        "app.services.reports_service.neo4j_client",
        fake_client,
    )

    service = ReportsService()

    service.get_dashboard_summary("d1")

    assert "WHERE d.id = $doctor_id" in fake_client.session_instance.last_query
    assert fake_client.session_instance.last_params["doctor_id"] == "d1"


def test_get_appointments_by_status_returns_chart_data(monkeypatch):
    fake_client = FakeNeo4jClient([
        FakeRecord({"status": "completed", "total": 5}),
        FakeRecord({"status": "cancelled", "total": 2}),
    ])

    monkeypatch.setattr(
        "app.services.reports_service.neo4j_client",
        fake_client,
    )

    service = ReportsService()

    result = service.get_appointments_by_status()

    assert result == {
        "data": [
            {"status": "completed", "total": 5},
            {"status": "cancelled", "total": 2},
        ]
    }


def test_export_appointments_by_status_csv(monkeypatch):
    service = ReportsService()

    monkeypatch.setattr(
        service,
        "get_appointments_by_status",
        lambda doctor_id=None: {
            "data": [
                {"status": "completed", "total": 5},
                {"status": "cancelled", "total": 2},
            ]
        },
    )

    result = service.export_appointments_by_status_csv("d1")

    assert "status,total" in result
    assert "completed,5" in result
    assert "cancelled,2" in result