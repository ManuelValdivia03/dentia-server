using Dentia.Appointments.Api.Application.Common;
using Dentia.Appointments.Api.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace Dentia.Appointments.Api.Controllers;

[ApiController]
[Route("internal")]
public class InternalController : ControllerBase
{
    private readonly IAppointmentsService _appointmentsService;
    private readonly IConfiguration _configuration;

    public InternalController(
        IAppointmentsService appointmentsService,
        IConfiguration configuration)
    {
        _appointmentsService = appointmentsService;
        _configuration = configuration;
    }

    [HttpGet("relationships/patient-dentist")]
    public async Task<IActionResult> CheckPatientDentistRelation(
        [FromQuery] string patientId,
        [FromQuery] string dentistId)
    {
        var apiKey = Request.Headers["x-internal-api-key"].FirstOrDefault();
        var expectedApiKey = _configuration["INTERNAL_API_KEY"] ?? "dev-internal-key";

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey != expectedApiKey)
        {
            throw new AppException(StatusCodes.Status401Unauthorized, "Invalid internal API key");
        }

        if (string.IsNullOrWhiteSpace(patientId) || string.IsNullOrWhiteSpace(dentistId))
        {
            throw new AppException(StatusCodes.Status400BadRequest, "patientId and dentistId are required");
        }

        var result = await _appointmentsService.HasPatientDentistRelationAsync(patientId, dentistId);
        return Ok(result);
    }
}