using Microsoft.AspNetCore.Mvc;

namespace ChatService.Controllers;

[ApiController]
public class HealthController : ControllerBase
{
    [HttpGet("health")]
    public IActionResult Health() => Ok(new
    {
        status = "ok",
        service = "chat-service",
        timestamp = DateTime.UtcNow.ToString("O"),
    });
}
