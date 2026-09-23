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
    public class DepartmentController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public DepartmentController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResult<DepartmentDto>>> GetDepartments([FromQuery] DepartmentFilter filter)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user?.OfficeId == null)
            {
                return Unauthorized(new { message = "User or office not found" });
            }

            var query = _context.Departments
                .Where(department => department.OfficeId == user.OfficeId.Value)
                .AsQueryable();

            if (filter.Id.HasValue)
            {
                query = query.Where(department => department.Id == filter.Id.Value);
            }

            if (!string.IsNullOrEmpty(filter.SearchTerm))
            {
                var searchTerm = filter.SearchTerm.ToLower();
                query = query.Where(department =>
                    department.Name.ToLower().Contains(searchTerm));
            }

            var totalRecords = await query.CountAsync();

            var sortBy = filter.SortBy ?? new[] { "Name:asc", "Id:desc" };
            query = query.ApplyMultiSort(sortBy);

            var departments = await query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .AsNoTracking()
                .Select(department => new DepartmentDto
                {
                    Id = department.Id,
                    OfficeId = department.OfficeId,
                    Name = department.Name,
                    IsActive = department.IsActive,
                })
                .ToListAsync();

            return Ok(new PagedResult<DepartmentDto>
            {
                Data = departments,
                TotalRecords = totalRecords,
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = (int)Math.Ceiling((double)totalRecords / filter.PageSize),
                HasNextPage = filter.Page * filter.PageSize < totalRecords,
                HasPreviousPage = filter.Page > 1
            });
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<DepartmentDto>> GetDepartment(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user?.OfficeId == null)
            {
                return Unauthorized(new { message = "User or office not found" });
            }

            var department = await _context.Departments
                .AsNoTracking()
                .Where(entry => entry.Id == id && entry.OfficeId == user.OfficeId.Value)
                .Select(entry => new DepartmentDto
                {
                    Id = entry.Id,
                    OfficeId = entry.OfficeId,
                    Name = entry.Name,
                    IsActive = entry.IsActive,
                })
                .FirstOrDefaultAsync();

            if (department == null)
            {
                return NotFound();
            }

            return Ok(department);
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteDepartment(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user?.OfficeId == null)
            {
                return Unauthorized(new { message = "User or office not found" });
            }

            var department = await _context.Departments
                .FirstOrDefaultAsync(entry => entry.Id == id && entry.OfficeId == user.OfficeId.Value);

            if (department == null)
            {
                return NotFound();
            }

            _context.Departments.Remove(department);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<DepartmentDto>> PostDepartment([FromBody] DepartmentUpsertDto department)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var user = await _currentUserService.GetCurrentUserAsync(User);
                if (user?.OfficeId == null)
                {
                    return Unauthorized(new { message = "User or office not found" });
                }

                Department? departmentInDb;
                if (department.Id == 0)
                {
                    departmentInDb = new Department
                    {
                        OfficeId = user.OfficeId.Value,
                    };

                    _context.Departments.Add(departmentInDb);
                }
                else
                {
                    departmentInDb = await _context.Departments
                        .FirstOrDefaultAsync(entry => entry.Id == department.Id && entry.OfficeId == user.OfficeId.Value);

                    if (departmentInDb == null)
                    {
                        return NotFound(new { message = "Department not found" });
                    }
                }

                ApplyDepartmentChanges(departmentInDb, department);

                await _context.SaveChangesAsync();
                return Ok(MapDepartment(departmentInDb));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        private static DepartmentDto MapDepartment(Department department)
        {
            return new DepartmentDto
            {
                Id = department.Id,
                OfficeId = department.OfficeId,
                Name = department.Name,
                IsActive = department.IsActive,
            };
        }

        private static void ApplyDepartmentChanges(Department target, DepartmentUpsertDto source)
        {
            target.Name = source.Name?.Trim() ?? string.Empty;
            target.IsActive = source.IsActive;
        }
    }
}