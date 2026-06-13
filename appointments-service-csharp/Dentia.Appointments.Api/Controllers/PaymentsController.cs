using Dentia.Appointments.Api.Application.DTOs;
using Dentia.Appointments.Api.Application.Security;
using Dentia.Appointments.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Dentia.Appointments.Api.Controllers;

[ApiController]
[Authorize]
[Route("payments")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentsService _paymentsService;
    private readonly ICurrentUserService _currentUserService;

    public PaymentsController(
        IPaymentsService paymentsService,
        ICurrentUserService currentUserService)
    {
        _paymentsService = paymentsService;
        _currentUserService = currentUserService;
    }

    [HttpPost("appointments/{appointmentId:guid}")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Dentist}")]
    public async Task<IActionResult> Create(
        [FromRoute] Guid appointmentId,
        [FromBody] CreateAppointmentPaymentDto dto)
    {
        var requester = _currentUserService.GetCurrentUser();
        var result = await _paymentsService.CreateAsync(appointmentId, dto, requester);
        return CreatedAtAction(nameof(GetCashCut), result);
    }

    [HttpGet]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Dentist}")]
    public async Task<IActionResult> GetCashCut(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] string? dentistId)
    {
        var requester = _currentUserService.GetCurrentUser();
        var result = await _paymentsService.GetCashCutAsync(from, to, dentistId, requester);
        return Ok(result);
    }
}
