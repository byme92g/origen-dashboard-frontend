using OrigenDashboard.Models;

namespace OrigenDashboard.Services;

public class EgresoService(HttpClient http) : ApiBase(http)
{
    public Task<(bool ok, List<EgresoDto>? data, string? error)> ListarAsync(DateTime? desde = null, DateTime? hasta = null)
    {
        var url = "/api/egresos";
        if (desde.HasValue && hasta.HasValue)
            url += $"?desde={desde:O}&hasta={hasta:O}";
        return GetAsync<List<EgresoDto>>(url);
    }

    public Task<(bool ok, EgresoDto? data, string? error)> CrearAsync(CrearEgresoRequest req) =>
        PostAsync<EgresoDto>("/api/egresos", req);

    public Task<(bool ok, string? error)> EliminarAsync(int id) =>
        DeleteAsync($"/api/egresos/{id}");
}
