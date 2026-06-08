namespace ChatService.Security;

public class CurrentUser
{
    public string Id { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
}

public static class UserRoles
{
    public const string Admin = "ADMIN";
    public const string Dentist = "DENTIST";
    public const string Patient = "PATIENT";

    public static bool IsValid(string role) =>
        role is Admin or Dentist or Patient;
}
