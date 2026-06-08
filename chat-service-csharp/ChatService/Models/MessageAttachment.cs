using MongoDB.Bson.Serialization.Attributes;

namespace ChatService.Models;

[BsonIgnoreExtraElements]
public class MessageAttachment
{
    [BsonElement("fileId")]
    public string FileId { get; set; } = string.Empty;

    [BsonElement("mediaType")]
    public string MediaType { get; set; } = string.Empty;

    [BsonElement("contentType")]
    public string ContentType { get; set; } = string.Empty;

    [BsonElement("originalName")]
    public string OriginalName { get; set; } = string.Empty;

    [BsonElement("size")]
    public long Size { get; set; }
}
