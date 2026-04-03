namespace Hyr.Api.Filters
{
    public class ReservationFilter
    {
        public int? Id { get; set; }
        public int? ReservationNr { get; set; }
        public int? CustomerId { get; set; }
        public int? OfficeId { get; set; }
        public string? StatusCode { get; set; }
        public DateTime? CreatedDateFrom { get; set; }
        public DateTime? CreatedDateTo { get; set; }

        // Pagination
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 100;

        // Sorting - Array of sort criteria in format "PropertyName:asc" or "PropertyName:desc"
        // Example: ["CreatedDate:desc", "ReservationNr:asc"]
        public string[]? SortBy { get; set; }

        // Search
        public string? SearchTerm { get; set; }
    }
}
