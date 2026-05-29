using ChatService.Common;

namespace ChatService.Security;

public interface ICurrentUserService
{
    CurrentUser Get();
}

// Trusts the identity headers forwarded by the API gateway (x-user-id / x-user-role).
// Mirrors the NestJS InternalAuthGuard + @CurrentUser() decorator. No JWT validation here.
public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public CurrentUser Get()
    {
        var headers = _httpContextAccessor.HttpContext?.Request.Headers;

        var id = headers?["x-user-id"].FirstOrDefault();
        var role = headers?["x-user-role"].FirstOrDefault();

        if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(role))
        {
            throw new AppException(StatusCodes.Status401Unauthorized, "Missing user identity headers");
        }

        role = role.ToUpperInvariant();

        if (!UserRoles.IsValid(role))
        {
            throw new AppException(StatusCodes.Status401Unauthorized, "Invalid user role");
        }

        return new CurrentUser { Id = id, Role = role };
    }
}
