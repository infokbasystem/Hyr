using System.Text.Json;
using System.Threading;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;

using Telerik.Reporting;
using Telerik.Reporting.Processing;
using Telerik.Reporting.XmlSerialization;


using Hyr.Api.Data;

namespace Hyr.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PdfController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public PdfController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("invoice/{id:int}")]
        public async Task<IActionResult> GetPdfById(int id)
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

            var reportPath = Path.Combine(Directory.GetCurrentDirectory(), "", "Reports", "Invoice.trdx");

            if (!System.IO.File.Exists(reportPath))
            {
                return NotFound("Report file not found.");
            }

            Telerik.Reporting.Report report;
            using (var fs = System.IO.File.OpenRead(reportPath))
            {
                var serializer = new ReportXmlSerializer();
                report = (Telerik.Reporting.Report)serializer.Deserialize(fs);
            }

            if (report == null)
                return Problem("Failed to load report.");

            var officeInDb = await _context.Offices.Where(o => o.Id == user.OfficeId).FirstOrDefaultAsync();
            var invoiceInDb = await _context.Invoices
                            .Include(i => i.CreatedByUser)
                            .Include(i => i.ModifiedByUser)
                            .Include(i => i.Customer)
                            .Include(i => i.InvoiceRows)
                            .FirstOrDefaultAsync(i => i.Id == id);

            if (invoiceInDb == null)
            {
                return NotFound("Invoice not found.");
            }

            var invoice = new Models.Print.Invoice
            {
                Id = invoiceInDb.Id.ToString(),
                InvoiceNr = invoiceInDb.InvoiceNr.GetValueOrDefault().ToString(),
                InvoiceDate = invoiceInDb.InvoiceDate.GetValueOrDefault().ToString("yyyy-MM-dd"),
                DueDate = invoiceInDb.DueDate.GetValueOrDefault().AddDays(invoiceInDb.NrOfInvoiceDays.GetValueOrDefault()).ToString("yyyy-MM-dd"),
                CustomerName = invoiceInDb.CustomerName,
                InvoiceRows = invoiceInDb.InvoiceRows.Select(r => new Models.Print.InvoiceRow
                {
                    AccountNr = r.AccountNr.GetValueOrDefault().ToString(),
                    ArticleId = r.ArticleId.GetValueOrDefault().ToString(),
                    ArticleNr = r.ArticleNr,
                    CostCenter = r.CostCenter,
                    DiscountRate = r.DiscountRate.GetValueOrDefault().ToString(),
                    InvoiceId = r.InvoiceId.GetValueOrDefault().ToString(),
                    InvoiceRowType = r.InvoiceRowType,
                    Qty = r.Qty.GetValueOrDefault().ToString(),
                    SortNr = r.SortNr.GetValueOrDefault().ToString(),
                    Sum = r.Sum.GetValueOrDefault().ToString(),
                    Text1 = r.Text1,
                    Text2 = r.Text2,
                    UnitPrice = r.UnitPrice.GetValueOrDefault().ToString(),
                    VatRate = r.VatRate.GetValueOrDefault().ToString()
                }).ToList()
            };

            report.DataSource = invoice;

            // Render PDF
            var result = await Task.Run(() =>
            {
                var processor = new ReportProcessor();
                var reportSource = new Telerik.Reporting.InstanceReportSource { ReportDocument = report };
                return processor.RenderReport("PDF", reportSource, null);
            });

            if (result.HasErrors)
                return Problem(string.Join("\n", (IEnumerable<string>)result.Errors.Select(e => e.Message)));

            // Return PDF to browser
            return File(result.DocumentBytes, "application/pdf", null, enableRangeProcessing: true);


        }

    }
}

