namespace Hyr.Api.Filters
{
    public class SmsTextFilter
    {
        public int? Id { get; set; }

        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 100;

        public string[]? SortBy { get; set; }

        public string? SearchTerm { get; set; }
    }
}
