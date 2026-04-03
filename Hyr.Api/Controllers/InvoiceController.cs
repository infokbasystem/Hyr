using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Hyr.Api.Data;
using Hyr.Api.Models;
using Hyr.Api.Filters;
using Hyr.Api.Utils;

using Fortnox.SDK;
using Fortnox.SDK.Auth;
using Fortnox.SDK.Authorization;
using Fortnox.SDK.Extensions;
using Fortnox.SDK.Search;
using Fortnox.SDK.Exceptions;


namespace Hyr.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InvoiceController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        // private readonly OldApplicationDbContext _context;

        public InvoiceController(ApplicationDbContext context)
        {
            _context = context;
            // _context = oldContext;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResult<Invoice>>> GetInvoices([FromQuery] InvoiceFilter filter)
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

            var query = _context.Invoices
                .Where(i => i.OfficeId == user.OfficeId)
                .AsQueryable();

            if (filter.Id.HasValue)
                query = query.Where(c => c.Id == filter.Id.Value);

            if (filter.InvoiceNr.HasValue)
                query = query.Where(c => c.InvoiceNr == filter.InvoiceNr.Value);

            if (filter.InvoiceDateFrom.HasValue)
                query = query.Where(c => c.InvoiceDate >= filter.InvoiceDateFrom.Value);

            if (filter.InvoiceDateTo.HasValue)
                query = query.Where(c => c.InvoiceDate <= filter.InvoiceDateTo.Value);

            if (filter.IsAccounted.HasValue)
                query = query.Where(c => c.AccountedDate == null);

            if (!string.IsNullOrEmpty(filter.SearchTerm))
            {
                var searchTerm = filter.SearchTerm.ToLower();
                query = query.Where(c => c.CustomerName.ToLower().Contains(searchTerm));
            }

            var totalRecords = await query.CountAsync();

            // Apply sorting (default to InvoiceDate:desc, InvoiceNr:asc if not specified)
            var sortBy = filter.SortBy ?? new[] { "InvoiceDate:desc", "InvoiceNr:asc" };
            query = query.ApplyMultiSort(sortBy);

            var pagedQuery = query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(invoice => new
                {
                    Invoice = invoice,
                });

            var result = new List<Invoice>();
            foreach (var item in pagedQuery)
            {
                result.Add(new Models.Invoice
                {
                    AccountedDate = item.Invoice.AccountedDate,
                    AccountNr = item.Invoice.AccountNr,
                    AccountNrVat = item.Invoice.AccountNrVat,
                    City = item.Invoice.City,
                    CrediflowSessionId = item.Invoice.CrediflowSessionId,
                    CreditingInvoiceId = item.Invoice.CreditingInvoiceId,
                    CurrencyId = item.Invoice.CurrencyId,
                    CurrencyRate = item.Invoice.CurrencyRate,
                    CustomerId = item.Invoice.CustomerId,
                    CustomerName = item.Invoice.CustomerName,
                    CustomerReference = item.Invoice.CustomerReference,
                    ExportResult = item.Invoice.ExportResult,
                    Id = item.Invoice.Id,
                    InvoiceDate = item.Invoice.InvoiceDate,
                    InvoiceFee = item.Invoice.InvoiceFee,
                    InvoiceNr = item.Invoice.InvoiceNr,
                    InvoicePayMethod = item.Invoice.InvoicePayMethod,
                    InvoiceType = item.Invoice.InvoiceType,
                    IsCancelled = item.Invoice.IsCancelled,
                    IsSettled = item.Invoice.IsSettled,
                    IsOkForAccounting = item.Invoice.IsOkForAccounting,
                    IsPrinted = item.Invoice.IsPrinted,
                    IsEmailed = item.Invoice.IsEmailed,
                    IsEInvoiced = item.Invoice.IsEInvoiced,
                    Marking = item.Invoice.Marking,
                    Note = item.Invoice.Note,
                    NrOfInvoiceDays = item.Invoice.NrOfInvoiceDays,
                    OrgNr = item.Invoice.OrgNr,
                    OurReference = item.Invoice.OurReference,
                    PdfName = item.Invoice.PdfName,
                    Rounding = item.Invoice.Rounding,
                    Street1 = item.Invoice.Street1,
                    Street2 = item.Invoice.Street2,
                    TermsOfPayment = item.Invoice.TermsOfPayment,
                    TotExVat = item.Invoice.TotExVat,
                    TotSum = item.Invoice.TotSum,
                    TotVat = item.Invoice.TotVat,
                    VatNr = item.Invoice.VatNr,
                    ZipCode = item.Invoice.ZipCode,
                    YourReference = item.Invoice.YourReference,
                    DueDate = item.Invoice.InvoiceDate.HasValue && item.Invoice.NrOfInvoiceDays.HasValue
                        ? item.Invoice.InvoiceDate.Value.AddDays(item.Invoice.NrOfInvoiceDays.Value)
                        : (DateTime?)null,
                });
            }

            var totalPages = (int)Math.Ceiling((double)totalRecords / filter.PageSize);

            return new PagedResult<Invoice>
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

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<Invoice>> GetInvoice(int id)
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
            var invoiceInDb = await _context.Invoices.Where(i => i.Id == id && i.OfficeId == user.OfficeId).FirstOrDefaultAsync();

            if (invoiceInDb == null)
            {
                return NotFound(new { message = "Invoice not found" });
            }

            var invoiceRowsFromDb = await _context.InvoiceRows
                .Where(r => r.InvoiceId == id)
                .ToListAsync();

            var invoiceRows = new List<Models.InvoiceRow>();
            foreach (var r in invoiceRowsFromDb)
            {
                invoiceRows.Add(new Models.InvoiceRow
                {
                    AccountNr = r.AccountNr,
                    ArticleId = r.ArticleId,
                    ArticleNr = r.ArticleNr,
                    CostCenter = r.CostCenter,
                    DiscountRate = r.DiscountRate,
                    Id = r.Id,
                    InvoiceId = r.InvoiceId,
                    InvoiceRowType = r.InvoiceRowType,
                    ItemId = r.ItemId,
                    OfficeId = r.OfficeId,
                    Qty = r.Qty,
                    ReservationCalcItemId = r.ReservationCalcItemId,
                    SortNr = r.SortNr,
                    Text1 = r.Text1,
                    Text2 = r.Text2,
                    Sum = r.Sum,
                    UnitPrice = r.UnitPrice,
                    VatRate = r.VatRate,
                });
            }

            var invoice = new Models.Invoice()
            {
                AccountedDate = invoiceInDb.AccountedDate,
                AccountNr = invoiceInDb.AccountNr,
                AccountNrVat = invoiceInDb.AccountNrVat,
                City = invoiceInDb.City,
                CrediflowSessionId = invoiceInDb.CrediflowSessionId,
                CreditingInvoiceId = invoiceInDb.CreditingInvoiceId,
                CurrencyId = invoiceInDb.CurrencyId,
                CurrencyRate = invoiceInDb.CurrencyRate,
                CustomerId = invoiceInDb.CustomerId,
                CustomerName = invoiceInDb.CustomerName,
                CustomerReference = invoiceInDb.CustomerReference,
                ExportResult = invoiceInDb.ExportResult,
                Id = invoiceInDb.Id,
                InvoiceDate = invoiceInDb.InvoiceDate,
                InvoiceFee = invoiceInDb.InvoiceFee,
                InvoiceNr = invoiceInDb.InvoiceNr,
                InvoicePayMethod = invoiceInDb.InvoicePayMethod,
                InvoiceType = invoiceInDb.InvoiceType,
                IsCancelled = invoiceInDb.IsCancelled,
                IsSettled = invoiceInDb.IsSettled,
                IsOkForAccounting = invoiceInDb.IsOkForAccounting,
                IsPrinted = invoiceInDb.IsPrinted,
                IsEmailed = invoiceInDb.IsEmailed,
                IsEInvoiced = invoiceInDb.IsEInvoiced,
                Marking = invoiceInDb.Marking,
                Note = invoiceInDb.Note,
                NrOfInvoiceDays = invoiceInDb.NrOfInvoiceDays,
                OrgNr = invoiceInDb.OrgNr,
                OurReference = invoiceInDb.OurReference,
                PdfName = invoiceInDb.PdfName,
                Rounding = invoiceInDb.Rounding,
                Street1 = invoiceInDb.Street1,
                Street2 = invoiceInDb.Street2,
                TermsOfPayment = invoiceInDb.NrOfInvoiceDays != null ? invoiceInDb.NrOfInvoiceDays.GetValueOrDefault().ToString() : "30",
                TotExVat = invoiceInDb.TotExVat,
                TotSum = invoiceInDb.TotSum,
                TotVat = invoiceInDb.TotVat,
                VatNr = invoiceInDb.VatNr,
                ZipCode = invoiceInDb.ZipCode,
                YourReference = invoiceInDb.YourReference?.Length > 50 ? invoiceInDb.YourReference.Substring(0, 50) : invoiceInDb.YourReference ?? "",
                DueDate = invoiceInDb.InvoiceDate.HasValue && invoiceInDb.NrOfInvoiceDays.HasValue
                    ? invoiceInDb.InvoiceDate.Value.AddDays(invoiceInDb.NrOfInvoiceDays.Value)
                    : (DateTime?)null,
                InvoiceRows = invoiceRows
            };

            return Ok(invoice);
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<Invoice>> PostInvoice([FromBody] Invoice invoice)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var userIdClaim = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                                 ?? User?.FindFirst("sub")?.Value
                                 ?? User?.FindFirst("id")?.Value;
                _ = int.TryParse(userIdClaim, out int userId);

                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return Unauthorized(new { message = "User not found" });
                }

                Invoice? invoiceInDb = null;

                if (invoice.Id == 0)
                {
                    int invoiceNr = (await _context.Invoices
                        .Where(i => i.OfficeId == user.OfficeId)
                        .MaxAsync(i => (int?)i.InvoiceNr) ?? 0) + 1;
                    invoiceInDb = new Invoice
                    {
                        OfficeId = user.OfficeId,
                        CreatedByUserId = user.Id,
                        CreatedDate = DateTime.UtcNow,
                        InvoiceNr = invoiceNr
                    };
                    _context.Invoices.Add(invoiceInDb);
                }
                else
                {
                    invoiceInDb = await _context.Invoices.FindAsync(invoice.Id);
                    if (invoiceInDb == null)
                    {
                        return NotFound(new { message = "Invoice not found" });
                    }
                    if (invoiceInDb.OfficeId != user.OfficeId)
                    {
                        return Forbid();
                    }
                }

                invoiceInDb.ModifiedByUserId = user.Id;
                invoiceInDb.ModifiedDate = DateTime.UtcNow;
                invoiceInDb.InvoiceDate = invoice.InvoiceDate;
                invoiceInDb.InvoicePayMethod = invoice.InvoicePayMethod;
                invoiceInDb.NrOfInvoiceDays = invoice.NrOfInvoiceDays;
                invoiceInDb.CustomerId = invoice.CustomerId;
                invoiceInDb.CustomerName = invoice.CustomerName;
                invoiceInDb.CustomerReference = invoice.CustomerReference;
                invoiceInDb.VatNr = invoice.VatNr;
                invoiceInDb.OrgNr = invoice.OrgNr;
                invoiceInDb.Street1 = invoice.Street1;
                invoiceInDb.Street2 = invoice.Street2;
                invoiceInDb.ZipCode = invoice.ZipCode;
                invoiceInDb.City = invoice.City;
                invoiceInDb.OurReference = invoice.OurReference;
                invoiceInDb.YourReference = invoice.YourReference;
                invoiceInDb.AccountNr = invoice.AccountNr;
                invoiceInDb.AccountNrVat = invoice.AccountNrVat;
                invoiceInDb.Note = invoice.Note;
                invoiceInDb.IsCancelled = invoice.IsCancelled;
                invoiceInDb.IsSettled = invoice.IsSettled;
                invoiceInDb.IsOkForAccounting = invoice.IsOkForAccounting;
                invoiceInDb.IsPrinted = invoice.IsPrinted;
                invoiceInDb.IsEmailed = invoice.IsEmailed;
                invoiceInDb.IsEInvoiced = invoice.IsEInvoiced;
                invoiceInDb.TermsOfPayment = invoice.TermsOfPayment;
                invoiceInDb.Marking = invoice.Marking;
                invoiceInDb.InvoiceFee = invoice.InvoiceFee;
                invoiceInDb.CurrencyRate = invoice.CurrencyRate;
                invoiceInDb.CurrencyId = invoice.CurrencyId;
                invoiceInDb.PdfName = invoice.PdfName;
                invoiceInDb.ExportResult = invoice.ExportResult;
                invoiceInDb.CrediflowSessionId = invoice.CrediflowSessionId;
                invoiceInDb.TotExVat = invoice.InvoiceRows?.Where(r => r.InvoiceRowType?.ToUpper() != "VAT" && r.InvoiceRowType?.ToUpper() != "ROUNDING").Sum(r => r.Sum) ?? 0;
                invoiceInDb.TotVat = invoice.InvoiceRows?.Where(r => r.InvoiceRowType?.ToUpper() == "VAT").Sum(r => r.Sum) ?? 0;
                invoiceInDb.Rounding = Utils.Rounding.GetRoundingDifference(invoiceInDb.TotExVat.GetValueOrDefault() + invoiceInDb.TotVat.GetValueOrDefault()) + invoiceInDb.TotExVat.GetValueOrDefault() + invoiceInDb.TotVat.GetValueOrDefault();
                invoiceInDb.TotSum = invoiceInDb.TotExVat.GetValueOrDefault() + invoiceInDb.TotVat.GetValueOrDefault() + invoiceInDb.Rounding.GetValueOrDefault();

                // Handle Invoice Rows
                var existingRowIds = _context.InvoiceRows.Where(r => r.InvoiceId == invoiceInDb.Id).Select(r => r.Id).ToList();
                var incomingRowIds = invoice.InvoiceRows?.Where(r => r.Id != 0).Select(r => r.Id).ToList() ?? new List<int>();
                var rowsToDelete = existingRowIds.Except(incomingRowIds).ToList();
                foreach (var rowId in rowsToDelete)
                {
                    var rowToDelete = await _context.InvoiceRows.FindAsync(rowId);
                    if (rowToDelete != null)
                    {
                        _context.InvoiceRows.Remove(rowToDelete);
                    }
                }
                if (invoice.InvoiceRows != null)
                {
                    foreach (var row in invoice.InvoiceRows)
                    {
                        InvoiceRow? rowInDb = null;
                        if (row.Id == 0)
                        {
                            rowInDb = new InvoiceRow();
                            rowInDb.OfficeId = user.OfficeId;
                            rowInDb.Invoice = invoiceInDb;
                            _context.InvoiceRows.Add(rowInDb);
                        }
                        else
                        {
                            rowInDb = await _context.InvoiceRows.FindAsync(row.Id);
                            if (rowInDb == null)
                            {
                                return NotFound(new { message = "Invoice row not found" });
                            }
                        }
                        rowInDb.ItemId = row.ItemId;
                        rowInDb.ArticleId = row.ArticleId;
                        rowInDb.ArticleNr = row.ArticleNr;
                        rowInDb.Text1 = row.Text1;
                        rowInDb.Text2 = row.Text2;
                        rowInDb.Qty = row.Qty;
                        rowInDb.UnitPrice = row.UnitPrice;
                        rowInDb.DiscountRate = row.DiscountRate;
                        rowInDb.Sum = row.Sum;
                        rowInDb.VatRate = row.VatRate;
                        rowInDb.AccountNr = row.AccountNr;
                        rowInDb.CostCenter = row.CostCenter;
                        rowInDb.SortNr = row.SortNr;
                        rowInDb.InvoiceRowType = row.InvoiceRowType;
                        rowInDb.ReservationCalcItemId = row.ReservationCalcItemId;
                    }
                }

                await _context.SaveChangesAsync();
                return Ok(invoiceInDb.Id);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Invalid invoice data", error = ex.Message });
            }
        }

        [HttpPost("account")]
        [Authorize]
        public async Task<IActionResult> AccountInvoice([FromBody] int invoiceId)
        {
            try
            {
                var office = await _context.Offices.FindAsync(3);
                if (office == null)
                {
                    return BadRequest(new { message = "No Fortnox settings found" });
                }
                var invoice = await _context.Invoices.FindAsync(invoiceId);
                if (invoice == null)
                {
                    return NotFound(new { message = "Invoice not found" });
                }
                var invoiceRows = await _context.InvoiceRows.Where(p => p.InvoiceId == invoiceId).ToListAsync();
                var customer = await _context.Customers.Where(p => p.Id == invoice.CustomerId).FirstOrDefaultAsync();
                if (customer == null)
                {
                    return NotFound(new { message = "Customer not found" });
                }

                bool TokenIsValid = false;
                var fortnoxAuthClient = new FortnoxAuthClient();
                var authWorkflow = fortnoxAuthClient.StandardAuthWorkflow;
                if (!string.IsNullOrWhiteSpace(office.FortnoxAccessToken))
                {
                    var auth = new Fortnox.SDK.Authorization.StandardAuth(office.FortnoxAccessToken);
                    TokenIsValid = !auth.IsExpired(new TimeSpan());
                }
                if (!TokenIsValid && !string.IsNullOrWhiteSpace(office.FortnoxRefreshToken))
                {
                    try
                    {
                        var tokenInfo = await authWorkflow.RefreshTokenAsync(office.FortnoxRefreshToken, "lbiXtlx8rx0I", "fX3OelQ883");
                        office.FortnoxAccessToken = tokenInfo.AccessToken;
                        office.FortnoxRefreshToken = tokenInfo.RefreshToken;
                        office.FortnoxTokenCreated = DateTime.Now;
                        office.FortnoxTokenExpiresInSeconds = tokenInfo.ExpiresIn;
                        _context.SaveChanges();
                        TokenIsValid = true;
                    }
                    catch (Exception)
                    {
                    }
                }
                if (!TokenIsValid)
                {
#if DEBUG
                    var redirectUrl = "http://localhost:5173/settings/fortnoxredirect";
#else
                            var redirectUrl = "https://hyrsys.se/settings/fortnoxredirect";
#endif
                    var scopes = new List<Scope>()
                                    {
                                        //Scope.Article,
                                        Scope.Bookkeeping,
                                        Scope.CostCenter,
                                        Scope.Currency,
                                        Scope.Customer,
                                        Scope.Invoice,
                                        //Scope.Order,
                                        Scope.Payment,
                                    };
                    var uri = authWorkflow.BuildAuthUri("lbiXtlx8rx0I", scopes, office.Name, redirectUrl);
                    // System.Diagnostics.Process.Start(uri.AbsoluteUri);
                    return Ok(new { status = "FORTNOX_PAIRING_IN_PROGRESS", action = "alert", message = "Fortnox-koppling pågår, prova igen :)", redirecturl = uri.AbsoluteUri });
                }

                var accountService = new Utils.FortnoxAccountService(accessToken: office.FortnoxAccessToken);
                var costCenterService = new Utils.FortnoxCostCenterService(accessToken: office.FortnoxAccessToken);
                string Info = "";
                var authorization = new StandardAuth(office.FortnoxAccessToken);
                var fortnoxClient = new FortnoxClient(authorization);
                //
                // Om kund ej finns i Fortnox så skapa denna
                //
                string KeyFortnox = customer.KeyFortnox ?? "";
                var customerConnector = fortnoxClient.CustomerConnector;
                Fortnox.SDK.Entities.Customer? customerFortnox = null;
                if (!string.IsNullOrWhiteSpace(KeyFortnox))
                {
                    try
                    {
                        customerFortnox = await customerConnector.GetAsync(KeyFortnox);
                    }
                    catch (Exception)
                    {
                        KeyFortnox = "";
                    }
                }
                if (string.IsNullOrEmpty(KeyFortnox) || customerFortnox == null)
                {
                    // if (string.IsNullOrWhiteSpace(customer.strOrganizationNr))
                    // {
                    //     return BadRequest(new { message = "Kunden saknar org.nr, kan ej skapa kund i Fortnox" });
                    // }
                    customerFortnox = new Fortnox.SDK.Entities.Customer()
                    {
                        Address1 = customer.Street1 ?? "",
                        Address2 = customer.Street2 ?? "",
                        City = customer.City ?? "",
                        Currency = "",
                        CustomerNumber = customer.CustomerNr?.ToString() ?? "",
                        Email = customer.Email ?? "",
                        Name = customer.CustomerName ?? "",
                        OrganisationNumber = customer.OrgNr ?? "",
                        Phone1 = customer.Telephone ?? "",
                        Type = Utils.OrganisationNr.IsCompany(customer.OrgNr ?? "") ? Fortnox.SDK.Entities.CustomerType.Company : Fortnox.SDK.Entities.CustomerType.Private,
                        VATType = Fortnox.SDK.Entities.CustomerVATType.SE_VAT,
                        ZipCode = customer.ZipCode ?? "",
                    };
                    try
                    {
                        var resultCustomer = await customerConnector.CreateAsync(customerFortnox);
                        KeyFortnox = resultCustomer.CustomerNumber;
                        customer.KeyFortnox = resultCustomer.CustomerNumber;
                        _context.SaveChanges();
                        Info += (!string.IsNullOrWhiteSpace(Info) ? ". " : "") + "Kund skapad i fortnox";
                    }
                    catch (Exception ex)
                    {
                        var fEx = (FortnoxApiException)ex;
                        if (fEx.ErrorInfo.Code == "2000637")
                        {
                            // Check if customer already exists by customernr or organisation number in Fortnox
                            var searchSettings = new CustomerSearch();
                            if (!string.IsNullOrWhiteSpace(customer.CustomerNr?.ToString()))
                            {
                                searchSettings.CustomerNumber = customer.CustomerNr?.ToString() ?? "";
                            }
                            else if (!string.IsNullOrWhiteSpace(customer.OrgNr))
                            {
                                searchSettings.OrganisationNumber = customer.OrgNr;
                            }
                            else
                            {
                                return BadRequest(new { message = "Kunde ej skapa ny kund i Fortnox. " + ex.Message });
                            }
                            var searchResult = await customerConnector.FindAsync(searchSettings);
                            if (searchResult.Entities != null && searchResult.Entities.Count > 0)
                            {
                                var existingCustomer = searchResult.Entities[0];
                                KeyFortnox = existingCustomer.CustomerNumber;
                                customer.KeyFortnox = existingCustomer.CustomerNumber;
                                _context.SaveChanges();
                                Info += (!string.IsNullOrWhiteSpace(Info) ? ". " : "") + "Kund återanvänds från fortnox";
                            }
                            else
                            {
                                return BadRequest(new { message = "Kunde ej skapa ny kund i Fortnox. " + ex.Message });
                            }
                        }
                        else
                        {
                            return BadRequest(new { message = "Kunde ej skapa ny kund i Fortnox. " + ex.Message });
                        }
                    }
                }
                //
                // Fakturarader
                //
                var invoiceRowsFortnoxToAdd = new List<Fortnox.SDK.Entities.InvoiceRow>();
                foreach (var invoiceRow in invoiceRows.Where(p => p.InvoiceRowType?.ToUpper() != "VAT" && p.InvoiceRowType?.ToUpper() != "ROUNDING").OrderBy(p => p.SortNr))
                {
                    // Kotrollera att konto finns upplagt i Fortnox, annars lägg upp
                    if (invoiceRow.AccountNr != null)
                    {
                        try
                        {
                            var accountFortnox = await accountService.GetAccountAsync(invoiceRow.AccountNr.Value);
                            if (accountFortnox == null)
                            {
                                var item = await _context.Items.Where(p => p.Id == invoiceRow.ItemId).FirstOrDefaultAsync();
                                var result = await accountService.AddAccountAsync(
                                    new Utils.Fortnox.Models.Account()
                                    {
                                        Number = invoiceRow.AccountNr.Value,
                                        Description = item != null && !string.IsNullOrWhiteSpace(item?.MachineNr) ? item.MachineNr ?? "" : invoiceRow.AccountNr.Value.ToString(),
                                        Active = true
                                    }
                                );
                            }
                        }
                        catch (Exception ex)
                        {
                            return BadRequest(new { message = "Kunde ej skapa nytt konto i Fortnox. " + ex.Message });
                        }
                    }
                    // Kotrollera att kostnadsställe finns upplagt i Fortnox, annars lägg upp
                    if (!string.IsNullOrWhiteSpace(invoiceRow.CostCenter))
                    {
                        if (!string.IsNullOrWhiteSpace(invoiceRow.CostCenter) && invoiceRow.CostCenter != "0")
                        {
                            try
                            {
                                var costCenterFortnox = await costCenterService.GetCostCenterAsync(invoiceRow.CostCenter);
                                if (costCenterFortnox == null)
                                {
                                    var result = await costCenterService.AddCostCenterAsync(
                                        new Utils.Fortnox.Models.CostCenter()
                                        {
                                            Code = invoiceRow.CostCenter,
                                            Description = invoiceRow.CostCenter,
                                            Active = true
                                        }
                                    );
                                }
                            }
                            catch (Exception ex)
                            {
                                return BadRequest(new { message = "Kunde ej skapa nytt kostnadsställe i Fortnox. " + ex.Message });
                            }
                        }
                    }
                    // Skapar fakturarader
                    invoiceRowsFortnoxToAdd.Add(new Fortnox.SDK.Entities.InvoiceRow()
                    {
                        AccountNumber = int.TryParse(invoiceRow.AccountNr.ToString(), out var number) ? number : (int?)null,
                        // ArticleNumber = invoiceRow.HelpPropertyArticleNr,
                        // CostCenter = invoiceRow.CostCenter ?? "",
                        DeliveredQuantity = 1,
                        Description = invoiceRow.Text1 + (string.IsNullOrWhiteSpace(invoiceRow.Text2) ? "" : " (" + invoiceRow.Text2 + ")"),
                        Price = (decimal?)invoiceRow.Sum,
                        VAT = 25
                    });
                }
                //
                // Fakturahuvud
                //
                var invoiceFortnox = new Fortnox.SDK.Entities.Invoice()
                {
                    Address1 = invoice.Street1 ?? "",
                    Address2 = invoice.Street2 ?? "",
                    City = invoice.City ?? "",
                    Comments = invoice.Note ?? "",
                    CostCenter = "",
                    Country = "",
                    CustomerName = invoice.CustomerName ?? "",
                    CustomerNumber = KeyFortnox,
                    DeliveryAddress1 = "",
                    DeliveryAddress2 = "",
                    DeliveryCity = "",
                    DeliveryZipCode = "",
                    DueDate = invoice.InvoiceDate.GetValueOrDefault().AddDays(invoice.NrOfInvoiceDays.GetValueOrDefault()),
                    DocumentNumber = invoice.InvoiceNr,
                    InvoiceDate = invoice.InvoiceDate,
                    InvoiceType = (invoice.InvoicePayMethod == "CASH" || invoice.InvoicePayMethod == "CARD") ? Fortnox.SDK.Entities.InvoiceType.CashInvoice : Fortnox.SDK.Entities.InvoiceType.Invoice,
                    Language = Fortnox.SDK.Entities.Language.Swedish,
                    OurReference = invoice.OurReference ?? "",
                    // PaymentWay = (invoice.InvoicePayMethod == "CASH" ? Utils.Fortnox.Entities.PaymentWay.Cash : inv.Invoice.PayMethod == "CARD" ? Utils.Fortnox.Entities.PaymentWay.Card : null),
                    TermsOfPayment = invoice.NrOfInvoiceDays != null ? invoice.NrOfInvoiceDays.GetValueOrDefault().ToString() : "30",
                    VATIncluded = false,
                    YourOrderNumber = "",
                    YourReference = invoice.YourReference?.Length > 50 ? invoice.YourReference.Substring(0, 50) : invoice.YourReference ?? "",
                    InvoiceRows = invoiceRowsFortnoxToAdd,
                };
                var invoiceConnector = fortnoxClient.InvoiceConnector;
                try
                {
                    var result = await invoiceConnector.CreateAsync(invoiceFortnox);
                    Info += (!string.IsNullOrWhiteSpace(Info) ? ". " : "") + "Faktura skapad i fortnox";
                }
                catch (Exception ex)
                {
                    var fEx = (FortnoxApiException)ex;
                    if (fEx.ErrorInfo.Code == "2000861")
                    {
                        // Mark invoice as accounted anyway
                        Info += (!string.IsNullOrWhiteSpace(Info) ? ". " : "") + "Faktura finns redan i fortnox, markeras som bokförd";
                    }
                    else
                    {
                        return BadRequest(new { message = "Kunde ej skapa ny faktura i Fortnox. " + ex.Message });
                    }
                }

                invoice.AccountedDate = DateTime.Today;
                _context.SaveChanges();
                string Result = "Ok" + (string.IsNullOrWhiteSpace(Info) ? "" : ". " + Info);

                return Ok(new { message = Result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Fel", error = ex.Message });
            }
        }


    }
}
