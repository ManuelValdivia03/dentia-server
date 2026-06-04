using Dentia.Appointments.Api.Application.Common;
using Dentia.Appointments.Api.Application.DTOs;
using Dentia.Appointments.Api.Application.Security;
using Dentia.Appointments.Api.Application.Reports;
using Dentia.Appointments.Api.Application.Events;
using Dentia.Appointments.Api.Domain.Entities;
using Dentia.Appointments.Api.Domain.Enums;
using Dentia.Appointments.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Dentia.Appointments.Api.Application.Services;

public interface IAppointmentsService
{
    Task<List<Appointment>> FindAllAsync(RequestUser requester);
    Task<List<Appointment>> FindByDayAsync(string date, string? dentistId, RequestUser requester);
    Task<Appointment> FindOneAsync(Guid id, RequestUser requester);
    Task<object> GetAvailabilityAsync(string dentistId, string date, RequestUser requester);
    Task<Appointment> CreateAsync(CreateAppointmentDto dto, RequestUser requester);
    Task<Appointment> RescheduleAsync(Guid id, RescheduleAppointmentDto dto, RequestUser requester);
    Task<Appointment> CancelAsync(Guid id, RequestUser requester);
    Task<Appointment> ConfirmAsync(Guid id, RequestUser requester);
    Task<Appointment> CompleteAsync(Guid id, RequestUser requester);
    Task<object> HasPatientDentistRelationAsync(string patientId, string dentistId);
}

public class AppointmentsService : IAppointmentsService
{
    private readonly AppointmentsDbContext _db;
    private readonly IReportsClient _reportsClient;
    private readonly IAppointmentEventsPublisher _eventsPublisher;

    public AppointmentsService(
        AppointmentsDbContext db,
        IReportsClient reportsClient,
        IAppointmentEventsPublisher eventsPublisher)
    {
        _db = db;
        _reportsClient = reportsClient;
        _eventsPublisher = eventsPublisher;
    }

    public async Task<List<Appointment>> FindAllAsync(RequestUser requester)
    {
        var query = _db.Appointments.AsQueryable();

        if (requester.Role == UserRoles.Patient)
        {
            query = query.Where(x => x.PatientId == requester.DomainId);
        }

        if (requester.Role == UserRoles.Dentist)
        {
            query = query.Where(x => x.DentistId == requester.DomainId);
        }

        return await query
            .OrderByDescending(x => x.StartAt)
            .ToListAsync();
    }

    public async Task<List<Appointment>> FindByDayAsync(
    string date,
    string? dentistId,
    RequestUser requester)
{
    if (!DateOnly.TryParse(date, out var parsedDate))
    {
        throw new AppException(StatusCodes.Status400BadRequest, "date must be a valid date");
    }

    if (requester.Role == UserRoles.Patient)
    {
        throw new AppException(StatusCodes.Status403Forbidden, "Patients cannot access dentist agenda");
    }

    var dayStart = ToDbTimestamp(parsedDate.ToDateTime(TimeOnly.MinValue));
    var dayEnd = dayStart.AddDays(1);

    var query = _db.Appointments
        .Where(x =>
            x.Status != AppointmentStatus.CANCELLED &&
            x.StartAt < dayEnd &&
            x.EndAt > dayStart);

    if (requester.Role == UserRoles.Dentist)
    {
        query = query.Where(x => x.DentistId == requester.DomainId);
    }

    if (requester.Role == UserRoles.Admin && !string.IsNullOrWhiteSpace(dentistId))
    {
        query = query.Where(x => x.DentistId == dentistId);
    }

    return await query
        .OrderBy(x => x.StartAt)
        .ToListAsync();
    }

    public async Task<Appointment> FindOneAsync(Guid id, RequestUser requester)
    {
        var appointment = await GetAppointmentOrFail(id);
        EnsureCanAccess(appointment, requester);
        return appointment;
    }

    public async Task<object> GetAvailabilityAsync(string dentistId, string date, RequestUser requester)
    {
        if (string.IsNullOrWhiteSpace(dentistId))
        {
            throw new AppException(StatusCodes.Status400BadRequest, "dentistId is required");
        }

        if (!DateOnly.TryParse(date, out var parsedDate))
        {
            throw new AppException(StatusCodes.Status400BadRequest, "date must be a valid date");
        }

        var dayStart = ToDbTimestamp(parsedDate.ToDateTime(TimeOnly.MinValue));
        var businessStart = dayStart.AddHours(9);
        var businessEnd = dayStart.AddHours(17);

        var appointments = await _db.Appointments
            .Where(x =>
                x.DentistId == dentistId &&
                x.Status != AppointmentStatus.CANCELLED &&
                x.StartAt < businessEnd &&
                x.EndAt > businessStart)
            .ToListAsync();

        var slots = new List<object>();

        for (var slotStart = businessStart; slotStart < businessEnd; slotStart = slotStart.AddHours(1))
        {
            var slotEnd = slotStart.AddHours(1);

            var isBusy = appointments.Any(x =>
                slotStart < x.EndAt &&
                slotEnd > x.StartAt);

            slots.Add(new
            {
                startAt = slotStart,
                endAt = slotEnd,
                available = !isBusy
            });
        }

        return new
        {
            dentistId,
            date,
            slots
        };
    }

    public async Task<Appointment> CreateAsync(CreateAppointmentDto dto, RequestUser requester)
    {
        ValidateRange(dto.StartAt, dto.EndAt);

        if (requester.Role == UserRoles.Patient && dto.PatientId != requester.DomainId)
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Patient can only create appointments for themselves");
        }

        var startAt = ToDbTimestamp(dto.StartAt);
        var endAt = ToDbTimestamp(dto.EndAt);

        await EnsureNoOverlap(dto.DentistId, startAt, endAt);

        var now = ToDbTimestamp(DateTime.UtcNow);

        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            DentistId = dto.DentistId,
            StartAt = startAt,
            EndAt = endAt,
            Status = AppointmentStatus.PENDING,
            Reason = dto.Reason,
            Notes = dto.Notes,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Appointments.Add(appointment);
        await _db.SaveChangesAsync();
        await _reportsClient.SendAppointmentSnapshotAsync(appointment);
        await _eventsPublisher.PublishAppointmentCreatedAsync(appointment);

        return appointment;
    }

    public async Task<Appointment> RescheduleAsync(Guid id, RescheduleAppointmentDto dto, RequestUser requester)
    {
        ValidateRange(dto.StartAt, dto.EndAt);

        var appointment = await GetAppointmentOrFail(id);

        if (requester.Role != UserRoles.Admin &&
            !(requester.Role == UserRoles.Patient && appointment.PatientId == requester.DomainId))
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Only admin or appointment patient can reschedule");
        }

        if (appointment.Status == AppointmentStatus.CANCELLED)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Cancelled appointments cannot be rescheduled");
        }

        var startAt = ToDbTimestamp(dto.StartAt);
        var endAt = ToDbTimestamp(dto.EndAt);

        await EnsureNoOverlap(appointment.DentistId, startAt, endAt, appointment.Id);

        appointment.StartAt = startAt;
        appointment.EndAt = endAt;
        appointment.Reason = dto.Reason;
        appointment.Notes = dto.Notes;
        appointment.UpdatedAt = ToDbTimestamp(DateTime.UtcNow);

        await _db.SaveChangesAsync();
        await _reportsClient.SendAppointmentSnapshotAsync(appointment);
        await _eventsPublisher.PublishAppointmentRescheduledAsync(appointment);

        return appointment;
    }

    public async Task<Appointment> CancelAsync(Guid id, RequestUser requester)
    {
        var appointment = await GetAppointmentOrFail(id);

        EnsureCanAccess(appointment, requester);

        appointment.Status = AppointmentStatus.CANCELLED;
        appointment.UpdatedAt = ToDbTimestamp(DateTime.UtcNow);

        await _db.SaveChangesAsync();
        await _reportsClient.SendAppointmentSnapshotAsync(appointment);
        await _eventsPublisher.PublishAppointmentCancelledAsync(appointment);
        return appointment;
    }

    public async Task<Appointment> ConfirmAsync(Guid id, RequestUser requester)
    {
        var appointment = await GetAppointmentOrFail(id);

        if (requester.Role != UserRoles.Admin &&
            !(requester.Role == UserRoles.Dentist && appointment.DentistId == requester.DomainId))
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Only admin or assigned dentist can confirm");
        }

        if (appointment.Status == AppointmentStatus.CANCELLED)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Cancelled appointments cannot be confirmed");
        }

        appointment.Status = AppointmentStatus.CONFIRMED;
        appointment.UpdatedAt = ToDbTimestamp(DateTime.UtcNow);

        await _db.SaveChangesAsync();
        await _reportsClient.SendAppointmentSnapshotAsync(appointment);
        await _eventsPublisher.PublishAppointmentConfirmedAsync(appointment);

        return appointment;
    }

    public async Task<Appointment> CompleteAsync(Guid id, RequestUser requester)
    {
        var appointment = await GetAppointmentOrFail(id);

        if (requester.Role != UserRoles.Admin &&
            !(requester.Role == UserRoles.Dentist && appointment.DentistId == requester.DomainId))
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Only admin or assigned dentist can complete");
        }

        if (appointment.Status == AppointmentStatus.CANCELLED)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Cancelled appointments cannot be completed");
        }

        if (appointment.StartAt > ToDbTimestamp(DateTime.UtcNow))
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Appointment cannot be completed before its start time");
        }

        appointment.Status = AppointmentStatus.COMPLETED;
        appointment.UpdatedAt = ToDbTimestamp(DateTime.UtcNow);

        await _db.SaveChangesAsync();
        await _reportsClient.SendAppointmentSnapshotAsync(appointment);
        return appointment;
    }

    public async Task<object> HasPatientDentistRelationAsync(string patientId, string dentistId)
    {
        var exists = await _db.Appointments.AnyAsync(x =>
            x.PatientId == patientId &&
            x.DentistId == dentistId &&
            (x.Status == AppointmentStatus.CONFIRMED || x.Status == AppointmentStatus.COMPLETED));

        return new
        {
            allowed = exists
        };
    }

    private async Task<Appointment> GetAppointmentOrFail(Guid id)
    {
        return await _db.Appointments.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException("Appointment not found");
    }

    private static void EnsureCanAccess(Appointment appointment, RequestUser requester)
    {
        if (requester.Role == UserRoles.Admin)
        {
            return;
        }

        if (requester.Role == UserRoles.Patient && appointment.PatientId == requester.DomainId)
        {
            return;
        }

        if (requester.Role == UserRoles.Dentist && appointment.DentistId == requester.DomainId)
        {
            return;
        }

        throw new AppException(StatusCodes.Status403Forbidden, "Access denied");
    }

    private async Task EnsureNoOverlap(
        string dentistId,
        DateTime startAt,
        DateTime endAt,
        Guid? ignoreAppointmentId = null)
    {
        var start = ToDbTimestamp(startAt);
        var end = ToDbTimestamp(endAt);

        var overlap = await _db.Appointments.AnyAsync(x =>
            x.DentistId == dentistId &&
            x.Status != AppointmentStatus.CANCELLED &&
            (!ignoreAppointmentId.HasValue || x.Id != ignoreAppointmentId.Value) &&
            start < x.EndAt &&
            end > x.StartAt);

        if (overlap)
        {
            throw new AppException(StatusCodes.Status409Conflict, "Dentist already has an appointment in this time range");
        }
    }

    private static void ValidateRange(DateTime startAt, DateTime endAt)
    {
        var start = ToDbTimestamp(startAt);
        var end = ToDbTimestamp(endAt);

        if (start >= end)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "startAt must be before endAt");
        }

        if (start <= ToDbTimestamp(DateTime.UtcNow))
        {
            throw new AppException(StatusCodes.Status400BadRequest, "startAt must be in the future");
        }
    }

    private static DateTime ToDbTimestamp(DateTime value)
    {
        return DateTime.SpecifyKind(value, DateTimeKind.Unspecified);
    }
}
