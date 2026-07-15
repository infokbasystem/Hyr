namespace Hyr.Api.Dtos;

public sealed record ReservationSearchRowDto(
    int Id,
    int? ReservationNr,
    string CustomerName,
    DateTime? CreatedDate,
    string StatusCode,
    string Note,
    string? OfficeLocation);
