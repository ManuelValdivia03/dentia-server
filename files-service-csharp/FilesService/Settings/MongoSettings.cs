namespace FilesService.Settings;

public class MongoSettings
{
    public string ConnectionString { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = "dentia_files";
    public string FilesCollection { get; set; } = "clinical_files";

}