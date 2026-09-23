using Microsoft.AspNetCore.DataProtection;

namespace Backend.Services
{
    public interface ISecretProtector
    {
        string Protect(string plainText);

        string Unprotect(string protectedText);
    }

    public class SecretProtector : ISecretProtector
    {
        private const string Purpose = "Backend.Secrets.v1";
        private readonly IDataProtector _protector;

        public SecretProtector(IDataProtectionProvider dataProtectionProvider)
        {
            _protector = dataProtectionProvider.CreateProtector(Purpose);
        }

        public string Protect(string plainText)
        {
            return string.IsNullOrEmpty(plainText) ? string.Empty : _protector.Protect(plainText);
        }

        public string Unprotect(string protectedText)
        {
            if (string.IsNullOrEmpty(protectedText))
            {
                return string.Empty;
            }

            return _protector.Unprotect(protectedText);
        }
    }
}
