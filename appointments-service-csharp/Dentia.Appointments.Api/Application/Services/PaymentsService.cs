using Dentia.Appointments.Api.Application.Common;
using Dentia.Appointments.Api.Application.DTOs;
using Dentia.Appointments.Api.Application.Security;
using Dentia.Appointments.Api.Domain.Entities;
using Dentia.Appointments.Api.Domain.Enums;
using Dentia.Appointments.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Dentia.Appointments.Api.Application.Services;

public interface IPaymentsService
{
    Task<PaymentResponseDto> CreateAsync(
        Guid appointmentId,
        CreateAppointmentPaymentDto dto,
        RequestUser requester);
    Task<CashCutResponseDto> GetCashCutAsync(
        string? from,
        string? to,
        string? dentistId,
        RequestUser requester);
}

public class PaymentsService : IPaymentsService
{
    private static readonly HashSet<string> AllowedMethods =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "CASH",
            "CARD",
            "TRANSFER",
            "OTHER",
        };

    private readonly AppointmentsDbContext _db;

    public PaymentsService(AppointmentsDbContext db)
    {
        _db = db;
    }

    public async Task<PaymentResponseDto> CreateAsync(
        Guid appointmentId,
        CreateAppointmentPaymentDto dto,
        RequestUser requester)
    {
        var appointment = await _db.Appointments
            .FirstOrDefaultAsync(x => x.Id == appointmentId)
            ?? throw new KeyNotFoundException("Appointment not found");

        EnsureCanManage(appointment.DentistId, requester);

        if (appointment.Status != AppointmentStatus.COMPLETED)
        {
            throw new AppException(
                StatusCodes.Status400BadRequest,
                "Only completed appointments can receive payments");
        }

        if (dto.Amount <= 0)
        {
            throw new AppException(
                StatusCodes.Status400BadRequest,
                "Payment amount must be greater than zero");
        }

        var method = dto.Method.Trim().ToUpperInvariant();
        if (!AllowedMethods.Contains(method))
        {
            throw new AppException(
                StatusCodes.Status400BadRequest,
                "Payment method must be CASH, CARD, TRANSFER or OTHER");
        }

        if (string.IsNullOrWhiteSpace(dto.TreatmentDescription))
        {
            throw new AppException(
                StatusCodes.Status400BadRequest,
                "Treatment description is required");
        }

        if (await _db.AppointmentPayments.AnyAsync(x => x.AppointmentId == appointmentId))
        {
            throw new AppException(
                StatusCodes.Status409Conflict,
                "Appointment already has a registered payment");
        }

        var now = AppointmentTime.Now();
        var paidAt = dto.PaidAt.HasValue
            ? ToDbTimestamp(dto.PaidAt.Value)
            : now;

        if (paidAt > now.AddMinutes(1))
        {
            throw new AppException(
                StatusCodes.Status400BadRequest,
                "Payment date cannot be in the future");
        }

        var payment = new AppointmentPayment
        {
            Id = Guid.NewGuid(),
            AppointmentId = appointment.Id,
            PatientId = appointment.PatientId,
            DentistId = appointment.DentistId,
            Amount = decimal.Round(dto.Amount, 2),
            Method = method,
            TreatmentDescription = dto.TreatmentDescription.Trim(),
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            PaidAt = paidAt,
            CreatedAt = now,
        };

        _db.AppointmentPayments.Add(payment);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            throw new AppException(
                StatusCodes.Status409Conflict,
                "Appointment already has a registered payment");
        }

        return MapPayment(payment, appointment);
    }

    public async Task<CashCutResponseDto> GetCashCutAsync(
        string? from,
        string? to,
        string? dentistId,
        RequestUser requester)
    {
        var (rangeStart, rangeEnd) = ParseRange(from, to);
        var query = _db.AppointmentPayments
            .AsNoTracking()
            .Where(x => x.PaidAt >= rangeStart && x.PaidAt < rangeEnd);

        if (requester.Role == UserRoles.Dentist)
        {
            query = query.Where(x => x.DentistId == requester.DomainId);
        }
        else if (requester.Role == UserRoles.Admin && !string.IsNullOrWhiteSpace(dentistId))
        {
            query = query.Where(x => x.DentistId == dentistId);
        }
        else if (requester.Role != UserRoles.Admin)
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Access denied");
        }

        var payments = await query
            .Join(
                _db.Appointments.AsNoTracking(),
                payment => payment.AppointmentId,
                appointment => appointment.Id,
                (payment, appointment) => new { payment, appointment })
            .OrderByDescending(x => x.payment.PaidAt)
            .ToListAsync();

        var items = payments
            .Select(x => MapPayment(x.payment, x.appointment))
            .ToList();

        return new CashCutResponseDto
        {
            From = rangeStart,
            To = rangeEnd.AddTicks(-1),
            PaymentCount = items.Count,
            TotalAmount = items.Sum(x => x.Amount),
            ByMethod = items
                .GroupBy(x => x.Method)
                .Select(group => new PaymentMethodSummaryDto
                {
                    Method = group.Key,
                    Count = group.Count(),
                    Total = group.Sum(x => x.Amount),
                })
                .OrderByDescending(x => x.Total)
                .ToList(),
            Payments = items,
        };
    }

    private static (DateTime Start, DateTime End) ParseRange(string? from, string? to)
    {
        var today = DateOnly.FromDateTime(AppointmentTime.Now());
        var startDate = string.IsNullOrWhiteSpace(from)
            ? today
            : ParseDate(from, "from");
        var endDate = string.IsNullOrWhiteSpace(to)
            ? startDate
            : ParseDate(to, "to");

        if (endDate < startDate)
        {
            throw new AppException(
                StatusCodes.Status400BadRequest,
                "to must be on or after from");
        }

        if (endDate.DayNumber - startDate.DayNumber > 3660)
        {
            throw new AppException(
                StatusCodes.Status400BadRequest,
                "Payment range cannot exceed 10 years");
        }

        return (
            ToDbTimestamp(startDate.ToDateTime(TimeOnly.MinValue)),
            ToDbTimestamp(endDate.AddDays(1).ToDateTime(TimeOnly.MinValue)));
    }

    private static DateOnly ParseDate(string value, string field)
    {
        if (!DateOnly.TryParse(value, out var date))
        {
            throw new AppException(
                StatusCodes.Status400BadRequest,
                $"{field} must be a valid date");
        }

        return date;
    }

    private static PaymentResponseDto MapPayment(
        AppointmentPayment payment,
        Appointment appointment)
    {
        return new PaymentResponseDto
        {
            Id = payment.Id,
            AppointmentId = payment.AppointmentId,
            PatientId = payment.PatientId,
            DentistId = payment.DentistId,
            Amount = payment.Amount,
            Method = payment.Method,
            TreatmentDescription = payment.TreatmentDescription,
            Notes = payment.Notes,
            PaidAt = payment.PaidAt,
            AppointmentStartAt = appointment.StartAt,
            AppointmentReason = appointment.Reason ?? "Cita odontologica",
        };
    }

    private static void EnsureCanManage(string dentistId, RequestUser requester)
    {
        if (requester.Role == UserRoles.Admin)
        {
            return;
        }

        if (requester.Role == UserRoles.Dentist && requester.DomainId == dentistId)
        {
            return;
        }

        throw new AppException(StatusCodes.Status403Forbidden, "Access denied");
    }

    private static DateTime ToDbTimestamp(DateTime value)
    {
        return DateTime.SpecifyKind(value, DateTimeKind.Unspecified);
    }
}
