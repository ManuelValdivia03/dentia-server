using System.ComponentModel.DataAnnotations;

namespace ChatService.DTOs;

public class ListMessagesQuery
{
    [Range(1, 100)]
    public int Limit { get; set; } = 30;

    // Optional Mongo ObjectId cursor: return messages with _id strictly less than this.
    public string? Before { get; set; }
}
