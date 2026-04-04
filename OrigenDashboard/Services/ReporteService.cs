using OrigenDashboard.Models;

namespace OrigenDashboard.Services;

public class ReporteService(HttpClient http) : ApiBase(http)
{
    public Task<(bool ok, DashboardData? data, string? error)> ObtenerDashboardAsync() =>
        GetAsync<DashboardData>("/api/reportes/dashboard");

    public Task<(bool ok, ResumenReporte? data, string? error)> ObtenerResumenAsync(DateTime desde, DateTime hasta) =>
        GetAsync<ResumenReporte>($"/api/reportes/resumen?desde={desde:O}&hasta={hasta:O}");
}
