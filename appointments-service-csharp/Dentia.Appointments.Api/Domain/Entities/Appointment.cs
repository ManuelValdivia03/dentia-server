using Dentia.Appointments.Api.Domain.Enums;

namespace Dentia.Appointments.Api.Domain.Entities;

public class Appointment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string PatientId { get; set; } = string.Empty;

    public string DentistId { get; set; } = string.Empty;

    public DateTime StartAt { get; set; }

    public DateTime EndAt { get; set; }

    public AppointmentStatus Status { get; set; } = AppointmentStatus.PENDING;

    public string? Reason { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}