using System.Net.Http.Headers;
using Microsoft.JSInterop;

namespace OrigenDashboard.Auth;

/// <summary>
/// DelegatingHandler que añade el Bearer token a cada petición HTTP.
/// Lee el token directamente de localStorage para evitar dependencia circular con AuthService.
/// </summary>
public class AuthorizedHandler(IJSRuntime js) : DelegatingHandler
{
    private const string TokenKey = "origen_token";
    private const string ExpiryKey = "origen_expiry";

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var token = await ObtenerTokenValidoAsync();
        if (token is not null)
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        return await base.SendAsync(request, cancellationToken);
    }

    private async Task<string?> ObtenerTokenValidoAsync()
    {
        try
        {
            var expiry = await js.InvokeAsync<string?>("localStorage.getItem", ExpiryKey);
            if (expiry is null) return null;

            if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() >= long.Parse(expiry))
                return null;

            return await js.InvokeAsync<string?>("localStorage.getItem", TokenKey);
        }
        catch
        {
            return null;
        }
    }
}
