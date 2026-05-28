using Dentia.Appointments.Api.Application.DTOs;
using Dentia.Appointments.Api.Application.Security;
using Dentia.Appointments.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Dentia.Appointments.Api.Controllers;

[ApiController]
[Authorize]
[Route("")]
public class RatingsController : ControllerBase
{
    private readonly IRatingsService _ratingsService;
    private readonly ICurrentUserService _currentUserService;

    public RatingsController(
        IRatingsService ratingsService,
        ICurrentUserService currentUserService)
    {
        _ratingsService = ratingsService;
        _currentUserService = currentUserService;
    }

    [HttpPost("appointments/{appointmentId:guid}/rating")]
    [Authorize(Roles = UserRoles.Patient)]
    public async Task<IActionResult> Create(
        [FromRoute] Guid appointmentId,
        [FromBody] CreateAppointmentRatingDto dto)
    {
        var requester = _currentUserService.GetCurrentUser();
        var result = await _ratingsService.CreateAsync(appointmentId, dto, requester);

        return Created($"/appointments/{appointmentId}/rating", result);
    }

    [HttpGet("dentists/{dentistId}/ratings/summary")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Patient},{UserRoles.Dentist}")]
    public async Task<IActionResult> GetDentistSummary([FromRoute] string dentistId)
    {
        var requester = _currentUserService.GetCurrentUser();
        var result = await _ratingsService.GetDentistSummaryAsync(dentistId, requester);

        return Ok(result);
    }
}