using System.Security.Claims;
using FilesService.Models;
using FilesService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FilesService.DTOs;

namespace FilesService.Controllers;

[ApiController]
[Route("api/files")]
[Authorize]
public class FilesController : ControllerBase
{
    private readonly FileMetadataService _metadataService;
    private readonly FileStorageService _storageService;

    private static readonly string[] AllowedContentTypes =
    {
        "image/jpeg",
        "image/png",
        "application/pdf"
    };

    public FilesController(
        FileMetadataService metadataService,
        FileStorageService storageService)
    {
        _metadataService = metadataService;
        _storageService = storageService;
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> Upload([FromForm] FileUploadRequest request)
    {
        var file = request.File;
        var patientId = request.PatientId;

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Archivo requerido." });

        if (!AllowedContentTypes.Contains(file.ContentType))
            return BadRequest(new { message = "Tipo de archivo no permitido." });

        var userId = GetUserId();
        var role = GetRole();

        if (role == "PATIENT" && userId != patientId)
            return Forbid();

        var saved = await _storageService.SaveAsync(file);

        var metadata = new ClinicalFile
        {
            OriginalName = file.FileName,
            StoredName = saved.StoredName,
            ContentType = file.ContentType,
            Size = file.Length,
            PatientId = patientId,
            UploadedByUserId = userId,
            UploadedByRole = role,
            StoragePath = saved.FullPath,
            CreatedAt = DateTime.UtcNow
        };

        await _metadataService.CreateAsync(metadata);

        return CreatedAtAction(nameof(GetById), new { id = metadata.Id }, metadata);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? patientId)
    {
        var userId = GetUserId();
        var role = GetRole();

        if (role == "admin")
            return Ok(await _metadataService.FindAllAsync());

        if (role == "patient")
            return Ok(await _metadataService.FindByPatientAsync(userId));

        if (role == "dentist")
        {
            if (string.IsNullOrWhiteSpace(patientId))
                return BadRequest(new { message = "patientId es requerido para dentista." });

            return Ok(await _metadataService.FindByPatientAsync(patientId));
        }

        return Forbid();
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var file = await _metadataService.FindByIdAsync(id);

        if (file == null)
            return NotFound();

        if (!CanAccess(file))
            return Forbid();

        return Ok(file);
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> Download(string id)
    {
        var file = await _metadataService.FindByIdAsync(id);

        if (file == null)
            return NotFound();

        if (!CanAccess(file))
            return Forbid();

        if (!_storageService.Exists(file.StoragePath))
            return NotFound(new { message = "Archivo físico no encontrado." });

        var bytes = await System.IO.File.ReadAllBytesAsync(file.StoragePath);

        return File(bytes, file.ContentType, file.OriginalName);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var file = await _metadataService.FindByIdAsync(id);

        if (file == null)
            return NotFound();

        if (!CanAccess(file))
            return Forbid();

        await _metadataService.SoftDeleteAsync(id);
        _storageService.Delete(file.StoragePath);

        return NoContent();
    }

    private bool CanAccess(ClinicalFile file)
    {
        var userId = GetUserId();
        var role = GetRole();

        return role switch
        {
            "ADMIN" => true,
            "PATIENT" => file.PatientId == userId,
            "DENTIST" => true,
            _ => false
        };
    }

    private string GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? string.Empty;
    }

    private string GetRole()
    {
        return (
            User.FindFirstValue(ClaimTypes.Role)
            ?? User.FindFirstValue("role")
            ?? string.Empty
        ).ToUpperInvariant();
    }
}