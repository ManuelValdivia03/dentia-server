using System.ComponentModel.DataAnnotations;

namespace Dentia.Appointments.Api.Application.DTOs;

public class CreateAppointmentRatingDto
{
    [Range(1, 5)]
    public int Score { get; set; }

    [MaxLength(500)]
    public string? Comment { get; set; }
}