using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ChatService.Models;

[BsonIgnoreExtraElements]
public class Message
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("conversationId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string ConversationId { get; set; } = string.Empty;

    [BsonElement("senderId")]
    public string SenderId { get; set; } = string.Empty;

    [BsonElement("senderRole")]
    public string SenderRole { get; set; } = string.Empty;

    [BsonElement("type")]
    public string Type { get; set; } = MessageTypes.Text;

    [BsonElement("body")]
    [BsonIgnoreIfNull]
    public string? Body { get; set; }

    [BsonElement("attachment")]
    [BsonIgnoreIfNull]
    public MessageAttachment? Attachment { get; set; }

    [BsonElement("deleted")]
    public bool Deleted { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public static class MessageTypes
{
    public const string Text = "TEXT";
    public const string Image = "IMAGE";
    public const string Video = "VIDEO";
}
