using System.ComponentModel.DataAnnotations;

namespace Dentia.Appointments.Api.Application.DTOs;

public class RescheduleAppointmentDto
{
    [Required]
    public DateTime StartAt { get; set; }

    [Required]
    public DateTime EndAt { get; set; }
}