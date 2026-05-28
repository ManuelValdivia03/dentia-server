using Dentia.Appointments.Api.Application.Common;
using Dentia.Appointments.Api.Application.DTOs;
using Dentia.Appointments.Api.Application.Security;
using Dentia.Appointments.Api.Domain.Entities;
using Dentia.Appointments.Api.Domain.Enums;
using Dentia.Appointments.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Dentia.Appointments.Api.Application.Services;

public interface IRatingsService
{
    Task<AppointmentRating> CreateAsync(Guid appointmentId, CreateAppointmentRatingDto dto, RequestUser requester);
    Task<object> GetDentistSummaryAsync(string dentistId, RequestUser requester);
}

public class RatingsService : IRatingsService
{
    private readonly AppointmentsDbContext _db;

    public RatingsService(AppointmentsDbContext db)
    {
        _db = db;
    }

    public async Task<AppointmentRating> CreateAsync(
        Guid appointmentId,
        CreateAppointmentRatingDto dto,
        RequestUser requester)
    {
        if (requester.Role != UserRoles.Patient)
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Only patients can rate appointments");
        }

        if (dto.Score < 1 || dto.Score > 5)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Score must be between 1 and 5");
        }

        var appointment = await _db.Appointments.FirstOrDefaultAsync(x => x.Id == appointmentId);

        if (appointment == null)
        {
            throw new KeyNotFoundException("Appointment not found");
        }

        if (appointment.PatientId != requester.DomainId)
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Patient can only rate own appointments");
        }

        if (appointment.Status != AppointmentStatus.COMPLETED)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Only completed appointments can be rated");
        }

        var alreadyRated = await _db.AppointmentRatings.AnyAsync(x => x.AppointmentId == appointmentId);

        if (alreadyRated)
        {
            throw new AppException(StatusCodes.Status409Conflict, "Appointment already has a rating");
        }

        var now = ToDbTimestamp(DateTime.UtcNow);

        var rating = new AppointmentRating
        {
            Id = Guid.NewGuid(),
            AppointmentId = appointment.Id,
            PatientId = appointment.PatientId,
            DentistId = appointment.DentistId,
            Score = dto.Score,
            Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.AppointmentRatings.Add(rating);
        await _db.SaveChangesAsync();

        return rating;
    }

    public async Task<object> GetDentistSummaryAsync(string dentistId, RequestUser requester)
    {
        if (string.IsNullOrWhiteSpace(dentistId))
        {
            throw new AppException(StatusCodes.Status400BadRequest, "dentistId is required");
        }

        if (requester.Role == UserRoles.Dentist && requester.DomainId != dentistId)
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Dentist can only see own ratings summary");
        }

        var ratings = await _db.AppointmentRatings
            .Where(x => x.DentistId == dentistId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        var total = ratings.Count;
        var average = total == 0 ? 0 : Math.Round(ratings.Average(x => x.Score), 2);

        return new
        {
            dentistId,
            totalRatings = total,
            averageScore = average,
            latestRatings = ratings.Take(5).Select(x => new
            {
                x.Id,
                x.AppointmentId,
                x.PatientId,
                x.Score,
                x.Comment,
                x.CreatedAt
            })
        };
    }

    private static DateTime ToDbTimestamp(DateTime value)
    {
        return DateTime.SpecifyKind(value, DateTimeKind.Unspecified);
    }
}