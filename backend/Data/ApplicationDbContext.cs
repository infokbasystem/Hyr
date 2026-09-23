using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<Office> Offices { get; set; } = null!;
        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Customer> Customers { get; set; } = null!;
        public DbSet<Item> Items { get; set; } = null!;
        public DbSet<Reservation> Reservations { get; set; } = null!;
        public DbSet<ReservationItem> ReservationItems { get; set; } = null!;
        public DbSet<ReservationCalc> ReservationCalcs { get; set; } = null!;
        public DbSet<ReservationCalcItem> ReservationCalcItems { get; set; } = null!;
        public DbSet<Invoice> Invoices { get; set; } = null!;
        public DbSet<InvoiceRow> InvoiceRows { get; set; } = null!;
        public DbSet<Payment> Payments { get; set; } = null!;
        public DbSet<TinkPaymentRequest> TinkPaymentRequests { get; set; } = null!;
        public DbSet<Account> Accounts { get; set; } = null!;
        public DbSet<Article> Articles { get; set; } = null!;
        public DbSet<VatRate> VatRates { get; set; } = null!;
        public DbSet<ItemType> ItemTypes { get; set; } = null!;
        public DbSet<ItemCategory> ItemCategories { get; set; } = null!;
        public DbSet<ItemModel> ItemModels { get; set; } = null!;
        public DbSet<PriceList> PriceLists { get; set; } = null!;
        public DbSet<PriceListDayPrice> PriceListDayPrices { get; set; } = null!;
        public DbSet<PriceListDayPriceFreeKm> PriceListDayPriceFreeKms { get; set; } = null!;
        public DbSet<PriceListWeekPriceIncludedKm> PriceListWeekPriceIncludedKms { get; set; } = null!;
        public DbSet<PriceListWeekPriceFreeKm> PriceListWeekPriceFreeKms { get; set; } = null!;
        public DbSet<PriceListThirtyDayPriceIncludedKm> PriceListThirtyDayPriceIncludedKms { get; set; } = null!;
        public DbSet<PriceListWeekendPrice> PriceListWeekendPrices { get; set; } = null!;
        public DbSet<PriceListHourPriceIncludedKm> PriceListHourPriceIncludedKms { get; set; } = null!;
        public DbSet<PriceListServicePrice> PriceListServicePrices { get; set; } = null!;
        public DbSet<PriceListGuaranteePrice> PriceListGuaranteePrices { get; set; } = null!;
        public DbSet<PriceListWeekendPriceIncludedKm> PriceListWeekendPriceIncludedKms { get; set; } = null!;
        public DbSet<PriceListWeekendPriceFreeKm> PriceListWeekendPriceFreeKms { get; set; } = null!;
        public DbSet<Currency> Currencies { get; set; } = null!;
        public DbSet<ServiceType> ServiceTypes { get; set; } = null!;
        public DbSet<InsuranceCompany> InsuranceCompanies { get; set; } = null!;
        public DbSet<Department> Departments { get; set; } = null!;
        public DbSet<MailText> MailTexts { get; set; } = null!;
        public DbSet<SmsText> SmsTexts { get; set; } = null!;
        public DbSet<OfficeItemType> OfficeItemTypes { get; set; } = null!;
        public DbSet<ItemPackageItem> ItemPackageItems { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder); // Call the base method 

            modelBuilder.Entity<Office>(entity =>
            {
                entity.ToTable("Office");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Street).HasMaxLength(200);
                entity.Property(e => e.ZipCode).HasMaxLength(200);
                entity.Property(e => e.City).HasMaxLength(200);
                entity.Property(e => e.Country).HasMaxLength(200);
                entity.Property(e => e.InvoiceFee).HasColumnType("decimal(18,5)");
                entity.Property(e => e.GeneralContractText).HasMaxLength(2000);
                entity.Property(e => e.DeductibleReductionText).HasMaxLength(2000);
                entity.Property(e => e.DeductibleReductionCostPerDay).HasColumnType("decimal(18,5)");
                entity.Property(e => e.LatePaymentInterest).HasColumnType("decimal(18,5)");
                entity.Property(e => e.Telephone).HasMaxLength(200);
                entity.Property(e => e.MobilePhone).HasMaxLength(200);
                entity.Property(e => e.EmergencyNumber).HasMaxLength(200);
                entity.Property(e => e.FaxNr).HasMaxLength(200);
                entity.Property(e => e.Email).HasMaxLength(200);
                entity.Property(e => e.Web).HasMaxLength(200);
                entity.Property(e => e.OrganizationNr).HasMaxLength(200);
                entity.Property(e => e.VatNr).HasMaxLength(200);
                entity.Property(e => e.Bank).HasMaxLength(200);
                entity.Property(e => e.SwiftBic).HasMaxLength(200);
                entity.Property(e => e.BankAccountNr).HasMaxLength(200);
                entity.Property(e => e.BgNr).HasMaxLength(200);
                entity.Property(e => e.PgNr).HasMaxLength(200);
                entity.Property(e => e.DefaultPaymentDays).IsRequired(false);
                entity.Property(e => e.ViewContractPricesOnPrint).IsRequired();
                entity.Property(e => e.VatRegCity).HasMaxLength(200);
                entity.Property(e => e.VatRegText).HasMaxLength(2000);
                entity.Property(e => e.Iban).HasMaxLength(200);
                entity.Property(e => e.CrediflowId).HasMaxLength(200);
                entity.Property(e => e.GlnNr).HasMaxLength(200);
                entity.Property(e => e.FortnoxRefreshToken).IsRequired().HasMaxLength(500);
                entity.Property(e => e.TinkClientId).HasMaxLength(200);
                entity.Property(e => e.TinkMarket).HasMaxLength(10);
                entity.Property(e => e.TinkLocale).HasMaxLength(10);
                entity.Property(e => e.TinkRecipientName).HasMaxLength(200);
                entity.Property(e => e.TinkRecipientAccountNumber).HasMaxLength(100);
                entity.Property(e => e.TinkRecipientAccountType).HasMaxLength(50);
                entity.Property(e => e.TinkPaymentScheme).HasMaxLength(50);
                entity.Property(e => e.DefaultBookedFromTime).HasMaxLength(5);
                entity.Property(e => e.DefaultBookedToTime).HasMaxLength(5);
                entity.Property(e => e.LogoData).HasColumnType("varbinary(max)");
                entity.Property(e => e.LogoContentType).HasMaxLength(100);
            });

            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("User");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Role).IsRequired().HasMaxLength(50).HasDefaultValue("User");
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(200);
                entity.Property(e => e.PasswordHash).IsRequired();
                entity.HasIndex(e => e.Email).IsUnique();
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.Users)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Customer>(entity =>
            {
                entity.ToTable("Customer");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CustomerName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.OrgNr).HasMaxLength(200);
                entity.Property(e => e.VatNr).HasMaxLength(200);
                entity.Property(e => e.Street1).HasMaxLength(200);
                entity.Property(e => e.Street2).HasMaxLength(200);
                entity.Property(e => e.ZipCode).HasMaxLength(200);
                entity.Property(e => e.City).HasMaxLength(200);
                entity.Property(e => e.Telephone).HasMaxLength(200);
                entity.Property(e => e.MobilePhone).HasMaxLength(200);
                entity.Property(e => e.Email).HasMaxLength(200);
                entity.Property(e => e.Note).HasMaxLength(2000);
                entity.Property(e => e.ImportSource).HasMaxLength(200);
                entity.Property(e => e.KeySpcs).HasMaxLength(200);
                entity.Property(e => e.KeyFortnox).HasMaxLength(200);
                entity.Property(e => e.KeyWinassist).HasMaxLength(200);
                entity.Property(e => e.RegNr).HasMaxLength(200);
                entity.Property(e => e.PgNr).HasMaxLength(200);
                entity.Property(e => e.BgNr).HasMaxLength(200);
                entity.Property(e => e.EfakturaAddresseeIntermediator).HasMaxLength(200);
                entity.Property(e => e.EfakturaAddresseeID).HasMaxLength(200);
                entity.Property(e => e.EfakturaAddresseeIDType).HasMaxLength(200);
                entity.Property(e => e.EfakturaBankCode).HasMaxLength(200);
                entity.Property(e => e.EfakturaBankId).HasMaxLength(200);
                entity.Property(e => e.EfakturaBankName).HasMaxLength(200);
                entity.Property(e => e.EfakturaVatHomeTown).HasMaxLength(200);
                entity.Property(e => e.EfakturaVatRegistration).HasMaxLength(200);
                entity.Property(e => e.CreditLimit).HasColumnType("decimal(18,5)");
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.Customers)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.UpdatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.UpdatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.DefaultPriceList)
                    .WithMany(e => e.CustomersWithDefaultPriceList)
                    .HasForeignKey(e => e.DefaultPriceListId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Item>(entity =>
            {
                entity.ToTable("Item");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.OfficeId).IsRequired();
                entity.Property(e => e.ItemTypeCode).HasMaxLength(50);
                entity.Property(e => e.ItemCategoryId).IsRequired(false);
                entity.Property(e => e.ItemModelId).IsRequired(false);
                entity.Property(e => e.RegNr).HasMaxLength(100);
                entity.Property(e => e.MachineNr).HasMaxLength(100);
                entity.Property(e => e.SerialNr).HasMaxLength(100);
                entity.Property(e => e.YearModel).HasMaxLength(50);
                entity.Property(e => e.Fuel).HasMaxLength(200);
                entity.Property(e => e.Equipment).HasMaxLength(500);
                entity.Property(e => e.Note).HasMaxLength(500);
                entity.Property(e => e.ItemNr).HasMaxLength(100);
                entity.Property(e => e.PopupText).HasMaxLength(500);
                entity.Property(e => e.IsActive).IsRequired();
                entity.Property(e => e.Manufacturer).HasMaxLength(200);
                entity.Property(e => e.ArticleNr).HasMaxLength(100);
                entity.Property(e => e.ShowInPlanning).IsRequired();
                entity.Property(e => e.SortNr).IsRequired(false);
                entity.Property(e => e.ImportId).IsRequired(false);
                entity.Property(e => e.ImportSource).HasMaxLength(200);
                entity.Property(e => e.PlatformHeightMm).IsRequired(false);
                entity.Property(e => e.PlatformLengthMm).IsRequired(false);
                entity.Property(e => e.WeightKg).IsRequired(false).HasColumnType("decimal(10,5)");
                entity.Property(e => e.HourMeter).IsRequired(false).HasColumnType("decimal(10,5)");
                entity.Property(e => e.KmReading).IsRequired(false);
                entity.Property(e => e.BasePrice).IsRequired(false).HasColumnType("decimal(10,5)");
                entity.Property(e => e.PricePerHour).IsRequired(false).HasColumnType("decimal(10,5)");
                entity.Property(e => e.PricePerDay).IsRequired(false).HasColumnType("decimal(10,5)");
                entity.Property(e => e.PricePerWeek).IsRequired(false).HasColumnType("decimal(10,5)");
                entity.Property(e => e.PricePerMonth).IsRequired(false).HasColumnType("decimal(10,5)");
                entity.Property(e => e.PricePerKm).IsRequired(false).HasColumnType("decimal(10,5)");
                entity.Property(e => e.FuelConsumptionLitresPerKm).IsRequired(false).HasColumnType("decimal(10,5)");
                entity.Property(e => e.FuelConsumptionLitresPerHour).IsRequired(false).HasColumnType("decimal(10,5)");
                entity.Property(e => e.ReplacementCost).IsRequired(false).HasColumnType("decimal(10,5)");
                entity.Property(e => e.NrOfItemsTotal).IsRequired(false);
                entity.Property(e => e.IsStorageItem).IsRequired();
                entity.Property(e => e.IsPartOfPackage).IsRequired();
                entity.Property(e => e.CalculatePriceFromPartPrices).IsRequired();
                entity.Property(e => e.UnavailableForReservation).IsRequired();
                entity.Property(e => e.UnavailableReason).HasMaxLength(2000);
                entity.Property(e => e.UnavailableFrom).IsRequired(false);
                entity.Property(e => e.UnavailableTo).IsRequired(false);
                entity.Property(e => e.AccountNr).HasMaxLength(100);
                entity.Property(e => e.CostCenterNr).HasMaxLength(100);
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.Items)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ItemCategory)
                    .WithMany(e => e.Items)
                    .HasForeignKey(e => e.ItemCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ItemModel)
                    .WithMany(e => e.Items)
                    .HasForeignKey(e => e.ItemModelId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ItemType)
                    .WithMany(e => e.Items)
                    .HasForeignKey(e => e.ItemTypeCode)
                    .HasPrincipalKey(e => e.Code)
                    .IsRequired(false)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.UpdatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.UpdatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ItemPackageItem>(entity =>
            {
                entity.ToTable("ItemPackageItem");
                entity.HasKey(e => new { e.ItemId, e.PackageItemId });
                entity.Property(e => e.Quantity).HasColumnType("decimal(18,5)");

                entity.HasOne(e => e.Item)
                    .WithMany(e => e.PackageItems)
                    .HasForeignKey(e => e.ItemId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.PackageItem)
                    .WithMany(e => e.IncludedInItems)
                    .HasForeignKey(e => e.PackageItemId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Currency>(entity =>
            {
                entity.ToTable("Currency");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.OfficeId).IsRequired();
                entity.Property(e => e.CurrencyName).IsRequired(false).HasMaxLength(255);
                entity.Property(e => e.PurchaseCurrencyRate).HasColumnType("float(53)");
                entity.Property(e => e.SalesCurrencyRate).HasColumnType("float(53)");
                entity.Property(e => e.KeyFortnox).IsRequired(false).HasMaxLength(255);
                entity.Property(e => e.IsDefault).IsRequired();

                entity.HasOne(e => e.Office)
                    .WithMany(e => e.Currencies)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<OfficeItemType>(entity =>
            {
                entity.ToTable("OfficeItemType");
                entity.HasKey(e => new { e.OfficeId, e.ItemTypeId });
                entity.HasIndex(e => e.ItemTypeId);

                entity.HasOne(e => e.Office)
                    .WithMany(e => e.OfficeItemTypes)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.ItemType)
                    .WithMany(e => e.OfficeItemTypes)
                    .HasForeignKey(e => e.ItemTypeId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

                    modelBuilder.Entity<Department>(entity =>
                    {
                    entity.ToTable("Department");
                    entity.HasKey(e => e.Id);
                    entity.Property(e => e.OfficeId).IsRequired();
                    entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                    entity.Property(e => e.IsActive).IsRequired();
                    entity.HasOne(e => e.Office)
                        .WithMany(e => e.Departments)
                        .HasForeignKey(e => e.OfficeId)
                        .OnDelete(DeleteBehavior.Restrict);
                    });

            modelBuilder.Entity<MailText>(entity =>
            {
                entity.ToTable("MailText");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.OfficeId).IsRequired();
                entity.Property(e => e.Item).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Subject).IsRequired().HasMaxLength(200);
                entity.Property(e => e.BodyHtml).IsRequired().HasMaxLength(4000);
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.MailTexts)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => new { e.OfficeId, e.Item }).IsUnique();
            });

            modelBuilder.Entity<SmsText>(entity =>
            {
                entity.ToTable("SmsText");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.OfficeId).IsRequired();
                entity.Property(e => e.Item).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Titel).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Text).IsRequired().HasMaxLength(4000);
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.SmsTexts)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => new { e.OfficeId, e.Item }).IsUnique();
            });

            modelBuilder.Entity<Reservation>(entity =>
            {
                entity.ToTable("Reservation");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.StatusCode).HasMaxLength(50);
                entity.Property(e => e.DriverName).HasMaxLength(200);
                entity.Property(e => e.PickUpBy).HasMaxLength(200);
                entity.Property(e => e.TelephoneWorkplace).HasMaxLength(200);
                entity.Property(e => e.DeliveryPlace).HasMaxLength(500);
                entity.Property(e => e.CustomerMarking).HasMaxLength(500);
                entity.Property(e => e.DriverMobilePhone).HasMaxLength(200);
                entity.Property(e => e.DriverNote).HasMaxLength(2000);
                entity.Property(e => e.DriverLicenceNr).HasMaxLength(200);
                entity.Property(e => e.Orderer).HasMaxLength(200);
                entity.Property(e => e.CustomerName).HasMaxLength(200);
                entity.Property(e => e.Address).HasMaxLength(500);
                entity.Property(e => e.ZipCode).HasMaxLength(100);
                entity.Property(e => e.Email).HasMaxLength(500);
                entity.Property(e => e.MobilePhone).HasMaxLength(200);
                entity.Property(e => e.Reference).HasMaxLength(500);
                entity.Property(e => e.Note).HasMaxLength(2000);
                entity.Property(e => e.NoteExternal).HasMaxLength(2000);
                entity.Property(e => e.DeliveryPlaceNote).HasMaxLength(2000);
                entity.Property(e => e.PickupPlaceNote).HasMaxLength(2000);
                entity.Property(e => e.OngoingInvoicingInterval).HasMaxLength(50);
                entity.Property(e => e.PricingCalendarCode).HasMaxLength(20);
                entity.Property(e => e.Deposition).HasColumnType("decimal(18,5)");
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.Reservations)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.CreatedByUser)
                    .WithMany(e => e.CreatedReservations)
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ModifiedByUser)
                    .WithMany(e => e.ModifiedReservations)
                    .HasForeignKey(e => e.ModifiedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Customer)
                    .WithMany(e => e.Reservations)
                    .HasForeignKey(e => e.CustomerId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.PriceList)
                    .WithMany(e => e.ReservationsWithPriceListOverride)
                    .HasForeignKey(e => e.PriceListId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ReservationItem>(entity =>
            {
                entity.ToTable("ReservationItem");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ItemTypeCode).HasMaxLength(100);
                entity.Property(e => e.DeliveryPlaceNote).HasMaxLength(2000);
                entity.Property(e => e.PickupPlaceNote).HasMaxLength(2000);
                entity.Property(e => e.InsuranceDamageNr).HasMaxLength(200);
                entity.Property(e => e.InsuranceCustomerRegNr).HasMaxLength(100);
                entity.Property(e => e.InsuranceCounterpartRegNr).HasMaxLength(100);
                entity.Property(e => e.FuelLitres).HasColumnType("decimal(18,5)");
                entity.Property(e => e.FuelUnitPrice).HasColumnType("decimal(18,5)");
                entity.Property(e => e.InsuranceMaxAllowedCompensationCost).HasColumnType("decimal(18,5)");
                entity.Property(e => e.InsuranceSjalvriskDayCost).HasColumnType("decimal(18,5)");
                entity.Property(e => e.InsuranceManulaMaxCompensationCost).HasColumnType("decimal(18,5)");
                entity.Property(e => e.InsuranceManualShareRent).HasColumnType("decimal(18,5)");
                entity.Property(e => e.InsuranceManualShareVat).HasColumnType("decimal(18,5)");
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.ReservationItems)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Reservation)
                    .WithMany(e => e.ReservationItems)
                    .HasForeignKey(e => e.ReservationId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Item)
                    .WithMany(e => e.ReservationItems)
                    .HasForeignKey(e => e.ItemId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ReservationCalc>(entity =>
            {
                entity.ToTable("ReservationCalc");
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.ReservationCalcs)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Reservation)
                    .WithMany(e => e.ReservationCalcs)
                    .HasForeignKey(e => e.ReservationId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.Property(e => e.ReceiverTypeCode).HasMaxLength(30).HasDefaultValue(ReceiverTypeCodes.Customer);
            });

            modelBuilder.Entity<ReservationCalcItem>(entity =>
            {
                entity.ToTable("ReservationCalcItem");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CalcPriceTypeCode).HasMaxLength(30).HasDefaultValue(CalcPriceTypeCodes.FreeText);
                entity.Property(e => e.Text).HasMaxLength(500);
                entity.Property(e => e.VatRate).HasColumnType("decimal(18,5)");
                entity.Property(e => e.Qty).HasColumnType("decimal(18,5)");
                entity.Property(e => e.UnitPrice).HasColumnType("decimal(18,5)");
                entity.Property(e => e.Sum).HasColumnType("decimal(18,5)");
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.ReservationCalcItems)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ReservationCalc)
                   .WithMany(e => e.ReservationCalcItems)
                   .HasForeignKey(e => e.ReservationCalcId)
                   .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Item)
                    .WithMany(e => e.ReservationCalcItems)
                    .HasForeignKey(e => e.ItemId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.PriceList)
                    .WithMany(e => e.ReservationCalcItems)
                    .HasForeignKey(e => e.PriceListId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Vat)
                    .WithMany(e => e.ReservationCalcItems)
                    .HasForeignKey(e => e.VatId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Invoice>(entity =>
            {
                entity.ToTable("Invoice");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.InvoiceType).HasMaxLength(50);
                entity.Property(e => e.InvoicePayMethod).HasMaxLength(50);
                entity.Property(e => e.CustomerName).HasMaxLength(200);
                entity.Property(e => e.CustomerReference).HasMaxLength(200);
                entity.Property(e => e.VatNr).HasMaxLength(50);
                entity.Property(e => e.OrgNr).HasMaxLength(50);
                entity.Property(e => e.Street1).HasMaxLength(200);
                entity.Property(e => e.Street2).HasMaxLength(200);
                entity.Property(e => e.ZipCode).HasMaxLength(50);
                entity.Property(e => e.City).HasMaxLength(100);
                entity.Property(e => e.OurReference).HasMaxLength(200);
                entity.Property(e => e.YourReference).HasMaxLength(200);
                entity.Property(e => e.TermsOfPayment).HasMaxLength(200);
                entity.Property(e => e.Marking).HasMaxLength(200);
                entity.Property(e => e.PdfName).HasMaxLength(200);
                entity.Property(e => e.ExportResult).HasMaxLength(1000);
                entity.Property(e => e.CrediflowSessionId).HasMaxLength(200);
                entity.Property(e => e.InvoiceFee).HasColumnType("decimal(18,5)");
                entity.Property(e => e.CurrencyRate).HasColumnType("decimal(18,5)");
                entity.Property(e => e.TotExVat).HasColumnType("decimal(18,5)");
                entity.Property(e => e.TotVat).HasColumnType("decimal(18,5)");
                entity.Property(e => e.TotSum).HasColumnType("decimal(18,5)");
                entity.Property(e => e.Rounding).HasColumnType("decimal(18,5)");
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.Invoices)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.CreatedByUser)
                    .WithMany(e => e.CreatedInvoices)
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ModifiedByUser)
                    .WithMany(e => e.ModifiedInvoices)
                    .HasForeignKey(e => e.ModifiedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Customer)
                    .WithMany(e => e.Invoices)
                    .HasForeignKey(e => e.CustomerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<InvoiceRow>(entity =>
            {
                entity.ToTable("InvoiceRow");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ArticleNr).HasMaxLength(100);
                entity.Property(e => e.InvoiceRowType).HasMaxLength(100);
                entity.Property(e => e.Text1).HasMaxLength(100);
                entity.Property(e => e.Text2).HasMaxLength(100);
                entity.Property(e => e.Qty).HasColumnType("decimal(18,5)");
                entity.Property(e => e.UnitPrice).HasColumnType("decimal(18,5)");
                entity.Property(e => e.Sum).HasColumnType("decimal(18,5)");
                entity.Property(e => e.VatRate).HasColumnType("decimal(18,5)");
                entity.Property(e => e.DiscountRate).HasColumnType("decimal(18,5)");
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.InvoiceRows)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Invoice)
                    .WithMany(e => e.InvoiceRows)
                    .HasForeignKey(e => e.InvoiceId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Item)
                    .WithMany(e => e.InvoiceRows)
                    .HasForeignKey(e => e.ItemId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ReservationCalcItem)
                    .WithMany(e => e.InvoiceRows)
                    .HasForeignKey(e => e.ReservationCalcItemId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Article)
                    .WithMany(e => e.InvoiceRows)
                    .HasForeignKey(e => e.ArticleId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Payment>(entity =>
            {
                entity.ToTable("Payment");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.PaymentDate).IsRequired();
                entity.Property(e => e.Amount).HasColumnType("decimal(18,5)");
                entity.Property(e => e.PaymentMethod).HasMaxLength(100);
                entity.Property(e => e.Reference).HasMaxLength(200);
                entity.Property(e => e.Note).HasMaxLength(1000);

                entity.HasOne(e => e.Office)
                    .WithMany(e => e.Payments)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Invoice)
                    .WithMany(e => e.Payments)
                    .HasForeignKey(e => e.InvoiceId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.OfficeId);
                entity.HasIndex(e => e.InvoiceId);
                entity.HasIndex(e => e.PaymentDate);
            });

            modelBuilder.Entity<TinkPaymentRequest>(entity =>
            {
                entity.ToTable("TinkPaymentRequest");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.TinkRequestId).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Amount).HasColumnType("decimal(18,5)");
                entity.Property(e => e.Currency).HasMaxLength(10);
                entity.Property(e => e.Market).HasMaxLength(10);
                entity.Property(e => e.LinkUrl).HasMaxLength(1000);
                entity.Property(e => e.Status).HasMaxLength(50);
                entity.Property(e => e.StatusMessage).HasMaxLength(500);
                entity.Property(e => e.SentEmail).HasMaxLength(200);
                entity.Property(e => e.SentMobile).HasMaxLength(50);

                entity.HasOne(e => e.Office)
                    .WithMany(e => e.TinkPaymentRequests)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Invoice)
                    .WithMany(e => e.TinkPaymentRequests)
                    .HasForeignKey(e => e.InvoiceId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Payment)
                    .WithMany()
                    .HasForeignKey(e => e.PaymentId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.OfficeId);
                entity.HasIndex(e => e.InvoiceId);
                entity.HasIndex(e => e.TinkRequestId).IsUnique();
            });

            modelBuilder.Entity<Account>(entity =>
            {
                entity.ToTable("Account");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.AccountNr).HasMaxLength(100);
                entity.Property(e => e.SystemCode).HasMaxLength(50);
                entity.Property(e => e.Name).HasMaxLength(500);
                entity.HasIndex(e => e.OfficeId);
                entity.HasIndex(e => new { e.OfficeId, e.SystemCode })
                    .IsUnique()
                    .HasFilter("[SystemCode] IS NOT NULL");
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.Accounts)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<VatRate>(entity =>
            {
                entity.ToTable("Vat");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Rate).HasColumnType("decimal(18,5)");
                entity.Property(e => e.Name).HasMaxLength(500);
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.VatRates)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Article>(entity =>
            {
                entity.ToTable("Article");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ArticleNr).HasMaxLength(100);
                entity.Property(e => e.Name).HasMaxLength(500);
                entity.Property(e => e.Price).HasColumnType("decimal(18,5)");
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.Articles)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.Articles)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.VatRate)
                    .WithMany(e => e.Articles)
                    .HasForeignKey(e => e.VatRateId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.Property(e => e.CalcPriceTypeCode).HasMaxLength(30);
                entity.HasIndex(e => new { e.OfficeId, e.CalcPriceTypeCode })
                    .IsUnique()
                    .HasFilter("[CalcPriceTypeCode] IS NOT NULL");
            });

            modelBuilder.Entity<ItemType>(entity =>
            {
                entity.ToTable("ItemType");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Code).HasMaxLength(50);
                entity.Property(e => e.Name).HasMaxLength(200);
                entity.HasAlternateKey(e => e.Code);
            });

            modelBuilder.Entity<ItemCategory>(entity =>
            {
                entity.ToTable("ItemCategory");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(200);
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.ItemCategories)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ItemModel>(entity =>
            {
                entity.ToTable("ItemModel");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(200);
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.ItemModels)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<PriceList>(entity =>
            {
                entity.ToTable("PriceList");
                entity.ToTable(t => t.HasCheckConstraint("CK_PriceList_ValidDateRange", "[ValidTo] IS NULL OR [ValidTo] >= [ValidFrom]"));
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.IsActive).IsRequired();
                entity.Property(e => e.Priority).IsRequired(false);
                entity.HasIndex(e => new { e.OfficeId, e.Name }).IsUnique();
                entity.HasIndex(e => new { e.OfficeId, e.IsActive, e.ValidFrom, e.ValidTo });
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.PriceLists)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<PriceListDayPrice>(entity =>
            {
                entity.ToTable("PriceListDayPrice");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.PricePerDay).HasColumnType("decimal(10,5)");
                entity.Property(e => e.PricePerKm).HasColumnType("decimal(10,5)");
                entity.HasIndex(e => new { e.PriceListId, e.ItemCategoryId }).IsUnique();
                entity.HasOne(e => e.PriceList)
                    .WithMany(e => e.DayPrices)
                    .HasForeignKey(e => e.PriceListId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ItemCategory)
                    .WithMany(e => e.DayPrices)
                    .HasForeignKey(e => e.ItemCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<PriceListDayPriceFreeKm>(entity =>
            {
                entity.ToTable("PriceListDayPriceFreeKm");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.PricePerDay).HasColumnType("decimal(10,5)");
                entity.HasIndex(e => new { e.PriceListId, e.ItemCategoryId }).IsUnique();
                entity.HasOne(e => e.PriceList)
                    .WithMany(e => e.DayPriceFreeKms)
                    .HasForeignKey(e => e.PriceListId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ItemCategory)
                    .WithMany(e => e.DayPriceFreeKms)
                    .HasForeignKey(e => e.ItemCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<PriceListWeekPriceIncludedKm>(entity =>
            {
                entity.ToTable("PriceListWeekPriceIncludedKm");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.PricePerWeek).HasColumnType("decimal(10,5)");
                entity.Property(e => e.IncludedKmPerWeek).HasColumnType("decimal(10,5)");
                entity.Property(e => e.PricePerExtraDay).HasColumnType("decimal(10,5)");
                entity.Property(e => e.IncludedKmPerExtraDay).HasColumnType("decimal(10,5)");
                entity.Property(e => e.PricePerExcessKm).HasColumnType("decimal(10,5)");
                entity.HasIndex(e => new { e.PriceListId, e.ItemCategoryId }).IsUnique();
                entity.HasOne(e => e.PriceList)
                    .WithMany(e => e.WeekPriceIncludedKms)
                    .HasForeignKey(e => e.PriceListId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ItemCategory)
                    .WithMany(e => e.WeekPriceIncludedKms)
                    .HasForeignKey(e => e.ItemCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<PriceListWeekPriceFreeKm>(entity =>
            {
                entity.ToTable("PriceListWeekPriceFreeKm");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.PricePerWeek).HasColumnType("decimal(10,5)");
                entity.Property(e => e.PricePerExtraDay).HasColumnType("decimal(10,5)");
                entity.HasIndex(e => new { e.PriceListId, e.ItemCategoryId }).IsUnique();
                entity.HasOne(e => e.PriceList)
                    .WithMany(e => e.WeekPriceFreeKms)
                    .HasForeignKey(e => e.PriceListId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ItemCategory)
                    .WithMany(e => e.WeekPriceFreeKms)
                    .HasForeignKey(e => e.ItemCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<PriceListThirtyDayPriceIncludedKm>(entity =>
            {
                entity.ToTable("PriceListThirtyDayPriceIncludedKm");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.PricePer30Days).HasColumnType("decimal(10,5)");
                entity.Property(e => e.IncludedKmPer30Days).HasColumnType("decimal(10,5)");
                entity.Property(e => e.PricePerExtraDay).HasColumnType("decimal(10,5)");
                entity.Property(e => e.IncludedKmPerExtraDay).HasColumnType("decimal(10,5)");
                entity.Property(e => e.PricePerExcessKm).HasColumnType("decimal(10,5)");
                entity.HasIndex(e => new { e.PriceListId, e.ItemCategoryId }).IsUnique();
                entity.HasOne(e => e.PriceList)
                    .WithMany(e => e.ThirtyDayPriceIncludedKms)
                    .HasForeignKey(e => e.PriceListId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ItemCategory)
                    .WithMany(e => e.ThirtyDayPriceIncludedKms)
                    .HasForeignKey(e => e.ItemCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<PriceListWeekendPrice>(entity =>
            {
                entity.ToTable("PriceListWeekendPrice");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FromTime).HasColumnType("time");
                entity.Property(e => e.ToTime).HasColumnType("time");
                entity.Property(e => e.WeekendPrice).HasColumnType("decimal(10,5)");
                entity.Property(e => e.PricePerKm).HasColumnType("decimal(10,5)");
                entity.HasIndex(e => new { e.PriceListId, e.ItemCategoryId }).IsUnique();
                entity.HasOne(e => e.PriceList)
                    .WithMany(e => e.WeekendPrices)
                    .HasForeignKey(e => e.PriceListId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ItemCategory)
                    .WithMany(e => e.WeekendPrices)
                    .HasForeignKey(e => e.ItemCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<PriceListHourPriceIncludedKm>(entity =>
            {
                entity.ToTable("PriceListHourPriceIncludedKm");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.PricePerHour).HasColumnType("decimal(10,5)");
                entity.Property(e => e.IncludedKmPerHour).HasColumnType("decimal(10,5)");
                entity.Property(e => e.PricePerExcessKm).HasColumnType("decimal(10,5)");
                entity.HasIndex(e => new { e.PriceListId, e.ItemCategoryId }).IsUnique();
                entity.HasOne(e => e.PriceList)
                    .WithMany(e => e.HourPriceIncludedKms)
                    .HasForeignKey(e => e.PriceListId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ItemCategory)
                    .WithMany(e => e.HourPriceIncludedKms)
                    .HasForeignKey(e => e.ItemCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<PriceListServicePrice>(entity =>
            {
                entity.ToTable("PriceListServicePrice");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.PricePerServiceDay).HasColumnType("decimal(10,5)");
                entity.Property(e => e.IncludedKmPerDay).HasColumnType("decimal(10,5)");
                entity.Property(e => e.PricePerExcessKm).HasColumnType("decimal(10,5)");
                entity.HasIndex(e => new { e.PriceListId, e.ItemCategoryId }).IsUnique();
                entity.HasOne(e => e.PriceList)
                    .WithMany(e => e.ServicePrices)
                    .HasForeignKey(e => e.PriceListId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ItemCategory)
                    .WithMany(e => e.ServicePrices)
                    .HasForeignKey(e => e.ItemCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<PriceListGuaranteePrice>(entity =>
            {
                entity.ToTable("PriceListGuaranteePrice");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.PricePerGuaranteeDay).HasColumnType("decimal(10,5)");
                entity.HasIndex(e => new { e.PriceListId, e.ItemCategoryId }).IsUnique();
                entity.HasOne(e => e.PriceList)
                    .WithMany(e => e.GuaranteePrices)
                    .HasForeignKey(e => e.PriceListId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ItemCategory)
                    .WithMany(e => e.GuaranteePrices)
                    .HasForeignKey(e => e.ItemCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<PriceListWeekendPriceIncludedKm>(entity =>
            {
                entity.ToTable("PriceListWeekendPriceIncludedKm");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FromTime).HasColumnType("time");
                entity.Property(e => e.ToTime).HasColumnType("time");
                entity.Property(e => e.WeekendPrice).HasColumnType("decimal(10,5)");
                entity.Property(e => e.IncludedKm).HasColumnType("decimal(10,5)");
                entity.Property(e => e.PricePerExcessKm).HasColumnType("decimal(10,5)");
                entity.HasIndex(e => new { e.PriceListId, e.ItemCategoryId }).IsUnique();
                entity.HasOne(e => e.PriceList)
                    .WithMany(e => e.WeekendPriceIncludedKms)
                    .HasForeignKey(e => e.PriceListId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ItemCategory)
                    .WithMany(e => e.WeekendPriceIncludedKms)
                    .HasForeignKey(e => e.ItemCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<PriceListWeekendPriceFreeKm>(entity =>
            {
                entity.ToTable("PriceListWeekendPriceFreeKm");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FromTime).HasColumnType("time");
                entity.Property(e => e.ToTime).HasColumnType("time");
                entity.Property(e => e.WeekendPrice).HasColumnType("decimal(10,5)");
                entity.HasIndex(e => new { e.PriceListId, e.ItemCategoryId }).IsUnique();
                entity.HasOne(e => e.PriceList)
                    .WithMany(e => e.WeekendPriceFreeKms)
                    .HasForeignKey(e => e.PriceListId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ItemCategory)
                    .WithMany(e => e.WeekendPriceFreeKms)
                    .HasForeignKey(e => e.ItemCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ServiceType>(entity =>
            {
                entity.ToTable("ServiceType");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ServiceCode).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.ServiceTypes)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<InsuranceCompany>(entity =>
            {
                entity.ToTable("InsuranceCompany");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(200);
                entity.Property(e => e.OrganizationNr).HasMaxLength(200);
                entity.Property(e => e.ContactPerson).HasMaxLength(200);
                entity.Property(e => e.Telephone).HasMaxLength(200);
                entity.Property(e => e.Email).HasMaxLength(200);
                entity.Property(e => e.Street).HasMaxLength(200);
                entity.Property(e => e.ZipCode).HasMaxLength(200);
                entity.Property(e => e.City).HasMaxLength(200);
                entity.Property(e => e.Country).HasMaxLength(200);
                entity.Property(e => e.PaymentDays).IsRequired(false);
                entity.Property(e => e.KeyFortnox).HasMaxLength(200);
                entity.HasOne(e => e.Office)
                    .WithMany(e => e.InsuranceCompanies)
                    .HasForeignKey(e => e.OfficeId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

        }

    }
}