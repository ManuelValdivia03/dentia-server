using System.ComponentModel.DataAnnotations;

namespace ChatService.DTOs;

// Sent by the gateway after it uploads the binary to files-service.
public class AttachmentDto
{
    [Required]
    [MinLength(1)]
    public string FileId { get; set; } = string.Empty;

    [Required]
    [MinLength(1)]
    public string ContentType { get; set; } = string.Empty;

    public string OriginalName { get; set; } = string.Empty;

    public long Size { get; set; }
}
