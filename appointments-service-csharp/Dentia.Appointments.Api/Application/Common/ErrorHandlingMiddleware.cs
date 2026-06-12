using System.Text.Json;

namespace Dentia.Appointments.Api.Application.Common;

public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;

    public ErrorHandlingMiddleware(
        RequestDelegate next,
        ILogger<ErrorHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AppException ex)
        {
            await WriteError(context, ex.StatusCode, ex.Message);
        }
        catch (KeyNotFoundException)
        {
            await WriteError(
                context,
                StatusCodes.Status404NotFound,
                "The requested resource was not found"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Unhandled error processing {Method} {Path}",
                context.Request.Method,
                context.Request.Path
            );

            await WriteError(
                context,
                StatusCodes.Status500InternalServerError,
                "An unexpected error occurred"
            );
        }
    }

    private static async Task WriteError(HttpContext context, int statusCode, string message)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var body = JsonSerializer.Serialize(new
        {
            statusCode,
            message
        });

        await context.Response.WriteAsync(body);
    }
}
