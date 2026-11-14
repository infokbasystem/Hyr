using Backend.Dtos;
using Backend.Models;

namespace Backend.Services
{
    public interface IFortnoxImportService
    {
        Task<OfficeFortnoxImportResultDto> ImportPageAsync(
            Office office,
            int userId,
            string entity,
            OfficeFortnoxImportRequestDto request,
            CancellationToken cancellationToken = default);
    }
}
