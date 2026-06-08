using System.Text.Json;

namespace ChatService.Services;

public interface IAppointmentsRelationClient
{
    Task<bool> HasPatientDentistRelationAsync(string patientId, string dentistId);
}

public class AppointmentsRelationClient : IAppointmentsRelationClient
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public AppointmentsRelationClient(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task<bool> HasPatientDentistRelationAsync(string patientId, string dentistId)
    {
        if (string.IsNullOrWhiteSpace(patientId) || string.IsNullOrWhiteSpace(dentistId))
        {
            return false;
        }

        var baseUrl = _configuration["APPOINTMENTS_SERVICE_URL"] ?? "http://appointments-service:3002";
        var internalKey = _configuration["INTERNAL_API_KEY"] ?? "dev-internal-key";

        var url =
            $"{baseUrl}/internal/relationships/patient-dentist" +
            $"?patientId={Uri.EscapeDataString(patientId)}" +
            $"&dentistId={Uri.EscapeDataString(dentistId)}";

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("x-internal-api-key", internalKey);

            using var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                return false;
            }

            await using var stream = await response.Content.ReadAsStreamAsync();

            var result = await JsonSerializer.DeserializeAsync<RelationResponse>(
                stream,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return result?.Allowed == true;
        }
        catch
        {
            return false;
        }
    }

    private sealed class RelationResponse
    {
        public bool Allowed { get; set; }
    }
}
