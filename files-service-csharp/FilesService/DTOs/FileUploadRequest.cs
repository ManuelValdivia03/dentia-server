using System.ComponentModel.DataAnnotations;

namespace FilesService.DTOs;

public class FileUploadRequest
{
    [Required]
    public IFormFile File { get; set; } = null!;

    [Required]
    public string PatientId { get; set; } = string.Empty;
}