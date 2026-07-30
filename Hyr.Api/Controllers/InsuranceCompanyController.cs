using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Hyr.Api.Data;
using Hyr.Api.Dtos;
using Hyr.Api.Filters;
using Hyr.Api.Models;
using Hyr.Api.Services;
using Hyr.Api.Utils;

namespace Hyr.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InsuranceCompanyController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public InsuranceCompanyController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResult<InsuranceCompanyDto>>> GetInsuranceCompanies([FromQuery] InsuranceCompanyFilter filter)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var query = _context.InsuranceCompanies
                .Where(insuranceCompany => insuranceCompany.OfficeId == user.OfficeId)
                .AsQueryable();

            if (filter.Id.HasValue)
            {
                query = query.Where(insuranceCompany => insuranceCompany.Id == filter.Id.Value);
            }

            if (!string.IsNullOrEmpty(filter.SearchTerm))
            {
                var searchTerm = filter.SearchTerm.ToLower();
                query = query.Where(insuranceCompany =>
                    insuranceCompany.Name.ToLower().Contains(searchTerm)
                    || insuranceCompany.OrganizationNr.ToLower().Contains(searchTerm)
                    || insuranceCompany.ContactPerson.ToLower().Contains(searchTerm)
                    || insuranceCompany.Telephone.ToLower().Contains(searchTerm)
                    || insuranceCompany.Email.ToLower().Contains(searchTerm)
                    || insuranceCompany.Street.ToLower().Contains(searchTerm)
                    || insuranceCompany.ZipCode.ToLower().Contains(searchTerm)
                    || insuranceCompany.City.ToLower().Contains(searchTerm)
                    || insuranceCompany.Country.ToLower().Contains(searchTerm)
                    || insuranceCompany.KeyFortnox.ToLower().Contains(searchTerm));
            }

            var totalRecords = await query.CountAsync();

            var sortBy = filter.SortBy ?? new[] { "Name:asc", "Id:desc" };
            query = query.ApplyMultiSort(sortBy);

            var insuranceCompanies = await query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .AsNoTracking()
                .Select(insuranceCompany => new InsuranceCompanyDto
                {
                    Id = insuranceCompany.Id,
                    OfficeId = insuranceCompany.OfficeId,
                    Name = insuranceCompany.Name,
                    OrganizationNr = insuranceCompany.OrganizationNr,
                    ContactPerson = insuranceCompany.ContactPerson,
                    Telephone = insuranceCompany.Telephone,
                    Email = insuranceCompany.Email,
                    Street = insuranceCompany.Street,
                    ZipCode = insuranceCompany.ZipCode,
                    City = insuranceCompany.City,
                    Country = insuranceCompany.Country,
                    PaymentDays = insuranceCompany.PaymentDays,
                    KeyFortnox = insuranceCompany.KeyFortnox,
                })
                .ToListAsync();

            return Ok(new PagedResult<InsuranceCompanyDto>
            {
                Data = insuranceCompanies,
                TotalRecords = totalRecords,
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = (int)Math.Ceiling((double)totalRecords / filter.PageSize),
                HasNextPage = filter.Page * filter.PageSize < totalRecords,
                HasPreviousPage = filter.Page > 1,
            });
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<InsuranceCompanyDto>> GetInsuranceCompany(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var insuranceCompany = await _context.InsuranceCompanies
                .AsNoTracking()
                .Where(entry => entry.Id == id && entry.OfficeId == user.OfficeId)
                .Select(entry => new InsuranceCompanyDto
                {
                    Id = entry.Id,
                    OfficeId = entry.OfficeId,
                    Name = entry.Name,
                    OrganizationNr = entry.OrganizationNr,
                    ContactPerson = entry.ContactPerson,
                    Telephone = entry.Telephone,
                    Email = entry.Email,
                    Street = entry.Street,
                    ZipCode = entry.ZipCode,
                    City = entry.City,
                    Country = entry.Country,
                    PaymentDays = entry.PaymentDays,
                    KeyFortnox = entry.KeyFortnox,
                })
                .FirstOrDefaultAsync();

            if (insuranceCompany == null)
            {
                return NotFound();
            }

            return Ok(insuranceCompany);
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteInsuranceCompany(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var insuranceCompany = await _context.InsuranceCompanies
                .FirstOrDefaultAsync(entry => entry.Id == id && entry.OfficeId == user.OfficeId);

            if (insuranceCompany == null)
            {
                return NotFound();
            }

            _context.InsuranceCompanies.Remove(insuranceCompany);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<InsuranceCompanyDto>> PostInsuranceCompany([FromBody] InsuranceCompanyUpsertDto insuranceCompany)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var user = await _currentUserService.GetCurrentUserAsync(User);
                if (user == null)
                {
                    return Unauthorized(new { message = "User not found" });
                }

                InsuranceCompany? insuranceCompanyInDb;

                if (insuranceCompany.Id == 0)
                {
                    insuranceCompanyInDb = new InsuranceCompany
                    {
                        OfficeId = user.OfficeId,
                    };
                    _context.InsuranceCompanies.Add(insuranceCompanyInDb);
                }
                else
                {
                    insuranceCompanyInDb = await _context.InsuranceCompanies
                        .FirstOrDefaultAsync(entry => entry.Id == insuranceCompany.Id && entry.OfficeId == user.OfficeId);

                    if (insuranceCompanyInDb == null)
                    {
                        return NotFound(new { message = "InsuranceCompany not found" });
                    }
                }

                ApplyInsuranceCompanyChanges(insuranceCompanyInDb, insuranceCompany);

                await _context.SaveChangesAsync();
                return Ok(MapInsuranceCompany(insuranceCompanyInDb));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        private static InsuranceCompanyDto MapInsuranceCompany(InsuranceCompany insuranceCompany)
        {
            return new InsuranceCompanyDto
            {
                Id = insuranceCompany.Id,
                OfficeId = insuranceCompany.OfficeId,
                Name = insuranceCompany.Name,
                OrganizationNr = insuranceCompany.OrganizationNr,
                ContactPerson = insuranceCompany.ContactPerson,
                Telephone = insuranceCompany.Telephone,
                Email = insuranceCompany.Email,
                Street = insuranceCompany.Street,
                ZipCode = insuranceCompany.ZipCode,
                City = insuranceCompany.City,
                Country = insuranceCompany.Country,
                PaymentDays = insuranceCompany.PaymentDays,
                KeyFortnox = insuranceCompany.KeyFortnox,
            };
        }

        private static void ApplyInsuranceCompanyChanges(InsuranceCompany target, InsuranceCompanyUpsertDto source)
        {
            target.Name = source.Name?.Trim() ?? string.Empty;
            target.OrganizationNr = source.OrganizationNr?.Trim() ?? string.Empty;
            target.ContactPerson = source.ContactPerson?.Trim() ?? string.Empty;
            target.Telephone = source.Telephone?.Trim() ?? string.Empty;
            target.Email = source.Email?.Trim() ?? string.Empty;
            target.Street = source.Street?.Trim() ?? string.Empty;
            target.ZipCode = source.ZipCode?.Trim() ?? string.Empty;
            target.City = source.City?.Trim() ?? string.Empty;
            target.Country = source.Country?.Trim() ?? string.Empty;
            target.PaymentDays = source.PaymentDays;
            target.KeyFortnox = source.KeyFortnox?.Trim() ?? string.Empty;
        }
    }
}
