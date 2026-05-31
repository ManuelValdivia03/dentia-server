using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

namespace FilesService.DTOs;

public class FileUploadRequest
{
    [Required]
    [FromForm(Name = "file")]
    public IFormFile File { get; set; } = null!;

    [Required]
    [FromForm(Name = "patientId")]
    public string PatientId { get; set; } = string.Empty;
}