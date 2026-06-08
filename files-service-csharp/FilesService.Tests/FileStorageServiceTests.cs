using FilesService.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace FilesService.Tests;

public class FileStorageServiceTests
{
    private static FileStorageService CreateService(string storagePath)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Storage:Path"] = storagePath
            })
            .Build();

        return new FileStorageService(configuration);
    }

    private static IFormFile CreateFormFile(
        string fileName = "test-file.pdf",
        string contentType = "application/pdf",
        string content = "dummy pdf content")
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(content);
        var stream = new MemoryStream(bytes);

        return new FormFile(stream, 0, bytes.Length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    [Fact]
    public async Task SaveAsync_ShouldStoreFileAndKeepOriginalExtension()
    {
        var tempPath = Path.Combine(Path.GetTempPath(), $"dentia-files-test-{Guid.NewGuid()}");
        var service = CreateService(tempPath);
        var file = CreateFormFile("clinical-report.pdf");

        try
        {
            var result = await service.SaveAsync(file);

            Assert.EndsWith(".pdf", result.StoredName);
            Assert.True(File.Exists(result.FullPath));
            Assert.Equal(tempPath, Path.GetDirectoryName(result.FullPath));

            var storedContent = await File.ReadAllTextAsync(result.FullPath);
            Assert.Equal("dummy pdf content", storedContent);
        }
        finally
        {
            if (Directory.Exists(tempPath))
            {
                Directory.Delete(tempPath, recursive: true);
            }
        }
    }

    [Fact]
    public async Task Exists_ShouldReturnTrue_WhenFileExists()
    {
        var tempPath = Path.Combine(Path.GetTempPath(), $"dentia-files-test-{Guid.NewGuid()}");
        var service = CreateService(tempPath);
        var file = CreateFormFile();

        try
        {
            var result = await service.SaveAsync(file);

            Assert.True(service.Exists(result.FullPath));
        }
        finally
        {
            if (Directory.Exists(tempPath))
            {
                Directory.Delete(tempPath, recursive: true);
            }
        }
    }

    [Fact]
    public async Task Delete_ShouldRemoveFile_WhenFileExists()
    {
        var tempPath = Path.Combine(Path.GetTempPath(), $"dentia-files-test-{Guid.NewGuid()}");
        var service = CreateService(tempPath);
        var file = CreateFormFile();

        try
        {
            var result = await service.SaveAsync(file);

            service.Delete(result.FullPath);

            Assert.False(File.Exists(result.FullPath));
        }
        finally
        {
            if (Directory.Exists(tempPath))
            {
                Directory.Delete(tempPath, recursive: true);
            }
        }
    }

    [Fact]
    public void Delete_ShouldNotThrow_WhenFileDoesNotExist()
    {
        var tempPath = Path.Combine(Path.GetTempPath(), $"dentia-files-test-{Guid.NewGuid()}");
        var service = CreateService(tempPath);
        var missingPath = Path.Combine(tempPath, "missing.pdf");

        try
        {
            var exception = Record.Exception(() => service.Delete(missingPath));

            Assert.Null(exception);
        }
        finally
        {
            if (Directory.Exists(tempPath))
            {
                Directory.Delete(tempPath, recursive: true);
            }
        }
    }
}