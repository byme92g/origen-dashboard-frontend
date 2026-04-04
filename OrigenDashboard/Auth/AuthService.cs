using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.JSInterop;
using OrigenDashboard.Models;

namespace OrigenDashboard.Auth;

public class AuthService(HttpClient http, IJSRuntime js)
{
    private const string TokenKey = "origen_token";
    private const string UserKey = "origen_user";
    private const string ExpiryKey = "origen_expiry";

    public async Task<(bool ok, string? error)> LoginAsync(string usuario, string password)
    {
        try
        {
            var res = await http.PostAsJsonAsync("/api/auth/login", new LoginRequest(usuario, password));
            var body = await res.Content.ReadFromJsonAsync<LoginResponse>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (!res.IsSuccessStatusCode || body is null)
                return (false, "Credenciales incorrectas.");

            var expiry = DateTimeOffset.UtcNow.AddSeconds(body.ExpiraEn).ToUnixTimeSeconds();

            await js.InvokeVoidAsync("localStorage.setItem", TokenKey, body.Token);
            await js.InvokeVoidAsync("localStorage.setItem", UserKey, JsonSerializer.Serialize(body.Usuario));
            await js.InvokeVoidAsync("localStorage.setItem", ExpiryKey, expiry.ToString());

            return (true, null);
        }
        catch
        {
            return (false, "Error al conectar con el servidor.");
        }
    }

    public async Task LogoutAsync()
    {
        await js.InvokeVoidAsync("localStorage.removeItem", TokenKey);
        await js.InvokeVoidAsync("localStorage.removeItem", UserKey);
        await js.InvokeVoidAsync("localStorage.removeItem", ExpiryKey);
    }

    public async Task<string?> GetTokenAsync()
    {
        var expiry = await js.InvokeAsync<string?>("localStorage.getItem", ExpiryKey);
        if (expiry is null) return null;

        if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() >= long.Parse(expiry))
        {
            await LogoutAsync();
            return null;
        }

        return await js.InvokeAsync<string?>("localStorage.getItem", TokenKey);
    }

    public async Task<UsuarioInfo?> GetUsuarioAsync()
    {
        var token = await GetTokenAsync();
        if (token is null) return null;

        var json = await js.InvokeAsync<string?>("localStorage.getItem", UserKey);
        return json is null ? null : JsonSerializer.Deserialize<UsuarioInfo>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    }

    public async Task<bool> IsAuthenticatedAsync() => await GetTokenAsync() is not null;
}
