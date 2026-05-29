using ChatService.Common;
using ChatService.Security;
using ChatService.Services;
using ChatService.Settings;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<MongoSettings>(builder.Configuration.GetSection("Mongo"));

// Mongo access is process-wide; a single repository holds the collections.
builder.Services.AddSingleton<IChatRepository, ChatRepository>();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IChatMessagingService, ChatMessagingService>();

builder.Services.AddHttpClient<IAppointmentsRelationClient, AppointmentsRelationClient>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseMiddleware<ErrorHandlingMiddleware>();

app.UseSwagger();
app.UseSwaggerUI();

app.MapControllers();

app.Run();
