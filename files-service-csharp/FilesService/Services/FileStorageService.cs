namespace FilesService.Services;

public class FileStorageService
{
    private readonly string _storagePath;

    public FileStorageService(IConfiguration configuration)
    {
        _storagePath = configuration["Storage:Path"] ?? "/app/uploads";
        Directory.CreateDirectory(_storagePath);
    }

    public async Task<(string StoredName, string FullPath)> SaveAsync(IFormFile file)
    {
        var extension = Path.GetExtension(file.FileName);
        var storedName = $"{Guid.NewGuid()}{extension}";
        var fullPath = Path.Combine(_storagePath, storedName);

        await using var stream = new FileStream(fullPath, FileMode.Create);
        await file.CopyToAsync(stream);

        return (storedName, fullPath);
    }

    public bool Exists(string fullPath)
    {
        return File.Exists(fullPath);
    }

    public void Delete(string fullPath)
    {
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }
    }
}