using System.Text.Json.Serialization;
using Dentia.Appointments.Api.Application.Common;
using Dentia.Appointments.Api.Application.Security;
using Dentia.Appointments.Api.Application.Services;
using Dentia.Appointments.Api.Application.Events;
using Dentia.Appointments.Api.Domain.Enums;
using Dentia.Appointments.Api.Infrastructure.Persistence;
using Dentia.Appointments.Api.Application.Reports;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// Database
var dbHost = builder.Configuration["DB_HOST"] ?? "localhost";
var dbPort = builder.Configuration["DB_PORT"] ?? "5432";
var dbUser = builder.Configuration["DB_USER"] ?? "dentia";
var dbPassword = builder.Configuration["DB_PASSWORD"] ?? "dentia123";
var dbName = builder.Configuration["DB_NAME"] ?? "dentia_appointments";

var connectionString =
    builder.Configuration.GetConnectionString("AppointmentsDb") ??
    $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword}";

var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.MapEnum<AppointmentStatus>("appointments_status_enum");
var dataSource = dataSourceBuilder.Build();

builder.Services.AddDbContext<AppointmentsDbContext>(options =>
{
    options.UseNpgsql(dataSource);
});

// Controllers / JSON
builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// Application services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IAppointmentsService, AppointmentsService>();
builder.Services.AddScoped<IAppointmentEventsPublisher, AppointmentEventsPublisher>();
builder.Services.AddHttpClient<IReportsClient, ReportsClient>();
// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Pega solo el token JWT. No escribas Bearer."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Auth
builder.Services
    .AddAuthentication(DentiaJwtAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, DentiaJwtAuthenticationHandler>(
        DentiaJwtAuthenticationHandler.SchemeName,
        _ => { }
    );

builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppointmentsDbContext>();
    db.Database.EnsureCreated();
}

app.UseMiddleware<ErrorHandlingMiddleware>();

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/health", () => new
{
    ok = true,
    service = "appointments-service",
    timestamp = DateTime.UtcNow
});

app.Run();
