using Dentia.Appointments.Api.Application.Common;
using Dentia.Appointments.Api.Application.DTOs;
using Dentia.Appointments.Api.Application.Security;
using Dentia.Appointments.Api.Application.Services;
using Dentia.Appointments.Api.Domain.Entities;
using Dentia.Appointments.Api.Domain.Enums;
using Dentia.Appointments.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Dentia.Appointments.Tests;

public class PaymentsServiceTests
{
    private static AppointmentsDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppointmentsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppointmentsDbContext(options);
    }

    private static RequestUser Dentist(string dentistId = "dentist-1")
    {
        return new RequestUser
        {
            Role = UserRoles.Dentist,
            DomainId = dentistId,
        };
    }

    [Fact]
    public async Task CreateAsync_ShouldRegisterPaymentForCompletedAppointment()
    {
        await using var db = CreateDbContext();
        var appointment = CompletedAppointment();
        db.Appointments.Add(appointment);
        await db.SaveChangesAsync();

        var service = new PaymentsService(db);
        var result = await service.CreateAsync(
            appointment.Id,
            new CreateAppointmentPaymentDto
            {
                Amount = 850,
                Method = "card",
                TreatmentDescription = "Limpieza dental",
            },
            Dentist());

        Assert.Equal(850, result.Amount);
        Assert.Equal("CARD", result.Method);
        Assert.Equal("Limpieza dental", result.TreatmentDescription);
        Assert.Equal(AppointmentTime.Now().Date, result.PaidAt.Date);
        Assert.Single(db.AppointmentPayments);
    }

    [Fact]
    public async Task CreateAsync_ShouldRejectPaymentForNonCompletedAppointment()
    {
        await using var db = CreateDbContext();
        var appointment = CompletedAppointment();
        appointment.Status = AppointmentStatus.CONFIRMED;
        db.Appointments.Add(appointment);
        await db.SaveChangesAsync();

        var service = new PaymentsService(db);
        var error = await Assert.ThrowsAsync<AppException>(() =>
            service.CreateAsync(
                appointment.Id,
                ValidPayment(),
                Dentist()));

        Assert.Equal(400, error.StatusCode);
        Assert.Empty(db.AppointmentPayments);
    }

    [Fact]
    public async Task CreateAsync_ShouldRejectDuplicateAppointmentPayment()
    {
        await using var db = CreateDbContext();
        var appointment = CompletedAppointment();
        db.Appointments.Add(appointment);
        await db.SaveChangesAsync();
        var service = new PaymentsService(db);

        await service.CreateAsync(appointment.Id, ValidPayment(), Dentist());

        var error = await Assert.ThrowsAsync<AppException>(() =>
            service.CreateAsync(appointment.Id, ValidPayment(), Dentist()));

        Assert.Equal(409, error.StatusCode);
        Assert.Single(db.AppointmentPayments);
    }

    [Fact]
    public async Task GetCashCutAsync_ShouldFilterDentistAndSummarizeMethods()
    {
        await using var db = CreateDbContext();
        var first = CompletedAppointment();
        var second = CompletedAppointment();
        var otherDentist = CompletedAppointment("dentist-2");
        db.Appointments.AddRange(first, second, otherDentist);
        await db.SaveChangesAsync();

        var service = new PaymentsService(db);
        await service.CreateAsync(first.Id, ValidPayment(500, "CASH"), Dentist());
        await service.CreateAsync(second.Id, ValidPayment(750, "CARD"), Dentist());
        await service.CreateAsync(
            otherDentist.Id,
            ValidPayment(2000, "CASH"),
            Dentist("dentist-2"));

        var today = DateOnly.FromDateTime(AppointmentTime.Now()).ToString("yyyy-MM-dd");
        var result = await service.GetCashCutAsync(today, today, null, Dentist());

        Assert.Equal(2, result.PaymentCount);
        Assert.Equal(1250, result.TotalAmount);
        Assert.Equal(2, result.ByMethod.Count);
        Assert.DoesNotContain(result.Payments, x => x.DentistId == "dentist-2");
    }

    [Fact]
    public async Task GetAvailablePeriodsAsync_ShouldReturnOnlyDentistPaymentDates()
    {
        await using var db = CreateDbContext();
        var first = CompletedAppointment();
        var second = CompletedAppointment();
        var otherDentist = CompletedAppointment("dentist-2");
        db.Appointments.AddRange(first, second, otherDentist);
        await db.SaveChangesAsync();

        var service = new PaymentsService(db);
        await service.CreateAsync(first.Id, ValidPayment(500), Dentist());
        await service.CreateAsync(second.Id, ValidPayment(750), Dentist());
        await service.CreateAsync(
            otherDentist.Id,
            ValidPayment(2000),
            Dentist("dentist-2"));

        var result = await service.GetAvailablePeriodsAsync(null, Dentist());

        Assert.Single(result.Dates);
        Assert.Equal(
            DateOnly.FromDateTime(AppointmentTime.Now()).ToString("yyyy-MM-dd"),
            result.Dates[0]);
    }

    private static Appointment CompletedAppointment(string dentistId = "dentist-1")
    {
        var now = AppointmentTime.Now();
        return new Appointment
        {
            Id = Guid.NewGuid(),
            PatientId = Guid.NewGuid().ToString(),
            DentistId = dentistId,
            StartAt = now.AddHours(-2),
            EndAt = now.AddHours(-1),
            Status = AppointmentStatus.COMPLETED,
            Reason = "Consulta",
            CreatedAt = now.AddDays(-1),
            UpdatedAt = now,
        };
    }

    private static CreateAppointmentPaymentDto ValidPayment(
        decimal amount = 850,
        string method = "CASH")
    {
        return new CreateAppointmentPaymentDto
        {
            Amount = amount,
            Method = method,
            TreatmentDescription = "Tratamiento realizado",
        };
    }
}
