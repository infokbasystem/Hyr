using System.ComponentModel.DataAnnotations;

namespace Backend.Dtos;

/// <summary>A category and its linked articles.</summary>
public sealed record ItemCategoryDto
{
    public int Id { get; init; }
    public int? OfficeId { get; init; }
    public string Name { get; init; } = string.Empty;
    public int SortOrder { get; init; }
    public int[] ArticleIds { get; init; } = [];
    public CategoryArticleDto[] Articles { get; init; } = [];
}

/// <summary>Saves category details; omitted article collections leave existing links unchanged.</summary>
public sealed record ItemCategoryUpsertDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public int SortOrder { get; init; }
    public int[]? ArticleIds { get; init; }
    public CategoryArticleDto[]? Articles { get; init; }
}

/// <summary>An article linked to a category with its quantity per reservation item.</summary>
public sealed record CategoryArticleDto
{
    [Range(1, int.MaxValue)]
    public int ArticleId { get; init; }

    [Range(typeof(decimal), "0.00001", "9999999999999.99999")]
    public decimal Quantity { get; init; } = 1m;
}

/// <summary>An article available for category assignment.</summary>
public sealed record CategoryArticleOptionDto(int Id, string ArticleNr, string Name, bool IsActive, decimal? Price = null);

/// <summary>Available articles for the current office's category form.</summary>
public sealed record ItemCategoryFormOptionsDto(IReadOnlyList<CategoryArticleOptionDto> Articles);
