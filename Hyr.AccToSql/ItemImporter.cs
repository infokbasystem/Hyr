using System.Data;
using System.Data.OleDb;

public sealed class ItemImporter
{
    public AccessItem? GetItemFromAccess(string accessConnectionString, int itemId)
    {
        using var connection = new OleDbConnection(accessConnectionString);
        connection.Open();
        using var command = new OleDbCommand("SELECT * FROM Item WHERE lngItem_ID = ?", connection);
        command.Parameters.AddWithValue("?", itemId);

        using var reader = command.ExecuteReader();
        if (reader.Read())
        {
            return new AccessItem
            {
                Id = itemId,
                ItemNr = reader.IsDBNull(7) ? string.Empty : reader.GetValue(7)?.ToString()?.Trim() ?? string.Empty,
                ItemName = reader.IsDBNull(1) ? string.Empty : reader.GetValue(2)?.ToString()?.Trim() ?? string.Empty,
                Note = reader.IsDBNull(11) ? string.Empty : reader.GetValue(11)?.ToString()?.Trim() ?? string.Empty,
                AccountNr = reader.IsDBNull(31) ? (int?)null : Convert.ToInt32(reader.GetValue(31)),
                IsActive = reader.IsDBNull(13) ? true : Convert.ToBoolean(reader.GetValue(13)),
                IsStorageItem = reader.IsDBNull(26) ? false : Convert.ToBoolean(reader.GetValue(26)),
                Manufacturer = reader.IsDBNull(14) ? string.Empty : reader.GetValue(14)?.ToString()?.Trim() ?? string.Empty,
                MachineNr = reader.IsDBNull(15) ? string.Empty : reader.GetValue(15)?.ToString()?.Trim() ?? string.Empty,
                CostCenterNr = reader.IsDBNull(32) ? string.Empty : reader.GetValue(32)?.ToString()?.Trim() ?? string.Empty,
                BasePrice = reader.IsDBNull(21) ? (decimal?)null : Convert.ToDecimal(reader.GetValue(21)),
                NrOfItemsTotal = reader.IsDBNull(13) ? (int?)null : Convert.ToInt32(reader.GetValue(13)),
                PlatformHeightMm = reader.IsDBNull(19) ? (int?)null : Convert.ToInt32(reader.GetValue(19)),
                PlatformLengthMm = reader.IsDBNull(20) ? (int?)null : Convert.ToInt32(reader.GetValue(20)),
                PopupText = reader.IsDBNull(12) ? string.Empty : reader.GetValue(12)?.ToString()?.Trim() ?? string.Empty,
                PricePerDay = reader.IsDBNull(22) ? (decimal?)null : Convert.ToDecimal(reader.GetValue(22)),
                ReplacementCost = reader.IsDBNull(25) ? (decimal?)null : Convert.ToDecimal(reader.GetValue(25)),
                UnavailableForReservation = reader.IsDBNull(27) ? false : Convert.ToBoolean(reader.GetValue(27)),
                UnavailableReason = reader.IsDBNull(28) ? string.Empty : reader.GetValue(28)?.ToString()?.Trim() ?? string.Empty,
            };
        }
        return null;
    }
}

public class AccessItem
{
    public int Id { get; set; }
    public string ItemNr { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public int? AccountNr { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsStorageItem { get; set; } = false;
    public string Manufacturer { get; set; } = string.Empty;
    public string MachineNr { get; set; } = string.Empty;
    public string CostCenterNr { get; set; } = string.Empty;
    public decimal? BasePrice { get; set; }
    public int? NrOfItemsTotal { get; set; }
    public int? PlatformHeightMm { get; set; }
    public int? PlatformLengthMm { get; set; }
    public string PopupText { get; set; } = string.Empty;
    public decimal? PricePerDay { get; set; }
    public decimal? ReplacementCost { get; set; }
    public bool UnavailableForReservation { get; set; } = false;
    public string UnavailableReason { get; set; } = string.Empty;
    public decimal? WeightKg { get; set; }
}
