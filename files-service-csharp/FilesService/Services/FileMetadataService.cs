using FilesService.Models;
using FilesService.Settings;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace FilesService.Services;

public class FileMetadataService : IFileMetadataService
{
    private readonly IMongoCollection<ClinicalFile> _collection;
    public FileMetadataService(IOptions<MongoSettings> settings)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        var database = client.GetDatabase(settings.Value.DatabaseName);
        _collection = database.GetCollection<ClinicalFile>(settings.Value.FilesCollection);
    }

    public async Task<ClinicalFile> CreateAsync(ClinicalFile file)
    {
        await _collection.InsertOneAsync(file);
        return file;
    }

    public async Task<List<ClinicalFile>> FindByPatientAsync(string patientId)
    {
        return await _collection
            .Find(f => f.PatientId == patientId && f.DeletedAt == null)
            .SortByDescending(f => f.CreatedAt)
            .ToListAsync();
    }

    public async Task<List<ClinicalFile>> FindAllAsync()
    {
        return await _collection
            .Find(f => f.DeletedAt == null)
            .SortByDescending(f => f.CreatedAt)
            .ToListAsync();
    }

    public async Task<ClinicalFile?> FindByIdAsync(string id)
    {
        return await _collection
            .Find(f => f.Id == id && f.DeletedAt == null)
            .FirstOrDefaultAsync();
    }

    public async Task SoftDeleteAsync(string id)
    {
        var update = Builders<ClinicalFile>.Update.Set(f => f.DeletedAt, DateTime.UtcNow);
        await _collection.UpdateOneAsync(f => f.Id == id, update);
    }
}