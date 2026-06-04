using System.Text.Json.Serialization;

namespace Dentia.Appointments.Api.Application.Reports;

public class AppointmentReportSnapshot
{
    [JsonPropertyName("appointment_id")]
    public string AppointmentId { get; set; } = string.Empty;

    [JsonPropertyName("doctor_id")]
    public string DoctorId { get; set; } = string.Empty;

    [JsonPropertyName("patient_id")]
    public string PatientId { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("appointment_type")]
    public string AppointmentType { get; set; } = string.Empty;

    [JsonPropertyName("scheduled_at")]
    public string ScheduledAt { get; set; } = string.Empty;

    [JsonPropertyName("duration_minutes")]
    public int DurationMinutes { get; set; }
}
