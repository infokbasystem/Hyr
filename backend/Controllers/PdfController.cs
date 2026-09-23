using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Services;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PdfController : ControllerBase
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly IInvoicePdfService _invoicePdfService;
        private readonly IReservationPdfService _reservationPdfService;

        public PdfController(
            ICurrentUserService currentUserService,
            IInvoicePdfService invoicePdfService,
            IReservationPdfService reservationPdfService)
        {
            _currentUserService = currentUserService;
            _invoicePdfService = invoicePdfService;
            _reservationPdfService = reservationPdfService;
        }

        [HttpGet("invoice/{id:int}")]
        public async Task<IActionResult> GetPdfById(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            if (!user.OfficeId.HasValue)
            {
                return Unauthorized(new { message = "User has no office" });
            }

            var pdf = await _invoicePdfService.GenerateInvoicePdfAsync(user.OfficeId.Value, id, HttpContext.RequestAborted);
            return pdf is null
                ? NotFound("Invoice not found.")
                : File(pdf.Content, "application/pdf", pdf.FileName, enableRangeProcessing: true);
        }

        [HttpGet("reservation/{id:int}")]
        public async Task<IActionResult> GetReservationPdfById(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null || !user.OfficeId.HasValue)
            {
                return Unauthorized(new { message = "User not found or has no office" });
            }

            var pdf = await _reservationPdfService.GenerateReservationPdfAsync(user.OfficeId.Value, id, HttpContext.RequestAborted);
            return pdf is null
                ? NotFound("Reservation not found.")
                : File(pdf.Content, "application/pdf", pdf.FileName, enableRangeProcessing: true);
        }

    }
}
