using System.ComponentModel.DataAnnotations;

namespace ChatService.DTOs;

public class SendMessageDto
{
    [MaxLength(1000)]
    public string? Body { get; set; }

    public AttachmentDto? Attachment { get; set; }
}
