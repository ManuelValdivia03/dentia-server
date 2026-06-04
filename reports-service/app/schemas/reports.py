from enum import Enum
from pydantic import BaseModel, Field
from typing import List

class AppointmentStatus(str, Enum):
    scheduled = "scheduled"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"

class AppointmentSnapshotRequest(BaseModel):
    appointment_id: str = Field(..., examples=["apt_123"])
    doctor_id: str = Field(..., examples=["doctor_456"])
    patient_id: str = Field(..., examples=["patient_789"])
    status: AppointmentStatus
    appointment_type: str | None = Field(default=None, examples=["Limpieza"])
    scheduled_at: str = Field(..., examples=["2026-05-13T10:00:00Z"])
    duration_minutes: int = Field(..., examples=[60])

class DashboardSummaryResponse(BaseModel):
    total_appointments: int
    scheduled: int
    confirmed: int
    completed: int
    cancelled: int
    no_show: int
    completion_rate: float

class AppointmentStatusItem(BaseModel):
    status: str
    total: int

class AppointmentStatusReportResponse(BaseModel):
    data: List[AppointmentStatusItem]
