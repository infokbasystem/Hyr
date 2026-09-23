namespace Backend.Models
{
    public class AuthResponse
    {
        public string Token { get; set; } = string.Empty;
        public User User { get; set; } = new User();
    }   
}   
