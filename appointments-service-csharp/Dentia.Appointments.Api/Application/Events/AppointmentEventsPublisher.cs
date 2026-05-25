using System.Text;
using System.Text.Json;
using Dentia.Appointments.Api.Domain.Entities;
using RabbitMQ.Client;

namespace Dentia.Appointments.Api.Application.Events;

public interface IAppointmentEventsPublisher
{
    Task PublishAppointmentCreatedAsync(Appointment appointment);
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
        var rabbitMqUrl = _configuration["RABBITMQ_URL"];

        if (string.IsNullOrWhiteSpace(rabbitMqUrl))
        {
            _logger.LogWarning(
                "RABBITMQ_URL is not configured. appointment.created was not published: {AppointmentId}",
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
                "appointment.created published to RabbitMQ: {AppointmentId}",
                appointment.Id
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "RabbitMQ unavailable. appointment.created was not published: {AppointmentId}",
                appointment.Id
            );
        }
    }
}