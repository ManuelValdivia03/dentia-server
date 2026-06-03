using System.Text.Json.Serialization;

namespace Dentia.Appointments.Api.Application.Events;

public class AppointmentCreatedEvent
{
    [JsonPropertyName("eventId")]
    public string EventId { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("type")]
    public string Type { get; set; } = AppointmentEventTypes.Created;

    [JsonPropertyName("occurredAt")]
    public string OccurredAt { get; set; } = DateTime.UtcNow.ToString("O");

    [JsonPropertyName("data")]
    public AppointmentCreatedEventData Data { get; set; } = new();
}

public class AppointmentCreatedEventData
{
    [JsonPropertyName("appointmentId")]
    public string AppointmentId { get; set; } = string.Empty;

    [JsonPropertyName("patientId")]
    public string PatientId { get; set; } = string.Empty;

    [JsonPropertyName("dentistId")]
    public string DentistId { get; set; } = string.Empty;

    [JsonPropertyName("startAt")]
    public string StartAt { get; set; } = string.Empty;

    [JsonPropertyName("endAt")]
    public string EndAt { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
}

public static class AppointmentEventTypes
{
    public const string Created = "appointment.created";
    public const string Confirmed = "appointment.confirmed";
    public const string Cancelled = "appointment.cancelled";
    public const string Rescheduled = "appointment.rescheduled";
}
