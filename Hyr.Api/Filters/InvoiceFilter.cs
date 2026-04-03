namespace Hyr.Api.Filters
{

    public class InvoiceFilter
    {
        public int? Id { get; set; }
        public int? InvoiceNr { get; set; }
        public DateTime? InvoiceDateFrom { get; set; }
        public DateTime? InvoiceDateTo { get; set; }
        public bool? IsAccounted { get; set; }

        // Pagination
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 100;

        // Sorting - Array of sort criteria in format "PropertyName:asc" or "PropertyName:desc"
        // Example: ["InvoiceDate:desc", "InvoiceNr:asc"]
        public string[]? SortBy { get; set; }

        // Search
        public string? SearchTerm { get; set; }
    }
    
}