using FilesService.Models;

namespace FilesService.Services;

public interface IFileMetadataService
{
    Task<ClinicalFile> CreateAsync(ClinicalFile file);
    Task<List<ClinicalFile>> FindByPatientAsync(string patientId);
    Task<List<ClinicalFile>> FindAllAsync();
    Task<ClinicalFile?> FindByIdAsync(string id);
    Task SoftDeleteAsync(string id);
}