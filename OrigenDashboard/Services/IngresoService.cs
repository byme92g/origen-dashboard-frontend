using OrigenDashboard.Models;

namespace OrigenDashboard.Services;

public class IngresoService(HttpClient http) : ApiBase(http)
{
    public Task<(bool ok, List<IngresoDto>? data, string? error)> ListarAsync(DateTime? desde = null, DateTime? hasta = null)
    {
        var url = "/api/ingresos";
        if (desde.HasValue && hasta.HasValue)
            url += $"?desde={desde:O}&hasta={hasta:O}";
        return GetAsync<List<IngresoDto>>(url);
    }

    public Task<(bool ok, PagedResult<IngresoDto>? data, string? error)> ListarPaginadoAsync(DateTime? desde, DateTime? hasta, int page, int pageSize)
    {
        var url = $"/api/ingresos?page={page}&pageSize={pageSize}";
        if (desde.HasValue && hasta.HasValue)
            url += $"&desde={desde:O}&hasta={hasta:O}";
        return GetAsync<PagedResult<IngresoDto>>(url);
    }

    public Task<(bool ok, IngresoDto? data, string? error)> CrearAsync(CrearIngresoRequest req) =>
        PostAsync<IngresoDto>("/api/ingresos", req);

    public Task<(bool ok, string? error)> EliminarAsync(int id) =>
        DeleteAsync($"/api/ingresos/{id}");
}
