using System.Text;
using System.Text.Json;
using Dentia.Appointments.Api.Domain.Entities;
using RabbitMQ.Client;

namespace Dentia.Appointments.Api.Application.Events;

public interface IAppointmentEventsPublisher
{
    Task PublishAppointmentCreatedAsync(Appointment appointment);
    Task PublishAppointmentConfirmedAsync(Appointment appointment);
    Task PublishAppointmentCancelledAsync(Appointment appointment);
    Task PublishAppointmentRescheduledAsync(Appointment appointment);
}

public class AppointmentEventsPublisher : IAppointmentEventsPublisher
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<AppointmentEventsPublisher> _logger;

    public AppointmentEventsPublisher(
        IConfiguration configuration,
        ILogger<AppointmentEventsPublisher> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task PublishAppointmentCreatedAsync(Appointment appointment)
    {
        await PublishAppointmentEventAsync(AppointmentEventTypes.Created, appointment);
    }

    public async Task PublishAppointmentConfirmedAsync(Appointment appointment)
    {
        await PublishAppointmentEventAsync(AppointmentEventTypes.Confirmed, appointment);
    }

    public async Task PublishAppointmentCancelledAsync(Appointment appointment)
    {
        await PublishAppointmentEventAsync(AppointmentEventTypes.Cancelled, appointment);
    }

    public async Task PublishAppointmentRescheduledAsync(Appointment appointment)
    {
        await PublishAppointmentEventAsync(AppointmentEventTypes.Rescheduled, appointment);
    }

    private async Task PublishAppointmentEventAsync(string eventType, Appointment appointment)
    {
        var rabbitMqUrl = _configuration["RABBITMQ_URL"];

        if (string.IsNullOrWhiteSpace(rabbitMqUrl))
        {
            _logger.LogWarning(
                "RABBITMQ_URL is not configured. {EventType} was not published: {AppointmentId}",
                eventType,
                appointment.Id
            );

            return;
        }

        var queueName =
            _configuration["RABBITMQ_QUEUE_APPOINTMENTS"] ?? "appointments_events";

        try
        {
            var factory = new ConnectionFactory
            {
                Uri = new Uri(rabbitMqUrl)
            };

            await using var connection = await factory.CreateConnectionAsync();
            await using var channel = await connection.CreateChannelAsync();

            await channel.QueueDeclareAsync(
                queue: queueName,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null
            );

            var eventPayload = new AppointmentCreatedEvent
            {
                Type = eventType,
                Data = new AppointmentCreatedEventData
                {
                    AppointmentId = appointment.Id.ToString(),
                    PatientId = appointment.PatientId,
                    DentistId = appointment.DentistId,
                    StartAt = appointment.StartAt.ToString("O"),
                    EndAt = appointment.EndAt.ToString("O"),
                    Status = appointment.Status.ToString()
                }
            };

            var json = JsonSerializer.Serialize(eventPayload);
            var body = Encoding.UTF8.GetBytes(json);

            var properties = new BasicProperties
            {
                ContentType = "application/json",
                DeliveryMode = DeliveryModes.Persistent
            };

            await channel.BasicPublishAsync(
                exchange: string.Empty,
                routingKey: queueName,
                mandatory: false,
                basicProperties: properties,
                body: body
            );

            _logger.LogInformation(
                "{EventType} published to RabbitMQ: {AppointmentId}",
                eventType,
                appointment.Id
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "RabbitMQ unavailable. {EventType} was not published: {AppointmentId}",
                eventType,
                appointment.Id
            );
        }
    }
}
