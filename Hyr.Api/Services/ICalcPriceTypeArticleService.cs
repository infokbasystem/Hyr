using Hyr.Api.Models;

namespace Hyr.Api.Services
{
    public interface ICalcPriceTypeArticleService
    {
        Task<IReadOnlyDictionary<string, Article>> EnsureArticlesAsync(int officeId);
    }
}
