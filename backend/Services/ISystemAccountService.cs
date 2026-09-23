using Backend.Models;

namespace Backend.Services;

public interface ISystemAccountService
{
    Task<IReadOnlyDictionary<string, Account>> EnsureAccountsAsync(int officeId);
}
