using System.ComponentModel.DataAnnotations;

namespace Dentia.Appointments.Api.Application.DTOs;

public class CreateAppointmentDto
{
    [Required]
    [MinLength(1)]
    public string PatientId { get; set; } = string.Empty;

    [Required]
    [MinLength(1)]
    public string DentistId { get; set; } = string.Empty;

    [Required]
    public DateTime StartAt { get; set; }

    [Required]
    public DateTime EndAt { get; set; }

    public string? Reason { get; set; }

    public string? Notes { get; set; }
}