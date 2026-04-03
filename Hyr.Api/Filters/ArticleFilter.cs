namespace Hyr.Api.Filters
{
    public class ArticleFilter
    {
        public int? Id { get; set; }
        public string? ArticleNr { get; set; }
        public bool? IsActive { get; set; }

        // Pagination
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 100;

        // Sorting - Array of sort criteria in format "PropertyName:asc" or "PropertyName:desc"
        // Example: ["Name:asc", "Price:desc"]
        public string[]? SortBy { get; set; }

        // Search
        public string? SearchTerm { get; set; }
    }
}
