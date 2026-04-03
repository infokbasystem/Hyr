using Hyr.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Hyr.Api.Data
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
        public DbSet<Account> Accounts { get; set; } = null!;
        public DbSet<Article> Articles { get; set; } = null!;
        public DbSet<VatRate> VatRates { get; set; } = null!;
        public DbSet<ItemCategory> ItemCategories { get; set; } = null!;
        public DbSet<ItemModel> ItemModels { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder); // Call the base method 

            modelBuilder.Entity<Office>(entity =>
            {
                entity.ToTable("Office");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.FortnoxRefreshToken).IsRequired().HasMaxLength(500);
            });

            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("User");
                entity.HasKey(e => e.Id);
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
                entity.Property(e => e.YearModel).HasMaxLength(50);
                entity.Property(e => e.Note).HasMaxLength(500);
                entity.Property(e => e.ItemNr).HasMaxLength(100);
                entity.Property(e => e.PopupText).HasMaxLength(500);
                entity.Property(e => e.IsActive).IsRequired();
                entity.Property(e => e.Manufacturer).HasMaxLength(200);
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
                entity.Property(e => e.ReplacementCost).IsRequired(false).HasColumnType("decimal(10,5)");
                entity.Property(e => e.NrOfItemsTotal).IsRequired(false);
                entity.Property(e => e.IsStorageItem).IsRequired();
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
            });

            modelBuilder.Entity<Reservation>(entity =>
            {
                entity.ToTable("Reservation");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.StatusCode).HasMaxLength(50);
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
                entity.Property(e => e.DeliveryPlaceNote).HasMaxLength(2000);
                entity.Property(e => e.PickupPlaceNote).HasMaxLength(2000);
                entity.Property(e => e.OngoingInvoicingInterval).HasMaxLength(50);
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
            });

            modelBuilder.Entity<ReservationCalcItem>(entity =>
            {
                entity.ToTable("ReservationCalcItem");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Text).HasMaxLength(500);
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

            modelBuilder.Entity<Account>(entity =>
            {
                entity.ToTable("Account");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.AccountNr).HasMaxLength(100);
                entity.Property(e => e.Name).HasMaxLength(500);
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

        }

    }
}