using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Backend.Data;
using Backend.Dtos;
using Backend.Filters;
using Backend.Models;
using Backend.Services;
using Backend.Utils;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ServiceTypeController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ServiceTypeController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResult<ServiceTypeDto>>> GetServiceTypes([FromQuery] ServiceTypeFilter filter)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var query = _context.ServiceTypes
                .Where(serviceType => serviceType.OfficeId == user.OfficeId)
                .AsQueryable();

            if (filter.Id.HasValue)
            {
                query = query.Where(serviceType => serviceType.Id == filter.Id.Value);
            }

            if (!string.IsNullOrEmpty(filter.SearchTerm))
            {
                var searchTerm = filter.SearchTerm.ToLower();
                query = query.Where(serviceType =>
                    serviceType.ServiceCode.ToLower().Contains(searchTerm)
                    || serviceType.Name.ToLower().Contains(searchTerm));
            }

            var totalRecords = await query.CountAsync();

            var sortBy = filter.SortBy ?? new[] { "ServiceCode:asc", "Id:desc" };
            query = query.ApplyMultiSort(sortBy);

            var serviceTypes = await query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .AsNoTracking()
                .Select(serviceType => new ServiceTypeDto
                {
                    Id = serviceType.Id,
                    OfficeId = serviceType.OfficeId,
                    ServiceCode = serviceType.ServiceCode,
                    Name = serviceType.Name,
                })
                .ToListAsync();

            return Ok(new PagedResult<ServiceTypeDto>
            {
                Data = serviceTypes,
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
        public async Task<ActionResult<ServiceTypeDto>> GetServiceType(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var serviceType = await _context.ServiceTypes
                .AsNoTracking()
                .Where(entry => entry.Id == id && entry.OfficeId == user.OfficeId)
                .Select(entry => new ServiceTypeDto
                {
                    Id = entry.Id,
                    OfficeId = entry.OfficeId,
                    ServiceCode = entry.ServiceCode,
                    Name = entry.Name,
                })
                .FirstOrDefaultAsync();

            if (serviceType == null)
            {
                return NotFound();
            }

            return Ok(serviceType);
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteServiceType(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var serviceType = await _context.ServiceTypes
                .FirstOrDefaultAsync(entry => entry.Id == id && entry.OfficeId == user.OfficeId);

            if (serviceType == null)
            {
                return NotFound();
            }

            _context.ServiceTypes.Remove(serviceType);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<ServiceTypeDto>> PostServiceType([FromBody] ServiceTypeUpsertDto serviceType)
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

                if (!user.OfficeId.HasValue)
                {
                    return BadRequest(new { message = "User has no office" });
                }

                ServiceType? serviceTypeInDb;

                if (serviceType.Id == 0)
                {
                    serviceTypeInDb = new ServiceType
                    {
                        OfficeId = user.OfficeId.Value,
                    };
                    _context.ServiceTypes.Add(serviceTypeInDb);
                }
                else
                {
                    serviceTypeInDb = await _context.ServiceTypes
                        .FirstOrDefaultAsync(entry => entry.Id == serviceType.Id && entry.OfficeId == user.OfficeId);

                    if (serviceTypeInDb == null)
                    {
                        return NotFound(new { message = "ServiceType not found" });
                    }
                }

                ApplyServiceTypeChanges(serviceTypeInDb, serviceType);

                await _context.SaveChangesAsync();
                return Ok(MapServiceType(serviceTypeInDb));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        private static ServiceTypeDto MapServiceType(ServiceType serviceType)
        {
            return new ServiceTypeDto
            {
                Id = serviceType.Id,
                OfficeId = serviceType.OfficeId,
                ServiceCode = serviceType.ServiceCode,
                Name = serviceType.Name,
            };
        }

        private static void ApplyServiceTypeChanges(ServiceType target, ServiceTypeUpsertDto source)
        {
            target.ServiceCode = source.ServiceCode?.Trim() ?? string.Empty;
            target.Name = source.Name?.Trim() ?? string.Empty;
        }
    }
}