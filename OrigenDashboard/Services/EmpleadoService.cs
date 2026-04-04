using OrigenDashboard.Models;

namespace OrigenDashboard.Services;

public class EmpleadoService(HttpClient http) : ApiBase(http)
{
    public Task<(bool ok, List<EmpleadoDto>? data, string? error)> ListarAsync() =>
        GetAsync<List<EmpleadoDto>>("/api/empleados");

    public Task<(bool ok, EmpleadoDto? data, string? error)> CrearAsync(CrearEmpleadoRequest req) =>
        PostAsync<EmpleadoDto>("/api/empleados", req);

    public Task<(bool ok, string? error)> ActualizarAsync(int id, ActualizarEmpleadoRequest req) =>
        PutAsync($"/api/empleados/{id}", req);

    public Task<(bool ok, string? error)> EliminarAsync(int id) =>
        DeleteAsync($"/api/empleados/{id}");
}
