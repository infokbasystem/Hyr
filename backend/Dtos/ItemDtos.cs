namespace Backend.Dtos;

public class ItemSearchDto
{
    public int Id { get; set; }
    public string ItemNr { get; set; } = string.Empty;
    public string RegNr { get; set; } = string.Empty;
    public string YearModel { get; set; } = string.Empty;
    public string MachineNr { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public string ItemTypeCode { get; set; } = string.Empty;
    public string ItemTypeName { get; set; } = string.Empty;
    public string ItemCategoryName { get; set; } = string.Empty;
    public string ItemModelName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool IsPartOfPackage { get; set; }
    public int? NrOfItemsTotal { get; set; }
    public decimal? BasePrice { get; set; }
    public decimal? PricePerDay { get; set; }
    public decimal? PricePerWeek { get; set; }
    public string Note { get; set; } = string.Empty;
}

public class ItemTypeOptionDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class ItemCategoryOptionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class ItemModelOptionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class ItemPackageOptionDto
{
    public int Id { get; set; }
    public string ItemNr { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public string SerialNr { get; set; } = string.Empty;
    public decimal Quantity { get; set; } = 1m;
}

public class ItemPackageItemDto
{
    public int PackageItemId { get; set; }
    public decimal Quantity { get; set; } = 1m;
}

public class ItemPackageSelectionDto
{
    public List<ItemPackageOptionDto> AvailablePackageItems { get; set; } = [];
    public List<ItemPackageOptionDto> ConnectedPackageItems { get; set; } = [];
}

public class ItemFormOptionsDto
{
    public List<ItemTypeOptionDto> ItemTypes { get; set; } = [];
    public List<ItemCategoryOptionDto> ItemCategories { get; set; } = [];
    public List<ItemModelOptionDto> ItemModels { get; set; } = [];
    public List<CabinTypeOptionDto> CabinTypes { get; set; } = [];
}

public class CabinTypeOptionDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public abstract class ItemCabinFieldsDto
{
    public string? CabinTypeCode { get; set; }
    public int? LengthMm { get; set; }
    public int? WidthMm { get; set; }
    public int? HeightMm { get; set; }
    public int? InternalHeightMm { get; set; }
    public decimal? InternalFloorAreaM2 { get; set; }
    public decimal? MaxLoadKg { get; set; }
    public int? NrOfModules { get; set; }
    public int? NrOfSockets { get; set; }
    public bool HasResidualCurrentDevice { get; set; }
    public bool HasDistributionBoard { get; set; }
    public string ElectricalPhase { get; set; } = string.Empty;
    public string PowerConnectionType { get; set; } = string.Empty;
    public bool HasElectricRadiator { get; set; }
    public bool HasHeatPump { get; set; }
    public bool HasUnderfloorHeating { get; set; }
    public bool HasAirConditioning { get; set; }
    public bool HasLighting { get; set; }
    public bool HasVentilation { get; set; }
    public string ToiletType { get; set; } = string.Empty;
    public bool HasSink { get; set; }
    public bool HasWaterHeater { get; set; }
    public bool HasWaterTank { get; set; }
    public bool HasFridge { get; set; }
    public bool HasMicrowave { get; set; }
    public bool HasCoffeeMaker { get; set; }
    public bool HasKitchenSink { get; set; }
    public bool HasDryingCabinet { get; set; }
    public int? NrOfLockers { get; set; }
    public int? NrOfTables { get; set; }
    public int? NrOfChairs { get; set; }
    public int? NrOfBenches { get; set; }
    public int? NrOfSeats { get; set; }
    public bool IsInsulated { get; set; }
    public bool IsWinterRated { get; set; }
    public int? NrOfWindows { get; set; }
    public string DoorType { get; set; } = string.Empty;
    public string LockType { get; set; } = string.Empty;
    public bool HasLoadBearingRoof { get; set; }
    public bool HasLiftingEyes { get; set; }
    public bool HasForkliftPockets { get; set; }
    public bool IsStackable { get; set; }
    public bool RequiresSupportLegs { get; set; }
    public string PlacementRequirements { get; set; } = string.Empty;
    public decimal? PurchasePrice { get; set; }
    public DateTime? PurchaseDate { get; set; }
    public decimal? BookValue { get; set; }
    public int? DepreciationPeriodMonths { get; set; }
    public bool IsRentedIn { get; set; }
    public string OwnerName { get; set; } = string.Empty;
    public decimal? RentedInCostPerMonth { get; set; }
    public string RentedInAgreementRef { get; set; } = string.Empty;
}

public class ItemDto : ItemCabinFieldsDto
{
    public int Id { get; set; }
    public int OfficeId { get; set; }
    public string ItemTypeCode { get; set; } = string.Empty;
    public int? ItemCategoryId { get; set; }
    public int? ItemModelId { get; set; }
    public string RegNr { get; set; } = string.Empty;
    public string MachineNr { get; set; } = string.Empty;
    public string SerialNr { get; set; } = string.Empty;
    public string YearModel { get; set; } = string.Empty;
    public string Fuel { get; set; } = string.Empty;
    public string Equipment { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public string ItemNr { get; set; } = string.Empty;
    public string PopupText { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string Manufacturer { get; set; } = string.Empty;
    public string ArticleNr { get; set; } = string.Empty;
    public bool IsStorageItem { get; set; }
    public bool IsPartOfPackage { get; set; }
    public bool CalculatePriceFromPartPrices { get; set; }
    public bool ShowInPlanning { get; set; }
    public int? SortNr { get; set; }
    public int? PlatformHeightMm { get; set; }
    public int? PlatformLengthMm { get; set; }
    public decimal? WeightKg { get; set; }
    public decimal? HourMeter { get; set; }
    public int? KmReading { get; set; }
    public decimal? BasePrice { get; set; }
    public decimal? PricePerHour { get; set; }
    public decimal? PricePerDay { get; set; }
    public decimal? PricePerWeek { get; set; }
    public decimal? PricePerMonth { get; set; }
    public decimal? PricePerKm { get; set; }
    public decimal? FuelConsumptionLitresPerKm { get; set; }
    public decimal? FuelConsumptionLitresPerHour { get; set; }
    public decimal? ReplacementCost { get; set; }
    public int? NrOfItemsTotal { get; set; }
    public bool UnavailableForReservation { get; set; }
    public string UnavailableReason { get; set; } = string.Empty;
    public DateTime? UnavailableFrom { get; set; }
    public DateTime? UnavailableTo { get; set; }
    public string AccountNr { get; set; } = string.Empty;
    public string CostCenterNr { get; set; } = string.Empty;
    public List<int> PackageItemIds { get; set; } = [];
    public List<ItemPackageItemDto> PackageItems { get; set; } = [];

    // Audit / tracking fields
    public DateTime? CreatedAt { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedByName { get; set; }
}

public class ItemUpsertDto : ItemCabinFieldsDto
{
    public string ItemTypeCode { get; set; } = string.Empty;
    public int? ItemCategoryId { get; set; }
    public int? ItemModelId { get; set; }
    public string RegNr { get; set; } = string.Empty;
    public string MachineNr { get; set; } = string.Empty;
    public string SerialNr { get; set; } = string.Empty;
    public string YearModel { get; set; } = string.Empty;
    public string Fuel { get; set; } = string.Empty;
    public string Equipment { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public string ItemNr { get; set; } = string.Empty;
    public string PopupText { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public string Manufacturer { get; set; } = string.Empty;
    public string ArticleNr { get; set; } = string.Empty;
    public bool IsStorageItem { get; set; }
    public bool IsPartOfPackage { get; set; }
    public bool CalculatePriceFromPartPrices { get; set; }
    public bool ShowInPlanning { get; set; }
    public int? SortNr { get; set; }
    public int? PlatformHeightMm { get; set; }
    public int? PlatformLengthMm { get; set; }
    public decimal? WeightKg { get; set; }
    public decimal? HourMeter { get; set; }
    public int? KmReading { get; set; }
    public decimal? BasePrice { get; set; }
    public decimal? PricePerHour { get; set; }
    public decimal? PricePerDay { get; set; }
    public decimal? PricePerWeek { get; set; }
    public decimal? PricePerMonth { get; set; }
    public decimal? PricePerKm { get; set; }
    public decimal? FuelConsumptionLitresPerKm { get; set; }
    public decimal? FuelConsumptionLitresPerHour { get; set; }
    public decimal? ReplacementCost { get; set; }
    public int? NrOfItemsTotal { get; set; }
    public bool UnavailableForReservation { get; set; }
    public string UnavailableReason { get; set; } = string.Empty;
    public DateTime? UnavailableFrom { get; set; }
    public DateTime? UnavailableTo { get; set; }
    public string AccountNr { get; set; } = string.Empty;
    public string CostCenterNr { get; set; } = string.Empty;
    public List<int> PackageItemIds { get; set; } = [];
    public List<ItemPackageItemDto> PackageItems { get; set; } = [];
}

public class ItemTypeUpdateDto
{
    public string ItemTypeCode { get; set; } = string.Empty;
}