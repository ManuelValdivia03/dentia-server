using System.Security.Claims;
using System.Text.Json;
using FilesService.DTOs;
using FilesService.Models;
using FilesService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FilesService.Controllers;

[ApiController]
[Route("api/files")]
[Authorize]
[ApiExplorerSettings(GroupName = "v1")]
[Produces("application/json")]
[Tags("Files")]
public class FilesController : ControllerBase
{
    private readonly IFileMetadataService _metadataService;
    private readonly IFileStorageService _storageService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    private const long MaxUploadBytes = 52_428_800;

    private static readonly string[] AllowedContentTypes =
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
        "video/mp4",
        "video/webm"
    };

    public FilesController(
        IFileMetadataService metadataService,
        IFileStorageService storageService,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _metadataService = metadataService;
        _storageService = storageService;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxUploadBytes)]
    [ProducesResponseType(typeof(ClinicalFile), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status413PayloadTooLarge)]
    [ProducesResponseType(StatusCodes.Status415UnsupportedMediaType)]
    public async Task<IActionResult> Upload([FromForm] FileUploadRequest request)
    {
        var file = request.File;
        var patientId = request.PatientId;

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Archivo requerido." });

        if (file.Length > MaxUploadBytes)
            return StatusCode(StatusCodes.Status413PayloadTooLarge, new { message = "El archivo excede el tamaño máximo permitido (50MB)." });

        if (!AllowedContentTypes.Contains(file.ContentType))
            return StatusCode(StatusCodes.Status415UnsupportedMediaType, new { message = "Tipo de archivo no permitido." });

        var subjectId = GetSubjectId();
        var domainId = GetDomainId();
        var role = GetRole();

        if (role == "PATIENT")
        {
            if (string.IsNullOrWhiteSpace(domainId))
                return Forbid();

            patientId = domainId;
        }

        if (role == "DENTIST")
        {
            if (string.IsNullOrWhiteSpace(patientId))
                return BadRequest(new { message = "patientId es requerido para dentista." });

            var allowed = await HasPatientDentistRelationAsync(patientId, domainId);

            if (!allowed)
                return Forbid();
        }

        if (role == "ADMIN")
        {
            if (string.IsNullOrWhiteSpace(patientId))
                return BadRequest(new { message = "patientId es requerido." });
        }

        if (role != "ADMIN" && role != "PATIENT" && role != "DENTIST")
            return Forbid();

        var saved = await _storageService.SaveAsync(file);

        var metadata = new ClinicalFile
        {
            OriginalName = file.FileName,
            StoredName = saved.StoredName,
            ContentType = file.ContentType,
            Size = file.Length,
            PatientId = patientId,
            UploadedByUserId = subjectId,
            UploadedByRole = role,
            StoragePath = saved.FullPath,
            CreatedAt = DateTime.UtcNow
        };

        await _metadataService.CreateAsync(metadata);

        return CreatedAtAction(nameof(GetById), new { id = metadata.Id }, metadata);
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ClinicalFile>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAll([FromQuery] string? patientId)
    {
        var role = GetRole();
        var domainId = GetDomainId();

        if (role == "ADMIN")
        {
            if (!string.IsNullOrWhiteSpace(patientId))
                return Ok(await _metadataService.FindByPatientAsync(patientId));

            return Ok(await _metadataService.FindAllAsync());
        }

        if (role == "PATIENT")
            return Ok(await _metadataService.FindByPatientAsync(domainId));

        if (role == "DENTIST")
        {
            if (string.IsNullOrWhiteSpace(patientId))
                return BadRequest(new { message = "patientId es requerido para dentista." });

            var allowed = await HasPatientDentistRelationAsync(patientId, domainId);

            if (!allowed)
                return Forbid();

            return Ok(await _metadataService.FindByPatientAsync(patientId));
        }

        return Forbid();
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ClinicalFile), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(string id)
    {
        var file = await _metadataService.FindByIdAsync(id);

        if (file == null)
            return NotFound();

        if (!await CanAccessAsync(file))
            return Forbid();

        return Ok(file);
    }

    [HttpGet("{id}/download")]
    [Produces("application/octet-stream")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Download(string id)
    {
        var file = await _metadataService.FindByIdAsync(id);

        if (file == null)
            return NotFound();

        if (!await CanAccessAsync(file))
            return Forbid();

        if (!_storageService.Exists(file.StoragePath))
            return NotFound(new { message = "Archivo físico no encontrado." });

        var bytes = await System.IO.File.ReadAllBytesAsync(file.StoragePath);

        return File(bytes, file.ContentType, file.OriginalName);
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(string id)
    {
        var file = await _metadataService.FindByIdAsync(id);

        if (file == null)
            return NotFound();

        if (!await CanAccessAsync(file))
            return Forbid();

        await _metadataService.SoftDeleteAsync(id);
        _storageService.Delete(file.StoragePath);

        return NoContent();
    }

    private async Task<bool> CanAccessAsync(ClinicalFile file)
    {
        var role = GetRole();
        var domainId = GetDomainId();

        return role switch
        {
            "ADMIN" => true,
            "PATIENT" => file.PatientId == domainId,
            "DENTIST" => await HasPatientDentistRelationAsync(file.PatientId, domainId),
            _ => false
        };
    }

    private async Task<bool> HasPatientDentistRelationAsync(string patientId, string dentistId)
    {
        if (string.IsNullOrWhiteSpace(patientId) || string.IsNullOrWhiteSpace(dentistId))
            return false;

        var baseUrl = _configuration["APPOINTMENTS_SERVICE_URL"] ?? "http://appointments-service:3002";
        var internalKey = _configuration["INTERNAL_API_KEY"] ?? "dev-internal-key";

        var url =
            $"{baseUrl}/internal/relationships/patient-dentist" +
            $"?patientId={Uri.EscapeDataString(patientId)}" +
            $"&dentistId={Uri.EscapeDataString(dentistId)}";

        try
        {
            var client = _httpClientFactory.CreateClient();

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("x-internal-api-key", internalKey);

            using var response = await client.SendAsync(request);

            if (!response.IsSuccessStatusCode)
                return false;

            await using var stream = await response.Content.ReadAsStreamAsync();

            var result = await JsonSerializer.DeserializeAsync<RelationResponse>(
                stream,
                new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }
            );

            return result?.Allowed == true;
        }
        catch
        {
            return false;
        }
    }

    private string GetSubjectId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? string.Empty;
    }

    private string GetDomainId()
    {
        return User.FindFirstValue("domainId") ?? string.Empty;
    }

    private string GetRole()
    {
        return (
            User.FindFirstValue(ClaimTypes.Role)
            ?? User.FindFirstValue("role")
            ?? string.Empty
        ).ToUpperInvariant();
    }

    private sealed class RelationResponse
    {
        public bool Allowed { get; set; }
    }
}
