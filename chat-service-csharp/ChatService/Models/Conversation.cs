using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ChatService.Models;

[BsonIgnoreExtraElements]
public class Conversation
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("patientId")]
    public string PatientId { get; set; } = string.Empty;

    [BsonElement("dentistId")]
    public string DentistId { get; set; } = string.Empty;

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    [BsonElement("lastMessagePreview")]
    [BsonIgnoreIfNull]
    public string? LastMessagePreview { get; set; }

    [BsonElement("lastMessageAt")]
    [BsonIgnoreIfNull]
    public DateTime? LastMessageAt { get; set; }

    // Maps each participant userId to the timestamp they last read the conversation.
    [BsonElement("lastReadAt")]
    public Dictionary<string, DateTime> LastReadAt { get; set; } = new();

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
