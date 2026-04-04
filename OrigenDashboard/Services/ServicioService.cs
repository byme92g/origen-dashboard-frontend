using OrigenDashboard.Models;

namespace OrigenDashboard.Services;

public class ServicioService(HttpClient http) : ApiBase(http)
{
    public Task<(bool ok, List<ServicioDto>? data, string? error)> ListarAsync() =>
        GetAsync<List<ServicioDto>>("/api/servicios");

    public Task<(bool ok, ServicioDto? data, string? error)> CrearAsync(CrearServicioRequest req) =>
        PostAsync<ServicioDto>("/api/servicios", req);

    public Task<(bool ok, string? error)> ActualizarAsync(int id, ActualizarServicioRequest req) =>
        PutAsync($"/api/servicios/{id}", req);

    public Task<(bool ok, string? error)> EliminarAsync(int id) =>
        DeleteAsync($"/api/servicios/{id}");
}
