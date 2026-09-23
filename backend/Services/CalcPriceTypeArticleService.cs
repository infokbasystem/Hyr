using Backend.Data;
using Backend.Models;

using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class CalcPriceTypeArticleService : ICalcPriceTypeArticleService
    {
        private static readonly (string Code, string ArticleNr, string Name)[] ArticleDefaults =
        [
            (CalcPriceTypeCodes.Rent, "HYRA", "Hyra"),
            (CalcPriceTypeCodes.Km, "KM", "Km"),
            (CalcPriceTypeCodes.Fuel, "DRIVMEDEL", "Drivmedel"),
            (CalcPriceTypeCodes.User, "OVRIGT", "Övrigt"),
        ];

        private readonly ApplicationDbContext _context;

        public CalcPriceTypeArticleService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyDictionary<string, Article>> EnsureArticlesAsync(int officeId)
        {
            var articlesByCode = await _context.Articles
                .Where(article => article.OfficeId == officeId && article.CalcPriceTypeCode != null)
                .ToDictionaryAsync(article => article.CalcPriceTypeCode!, StringComparer.OrdinalIgnoreCase);

            var missingDefaults = ArticleDefaults
                .Where(entry => !articlesByCode.ContainsKey(entry.Code))
                .ToList();

            if (missingDefaults.Count == 0)
            {
                return articlesByCode;
            }

            var defaultVatRateId = await _context.VatRates
                .Where(vat => vat.OfficeId == officeId && vat.IsDefault)
                .OrderByDescending(vat => vat.IsActive)
                .ThenBy(vat => vat.Id)
                .Select(vat => (int?)vat.Id)
                .FirstOrDefaultAsync();

            foreach (var entry in missingDefaults)
            {
                var article = new Article
                {
                    OfficeId = officeId,
                    ArticleNr = entry.ArticleNr,
                    Name = entry.Name,
                    VatRateId = defaultVatRateId,
                    IsActive = true,
                    CalcPriceTypeCode = entry.Code,
                };

                _context.Articles.Add(article);
                articlesByCode[entry.Code] = article;
            }

            await _context.SaveChangesAsync();

            return articlesByCode;
        }
    }
}
