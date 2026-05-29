using System.ComponentModel.DataAnnotations;

namespace ChatService.DTOs;

public class CreateConversationDto
{
    [Required]
    [MinLength(1)]
    public string PatientId { get; set; } = string.Empty;

    [Required]
    [MinLength(1)]
    public string DentistId { get; set; } = string.Empty;
}
