namespace FilesService.Services;

public interface IFileStorageService
{
    Task<(string StoredName, string FullPath)> SaveAsync(IFormFile file);
    bool Exists(string fullPath);
    void Delete(string fullPath);
}