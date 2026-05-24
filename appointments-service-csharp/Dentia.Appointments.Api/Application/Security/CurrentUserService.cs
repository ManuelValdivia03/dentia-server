using System.Security.Claims;
using Dentia.Appointments.Api.Application.Common;

namespace Dentia.Appointments.Api.Application.Security;

public interface ICurrentUserService
{
    RequestUser GetCurrentUser();
}

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public RequestUser GetCurrentUser()
    {
        var user = _httpContextAccessor.HttpContext?.User;

        if (user is null || user.Identity?.IsAuthenticated != true)
        {
            throw new AppException(StatusCodes.Status401Unauthorized, "User is not authenticated");
        }

        return new RequestUser
        {
            Sub = GetClaim(user, "sub") ?? GetClaim(user, ClaimTypes.NameIdentifier) ?? string.Empty,
            Role = GetClaim(user, "role") ?? GetClaim(user, ClaimTypes.Role) ?? string.Empty,
            DomainId = GetClaim(user, "domainId") ?? string.Empty,
            Email = GetClaim(user, "email") ?? GetClaim(user, ClaimTypes.Email) ?? string.Empty,
        };
    }

    private static string? GetClaim(ClaimsPrincipal user, string type)
    {
        return user.Claims.FirstOrDefault(x => x.Type == type)?.Value;
    }
}