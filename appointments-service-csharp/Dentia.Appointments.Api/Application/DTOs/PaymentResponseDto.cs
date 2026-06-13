namespace Dentia.Appointments.Api.Application.DTOs;

public class PaymentResponseDto
{
    public Guid Id { get; set; }
    public Guid AppointmentId { get; set; }
    public string PatientId { get; set; } = string.Empty;
    public string DentistId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Method { get; set; } = string.Empty;
    public string TreatmentDescription { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime PaidAt { get; set; }
    public DateTime AppointmentStartAt { get; set; }
    public string AppointmentReason { get; set; } = string.Empty;
}

public class PaymentMethodSummaryDto
{
    public string Method { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Total { get; set; }
}

public class CashCutResponseDto
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public int PaymentCount { get; set; }
    public decimal TotalAmount { get; set; }
    public List<PaymentMethodSummaryDto> ByMethod { get; set; } = [];
    public List<PaymentResponseDto> Payments { get; set; } = [];
}

public class PaymentPeriodsResponseDto
{
    public List<string> Dates { get; set; } = [];
}
