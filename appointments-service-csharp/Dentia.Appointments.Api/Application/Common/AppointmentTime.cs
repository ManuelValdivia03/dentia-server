namespace Dentia.Appointments.Api.Application.Common;

public static class AppointmentTime
{
    private const string DefaultTimeZoneId = "America/Mexico_City";

    public static DateTime Now()
    {
        var timeZoneId =
            Environment.GetEnvironmentVariable("APPOINTMENTS_TIME_ZONE")
            ?? DefaultTimeZoneId;

        var timeZone = ResolveTimeZone(timeZoneId);
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);

        return ToDbTimestamp(localNow);
    }

    public static DateTime ToDbTimestamp(DateTime value)
    {
        return DateTime.SpecifyKind(value, DateTimeKind.Unspecified);
    }

    private static TimeZoneInfo ResolveTimeZone(string timeZoneId)
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            return ResolveFallbackTimeZone(timeZoneId);
        }
        catch (InvalidTimeZoneException)
        {
            return ResolveFallbackTimeZone(timeZoneId);
        }
    }

    private static TimeZoneInfo ResolveFallbackTimeZone(string timeZoneId)
    {
        if (timeZoneId == DefaultTimeZoneId)
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Central Standard Time (Mexico)");
            }
            catch
            {
                return TimeZoneInfo.Local;
            }
        }

        return TimeZoneInfo.Local;
    }
}
