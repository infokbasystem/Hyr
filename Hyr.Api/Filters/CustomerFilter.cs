namespace Hyr.Api.Filters
{

    public class CustomerFilter
    {
        public int? Id { get; set; }
        public int? CustomerNr { get; set; }
        public bool? IsActive { get; set; }

        // Pagination
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 100;

        // Sorting - Array of sort criteria in format "PropertyName:asc" or "PropertyName:desc"
        // Example: ["CustomerName:asc", "City:desc"]
        public string[]? SortBy { get; set; }

        // Search
        public string? SearchTerm { get; set; }
    }
    
}
