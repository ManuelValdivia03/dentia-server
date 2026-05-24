namespace Dentia.Appointments.Api.Application.Security;

public static class UserRoles
{
    public const string Admin = "ADMIN";
    public const string Dentist = "DENTIST";
    public const string Patient = "PATIENT";
}

public class RequestUser
{
    public string Sub { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public string DomainId { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;
}