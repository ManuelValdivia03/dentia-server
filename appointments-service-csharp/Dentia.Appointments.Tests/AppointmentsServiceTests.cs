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
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Dentia.Appointments.Tests;

public class AppointmentsServiceTests
{
    private static AppointmentsDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppointmentsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(warnings =>
                warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
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

    private static DateTime FutureDate(int daysFromNow, int hour = 10)
    {
        return DateTime.UtcNow.Date.AddDays(daysFromNow).AddHours(hour);
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
            StartAt = FutureDate(7),
            EndAt = FutureDate(7, 11),
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
    public async Task CreateAsync_ShouldAllowMultiplePendingRequestsForSameSlot()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);

        var startAt = FutureDate(8);
        var endAt = FutureDate(8, 11);

        var first = await service.CreateAsync(
            new CreateAppointmentDto
            {
                PatientId = "p1",
                DentistId = "d1",
                StartAt = startAt,
                EndAt = endAt,
                Reason = "Primera solicitud"
            },
            Patient("p1")
        );

        var second = await service.CreateAsync(
            new CreateAppointmentDto
            {
                PatientId = "p2",
                DentistId = "d1",
                StartAt = startAt,
                EndAt = endAt,
                Reason = "Segunda solicitud"
            },
            Patient("p2")
        );

        Assert.Equal(AppointmentStatus.PENDING, first.Status);
        Assert.Equal(AppointmentStatus.PENDING, second.Status);
        Assert.Equal(2, await db.Appointments.CountAsync());
    }

    [Fact]
    public async Task CreateAsync_ShouldThrow409_WhenDentistHasConfirmedOverlappingAppointment()
    {
        await using var db = CreateDbContext();

        var startAt = FutureDate(8);
        var endAt = FutureDate(8, 11);

        db.Appointments.Add(new Appointment
        {
            Id = Guid.NewGuid(),
            PatientId = "p1",
            DentistId = "d1",
            StartAt = startAt,
            EndAt = endAt,
            Status = AppointmentStatus.CONFIRMED,
            Reason = "Cita confirmada"
        });

        await db.SaveChangesAsync();
        var service = CreateService(db);
        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.CreateAsync(
                new CreateAppointmentDto
                {
                    PatientId = "p2",
                    DentistId = "d1",
                    StartAt = startAt.AddMinutes(30),
                    EndAt = endAt.AddMinutes(30),
                    Reason = "Solicitud empalmada"
                },
                Patient("p2")
            )
        );

        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("Dentist already has an appointment in this time range", ex.Message);
    }

    [Fact]
    public async Task GetAvailabilityAsync_ShouldIgnorePendingRequestsAndBlockConfirmedAppointments()
    {
        await using var db = CreateDbContext();

        var date = DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(10));
        var dayStart = date.ToDateTime(TimeOnly.MinValue);

        db.Appointments.AddRange(
            new Appointment
            {
                Id = Guid.NewGuid(),
                PatientId = "p1",
                DentistId = "d1",
                StartAt = dayStart.AddHours(10),
                EndAt = dayStart.AddHours(11),
                Status = AppointmentStatus.PENDING,
                Reason = "Solicitud pendiente"
            },
            new Appointment
            {
                Id = Guid.NewGuid(),
                PatientId = "p2",
                DentistId = "d1",
                StartAt = dayStart.AddHours(11),
                EndAt = dayStart.AddHours(12),
                Status = AppointmentStatus.CONFIRMED,
                Reason = "Cita confirmada"
            }
        );

        await db.SaveChangesAsync();

        var service = CreateService(db);
        var result = await service.GetAvailabilityAsync("d1", date.ToString("yyyy-MM-dd"), Patient("p1"));

        var slots = (IEnumerable<object>)result
            .GetType()
            .GetProperty("slots")!
            .GetValue(result)!;

        var slot10 = slots.First(slot =>
            ((DateTime)slot.GetType().GetProperty("startAt")!.GetValue(slot)!).Hour == 10);

        var slot11 = slots.First(slot =>
            ((DateTime)slot.GetType().GetProperty("startAt")!.GetValue(slot)!).Hour == 11);

        Assert.Equal(true, slot10.GetType().GetProperty("available")!.GetValue(slot10));
        Assert.Equal(false, slot11.GetType().GetProperty("available")!.GetValue(slot11));
    }

    [Fact]
    public async Task CreateAsync_ShouldThrow400_WhenStartAtIsNotFuture()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.CreateAsync(
                new CreateAppointmentDto
                {
                    PatientId = "p1",
                    DentistId = "d1",
                    StartAt = DateTime.UtcNow.AddMinutes(-30),
                    EndAt = DateTime.UtcNow.AddMinutes(30),
                    Reason = "Fecha pasada"
                },
                Patient("p1")
            )
        );

        Assert.Equal(400, ex.StatusCode);
        Assert.Equal("startAt must be in the future", ex.Message);
        Assert.Empty(db.Appointments);
    }

    [Fact]
    public async Task RescheduleAsync_ShouldThrow400_WhenStartAtIsNotFuture()
    {
        await using var db = CreateDbContext();

        var appointmentId = Guid.NewGuid();

        db.Appointments.Add(new Appointment
        {
            Id = appointmentId,
            PatientId = "p1",
            DentistId = "d1",
            StartAt = FutureDate(9),
            EndAt = FutureDate(9, 11),
            Status = AppointmentStatus.PENDING
        });

        await db.SaveChangesAsync();

        var service = CreateService(db);

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.RescheduleAsync(
                appointmentId,
                new RescheduleAppointmentDto
                {
                    StartAt = DateTime.UtcNow.AddMinutes(-30),
                    EndAt = DateTime.UtcNow.AddMinutes(30)
                },
                Patient("p1")
            )
        );

        Assert.Equal(400, ex.StatusCode);
        Assert.Equal("startAt must be in the future", ex.Message);
    }

    [Fact]
    public async Task RescheduleAsync_ShouldUpdateReasonAndNotes()
    {
        await using var db = CreateDbContext();

        var appointmentId = Guid.NewGuid();

        db.Appointments.Add(new Appointment
        {
            Id = appointmentId,
            PatientId = "p1",
            DentistId = "d1",
            StartAt = FutureDate(9),
            EndAt = FutureDate(9, 11),
            Reason = "Consulta",
            Notes = "Notas anteriores",
            Status = AppointmentStatus.PENDING
        });

        await db.SaveChangesAsync();

        var service = CreateService(db);

        var result = await service.RescheduleAsync(
            appointmentId,
            new RescheduleAppointmentDto
            {
                StartAt = FutureDate(10),
                EndAt = FutureDate(10, 11),
                Reason = "Limpieza",
                Notes = "Nuevas notas"
            },
            Patient("p1")
        );

        Assert.Equal("Limpieza", result.Reason);
        Assert.Equal("Nuevas notas", result.Notes);
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
    public async Task FindByDayAsync_ShouldReturnOnlyDentistAppointmentsForSelectedDay()
    {
        await using var db = CreateDbContext();

        db.Appointments.AddRange(
            new Appointment
            { 
                Id = Guid.NewGuid(),
                PatientId = "p1",
                DentistId = "d1",
                StartAt = DateTime.Parse("2026-06-10T10:00:00"),
                EndAt = DateTime.Parse("2026-06-10T11:00:00"),
                Status = AppointmentStatus.CONFIRMED
            },
            new Appointment
            {
                Id = Guid.NewGuid(),
                PatientId = "p2",
                DentistId = "d2",
                StartAt = DateTime.Parse("2026-06-10T12:00:00"),
                EndAt = DateTime.Parse("2026-06-10T13:00:00"),
                Status = AppointmentStatus.CONFIRMED
            },
            new Appointment
            {
                Id = Guid.NewGuid(),
                PatientId = "p3",
                DentistId = "d1",
                StartAt = DateTime.Parse("2026-06-11T10:00:00"),
                EndAt = DateTime.Parse("2026-06-11T11:00:00"),
                Status = AppointmentStatus.CONFIRMED
            }
        );

        await db.SaveChangesAsync();

        var service = CreateService(db);

        var result = await service.FindByDayAsync("2026-06-10", null, Dentist("d1"));

        Assert.Single(result);
        Assert.All(result, appointment => Assert.Equal("d1", appointment.DentistId));
        Assert.All(result, appointment => Assert.Equal(10, appointment.StartAt.Day));
    }

    [Fact]
    public async Task FindByDayAsync_ShouldAllowAdminToFilterByDentist()
    {
        await using var db = CreateDbContext();

        db.Appointments.AddRange(
            new Appointment
            {
                Id = Guid.NewGuid(),
                PatientId = "p1",
                DentistId = "d1",
                StartAt = DateTime.Parse("2026-06-10T10:00:00"),
                EndAt = DateTime.Parse("2026-06-10T11:00:00"),
                Status = AppointmentStatus.CONFIRMED
            },
            new Appointment
            {
                Id = Guid.NewGuid(),
                PatientId = "p2",
                DentistId = "d2",
                StartAt = DateTime.Parse("2026-06-10T12:00:00"),
                EndAt = DateTime.Parse("2026-06-10T13:00:00"),
                Status = AppointmentStatus.CONFIRMED
            }
        );

        await db.SaveChangesAsync();

        var service = CreateService(db);

        var result = await service.FindByDayAsync("2026-06-10", "d2", Admin());

        Assert.Single(result);
        Assert.Equal("d2", result[0].DentistId);
    }

    [Fact]
    public async Task FindByDayAsync_ShouldThrow403_WhenRequesterIsPatient()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.FindByDayAsync("2026-06-10", null, Patient("p1"))
        );

        Assert.Equal(403, ex.StatusCode);
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

    [Fact]
    public async Task ConfirmAsync_ShouldConfirmSelectedRequestAndCancelCompetingPendingRequests()
    {
        await using var db = CreateDbContext();

        var selectedId = Guid.NewGuid();
        var competingId = Guid.NewGuid();
        var nonCompetingId = Guid.NewGuid();

        var startAt = FutureDate(12);
        var endAt = FutureDate(12, 11);

        db.Appointments.AddRange(
            new Appointment
            {
                Id = selectedId,
                PatientId = "p1",
                DentistId = "d1",
                StartAt = startAt,
                EndAt = endAt,
                Status = AppointmentStatus.PENDING,
                Reason = "Solicitud seleccionada"
            },
            new Appointment
            {
                Id = competingId,
                PatientId = "p2",
                DentistId = "d1",
                StartAt = startAt,
                EndAt = endAt,
                Status = AppointmentStatus.PENDING,
                Reason = "Solicitud competidora"
            },
            new Appointment
            {
                Id = nonCompetingId,
                PatientId = "p3",
                DentistId = "d1",
                StartAt = FutureDate(12, 12),
                EndAt = FutureDate(12, 13),
                Status = AppointmentStatus.PENDING,
                Reason = "Solicitud en otro horario"
            }
        );

        await db.SaveChangesAsync();

        var reportsClient = new FakeReportsClient();
        var eventsPublisher = new FakeAppointmentEventsPublisher();
        var service = CreateService(db, reportsClient, eventsPublisher);

        var result = await service.ConfirmAsync(selectedId, Dentist("d1"));

        var selected = await db.Appointments.FindAsync(selectedId);
        var competing = await db.Appointments.FindAsync(competingId);
        var nonCompeting = await db.Appointments.FindAsync(nonCompetingId);

        Assert.Equal(AppointmentStatus.CONFIRMED, result.Status);
        Assert.Equal(AppointmentStatus.CONFIRMED, selected!.Status);
        Assert.Equal(AppointmentStatus.CANCELLED, competing!.Status);
        Assert.Equal(AppointmentStatus.PENDING, nonCompeting!.Status);

        Assert.Equal(2, reportsClient.SnapshotsSent.Count);
        Assert.Single(eventsPublisher.ConfirmedEvents);
        Assert.Single(eventsPublisher.CancelledEvents);
    }

    [Fact]
    public async Task ConfirmAsync_ShouldThrow400_WhenAppointmentIsNotPending()
    {
        await using var db = CreateDbContext();

        var appointmentId = Guid.NewGuid();

        db.Appointments.Add(new Appointment
        {
            Id = appointmentId,
            PatientId = "p1",
            DentistId = "d1",
            StartAt = FutureDate(13),
            EndAt = FutureDate(13, 11),
            Status = AppointmentStatus.CONFIRMED,
            Reason = "Ya confirmada"
        });

        await db.SaveChangesAsync();

        var service = CreateService(db);

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.ConfirmAsync(appointmentId, Dentist("d1"))
        );

        Assert.Equal(400, ex.StatusCode);
        Assert.Equal("Only pending appointments can be confirmed", ex.Message);
    }

    [Fact]
    public async Task CompleteAsync_ShouldThrow400_WhenAppointmentHasNotStarted()
    {
        await using var db = CreateDbContext();

        var appointmentId = Guid.NewGuid();

        db.Appointments.Add(new Appointment
        {
            Id = appointmentId,
            PatientId = "p1",
            DentistId = "d1",
            StartAt = FutureDate(1),
            EndAt = FutureDate(1, 11),
            Status = AppointmentStatus.CONFIRMED
        });

        await db.SaveChangesAsync();

        var service = CreateService(db);

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.CompleteAsync(appointmentId, Dentist("d1"))
        );

        Assert.Equal(400, ex.StatusCode);
        Assert.Equal("Appointment cannot be completed before its start time", ex.Message);
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
        public List<Appointment> ConfirmedEvents { get; } = new();
        public List<Appointment> CancelledEvents { get; } = new();
        public List<Appointment> RescheduledEvents { get; } = new();

        public Task PublishAppointmentCreatedAsync(Appointment appointment)
        {
            CreatedEvents.Add(appointment);
            return Task.CompletedTask;
        }

        public Task PublishAppointmentConfirmedAsync(Appointment appointment)
        {
            ConfirmedEvents.Add(appointment);
            return Task.CompletedTask;
        }

        public Task PublishAppointmentCancelledAsync(Appointment appointment)
        {
            CancelledEvents.Add(appointment);
            return Task.CompletedTask;
        }

        public Task PublishAppointmentRescheduledAsync(Appointment appointment)
        {
            RescheduledEvents.Add(appointment);
            return Task.CompletedTask;
        }
    }
}
