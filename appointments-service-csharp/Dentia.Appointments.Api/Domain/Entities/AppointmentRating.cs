namespace Dentia.Appointments.Api.Domain.Entities;

public class AppointmentRating
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AppointmentId { get; set; }

    public string PatientId { get; set; } = string.Empty;

    public string DentistId { get; set; } = string.Empty;

    public int Score { get; set; }

    public string? Comment { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}