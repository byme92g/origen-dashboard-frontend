using OrigenDashboard.Models;

namespace OrigenDashboard.Services;

public class EmpleadoService(HttpClient http) : ApiBase(http)
{
    public Task<(bool ok, List<EmpleadoDto>? data, string? error)> ListarAsync() =>
        GetAsync<List<EmpleadoDto>>("/api/empleados");

    public Task<(bool ok, PagedResult<EmpleadoDto>? data, string? error)> ListarPaginadoAsync(int page, int pageSize) =>
        GetAsync<PagedResult<EmpleadoDto>>($"/api/empleados?page={page}&pageSize={pageSize}");

    public Task<(bool ok, EmpleadoDto? data, string? error)> CrearAsync(CrearEmpleadoRequest req) =>
        PostAsync<EmpleadoDto>("/api/empleados", req);

    public Task<(bool ok, string? error)> ActualizarAsync(int id, ActualizarEmpleadoRequest req) =>
        PutAsync($"/api/empleados/{id}", req);

    public Task<(bool ok, string? error)> EliminarAsync(int id) =>
        DeleteAsync($"/api/empleados/{id}");
}
