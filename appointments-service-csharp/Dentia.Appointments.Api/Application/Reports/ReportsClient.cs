using System.Text;
using System.Text.Json;
using Dentia.Appointments.Api.Domain.Entities;

namespace Dentia.Appointments.Api.Application.Reports;

public interface IReportsClient
{
    Task SendAppointmentSnapshotAsync(Appointment appointment);
}

public class ReportsClient : IReportsClient
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ReportsClient> _logger;

    public ReportsClient(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<ReportsClient> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendAppointmentSnapshotAsync(Appointment appointment)
    {
        var reportsServiceUrl =
            _configuration["REPORTS_SERVICE_URL"] ?? "http://reports-service:3006";

        var internalApiKey =
            _configuration["INTERNAL_API_KEY"] ?? "dev-internal-key";

        var durationMinutes = (int)Math.Round(
            (appointment.EndAt - appointment.StartAt).TotalMinutes
        );

        var snapshot = new AppointmentReportSnapshot
        {
            AppointmentId = appointment.Id.ToString(),
            DoctorId = appointment.DentistId,
            PatientId = appointment.PatientId,
            Status = appointment.Status.ToString(),
            ScheduledAt = appointment.StartAt.ToString("O"),
            DurationMinutes = durationMinutes
        };

        try
        {
            var json = JsonSerializer.Serialize(snapshot);

            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"{reportsServiceUrl}/reports/snapshots/appointments"
            );

            request.Headers.Add("x-internal-api-key", internalApiKey);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();

                _logger.LogWarning(
                    "reports-service rejected appointment snapshot. Status={Status}. Body={Body}",
                    response.StatusCode,
                    body
                );

                return;
            }

            _logger.LogInformation(
                "Appointment snapshot sent to reports-service: {AppointmentId}",
                appointment.Id
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "reports-service unavailable. Appointment snapshot was not sent: {AppointmentId}",
                appointment.Id
            );
        }
    }
}