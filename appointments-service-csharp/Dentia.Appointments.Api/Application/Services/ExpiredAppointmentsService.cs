using Dentia.Appointments.Api.Application.Events;
using Dentia.Appointments.Api.Application.Reports;
using Dentia.Appointments.Api.Application.Security;
using Dentia.Appointments.Api.Domain.Entities;
using Dentia.Appointments.Api.Domain.Enums;
using Dentia.Appointments.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Dentia.Appointments.Api.Application.Services;

public interface IExpiredAppointmentsService
{
    Task<int> CancelExpiredPendingAppointmentsAsync(
        RequestUser? requester = null,
        string? dentistIdFilter = null,
        CancellationToken cancellationToken = default);

    Task CancelExpiredPendingAppointmentAsync(
        Appointment appointment,
        DateTime now,
        CancellationToken cancellationToken = default);
}

public class ExpiredAppointmentsService : IExpiredAppointmentsService
{
    private readonly AppointmentsDbContext _db;
    private readonly IReportsClient _reportsClient;
    private readonly IAppointmentEventsPublisher _eventsPublisher;

    public ExpiredAppointmentsService(
        AppointmentsDbContext db,
        IReportsClient reportsClient,
        IAppointmentEventsPublisher eventsPublisher)
    {
        _db = db;
        _reportsClient = reportsClient;
        _eventsPublisher = eventsPublisher;
    }

    public async Task<int> CancelExpiredPendingAppointmentsAsync(
        RequestUser? requester = null,
        string? dentistIdFilter = null,
        CancellationToken cancellationToken = default)
    {
        var now = ToDbTimestamp(DateTime.UtcNow);

        var query = _db.Appointments
            .Where(x =>
                x.Status == AppointmentStatus.PENDING &&
                x.StartAt < now);

        if (requester?.Role == UserRoles.Patient)
        {
            query = query.Where(x => x.PatientId == requester.DomainId);
        }

        if (requester?.Role == UserRoles.Dentist)
        {
            query = query.Where(x => x.DentistId == requester.DomainId);
        }

        if (requester?.Role == UserRoles.Admin && !string.IsNullOrWhiteSpace(dentistIdFilter))
        {
            query = query.Where(x => x.DentistId == dentistIdFilter);
        }

        var expiredAppointments = await query.ToListAsync(cancellationToken);

        if (expiredAppointments.Count == 0)
        {
            return 0;
        }

        foreach (var appointment in expiredAppointments)
        {
            appointment.Status = AppointmentStatus.CANCELLED;
            appointment.UpdatedAt = now;
        }

        await _db.SaveChangesAsync(cancellationToken);

        foreach (var appointment in expiredAppointments)
        {
            await _reportsClient.SendAppointmentSnapshotAsync(appointment);
            await _eventsPublisher.PublishAppointmentCancelledAsync(appointment);
        }

        return expiredAppointments.Count;
    }

    public async Task CancelExpiredPendingAppointmentAsync(
        Appointment appointment,
        DateTime now,
        CancellationToken cancellationToken = default)
    {
        if (appointment.Status != AppointmentStatus.PENDING)
        {
            return;
        }

        if (appointment.StartAt >= now)
        {
            return;
        }

        appointment.Status = AppointmentStatus.CANCELLED;
        appointment.UpdatedAt = now;

        await _db.SaveChangesAsync(cancellationToken);
        await _reportsClient.SendAppointmentSnapshotAsync(appointment);
        await _eventsPublisher.PublishAppointmentCancelledAsync(appointment);
    }

    private static DateTime ToDbTimestamp(DateTime value)
    {
        return DateTime.SpecifyKind(value, DateTimeKind.Unspecified);
    }
}