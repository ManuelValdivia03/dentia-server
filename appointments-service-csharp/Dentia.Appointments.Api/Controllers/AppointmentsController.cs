using Dentia.Appointments.Api.Application.DTOs;
using Dentia.Appointments.Api.Application.Security;
using Dentia.Appointments.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Dentia.Appointments.Api.Controllers;

[ApiController]
[Authorize]
[Route("appointments")]
public class AppointmentsController : ControllerBase
{
    private readonly IAppointmentsService _appointmentsService;
    private readonly ICurrentUserService _currentUserService;

    public AppointmentsController(
        IAppointmentsService appointmentsService,
        ICurrentUserService currentUserService)
    {
        _appointmentsService = appointmentsService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Patient},{UserRoles.Dentist}")]
    public async Task<IActionResult> FindAll()
    {
        var requester = _currentUserService.GetCurrentUser();
        var result = await _appointmentsService.FindAllAsync(requester);
        return Ok(result);
    }

    [HttpGet("availability")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Patient},{UserRoles.Dentist}")]
    public async Task<IActionResult> GetAvailability(
        [FromQuery] string dentistId,
        [FromQuery] string date)
    {
        var requester = _currentUserService.GetCurrentUser();
        var result = await _appointmentsService.GetAvailabilityAsync(dentistId, date, requester);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Patient},{UserRoles.Dentist}")]
    public async Task<IActionResult> FindOne([FromRoute] Guid id)
    {
        var requester = _currentUserService.GetCurrentUser();
        var result = await _appointmentsService.FindOneAsync(id, requester);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Patient}")]
    public async Task<IActionResult> Create([FromBody] CreateAppointmentDto dto)
    {
        var requester = _currentUserService.GetCurrentUser();

        if (requester.Role == UserRoles.Patient)
        {
            dto.PatientId = requester.DomainId;
        }

        var result = await _appointmentsService.CreateAsync(dto, requester);
        return CreatedAtAction(nameof(FindOne), new { id = result.Id }, result);
    }

    [HttpPatch("{id:guid}/reschedule")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Patient}")]
    public async Task<IActionResult> Reschedule(
        [FromRoute] Guid id,
        [FromBody] RescheduleAppointmentDto dto)
    {
        var requester = _currentUserService.GetCurrentUser();
        var result = await _appointmentsService.RescheduleAsync(id, dto, requester);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/cancel")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Patient},{UserRoles.Dentist}")]
    public async Task<IActionResult> Cancel([FromRoute] Guid id)
    {
        var requester = _currentUserService.GetCurrentUser();
        var result = await _appointmentsService.CancelAsync(id, requester);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/confirm")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Dentist}")]
    public async Task<IActionResult> Confirm([FromRoute] Guid id)
    {
        var requester = _currentUserService.GetCurrentUser();
        var result = await _appointmentsService.ConfirmAsync(id, requester);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/complete")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Dentist}")]
    public async Task<IActionResult> Complete([FromRoute] Guid id)
    {
        var requester = _currentUserService.GetCurrentUser();
        var result = await _appointmentsService.CompleteAsync(id, requester);
        return Ok(result);
    }
}