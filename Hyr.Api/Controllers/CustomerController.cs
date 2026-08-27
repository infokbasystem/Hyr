using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Hyr.Api.Data;
using Hyr.Api.Models;
using Hyr.Api.Filters;
using Hyr.Api.Dtos;
using Hyr.Api.Services;
using Hyr.Api.Utils;


namespace Hyr.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CustomerController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CustomerController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResult<CustomerDto>>> GetCustomers([FromQuery] CustomerFilter filter)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var query = _context.Customers
                .Where(c => c.OfficeId == user.OfficeId)
                .AsQueryable();

            if (filter.Id.HasValue)
                query = query.Where(c => c.Id == filter.Id.Value);

            if (filter.CustomerNr.HasValue)
                query = query.Where(c => c.CustomerNr == filter.CustomerNr.Value);

            if (filter.IsActive.HasValue)
                query = query.Where(c => c.IsActive == filter.IsActive.Value);

            if (!string.IsNullOrEmpty(filter.SearchTerm))
            {
                var searchTerm = filter.SearchTerm.ToLower();
                query = query.Where(c => 
                    c.CustomerName.ToLower().Contains(searchTerm) ||
                    c.OrgNr.ToLower().Contains(searchTerm) ||
                    c.City.ToLower().Contains(searchTerm) ||
                    c.Email.ToLower().Contains(searchTerm));
            }

            var totalRecords = await query.CountAsync();

            // Apply sorting (default to CustomerName:asc if not specified)
            var sortBy = filter.SortBy ?? new[] { "CustomerName:asc" };
            query = query.ApplyMultiSort(sortBy);

            var customers = await query
                .Include(c => c.CreatedByUser)
                .Include(c => c.UpdatedByUser)
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .AsNoTracking()
                .ToListAsync();

            var result = customers.Select(MapCustomer).ToList();

            var totalPages = (int)Math.Ceiling((double)totalRecords / filter.PageSize);

            return new PagedResult<CustomerDto>
            {
                Data = result,
                TotalRecords = totalRecords,
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = totalPages,
                HasNextPage = filter.Page < totalPages,
                HasPreviousPage = filter.Page > 1
            };
        }

        [HttpGet("{id:int}")]
        [Authorize]
        public async Task<ActionResult<CustomerDto>> GetCustomerById(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var customer = await _context.Customers
                .Include(c => c.CreatedByUser)
                .Include(c => c.UpdatedByUser)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id && c.OfficeId == user.OfficeId);

            if (customer == null)
            {
                return NotFound(new { message = "Customer not found" });
            }

            return Ok(MapCustomer(customer));
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<int>> CreateCustomer([FromBody] CustomerUpsertDto customer)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            if (string.IsNullOrWhiteSpace(customer.CustomerName))
            {
                return BadRequest(new { message = "CustomerName is required" });
            }

            if (customer.DefaultPriceListId.HasValue)
            {
                var defaultPriceListExists = await _context.PriceLists
                    .AnyAsync(priceList => priceList.Id == customer.DefaultPriceListId.Value && priceList.OfficeId == user.OfficeId);
                if (!defaultPriceListExists)
                {
                    return BadRequest(new { message = "DefaultPriceListId must belong to the current office" });
                }
            }

            var newCustomer = new Customer
            {
                OfficeId = user.OfficeId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = user.Id,
                UpdatedAt = DateTime.UtcNow,
                UpdatedBy = user.Id,
            };

            ApplyCustomerChanges(newCustomer, customer);
            var maxCustomerNr = await _context.Customers
                .Where(c => c.OfficeId == user.OfficeId)
                .MaxAsync(c => (int?)c.CustomerNr);
            newCustomer.CustomerNr = (maxCustomerNr ?? 0) + 1;

            _context.Customers.Add(newCustomer);
            await _context.SaveChangesAsync();

            return Ok(newCustomer.Id);
        }

        [HttpPut("{id:int}")]
        [Authorize]
        public async Task<ActionResult<int>> UpdateCustomer(int id, [FromBody] CustomerUpsertDto customer)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            if (string.IsNullOrWhiteSpace(customer.CustomerName))
            {
                return BadRequest(new { message = "CustomerName is required" });
            }

            var existingCustomer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Id == id && c.OfficeId == user.OfficeId);

            if (existingCustomer == null)
            {
                return NotFound(new { message = "Customer not found" });
            }

            ApplyCustomerChanges(existingCustomer, customer);
            existingCustomer.UpdatedAt = DateTime.UtcNow;
            existingCustomer.UpdatedBy = user.Id;
            await _context.SaveChangesAsync();

            return Ok(existingCustomer.Id);
        }


        private static CustomerDto MapCustomer(Customer customer)
        {
            return new CustomerDto
            {
                Id = customer.Id,
                OfficeId = customer.OfficeId,
                CustomerNr = customer.CustomerNr,
                CustomerName = customer.CustomerName,
                OrgNr = customer.OrgNr,
                VatNr = customer.VatNr,
                Street1 = customer.Street1,
                Street2 = customer.Street2,
                ZipCode = customer.ZipCode,
                City = customer.City,
                Telephone = customer.Telephone,
                MobilePhone = customer.MobilePhone,
                Email = customer.Email,
                NrOfInvoiceDays = customer.NrOfInvoiceDays,
                Note = customer.Note,
                CreditLimit = customer.CreditLimit,
                ImportId = customer.ImportId,
                ImportSource = customer.ImportSource,
                KeySpcs = customer.KeySpcs,
                KeyFortnox = customer.KeyFortnox,
                KeyWinassist = customer.KeyWinassist,
                IsActive = customer.IsActive,
                RegNr = customer.RegNr,
                IsCompany = customer.IsCompany,
                VatRegisterd = customer.VatRegisterd,
                PgNr = customer.PgNr,
                BgNr = customer.BgNr,
                EfakturaAddresseeIntermediator = customer.EfakturaAddresseeIntermediator,
                EfakturaAddresseeID = customer.EfakturaAddresseeID,
                EfakturaAddresseeIDType = customer.EfakturaAddresseeIDType,
                EfakturaBankCode = customer.EfakturaBankCode,
                EfakturaBankId = customer.EfakturaBankId,
                EfakturaBankName = customer.EfakturaBankName,
                EfakturaVatHomeTown = customer.EfakturaVatHomeTown,
                EfakturaVatRegistration = customer.EfakturaVatRegistration,
                CrediflowPartyId = customer.CrediflowPartyId,
                GLNnr = customer.GLNnr,
                DefaultPriceListId = customer.DefaultPriceListId,

                // Audit / tracking fields
                CreatedAt = customer.CreatedAt,
                CreatedByName = customer.CreatedByName,
                UpdatedAt = customer.UpdatedAt,
                UpdatedByName = customer.UpdatedByName,
            };
        }

        private static void ApplyCustomerChanges(Customer target, CustomerUpsertDto source)
        {
            target.CustomerNr = source.CustomerNr;
            target.CustomerName = source.CustomerName?.Trim() ?? string.Empty;
            target.OrgNr = source.OrgNr ?? string.Empty;
            target.VatNr = source.VatNr ?? string.Empty;
            target.Street1 = source.Street1 ?? string.Empty;
            target.Street2 = source.Street2 ?? string.Empty;
            target.ZipCode = source.ZipCode ?? string.Empty;
            target.City = source.City ?? string.Empty;
            target.Telephone = source.Telephone ?? string.Empty;
            target.MobilePhone = source.MobilePhone ?? string.Empty;
            target.Email = source.Email ?? string.Empty;
            target.NrOfInvoiceDays = source.NrOfInvoiceDays;
            target.Note = source.Note ?? string.Empty;
            target.CreditLimit = source.CreditLimit;
            target.ImportId = source.ImportId;
            target.ImportSource = source.ImportSource ?? string.Empty;
            target.KeySpcs = source.KeySpcs ?? string.Empty;
            target.KeyFortnox = source.KeyFortnox ?? string.Empty;
            target.KeyWinassist = source.KeyWinassist ?? string.Empty;
            target.IsActive = source.IsActive;
            target.RegNr = source.RegNr ?? string.Empty;
            target.IsCompany = source.IsCompany;
            target.VatRegisterd = source.VatRegisterd;
            target.PgNr = source.PgNr ?? string.Empty;
            target.BgNr = source.BgNr ?? string.Empty;
            target.EfakturaAddresseeIntermediator = source.EfakturaAddresseeIntermediator ?? string.Empty;
            target.EfakturaAddresseeID = source.EfakturaAddresseeID ?? string.Empty;
            target.EfakturaAddresseeIDType = source.EfakturaAddresseeIDType ?? string.Empty;
            target.EfakturaBankCode = source.EfakturaBankCode ?? string.Empty;
            target.EfakturaBankId = source.EfakturaBankId ?? string.Empty;
            target.EfakturaBankName = source.EfakturaBankName ?? string.Empty;
            target.EfakturaVatHomeTown = source.EfakturaVatHomeTown ?? string.Empty;
            target.EfakturaVatRegistration = source.EfakturaVatRegistration ?? string.Empty;
            target.CrediflowPartyId = source.CrediflowPartyId;
            target.GLNnr = source.GLNnr;
            target.DefaultPriceListId = source.DefaultPriceListId;
        }

    }

}
