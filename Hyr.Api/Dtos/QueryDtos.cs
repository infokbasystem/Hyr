using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace Hyr.Api.Dtos;

public class FilterRequest
{
    public List<FilterConditionDto> Conditions { get; set; } = [];
}

public class FilterConditionDto
{
    [Required]
    public string Field { get; set; } = string.Empty;

    [Required]
    public string Operator { get; set; } = "eq";

    public JsonElement? Value { get; set; }

    public List<JsonElement>? Values { get; set; }
}

public class PaginationRequest
{
    [Range(1, int.MaxValue)]
    public int PageNumber { get; set; } = 1;

    [Range(1, 1000)]
    public int PageSize { get; set; } = 50;
}

public class SortRequest
{
    [Required]
    public string Field { get; set; } = string.Empty;

    public string Direction { get; set; } = "asc";
}

public class PagedResultDto<T>
{
    public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;
}

public class ReservationSearchRequestDto
{
    public FilterRequest Filter { get; set; } = new();
    public PaginationRequest Pagination { get; set; } = new();
    public List<SortRequest> Sorts { get; set; } = [];
}
