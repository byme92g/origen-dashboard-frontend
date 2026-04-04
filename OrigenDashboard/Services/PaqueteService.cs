using OrigenDashboard.Models;

namespace OrigenDashboard.Services;

public class PaqueteService(HttpClient http) : ApiBase(http)
{
    public Task<(bool ok, List<PaqueteDto>? data, string? error)> ListarAsync() =>
        GetAsync<List<PaqueteDto>>("/api/paquetes");

    public Task<(bool ok, PaqueteDto? data, string? error)> CrearAsync(CrearPaqueteRequest req) =>
        PostAsync<PaqueteDto>("/api/paquetes", req);

    public Task<(bool ok, string? error)> ActualizarAsync(int id, ActualizarPaqueteRequest req) =>
        PutAsync($"/api/paquetes/{id}", req);

    public Task<(bool ok, string? error)> EliminarAsync(int id) =>
        DeleteAsync($"/api/paquetes/{id}");
}
