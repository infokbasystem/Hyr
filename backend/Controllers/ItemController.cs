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
    [Authorize]
    public class ItemController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ItemController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResult<ItemSearchDto>>> GetItems([FromQuery] ItemFilter filter)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var query = _context.Items
                .Where(i => i.OfficeId == user.OfficeId)
                .Include(i => i.ItemType)
                .Include(i => i.ItemCategory)
                .Include(i => i.ItemModel)
                .AsQueryable();

            if (filter.Id.HasValue)
                query = query.Where(i => i.Id == filter.Id.Value);

            if (filter.IsActive.HasValue)
                query = query.Where(i => i.IsActive == filter.IsActive.Value);

            if (!string.IsNullOrWhiteSpace(filter.ItemTypeCode))
            {
                var itemTypeCode = filter.ItemTypeCode.Trim().ToUpper();
                query = query.Where(i =>
                    i.ItemTypeCode.ToUpper() == itemTypeCode ||
                    (i.ItemType != null && i.ItemType.Code.ToUpper() == itemTypeCode));
            }

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var searchTerm = filter.SearchTerm.Trim().ToLower();
                query = query.Where(i =>
                    i.ItemNr.ToLower().Contains(searchTerm) ||
                    i.RegNr.ToLower().Contains(searchTerm) ||
                    i.MachineNr.ToLower().Contains(searchTerm) ||
                    i.Manufacturer.ToLower().Contains(searchTerm) ||
                    i.Note.ToLower().Contains(searchTerm));
            }

            var totalRecords = await query.CountAsync();

            // Default sort for stable paging when no explicit sorting is provided.
            var sortBy = filter.SortBy ?? new[] { "ItemNr:asc", "Id:desc" };
            query = query.ApplyMultiSort(sortBy);

            var items = await query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .AsNoTracking()
                .Select(i => new ItemSearchDto
                {
                    Id = i.Id,
                    ItemNr = i.ItemNr,
                    RegNr = i.RegNr,
                    YearModel = i.YearModel,
                    MachineNr = i.MachineNr,
                    Manufacturer = i.Manufacturer,
                    ItemTypeCode = !string.IsNullOrWhiteSpace(i.ItemTypeCode) ? i.ItemTypeCode : (i.ItemType != null ? i.ItemType.Code : string.Empty),
                    ItemTypeName = i.ItemType != null ? i.ItemType.Name : string.Empty,
                    ItemCategoryName = i.ItemCategory != null ? i.ItemCategory.Name : string.Empty,
                    ItemModelName = i.ItemModel != null ? i.ItemModel.Name : string.Empty,
                    IsActive = i.IsActive,
                    IsPartOfPackage = i.IsPartOfPackage,
                    NrOfItemsTotal = i.NrOfItemsTotal,
                    BasePrice = i.BasePrice,
                    PricePerDay = i.PricePerDay,
                    PricePerWeek = i.PricePerWeek,
                    Note = i.Note,
                })
                .ToListAsync();

            var totalPages = (int)Math.Ceiling((double)totalRecords / filter.PageSize);

            return new PagedResult<ItemSearchDto>
            {
                Data = items,
                TotalRecords = totalRecords,
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = totalPages,
                HasNextPage = filter.Page < totalPages,
                HasPreviousPage = filter.Page > 1
            };
        }

        [HttpGet("form-options")]
        public async Task<ActionResult<ItemFormOptionsDto>> GetFormOptions()
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            if (!user.OfficeId.HasValue)
            {
                return BadRequest(new { message = "User has no office" });
            }

            var formOptions = await BuildItemFormOptions(user.OfficeId.Value);
            return Ok(formOptions);
        }

        [HttpGet("carsearch-form-options")]
        public async Task<ActionResult<ItemFormOptionsDto>> GetCarSearchFormOptions()
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            if (!user.OfficeId.HasValue)
            {
                return BadRequest(new { message = "User has no office" });
            }

            var formOptions = await BuildItemFormOptions(user.OfficeId.Value);
            return Ok(formOptions);
        }

        private async Task<ItemFormOptionsDto> BuildItemFormOptions(int officeId)
        {
            var itemTypes = await _context.OfficeItemTypes
                .Where(officeItemType => officeItemType.OfficeId == officeId && officeItemType.ItemType != null)
                .Select(officeItemType => new ItemTypeOptionDto
                {
                    Id = officeItemType.ItemTypeId,
                    Code = officeItemType.ItemType != null ? officeItemType.ItemType.Code : string.Empty,
                    Name = officeItemType.ItemType != null ? officeItemType.ItemType.Name : string.Empty,
                })
                .GroupBy(itemType => new { itemType.Id, itemType.Code, itemType.Name })
                .Select(group => new ItemTypeOptionDto
                {
                    Id = group.Key.Id,
                    Code = group.Key.Code,
                    Name = group.Key.Name,
                })
                .OrderBy(itemType => itemType.Name)
                .ToListAsync();

            var itemCategories = await _context.ItemCategories
                .Where(itemCategory => itemCategory.OfficeId == officeId)
                .AsNoTracking()
                .OrderBy(itemCategory => itemCategory.Name)
                .Select(itemCategory => new ItemCategoryOptionDto
                {
                    Id = itemCategory.Id,
                    Name = itemCategory.Name,
                })
                .ToListAsync();

            var itemModels = await _context.ItemModels
                .Where(itemModel => itemModel.OfficeId == officeId)
                .AsNoTracking()
                .OrderBy(itemModel => itemModel.Name)
                .Select(itemModel => new ItemModelOptionDto
                {
                    Id = itemModel.Id,
                    Name = itemModel.Name,
                })
                .ToListAsync();

            return new ItemFormOptionsDto
            {
                ItemTypes = itemTypes,
                ItemCategories = itemCategories,
                ItemModels = itemModels,
            };
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ItemDto>> GetItemById(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var item = await _context.Items
                .Include(i => i.CreatedByUser)
                .Include(i => i.UpdatedByUser)
                .Include(i => i.PackageItems)
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == id && i.OfficeId == user.OfficeId);

            if (item == null)
            {
                return NotFound(new { message = "Item not found" });
            }

            return Ok(MapItem(item));
        }

        [HttpGet("{id:int}/package-items")]
        public async Task<ActionResult<ItemPackageSelectionDto>> GetPackageItems(int id)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var item = await _context.Items
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == id && i.OfficeId == user.OfficeId);

            if (item == null)
            {
                return NotFound(new { message = "Item not found" });
            }

            if (!IsAluItemType(item.ItemTypeCode) || item.IsPartOfPackage)
            {
                return Ok(new ItemPackageSelectionDto());
            }

            var connectedLinks = await _context.ItemPackageItems
                .AsNoTracking()
                .Where(link => link.ItemId == id)
                .Select(link => new { link.PackageItemId, link.Quantity })
                .ToListAsync();

            var connectedQuantityMap = connectedLinks
                .GroupBy(link => link.PackageItemId)
                .ToDictionary(group => group.Key, group => NormalizePackageItemQuantity(group.Last().Quantity));
            var connectedIdSet = connectedQuantityMap.Keys.ToHashSet();

            var candidateItems = await _context.Items
                .AsNoTracking()
                .Where(i =>
                    i.OfficeId == user.OfficeId &&
                    i.Id != id &&
                    i.ItemTypeCode != null &&
                    i.ItemTypeCode.ToUpper() == "ALU" &&
                    i.IsPartOfPackage)
                .OrderBy(i => i.ItemNr)
                .ThenBy(i => i.Id)
                .Select(i => new ItemPackageOptionDto
                {
                    Id = i.Id,
                    ItemNr = i.ItemNr,
                    Manufacturer = i.Manufacturer,
                    SerialNr = i.SerialNr,
                    Quantity = 1m,
                })
                .ToListAsync();

            var connectedItems = candidateItems
                .Where(i => connectedIdSet.Contains(i.Id))
                .Select(i => new ItemPackageOptionDto
                {
                    Id = i.Id,
                    ItemNr = i.ItemNr,
                    Manufacturer = i.Manufacturer,
                    SerialNr = i.SerialNr,
                    Quantity = connectedQuantityMap.TryGetValue(i.Id, out var quantity) ? quantity : 1m,
                })
                .ToList();

            var availableItems = candidateItems
                .Where(i => !connectedIdSet.Contains(i.Id))
                .ToList();

            return Ok(new ItemPackageSelectionDto
            {
                AvailablePackageItems = availableItems,
                ConnectedPackageItems = connectedItems,
            });
        }

        [HttpPost]
        public async Task<ActionResult<int>> CreateItem([FromBody] ItemUpsertDto itemDto)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            if (!user.OfficeId.HasValue)
            {
                return BadRequest(new { message = "User has no office" });
            }

            var officeId = user.OfficeId.Value;

            var newItem = new Item
            {
                OfficeId = officeId,
                ItemTypeCode = string.Empty,
                RegNr = string.Empty,
                MachineNr = string.Empty,
                SerialNr = string.Empty,
                YearModel = string.Empty,
                Note = string.Empty,
                ItemNr = string.Empty,
                PopupText = string.Empty,
                IsActive = true,
                Manufacturer = string.Empty,
                ArticleNr = string.Empty,
                ShowInPlanning = false,
                ImportSource = string.Empty,
                IsStorageItem = false,
                IsPartOfPackage = false,
                CalculatePriceFromPartPrices = false,
                UnavailableForReservation = false,
                UnavailableReason = string.Empty,
                UnavailableFrom = null,
                UnavailableTo = null,
                AccountNr = string.Empty,
                CostCenterNr = string.Empty,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = user.Id,
                UpdatedAt = DateTime.UtcNow,
                UpdatedBy = user.Id,
            };

            ApplyItemChanges(newItem, itemDto);

            _context.Items.Add(newItem);
            await _context.SaveChangesAsync();

            await SyncPackageItemsAsync(newItem, itemDto, officeId);
            await _context.SaveChangesAsync();

            return Ok(newItem.Id);
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<int>> UpdateItem(int id, [FromBody] ItemUpsertDto itemDto)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            if (!user.OfficeId.HasValue)
            {
                return BadRequest(new { message = "User has no office" });
            }

            var existingItem = await _context.Items
                .Include(i => i.PackageItems)
                .FirstOrDefaultAsync(i => i.Id == id && i.OfficeId == user.OfficeId);

            if (existingItem == null)
            {
                return NotFound(new { message = "Item not found" });
            }

            ApplyItemChanges(existingItem, itemDto);
            await SyncPackageItemsAsync(existingItem, itemDto, user.OfficeId.Value);
            existingItem.UpdatedAt = DateTime.UtcNow;
            existingItem.UpdatedBy = user.Id;
            await _context.SaveChangesAsync();

            return Ok(existingItem.Id);
        }

        [HttpPut("{id:int}/type")]
        public async Task<ActionResult> UpdateItemType(int id, [FromBody] ItemTypeUpdateDto typeDto)
        {
            var user = await _currentUserService.GetCurrentUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var nextItemTypeCode = typeDto.ItemTypeCode?.Trim().ToUpper() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(nextItemTypeCode))
            {
                return BadRequest(new { message = "ItemTypeCode is required" });
            }

            var item = await _context.Items
                .FirstOrDefaultAsync(i => i.Id == id && i.OfficeId == user.OfficeId);

            if (item == null)
            {
                return NotFound(new { message = "Item not found" });
            }

            var itemTypeExists = await _context.ItemTypes
                .AnyAsync(itemType => itemType.Code.ToUpper() == nextItemTypeCode);

            if (!itemTypeExists)
            {
                return BadRequest(new { message = "Invalid item type code" });
            }

            item.ItemTypeCode = nextItemTypeCode;
            await _context.SaveChangesAsync();

            return Ok(new { id = item.Id, itemTypeCode = item.ItemTypeCode });
        }

        private static ItemDto MapItem(Item item)
        {
            return new ItemDto
            {
                Id = item.Id,
                OfficeId = item.OfficeId,
                ItemTypeCode = item.ItemTypeCode,
                ItemCategoryId = item.ItemCategoryId,
                ItemModelId = item.ItemModelId,
                RegNr = item.RegNr,
                MachineNr = item.MachineNr,
                SerialNr = item.SerialNr,
                YearModel = item.YearModel,
                Fuel = item.Fuel,
                Equipment = item.Equipment,
                Note = item.Note,
                ItemNr = item.ItemNr,
                PopupText = item.PopupText,
                IsActive = item.IsActive,
                Manufacturer = item.Manufacturer,
                ArticleNr = item.ArticleNr,
                IsStorageItem = item.IsStorageItem,
                IsPartOfPackage = item.IsPartOfPackage,
                CalculatePriceFromPartPrices = item.CalculatePriceFromPartPrices,
                ShowInPlanning = item.ShowInPlanning,
                SortNr = item.SortNr,
                PlatformHeightMm = item.PlatformHeightMm,
                PlatformLengthMm = item.PlatformLengthMm,
                WeightKg = item.WeightKg,
                HourMeter = item.HourMeter,
                KmReading = item.KmReading,
                BasePrice = item.BasePrice,
                PricePerHour = item.PricePerHour,
                PricePerDay = item.PricePerDay,
                PricePerWeek = item.PricePerWeek,
                PricePerMonth = item.PricePerMonth,
                PricePerKm = item.PricePerKm,
                FuelConsumptionLitresPerKm = item.FuelConsumptionLitresPerKm,
                FuelConsumptionLitresPerHour = item.FuelConsumptionLitresPerHour,
                ReplacementCost = item.ReplacementCost,
                NrOfItemsTotal = item.NrOfItemsTotal,
                UnavailableForReservation = item.UnavailableForReservation,
                UnavailableReason = item.UnavailableReason,
                UnavailableFrom = item.UnavailableFrom,
                UnavailableTo = item.UnavailableTo,
                AccountNr = item.AccountNr,
                CostCenterNr = item.CostCenterNr,
                PackageItemIds = item.PackageItems
                    ?.Select(link => link.PackageItemId)
                    .Distinct()
                    .OrderBy(id => id)
                    .ToList() ?? [],
                PackageItems = item.PackageItems
                    ?.OrderBy(link => link.PackageItemId)
                    .Select(link => new ItemPackageItemDto
                    {
                        PackageItemId = link.PackageItemId,
                        Quantity = NormalizePackageItemQuantity(link.Quantity),
                    })
                    .ToList() ?? [],

                // Audit / tracking fields
                CreatedAt = item.CreatedAt,
                CreatedByName = item.CreatedByName,
                UpdatedAt = item.UpdatedAt,
                UpdatedByName = item.UpdatedByName,
            };
        }

        private static void ApplyItemChanges(Item target, ItemUpsertDto source)
        {
            target.ItemTypeCode = source.ItemTypeCode?.Trim().ToUpper() ?? string.Empty;
            target.ItemCategoryId = source.ItemCategoryId;
            target.ItemModelId = source.ItemModelId;
            target.RegNr = source.RegNr?.Trim() ?? string.Empty;
            target.MachineNr = source.MachineNr?.Trim() ?? string.Empty;
            target.SerialNr = source.SerialNr?.Trim() ?? string.Empty;
            target.YearModel = source.YearModel?.Trim() ?? string.Empty;
            target.Fuel = source.Fuel?.Trim() ?? string.Empty;
            target.Equipment = source.Equipment?.Trim() ?? string.Empty;
            target.Note = source.Note ?? string.Empty;
            target.ItemNr = source.ItemNr?.Trim() ?? string.Empty;
            target.PopupText = source.PopupText ?? string.Empty;
            target.IsActive = source.IsActive;
            target.Manufacturer = source.Manufacturer?.Trim() ?? string.Empty;
            target.ArticleNr = source.ArticleNr?.Trim() ?? string.Empty;
            target.IsStorageItem = source.IsStorageItem;
            target.IsPartOfPackage = source.IsPartOfPackage;
            target.CalculatePriceFromPartPrices = source.CalculatePriceFromPartPrices;
            target.ShowInPlanning = source.ShowInPlanning;
            target.SortNr = source.SortNr;
            target.PlatformHeightMm = source.PlatformHeightMm;
            target.PlatformLengthMm = source.PlatformLengthMm;
            target.WeightKg = source.WeightKg;
            target.HourMeter = source.HourMeter;
            target.KmReading = source.KmReading;
            target.BasePrice = source.BasePrice;
            target.PricePerHour = source.PricePerHour;
            target.PricePerDay = source.PricePerDay;
            target.PricePerWeek = source.PricePerWeek;
            target.PricePerMonth = source.PricePerMonth;
            target.PricePerKm = source.PricePerKm;
            target.FuelConsumptionLitresPerKm = source.FuelConsumptionLitresPerKm;
            target.FuelConsumptionLitresPerHour = source.FuelConsumptionLitresPerHour;
            target.ReplacementCost = source.ReplacementCost;
            target.NrOfItemsTotal = source.NrOfItemsTotal;
            target.UnavailableForReservation = source.UnavailableForReservation;
            target.UnavailableReason = source.UnavailableReason ?? string.Empty;
            target.UnavailableFrom = source.UnavailableFrom;
            target.UnavailableTo = source.UnavailableTo;
            target.AccountNr = source.AccountNr?.Trim() ?? string.Empty;
            target.CostCenterNr = source.CostCenterNr?.Trim() ?? string.Empty;
        }

        private static bool IsAluItemType(string? itemTypeCode)
        {
            return string.Equals(itemTypeCode?.Trim(), "ALU", StringComparison.OrdinalIgnoreCase);
        }

        private static decimal NormalizePackageItemQuantity(decimal quantity)
        {
            var normalized = quantity <= 0 ? 1m : quantity;
            return decimal.Round(normalized, 5, MidpointRounding.AwayFromZero);
        }

        private async Task SyncPackageItemsAsync(Item ownerItem, ItemUpsertDto source, int officeId)
        {
            var existingLinks = await _context.ItemPackageItems
                .Where(link => link.ItemId == ownerItem.Id)
                .ToListAsync();

            if (!IsAluItemType(ownerItem.ItemTypeCode) || ownerItem.IsPartOfPackage)
            {
                if (existingLinks.Count > 0)
                {
                    _context.ItemPackageItems.RemoveRange(existingLinks);
                }

                return;
            }

            var requestedQuantities = (source.PackageItems ?? [])
                .Where(entry => entry.PackageItemId > 0 && entry.PackageItemId != ownerItem.Id)
                .GroupBy(entry => entry.PackageItemId)
                .ToDictionary(
                    group => group.Key,
                    group => NormalizePackageItemQuantity(group.Last().Quantity));

            if (requestedQuantities.Count == 0)
            {
                foreach (var packageItemId in (source.PackageItemIds ?? []).Where(id => id > 0 && id != ownerItem.Id).Distinct())
                {
                    requestedQuantities[packageItemId] = 1m;
                }
            }

            var requestedIds = requestedQuantities.Keys.ToList();

            if (requestedIds.Count == 0)
            {
                if (existingLinks.Count > 0)
                {
                    _context.ItemPackageItems.RemoveRange(existingLinks);
                }

                return;
            }

            var allowedIds = await _context.Items
                .AsNoTracking()
                .Where(i =>
                    i.OfficeId == officeId &&
                    requestedIds.Contains(i.Id) &&
                    i.Id != ownerItem.Id &&
                    i.ItemTypeCode != null &&
                    i.ItemTypeCode.ToUpper() == "ALU" &&
                    i.IsPartOfPackage)
                .Select(i => i.Id)
                .ToListAsync();

            var allowedSet = allowedIds.ToHashSet();
            var existingSet = existingLinks.Select(link => link.PackageItemId).ToHashSet();

            var linksToRemove = existingLinks
                .Where(link => !allowedSet.Contains(link.PackageItemId))
                .ToList();

            if (linksToRemove.Count > 0)
            {
                _context.ItemPackageItems.RemoveRange(linksToRemove);
            }

            var linksToAdd = allowedSet
                .Where(packageItemId => !existingSet.Contains(packageItemId))
                .Select(packageItemId => new ItemPackageItem
                {
                    ItemId = ownerItem.Id,
                    PackageItemId = packageItemId,
                    Quantity = requestedQuantities.TryGetValue(packageItemId, out var quantity) ? quantity : 1m,
                })
                .ToList();

            if (linksToAdd.Count > 0)
            {
                _context.ItemPackageItems.AddRange(linksToAdd);
            }

            foreach (var existingLink in existingLinks.Where(link => allowedSet.Contains(link.PackageItemId)))
            {
                if (!requestedQuantities.TryGetValue(existingLink.PackageItemId, out var requestedQuantity))
                {
                    continue;
                }

                var normalizedQuantity = NormalizePackageItemQuantity(requestedQuantity);
                if (existingLink.Quantity != normalizedQuantity)
                {
                    existingLink.Quantity = normalizedQuantity;
                }
            }
        }
    }
}