namespace Hyr.Api.Filters
{
    public class ItemFilter
    {
        public int? Id { get; set; }
        public bool? IsActive { get; set; }
        public string? ItemTypeCode { get; set; }

        // Pagination
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 100;

        // Sorting - Array of sort criteria in format "PropertyName:asc" or "PropertyName:desc"
        public string[]? SortBy { get; set; }

        // Search
        public string? SearchTerm { get; set; }
    }
}