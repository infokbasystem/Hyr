using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Hyr.Api.Data;
using Hyr.Api.Models;
using Hyr.Api.Filters;
using Hyr.Api.Utils;


namespace Hyr.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CustomerController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CustomerController(ApplicationDbContext context)
        {
            _context = context;
        }

        private async Task<User?> GetCurrentUserAsync()
        {
            var userIdClaim = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                             ?? User?.FindFirst("sub")?.Value
                             ?? User?.FindFirst("id")?.Value;

            if (!int.TryParse(userIdClaim, out var userId))
            {
                return null;
            }

            return await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        }

        private static void ApplyCustomerChanges(Customer target, Customer source)
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
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResult<Customer>>> GetCustomers([FromQuery] CustomerFilter filter)
        {
            var user = await GetCurrentUserAsync();
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

            var pagedQuery = query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(customer => new
                {
                    Customer = customer,
                });

            var result = new List<Customer>();
            foreach (var item in pagedQuery)
            {
                result.Add(new Customer
                {
                    Id = item.Customer.Id,
                    OfficeId = item.Customer.OfficeId,
                    CustomerNr = item.Customer.CustomerNr,
                    CustomerName = item.Customer.CustomerName,
                    OrgNr = item.Customer.OrgNr,
                    VatNr = item.Customer.VatNr,
                    Street1 = item.Customer.Street1,
                    Street2 = item.Customer.Street2,
                    ZipCode = item.Customer.ZipCode,
                    City = item.Customer.City,
                    Telephone = item.Customer.Telephone,
                    MobilePhone = item.Customer.MobilePhone,
                    Email = item.Customer.Email,
                    NrOfInvoiceDays = item.Customer.NrOfInvoiceDays,
                    Note = item.Customer.Note,
                    CreditLimit = item.Customer.CreditLimit,
                    ImportId = item.Customer.ImportId,
                    ImportSource = item.Customer.ImportSource,
                    KeySpcs = item.Customer.KeySpcs,
                    KeyFortnox = item.Customer.KeyFortnox,
                    KeyWinassist = item.Customer.KeyWinassist,
                    IsActive = item.Customer.IsActive,
                    RegNr = item.Customer.RegNr,
                    IsCompany = item.Customer.IsCompany,
                    VatRegisterd = item.Customer.VatRegisterd,
                    PgNr = item.Customer.PgNr,
                    BgNr = item.Customer.BgNr,
                    EfakturaAddresseeIntermediator = item.Customer.EfakturaAddresseeIntermediator,
                    EfakturaAddresseeID = item.Customer.EfakturaAddresseeID,
                    EfakturaAddresseeIDType = item.Customer.EfakturaAddresseeIDType,
                    EfakturaBankCode = item.Customer.EfakturaBankCode,
                    EfakturaBankId = item.Customer.EfakturaBankId,
                    EfakturaBankName = item.Customer.EfakturaBankName,
                    EfakturaVatHomeTown = item.Customer.EfakturaVatHomeTown,
                    EfakturaVatRegistration = item.Customer.EfakturaVatRegistration,
                    CrediflowPartyId = item.Customer.CrediflowPartyId,
                    GLNnr = item.Customer.GLNnr
                });
            }

            var totalPages = (int)Math.Ceiling((double)totalRecords / filter.PageSize);

            return new PagedResult<Customer>
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
        public async Task<ActionResult<Customer>> GetCustomerById(int id)
        {
            var user = await GetCurrentUserAsync();
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var customer = await _context.Customers
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id && c.OfficeId == user.OfficeId);

            if (customer == null)
            {
                return NotFound(new { message = "Customer not found" });
            }

            return Ok(customer);
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<int>> CreateCustomer([FromBody] Customer customer)
        {
            var user = await GetCurrentUserAsync();
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            if (string.IsNullOrWhiteSpace(customer.CustomerName))
            {
                return BadRequest(new { message = "CustomerName is required" });
            }

            var newCustomer = new Customer
            {
                OfficeId = user.OfficeId,
                IsActive = true,
            };

            ApplyCustomerChanges(newCustomer, customer);
            _context.Customers.Add(newCustomer);
            await _context.SaveChangesAsync();

            return Ok(newCustomer.Id);
        }

        [HttpPut("{id:int}")]
        [Authorize]
        public async Task<ActionResult<int>> UpdateCustomer(int id, [FromBody] Customer customer)
        {
            var user = await GetCurrentUserAsync();
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
            await _context.SaveChangesAsync();

            return Ok(existingCustomer.Id);
        }

    }

}