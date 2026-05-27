using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace FilesService.Models;

public class ClinicalFile
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public string OriginalName { get; set; } = string.Empty;
    public string StoredName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Size { get; set; }

    public string PatientId { get; set; } = string.Empty;
    public string UploadedByUserId { get; set; } = string.Empty;
    public string UploadedByRole { get; set; } = string.Empty;

    public string StoragePath { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }
}