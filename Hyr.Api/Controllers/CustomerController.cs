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

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResult<Customer>>> GetCustomers([FromQuery] CustomerFilter filter)
        {
            var userIdClaim = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                             ?? User?.FindFirst("sub")?.Value
                             ?? User?.FindFirst("id")?.Value;
            _ = int.TryParse(userIdClaim, out int userId);

            var user = await _context.Users.FindAsync(userId);
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

    }

}