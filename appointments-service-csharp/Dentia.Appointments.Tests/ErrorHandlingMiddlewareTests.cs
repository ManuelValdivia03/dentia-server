using System.Text.Json;
using Dentia.Appointments.Api.Application.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace Dentia.Appointments.Tests;

public class ErrorHandlingMiddlewareTests
{
    [Fact]
    public async Task Invoke_ShouldHideUnexpectedExceptionDetails()
    {
        var middleware = new ErrorHandlingMiddleware(
            _ => throw new InvalidOperationException(
                "Host=db.internal;Password=secret;relation appointments does not exist"
            ),
            NullLogger<ErrorHandlingMiddleware>.Instance
        );
        var context = CreateContext();

        await middleware.Invoke(context);

        var response = await ReadResponseAsync(context);

        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
        Assert.Equal("An unexpected error occurred", response.GetProperty("message").GetString());
        Assert.DoesNotContain("secret", response.ToString(), StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("db.internal", response.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Invoke_ShouldPreserveExpectedAppExceptionMessage()
    {
        var middleware = new ErrorHandlingMiddleware(
            _ => throw new AppException(
                StatusCodes.Status409Conflict,
                "Only pending appointments can be rescheduled"
            ),
            NullLogger<ErrorHandlingMiddleware>.Instance
        );
        var context = CreateContext();

        await middleware.Invoke(context);

        var response = await ReadResponseAsync(context);

        Assert.Equal(StatusCodes.Status409Conflict, context.Response.StatusCode);
        Assert.Equal(
            "Only pending appointments can be rescheduled",
            response.GetProperty("message").GetString()
        );
    }

    [Fact]
    public async Task Invoke_ShouldHideKeyNotFoundExceptionDetails()
    {
        var middleware = new ErrorHandlingMiddleware(
            _ => throw new KeyNotFoundException("Appointment 123 and patient private-id not found"),
            NullLogger<ErrorHandlingMiddleware>.Instance
        );
        var context = CreateContext();

        await middleware.Invoke(context);

        var response = await ReadResponseAsync(context);

        Assert.Equal(StatusCodes.Status404NotFound, context.Response.StatusCode);
        Assert.Equal(
            "The requested resource was not found",
            response.GetProperty("message").GetString()
        );
        Assert.DoesNotContain("private-id", response.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    private static DefaultHttpContext CreateContext()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        return context;
    }

    private static async Task<JsonElement> ReadResponseAsync(HttpContext context)
    {
        context.Response.Body.Position = 0;
        using var document = await JsonDocument.ParseAsync(context.Response.Body);
        return document.RootElement.Clone();
    }
}
