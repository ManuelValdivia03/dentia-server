using System.ComponentModel.DataAnnotations;

namespace ChatService.DTOs;

public class ListMessagesQuery
{
    [Range(1, 100)]
    public int Limit { get; set; } = 30;

    public string? Before { get; set; }
}
