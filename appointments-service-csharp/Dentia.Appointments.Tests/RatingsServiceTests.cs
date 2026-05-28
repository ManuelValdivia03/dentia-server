using Dentia.Appointments.Api.Application.Common;
using Dentia.Appointments.Api.Application.DTOs;
using Dentia.Appointments.Api.Application.Security;
using Dentia.Appointments.Api.Application.Services;
using Dentia.Appointments.Api.Domain.Entities;
using Dentia.Appointments.Api.Domain.Enums;
using Dentia.Appointments.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Dentia.Appointments.Tests;

public class RatingsServiceTests
{
    private static AppointmentsDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppointmentsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppointmentsDbContext(options);
    }

    private static RatingsService CreateService(AppointmentsDbContext db)
    {
        return new RatingsService(db);
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

    [Fact]
    public async Task CreateAsync_ShouldCreateRating_WhenPatientOwnsCompletedAppointment()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);

        var appointmentId = Guid.NewGuid();

        db.Appointments.Add(new Appointment
        {
            Id = appointmentId,
            PatientId = "p1",
            DentistId = "d1",
            StartAt = DateTime.Parse("2026-05-01T10:00:00"),
            EndAt = DateTime.Parse("2026-05-01T11:00:00"),
            Status = AppointmentStatus.COMPLETED
        });

        await db.SaveChangesAsync();

        var result = await service.CreateAsync(
            appointmentId,
            new CreateAppointmentRatingDto
            {
                Score = 5,
                Comment = "Excelente atencion"
            },
            Patient("p1")
        );

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal(appointmentId, result.AppointmentId);
        Assert.Equal("p1", result.PatientId);
        Assert.Equal("d1", result.DentistId);
        Assert.Equal(5, result.Score);
        Assert.Equal("Excelente atencion", result.Comment);
        Assert.Single(db.AppointmentRatings);
    }

    [Fact]
    public async Task CreateAsync_ShouldThrow403_WhenPatientDoesNotOwnAppointment()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);

        var appointmentId = Guid.NewGuid();

        db.Appointments.Add(new Appointment
        {
            Id = appointmentId,
            PatientId = "p2",
            DentistId = "d1",
            StartAt = DateTime.Parse("2026-05-02T10:00:00"),
            EndAt = DateTime.Parse("2026-05-02T11:00:00"),
            Status = AppointmentStatus.COMPLETED
        });

        await db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.CreateAsync(
                appointmentId,
                new CreateAppointmentRatingDto
                {
                    Score = 5,
                    Comment = "No permitido"
                },
                Patient("p1")
            )
        );

        Assert.Equal(403, ex.StatusCode);
        Assert.Empty(db.AppointmentRatings);
    }

    [Fact]
    public async Task CreateAsync_ShouldThrow400_WhenAppointmentIsNotCompleted()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);

        var appointmentId = Guid.NewGuid();

        db.Appointments.Add(new Appointment
        {
            Id = appointmentId,
            PatientId = "p1",
            DentistId = "d1",
            StartAt = DateTime.Parse("2026-05-03T10:00:00"),
            EndAt = DateTime.Parse("2026-05-03T11:00:00"),
            Status = AppointmentStatus.CONFIRMED
        });

        await db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.CreateAsync(
                appointmentId,
                new CreateAppointmentRatingDto
                {
                    Score = 5,
                    Comment = "Todavia no debe permitir"
                },
                Patient("p1")
            )
        );

        Assert.Equal(400, ex.StatusCode);
        Assert.Empty(db.AppointmentRatings);
    }

    [Fact]
    public async Task CreateAsync_ShouldThrow409_WhenAppointmentAlreadyHasRating()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);

        var appointmentId = Guid.NewGuid();

        db.Appointments.Add(new Appointment
        {
            Id = appointmentId,
            PatientId = "p1",
            DentistId = "d1",
            StartAt = DateTime.Parse("2026-05-04T10:00:00"),
            EndAt = DateTime.Parse("2026-05-04T11:00:00"),
            Status = AppointmentStatus.COMPLETED
        });

        db.AppointmentRatings.Add(new AppointmentRating
        {
            Id = Guid.NewGuid(),
            AppointmentId = appointmentId,
            PatientId = "p1",
            DentistId = "d1",
            Score = 4,
            Comment = "Primera valoracion",
            CreatedAt = DateTime.Parse("2026-05-04T12:00:00"),
            UpdatedAt = DateTime.Parse("2026-05-04T12:00:00")
        });

        await db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.CreateAsync(
                appointmentId,
                new CreateAppointmentRatingDto
                {
                    Score = 5,
                    Comment = "Duplicada"
                },
                Patient("p1")
            )
        );

        Assert.Equal(409, ex.StatusCode);
        Assert.Single(db.AppointmentRatings);
    }

    [Fact]
    public async Task CreateAsync_ShouldThrow403_WhenRequesterIsDentist()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);

        var appointmentId = Guid.NewGuid();

        db.Appointments.Add(new Appointment
        {
            Id = appointmentId,
            PatientId = "p1",
            DentistId = "d1",
            StartAt = DateTime.Parse("2026-05-05T10:00:00"),
            EndAt = DateTime.Parse("2026-05-05T11:00:00"),
            Status = AppointmentStatus.COMPLETED
        });

        await db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.CreateAsync(
                appointmentId,
                new CreateAppointmentRatingDto
                {
                    Score = 5,
                    Comment = "Dentista no debe valorar"
                },
                Dentist("d1")
            )
        );

        Assert.Equal(403, ex.StatusCode);
        Assert.Empty(db.AppointmentRatings);
    }

    [Fact]
    public async Task CreateAsync_ShouldThrow400_WhenScoreIsOutOfRange()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);

        var appointmentId = Guid.NewGuid();

        db.Appointments.Add(new Appointment
        {
            Id = appointmentId,
            PatientId = "p1",
            DentistId = "d1",
            StartAt = DateTime.Parse("2026-05-06T10:00:00"),
            EndAt = DateTime.Parse("2026-05-06T11:00:00"),
            Status = AppointmentStatus.COMPLETED
        });

        await db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.CreateAsync(
                appointmentId,
                new CreateAppointmentRatingDto
                {
                    Score = 6,
                    Comment = "Score invalido"
                },
                Patient("p1")
            )
        );

        Assert.Equal(400, ex.StatusCode);
        Assert.Empty(db.AppointmentRatings);
    }

    [Fact]
    public async Task GetDentistSummaryAsync_ShouldReturnTotalAndAverage()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);

        db.AppointmentRatings.AddRange(
            new AppointmentRating
            {
                Id = Guid.NewGuid(),
                AppointmentId = Guid.NewGuid(),
                PatientId = "p1",
                DentistId = "d1",
                Score = 5,
                Comment = "Excelente",
                CreatedAt = DateTime.Parse("2026-05-07T12:00:00"),
                UpdatedAt = DateTime.Parse("2026-05-07T12:00:00")
            },
            new AppointmentRating
            {
                Id = Guid.NewGuid(),
                AppointmentId = Guid.NewGuid(),
                PatientId = "p2",
                DentistId = "d1",
                Score = 3,
                Comment = "Bien",
                CreatedAt = DateTime.Parse("2026-05-08T12:00:00"),
                UpdatedAt = DateTime.Parse("2026-05-08T12:00:00")
            },
            new AppointmentRating
            {
                Id = Guid.NewGuid(),
                AppointmentId = Guid.NewGuid(),
                PatientId = "p3",
                DentistId = "d2",
                Score = 1,
                Comment = "Otro dentista",
                CreatedAt = DateTime.Parse("2026-05-09T12:00:00"),
                UpdatedAt = DateTime.Parse("2026-05-09T12:00:00")
            }
        );

        await db.SaveChangesAsync();

        var result = await service.GetDentistSummaryAsync("d1", Patient("p1"));

        Assert.Equal("d1", GetProperty<string>(result, "dentistId"));
        Assert.Equal(2, GetProperty<int>(result, "totalRatings"));
        Assert.Equal(4d, GetProperty<double>(result, "averageScore"));
    }

    [Fact]
    public async Task GetDentistSummaryAsync_ShouldThrow403_WhenDentistRequestsAnotherDentistSummary()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.GetDentistSummaryAsync("d1", Dentist("d2"))
        );

        Assert.Equal(403, ex.StatusCode);
    }

    [Fact]
    public async Task GetDentistSummaryAsync_ShouldAllowAdmin()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);

        db.AppointmentRatings.Add(new AppointmentRating
        {
            Id = Guid.NewGuid(),
            AppointmentId = Guid.NewGuid(),
            PatientId = "p1",
            DentistId = "d1",
            Score = 5,
            Comment = "Admin puede consultar",
            CreatedAt = DateTime.Parse("2026-05-10T12:00:00"),
            UpdatedAt = DateTime.Parse("2026-05-10T12:00:00")
        });

        await db.SaveChangesAsync();

        var result = await service.GetDentistSummaryAsync("d1", Admin());

        Assert.Equal("d1", GetProperty<string>(result, "dentistId"));
        Assert.Equal(1, GetProperty<int>(result, "totalRatings"));
        Assert.Equal(5d, GetProperty<double>(result, "averageScore"));
    }

    private static T GetProperty<T>(object source, string propertyName)
    {
        var property = source.GetType().GetProperty(propertyName);

        Assert.NotNull(property);

        var value = property!.GetValue(source);

        Assert.NotNull(value);

        return Assert.IsType<T>(value);
    }
}