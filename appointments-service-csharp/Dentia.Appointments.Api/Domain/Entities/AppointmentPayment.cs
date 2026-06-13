namespace Dentia.Appointments.Api.Domain.Entities;

public class AppointmentPayment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AppointmentId { get; set; }

    public string PatientId { get; set; } = string.Empty;

    public string DentistId { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string Method { get; set; } = string.Empty;

    public string TreatmentDescription { get; set; } = string.Empty;

    public string? Notes { get; set; }

    public DateTime PaidAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
