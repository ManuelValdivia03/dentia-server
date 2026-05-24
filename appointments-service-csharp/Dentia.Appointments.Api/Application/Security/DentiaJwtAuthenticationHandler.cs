using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Dentia.Appointments.Api.Application.Security;

public class DentiaJwtAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "DentiaJwt";

    private readonly IConfiguration _configuration;

    public DentiaJwtAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IConfiguration configuration)
        : base(options, logger, encoder)
    {
        _configuration = configuration;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authHeader = Request.Headers.Authorization.FirstOrDefault();

        if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            return Task.FromResult(AuthenticateResult.Fail("Missing bearer token"));
        }

        var token = authHeader["Bearer ".Length..].Trim();
        var parts = token.Split('.');

        if (parts.Length != 3)
        {
            return Task.FromResult(AuthenticateResult.Fail("Invalid token format"));
        }

        var headerPart = parts[0];
        var payloadPart = parts[1];
        var signaturePart = parts[2];

        try
        {
            var headerJson = Encoding.UTF8.GetString(Base64UrlDecode(headerPart));
            using var headerDoc = JsonDocument.Parse(headerJson);

            var alg = headerDoc.RootElement.TryGetProperty("alg", out var algElement)
                ? algElement.GetString()
                : null;

            if (alg != "HS256")
            {
                return Task.FromResult(AuthenticateResult.Fail("Unsupported JWT algorithm"));
            }

            var jwtSecret = _configuration["JWT_SECRET"] ?? "dentia-dev-secret";
            var signingInput = $"{headerPart}.{payloadPart}";

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(jwtSecret));
            var expectedSignatureBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(signingInput));
            var expectedSignature = Base64UrlEncode(expectedSignatureBytes);

            var expectedBytes = Encoding.UTF8.GetBytes(expectedSignature);
            var actualBytes = Encoding.UTF8.GetBytes(signaturePart);

            if (expectedBytes.Length != actualBytes.Length ||
                !CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes))
            {
                return Task.FromResult(AuthenticateResult.Fail("Invalid token signature"));
            }

            var payloadJson = Encoding.UTF8.GetString(Base64UrlDecode(payloadPart));
            using var payloadDoc = JsonDocument.Parse(payloadJson);
            var payload = payloadDoc.RootElement;

            if (!payload.TryGetProperty("exp", out var expElement))
            {
                return Task.FromResult(AuthenticateResult.Fail("Token does not contain exp"));
            }

            var exp = expElement.GetInt64();
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            if (exp < now)
            {
                return Task.FromResult(AuthenticateResult.Fail("Token expired"));
            }

            var claims = new List<Claim>();

            foreach (var property in payload.EnumerateObject())
            {
                var value = property.Value.ValueKind switch
                {
                    JsonValueKind.String => property.Value.GetString(),
                    JsonValueKind.Number => property.Value.GetRawText(),
                    JsonValueKind.True => "true",
                    JsonValueKind.False => "false",
                    _ => property.Value.GetRawText()
                };

                if (!string.IsNullOrWhiteSpace(value))
                {
                    claims.Add(new Claim(property.Name, value));
                }
            }

            var identity = new ClaimsIdentity(
                claims,
                SchemeName,
                nameType: "sub",
                roleType: "role"
            );

            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, SchemeName);

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"JWT custom auth failed: {ex.GetType().Name}");
            Console.WriteLine(ex.Message);

            return Task.FromResult(AuthenticateResult.Fail("Invalid token"));
        }
    }

    private static byte[] Base64UrlDecode(string input)
    {
        var output = input.Replace('-', '+').Replace('_', '/');

        switch (output.Length % 4)
        {
            case 2:
                output += "==";
                break;
            case 3:
                output += "=";
                break;
            case 0:
                break;
            default:
                throw new FormatException("Invalid base64url string");
        }

        return Convert.FromBase64String(output);
    }

    private static string Base64UrlEncode(byte[] input)
    {
        return Convert.ToBase64String(input)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}