using Dentia.Appointments.Api.Application.Services;

namespace Dentia.Appointments.Api.Application.BackgroundServices;

public class ExpiredAppointmentsBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ExpiredAppointmentsBackgroundService> _logger;
    private readonly IConfiguration _configuration;

    public ExpiredAppointmentsBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<ExpiredAppointmentsBackgroundService> logger,
        IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var enabled = _configuration.GetValue(
            "EXPIRED_APPOINTMENTS_WORKER_ENABLED",
            true);

        var intervalMinutes = _configuration.GetValue(
            "EXPIRED_APPOINTMENTS_WORKER_INTERVAL_MINUTES",
            10);

        intervalMinutes = Math.Max(intervalMinutes, 1);

        if (!enabled)
        {
            _logger.LogInformation("Expired appointments background worker is disabled");
            return;
        }

        _logger.LogInformation(
            "Expired appointments background worker started. Interval: {IntervalMinutes} minutes",
            intervalMinutes);

        await RunOnceAsync(stoppingToken);

        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(intervalMinutes));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await RunOnceAsync(stoppingToken);
        }
    }

    private async Task RunOnceAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();

            var expiredAppointmentsService =
                scope.ServiceProvider.GetRequiredService<IExpiredAppointmentsService>();

            var cancelledCount =
                await expiredAppointmentsService.CancelExpiredPendingAppointmentsAsync(
                    cancellationToken: stoppingToken);

            if (cancelledCount > 0)
            {
                _logger.LogInformation(
                    "Auto-cancelled {CancelledCount} expired pending appointments",
                    cancelledCount);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // App is shutting down.
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error while auto-cancelling expired pending appointments");
        }
    }
}