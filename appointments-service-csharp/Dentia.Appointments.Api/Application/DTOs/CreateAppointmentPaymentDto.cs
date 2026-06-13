using System.ComponentModel.DataAnnotations;

namespace Dentia.Appointments.Api.Application.DTOs;

public class CreateAppointmentPaymentDto
{
    [Range(typeof(decimal), "0.01", "999999999.99")]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(30)]
    public string Method { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string TreatmentDescription { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Notes { get; set; }

}
