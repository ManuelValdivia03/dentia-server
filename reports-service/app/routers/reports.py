from fastapi import APIRouter, Depends, Query, status
from app.schemas.reports import (
    AppointmentSnapshotRequest,
    DashboardSummaryResponse,
    AppointmentStatusReportResponse,
)
from app.security.auth import require_roles, require_internal_key, resolve_doctor_scope
from app.services.reports_service import ReportsService
from fastapi.responses import Response

router = APIRouter(prefix="/reports", tags=["Reports"])

service = ReportsService()


@router.post(
    "/snapshots/appointments",
    status_code=status.HTTP_201_CREATED,
    summary="Registrar snapshot analítico de una cita",
    description=(
        "Recibe una copia analítica de una cita para construir reportes. "
        "Este endpoint no debe ser usado directamente por pacientes."
    ),
)
def create_appointment_snapshot(
    payload: AppointmentSnapshotRequest,
    _: bool = Depends(require_internal_key),
):
    return service.upsert_appointment_snapshot(payload)


@router.get(
    "/dashboard/summary",
    response_model=DashboardSummaryResponse,
    summary="Obtener resumen general del dashboard clínico",
    description=(
        "Devuelve indicadores agregados de citas: total, completadas, canceladas, "
        "no-show y tasa de finalización."
    ),
)
def get_dashboard_summary(
    doctor_id: str | None = Query(default=None, description="Filtra por dentista"),
    current_user: dict = Depends(require_roles("admin", "dentist")),
):
    effective_doctor_id = resolve_doctor_scope(current_user, doctor_id)

    return service.get_dashboard_summary(effective_doctor_id)


@router.get(
    "/appointments/by-status",
    response_model=AppointmentStatusReportResponse,
    summary="Obtener citas agrupadas por estado",
    description=(
        "Devuelve los datos necesarios para una gráfica de citas por estado."
    ),
)
def get_appointments_by_status(
    doctor_id: str | None = Query(default=None, description="Filtra por dentista"),
    current_user: dict = Depends(require_roles("admin", "dentist")),
):
    effective_doctor_id = resolve_doctor_scope(current_user, doctor_id)

    return service.get_appointments_by_status(effective_doctor_id)

@router.get(
    "/export/appointments-by-status",
    summary="Exportar citas agrupadas por estado en CSV",
    description="Genera un archivo CSV con el total de citas por estado.",
)
def export_appointments_by_status(
    doctor_id: str | None = Query(default=None, description="Filtra por dentista"),
    current_user: dict = Depends(require_roles("admin", "dentist")),
):
    effective_doctor_id = resolve_doctor_scope(current_user, doctor_id)
    csv_content = service.export_appointments_by_status_csv(effective_doctor_id)

    filename = "appointments-by-status.csv"

    if effective_doctor_id:
        filename = f"appointments-by-status-{effective_doctor_id}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )