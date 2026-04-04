using System.Net.Http.Json;
using System.Text.Json;
using OrigenDashboard.Models;

namespace OrigenDashboard.Services;

public abstract class ApiBase(HttpClient http)
{
    protected static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    protected async Task<(bool ok, T? data, string? error)> GetAsync<T>(string url)
    {
        try
        {
            var res = await http.GetFromJsonAsync<ApiResponse<T>>(url, JsonOpts);
            return res is null ? (false, default, "Sin respuesta.") : (res.Ok, res.Data, res.Error);
        }
        catch (Exception ex) { return (false, default, ex.Message); }
    }

    protected async Task<(bool ok, T? data, string? error)> PostAsync<T>(string url, object body)
    {
        try
        {
            var res = await http.PostAsJsonAsync(url, body);
            var parsed = await res.Content.ReadFromJsonAsync<ApiResponse<T>>(JsonOpts);
            return parsed is null ? (false, default, "Sin respuesta.") : (parsed.Ok, parsed.Data, parsed.Error);
        }
        catch (Exception ex) { return (false, default, ex.Message); }
    }

    protected async Task<(bool ok, string? error)> PutAsync(string url, object body)
    {
        try
        {
            var res = await http.PutAsJsonAsync(url, body);
            var parsed = await res.Content.ReadFromJsonAsync<ApiResponse<object>>(JsonOpts);
            return parsed is null ? (false, "Sin respuesta.") : (parsed.Ok, parsed.Error);
        }
        catch (Exception ex) { return (false, ex.Message); }
    }

    protected async Task<(bool ok, string? error)> DeleteAsync(string url)
    {
        try
        {
            var res = await http.DeleteAsync(url);
            var parsed = await res.Content.ReadFromJsonAsync<ApiResponse<object>>(JsonOpts);
            return parsed is null ? (false, "Sin respuesta.") : (parsed.Ok, parsed.Error);
        }
        catch (Exception ex) { return (false, ex.Message); }
    }
}
