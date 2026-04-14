using OrigenDashboard.Models;

namespace OrigenDashboard.Services;

public class ClienteService(HttpClient http) : ApiBase(http)
{
    public Task<(bool ok, List<ClienteDto>? data, string? error)> ListarAsync() =>
        GetAsync<List<ClienteDto>>("/api/clientes");

    public Task<(bool ok, PagedResult<ClienteDto>? data, string? error)> ListarPaginadoAsync(int page, int pageSize) =>
        GetAsync<PagedResult<ClienteDto>>($"/api/clientes?page={page}&pageSize={pageSize}");

    public Task<(bool ok, ClienteDto? data, string? error)> CrearAsync(CrearClienteRequest req) =>
        PostAsync<ClienteDto>("/api/clientes", req);

    public Task<(bool ok, string? error)> ActualizarAsync(int id, ActualizarClienteRequest req) =>
        PutAsync($"/api/clientes/{id}", req);

    public Task<(bool ok, string? error)> EliminarAsync(int id) =>
        DeleteAsync($"/api/clientes/{id}");
}
