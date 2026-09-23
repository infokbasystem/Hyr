using Backend.Models;

namespace Backend.Services
{
    public interface ICalcPriceTypeArticleService
    {
        Task<IReadOnlyDictionary<string, Article>> EnsureArticlesAsync(int officeId);
    }
}
