using NpgsqlTypes;

namespace Dentia.Appointments.Api.Domain.Enums;

public enum AppointmentStatus
{
    [PgName("PENDING")]
    PENDING,

    [PgName("CONFIRMED")]
    CONFIRMED,

    [PgName("CANCELLED")]
    CANCELLED,

    [PgName("COMPLETED")]
    COMPLETED
}