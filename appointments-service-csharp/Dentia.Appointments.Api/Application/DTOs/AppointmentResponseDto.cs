namespace Dentia.Appointments.Api.Application.DTOs;

public class AppointmentResponseDto
{
    public Guid Id { get; set; }
    public string PatientId { get; set; } = string.Empty;
    public string DentistId { get; set; } = string.Empty;
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool HasRating { get; set; }
    public bool HasPayment { get; set; }
}
