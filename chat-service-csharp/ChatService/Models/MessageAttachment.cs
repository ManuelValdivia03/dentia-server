using MongoDB.Bson.Serialization.Attributes;

namespace ChatService.Models;

// Reference to a binary stored in files-service. The chat service never holds the bytes.
[BsonIgnoreExtraElements]
public class MessageAttachment
{
    [BsonElement("fileId")]
    public string FileId { get; set; } = string.Empty;

    [BsonElement("mediaType")]
    public string MediaType { get; set; } = string.Empty; // IMAGE | VIDEO

    [BsonElement("contentType")]
    public string ContentType { get; set; } = string.Empty; // e.g. image/png, video/mp4

    [BsonElement("originalName")]
    public string OriginalName { get; set; } = string.Empty;

    [BsonElement("size")]
    public long Size { get; set; }
}
