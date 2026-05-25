using Dentia.Appointments.Api.Application.Common;
using Dentia.Appointments.Api.Application.DTOs;
using Dentia.Appointments.Api.Application.Events;
using Dentia.Appointments.Api.Application.Reports;
using Dentia.Appointments.Api.Application.Security;
using Dentia.Appointments.Api.Application.Services;
using Dentia.Appointments.Api.Domain.Entities;
using Dentia.Appointments.Api.Domain.Enums;
using Dentia.Appointments.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Dentia.Appointments.Tests;

public class AppointmentsServiceTests
{
    private static AppointmentsDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppointmentsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppointmentsDbContext(options);
    }

    private static RequestUser Patient(string domainId = "p1")
    {
        return new RequestUser
        {
            Sub = "u-patient",
            Role = UserRoles.Patient,
            DomainId = domainId,
            Email = "patient1@dentia.local"
        };
    }

    private static RequestUser Dentist(string domainId = "d1")
    {
        return new RequestUser
        {
            Sub = "u-dentist",
            Role = UserRoles.Dentist,
            DomainId = domainId,
            Email = "dentist1@dentia.local"
        };
    }

    private static RequestUser Admin()
    {
        return new RequestUser
        {
            Sub = "u-admin",
            Role = UserRoles.Admin,
            DomainId = "admin1",
            Email = "admin@dentia.local"
        };
    }

    private static AppointmentsService CreateService(
        AppointmentsDbContext db,
        FakeReportsClient? reportsClient = null,
        FakeAppointmentEventsPublisher? eventsPublisher = null)
    {
        return new AppointmentsService(
            db,
            reportsClient ?? new FakeReportsClient(),
            eventsPublisher ?? new FakeAppointmentEventsPublisher()
        );
    }

    [Fact]
    public async Task CreateAsync_ShouldCreateAppointment_WhenThereIsNoOverlap()
    {
        await using var db = CreateDbContext();
        var reportsClient = new FakeReportsClient();
        var eventsPublisher = new FakeAppointmentEventsPublisher();
        var service = CreateService(db, reportsClient, eventsPublisher);

        var dto = new CreateAppointmentDto
        {
            PatientId = "p1",
            DentistId = "d1",
            StartAt = DateTime.Parse("2026-05-01T10:00:00Z"),
            EndAt = DateTime.Parse("2026-05-01T11:00:00Z"),
            Reason = "Limpieza",
            Notes = "Prueba"
        };

        var result = await service.CreateAsync(dto, Patient("p1"));

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("p1", result.PatientId);
        Assert.Equal("d1", result.DentistId);
        Assert.Equal(AppointmentStatus.PENDING, result.Status);
        Assert.Single(db.Appointments);
        Assert.Single(reportsClient.SnapshotsSent);
        Assert.Single(eventsPublisher.CreatedEvents);
    }

    [Fact]
    public async Task CreateAsync_ShouldThrow409_WhenDentistHasOverlappingAppointment()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);

        await service.CreateAsync(
            new CreateAppointmentDto
            {
                PatientId = "p1",
                DentistId = "d1",
                StartAt = DateTime.Parse("2026-05-02T10:00:00Z"),
                EndAt = DateTime.Parse("2026-05-02T11:00:00Z"),
                Reason = "Primera cita"
            },
            Patient("p1")
        );

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.CreateAsync(
                new CreateAppointmentDto
                {
                    PatientId = "p1",
                    DentistId = "d1",
                    StartAt = DateTime.Parse("2026-05-02T10:30:00Z"),
                    EndAt = DateTime.Parse("2026-05-02T11:30:00Z"),
                    Reason = "Empalme"
                },
                Patient("p1")
            )
        );

        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("Dentist already has an appointment in this time range", ex.Message);
    }

    [Fact]
    public async Task FindAllAsync_ShouldReturnOnlyPatientAppointments_WhenRequesterIsPatient()
    {
        await using var db = CreateDbContext();

        db.Appointments.AddRange(
            new Appointment
            {
                Id = Guid.NewGuid(),
                PatientId = "p1",
                DentistId = "d1",
                StartAt = DateTime.Parse("2026-05-03T10:00:00"),
                EndAt = DateTime.Parse("2026-05-03T11:00:00"),
                Status = AppointmentStatus.PENDING
            },
            new Appointment
            {
                Id = Guid.NewGuid(),
                PatientId = "p2",
                DentistId = "d1",
                StartAt = DateTime.Parse("2026-05-04T10:00:00"),
                EndAt = DateTime.Parse("2026-05-04T11:00:00"),
                Status = AppointmentStatus.PENDING
            }
        );

        await db.SaveChangesAsync();

        var service = CreateService(db);

        var result = await service.FindAllAsync(Patient("p1"));

        Assert.Single(result);
        Assert.All(result, appointment => Assert.Equal("p1", appointment.PatientId));
    }

    [Fact]
    public async Task HasPatientDentistRelationAsync_ShouldReturnTrue_WhenAppointmentIsConfirmedOrCompleted()
    {
        await using var db = CreateDbContext();

        db.Appointments.Add(new Appointment
        {
            Id = Guid.NewGuid(),
            PatientId = "p1",
            DentistId = "d1",
            StartAt = DateTime.Parse("2026-05-05T10:00:00"),
            EndAt = DateTime.Parse("2026-05-05T11:00:00"),
            Status = AppointmentStatus.CONFIRMED
        });

        await db.SaveChangesAsync();

        var service = CreateService(db);

        var result = await service.HasPatientDentistRelationAsync("p1", "d1");

        var allowedProperty = result.GetType().GetProperty("allowed");
        var allowed = allowedProperty?.GetValue(result);

        Assert.Equal(true, allowed);
    }

    [Fact]
    public async Task HasPatientDentistRelationAsync_ShouldReturnFalse_WhenAppointmentIsOnlyPending()
    {
        await using var db = CreateDbContext();

        db.Appointments.Add(new Appointment
        {
            Id = Guid.NewGuid(),
            PatientId = "p1",
            DentistId = "d1",
            StartAt = DateTime.Parse("2026-05-06T10:00:00"),
            EndAt = DateTime.Parse("2026-05-06T11:00:00"),
            Status = AppointmentStatus.PENDING
        });

        await db.SaveChangesAsync();

        var service = CreateService(db);

        var result = await service.HasPatientDentistRelationAsync("p1", "d1");

        var allowedProperty = result.GetType().GetProperty("allowed");
        var allowed = allowedProperty?.GetValue(result);

        Assert.Equal(false, allowed);
    }

    [Fact]
    public async Task CancelAsync_ShouldSetStatusToCancelled_WhenRequesterCanAccessAppointment()
    {
        await using var db = CreateDbContext();

        var appointmentId = Guid.NewGuid();

        db.Appointments.Add(new Appointment
        {
            Id = appointmentId,
            PatientId = "p1",
            DentistId = "d1",
            StartAt = DateTime.Parse("2026-05-07T10:00:00"),
            EndAt = DateTime.Parse("2026-05-07T11:00:00"),
            Status = AppointmentStatus.PENDING
        });

        await db.SaveChangesAsync();

        var reportsClient = new FakeReportsClient();
        var service = CreateService(db, reportsClient);

        var result = await service.CancelAsync(appointmentId, Patient("p1"));

        Assert.Equal(AppointmentStatus.CANCELLED, result.Status);
        Assert.Single(reportsClient.SnapshotsSent);
    }

    [Fact]
    public async Task ConfirmAsync_ShouldThrow403_WhenDentistIsNotAssigned()
    {
        await using var db = CreateDbContext();

        var appointmentId = Guid.NewGuid();

        db.Appointments.Add(new Appointment
        {
            Id = appointmentId,
            PatientId = "p1",
            DentistId = "d1",
            StartAt = DateTime.Parse("2026-05-08T10:00:00"),
            EndAt = DateTime.Parse("2026-05-08T11:00:00"),
            Status = AppointmentStatus.PENDING
        });

        await db.SaveChangesAsync();

        var service = CreateService(db);

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.ConfirmAsync(appointmentId, Dentist("d2"))
        );

        Assert.Equal(403, ex.StatusCode);
    }

    private class FakeReportsClient : IReportsClient
    {
        public List<Appointment> SnapshotsSent { get; } = new();

        public Task SendAppointmentSnapshotAsync(Appointment appointment)
        {
            SnapshotsSent.Add(appointment);
            return Task.CompletedTask;
        }
    }

    private class FakeAppointmentEventsPublisher : IAppointmentEventsPublisher
    {
        public List<Appointment> CreatedEvents { get; } = new();

        public Task PublishAppointmentCreatedAsync(Appointment appointment)
        {
            CreatedEvents.Add(appointment);
            return Task.CompletedTask;
        }
    }
}