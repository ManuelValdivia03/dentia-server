using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using FilesService.Controllers;
using FilesService.DTOs;
using FilesService.Models;
using FilesService.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace FilesService.Tests;

public class FilesControllerTests
{
    private static ClaimsPrincipal User(string role, string domainId, string sub = "u1")
    {
        return new ClaimsPrincipal(
            new ClaimsIdentity(
                new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, sub),
                    new Claim("domainId", domainId),
                    new Claim(ClaimTypes.Role, role),
                },
                "test"
            )
        );
    }

    private static IFormFile FormFile(
        string fileName = "test.pdf",
        string contentType = "application/pdf",
        string content = "fake pdf")
    {
        var bytes = Encoding.UTF8.GetBytes(content);

        return new FormFile(new MemoryStream(bytes), 0, bytes.Length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    private static FilesController CreateController(
        FakeMetadataService metadata,
        FakeStorageService storage,
        string role,
        string domainId,
        bool relationAllowed = true)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["APPOINTMENTS_SERVICE_URL"] = "http://appointments.local",
                ["INTERNAL_API_KEY"] = "test-key"
            })
            .Build();

        var httpClientFactory = new FakeHttpClientFactory(relationAllowed);

        var controller = new FilesController(
            metadata,
            storage,
            httpClientFactory,
            configuration
        );

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = User(role, domainId)
            }
        };

        return controller;
    }

    [Fact]
    public async Task GetAll_ShouldReturnPatientFiles_WhenRequesterIsPatient()
    {
        var metadata = new FakeMetadataService();
        metadata.Files.Add(new ClinicalFile
        {
            Id = "f1",
            PatientId = "p1",
            OriginalName = "patient.pdf",
            ContentType = "application/pdf",
            StoragePath = "/tmp/patient.pdf"
        });

        var controller = CreateController(
            metadata,
            new FakeStorageService(),
            role: "PATIENT",
            domainId: "p1"
        );

        var result = await controller.GetAll(null);

        var ok = Assert.IsType<OkObjectResult>(result);
        var files = Assert.IsAssignableFrom<IEnumerable<ClinicalFile>>(ok.Value);

        Assert.Single(files);
        Assert.Equal("p1", files.First().PatientId);
    }

    [Fact]
    public async Task GetAll_ShouldReturnBadRequest_WhenDentistDoesNotSendPatientId()
    {
        var controller = CreateController(
            new FakeMetadataService(),
            new FakeStorageService(),
            role: "DENTIST",
            domainId: "d1"
        );

        var result = await controller.GetAll(null);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task GetAll_ShouldForbid_WhenDentistHasNoRelationWithPatient()
    {
        var controller = CreateController(
            new FakeMetadataService(),
            new FakeStorageService(),
            role: "DENTIST",
            domainId: "d1",
            relationAllowed: false
        );

        var result = await controller.GetAll("p1");

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task GetAll_ShouldReturnFiles_WhenDentistHasRelationWithPatient()
    {
        var metadata = new FakeMetadataService();
        metadata.Files.Add(new ClinicalFile
        {
            Id = "f1",
            PatientId = "p1",
            OriginalName = "clinical.pdf",
            ContentType = "application/pdf",
            StoragePath = "/tmp/clinical.pdf"
        });

        var controller = CreateController(
            metadata,
            new FakeStorageService(),
            role: "DENTIST",
            domainId: "d1",
            relationAllowed: true
        );

        var result = await controller.GetAll("p1");

        var ok = Assert.IsType<OkObjectResult>(result);
        var files = Assert.IsAssignableFrom<IEnumerable<ClinicalFile>>(ok.Value);

        Assert.Single(files);
        Assert.Equal("p1", files.First().PatientId);
    }

    [Fact]
    public async Task GetById_ShouldReturnNotFound_WhenFileDoesNotExist()
    {
        var controller = CreateController(
            new FakeMetadataService(),
            new FakeStorageService(),
            role: "ADMIN",
            domainId: "admin1"
        );

        var result = await controller.GetById("missing");

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetById_ShouldForbid_WhenPatientTriesToAccessOtherPatientFile()
    {
        var metadata = new FakeMetadataService();
        metadata.Files.Add(new ClinicalFile
        {
            Id = "f1",
            PatientId = "p2",
            OriginalName = "other.pdf",
            ContentType = "application/pdf",
            StoragePath = "/tmp/other.pdf"
        });

        var controller = CreateController(
            metadata,
            new FakeStorageService(),
            role: "PATIENT",
            domainId: "p1"
        );

        var result = await controller.GetById("f1");

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task GetById_ShouldReturnFileMetadata_WhenPatientOwnsFile()
    {
        var metadata = new FakeMetadataService();
        metadata.Files.Add(new ClinicalFile
        {
            Id = "f1",
            PatientId = "p1",
            OriginalName = "own.pdf",
            ContentType = "application/pdf",
            StoragePath = "/tmp/own.pdf"
        });

        var controller = CreateController(
            metadata,
            new FakeStorageService(),
            role: "PATIENT",
            domainId: "p1"
        );

        var result = await controller.GetById("f1");

        var ok = Assert.IsType<OkObjectResult>(result);
        var file = Assert.IsType<ClinicalFile>(ok.Value);

        Assert.Equal("f1", file.Id);
        Assert.Equal("p1", file.PatientId);
    }

    [Fact]
    public async Task Delete_ShouldSoftDeleteAndRemovePhysicalFile_WhenPatientOwnsFile()
    {
        var metadata = new FakeMetadataService();
        var storage = new FakeStorageService();

        metadata.Files.Add(new ClinicalFile
        {
            Id = "f1",
            PatientId = "p1",
            OriginalName = "own.pdf",
            ContentType = "application/pdf",
            StoragePath = "/tmp/own.pdf"
        });

        storage.ExistingPaths.Add("/tmp/own.pdf");

        var controller = CreateController(
            metadata,
            storage,
            role: "PATIENT",
            domainId: "p1"
        );

        var result = await controller.Delete("f1");

        Assert.IsType<NoContentResult>(result);
        Assert.Contains("f1", metadata.SoftDeletedIds);
        Assert.Contains("/tmp/own.pdf", storage.DeletedPaths);
    }

    [Fact]
    public async Task Upload_ShouldRejectUnsupportedContentType()
    {
        var controller = CreateController(
            new FakeMetadataService(),
            new FakeStorageService(),
            role: "PATIENT",
            domainId: "p1"
        );

        var result = await controller.Upload(new FileUploadRequest
        {
            File = FormFile("malware.exe", "application/x-msdownload")
        });

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status415UnsupportedMediaType, objectResult.StatusCode);
    }

    [Fact]
    public async Task Upload_ShouldForcePatientIdFromToken_WhenRequesterIsPatient()
    {
        var metadata = new FakeMetadataService();
        var storage = new FakeStorageService();

        var controller = CreateController(
            metadata,
            storage,
            role: "PATIENT",
            domainId: "p1"
        );

        var result = await controller.Upload(new FileUploadRequest
        {
            File = FormFile(),
            PatientId = "p2"
        });

        var created = Assert.IsType<CreatedAtActionResult>(result);
        var file = Assert.IsType<ClinicalFile>(created.Value);

        Assert.Equal("p1", file.PatientId);
        Assert.Equal("PATIENT", file.UploadedByRole);
        Assert.Single(metadata.Files);
    }

    private sealed class FakeMetadataService : IFileMetadataService
    {
        public List<ClinicalFile> Files { get; } = new();
        public List<string> SoftDeletedIds { get; } = new();

        public Task<ClinicalFile> CreateAsync(ClinicalFile file)
        {
            file.Id ??= $"f{Files.Count + 1}";
            Files.Add(file);
            return Task.FromResult(file);
        }

        public Task<List<ClinicalFile>> FindByPatientAsync(string patientId)
        {
            return Task.FromResult(
                Files
                    .Where(file => file.PatientId == patientId && file.DeletedAt == null)
                    .OrderByDescending(file => file.CreatedAt)
                    .ToList()
            );
        }

        public Task<List<ClinicalFile>> FindAllAsync()
        {
            return Task.FromResult(
                Files
                    .Where(file => file.DeletedAt == null)
                    .OrderByDescending(file => file.CreatedAt)
                    .ToList()
            );
        }

        public Task<ClinicalFile?> FindByIdAsync(string id)
        {
            return Task.FromResult(
                Files.FirstOrDefault(file => file.Id == id && file.DeletedAt == null)
            );
        }

        public Task SoftDeleteAsync(string id)
        {
            SoftDeletedIds.Add(id);

            var file = Files.FirstOrDefault(item => item.Id == id);
            if (file != null)
            {
                file.DeletedAt = DateTime.UtcNow;
            }

            return Task.CompletedTask;
        }
    }

    private sealed class FakeStorageService : IFileStorageService
    {
        public HashSet<string> ExistingPaths { get; } = new();
        public List<string> DeletedPaths { get; } = new();

        public Task<(string StoredName, string FullPath)> SaveAsync(IFormFile file)
        {
            var storedName = $"stored-{file.FileName}";
            var fullPath = $"/tmp/{storedName}";
            ExistingPaths.Add(fullPath);

            return Task.FromResult((storedName, fullPath));
        }

        public bool Exists(string fullPath)
        {
            return ExistingPaths.Contains(fullPath);
        }

        public void Delete(string fullPath)
        {
            DeletedPaths.Add(fullPath);
            ExistingPaths.Remove(fullPath);
        }
    }

    private sealed class FakeHttpClientFactory : IHttpClientFactory
    {
        private readonly bool _relationAllowed;

        public FakeHttpClientFactory(bool relationAllowed)
        {
            _relationAllowed = relationAllowed;
        }

        public HttpClient CreateClient(string name)
        {
            return new HttpClient(new FakeRelationHandler(_relationAllowed));
        }
    }

    private sealed class FakeRelationHandler : HttpMessageHandler
    {
        private readonly bool _allowed;

        public FakeRelationHandler(bool allowed)
        {
            _allowed = allowed;
        }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var json = JsonSerializer.Serialize(new { allowed = _allowed });

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            });
        }
    }
}