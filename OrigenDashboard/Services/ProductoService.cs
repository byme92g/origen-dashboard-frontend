using OrigenDashboard.Models;

namespace OrigenDashboard.Services;

public class ProductoService(HttpClient http) : ApiBase(http)
{
    public Task<(bool ok, List<ProductoDto>? data, string? error)> ListarAsync() =>
        GetAsync<List<ProductoDto>>("/api/productos");

    public Task<(bool ok, PagedResult<ProductoDto>? data, string? error)> ListarPaginadoAsync(int page, int pageSize) =>
        GetAsync<PagedResult<ProductoDto>>($"/api/productos?page={page}&pageSize={pageSize}");

    public Task<(bool ok, ProductoDto? data, string? error)> CrearAsync(CrearProductoRequest req) =>
        PostAsync<ProductoDto>("/api/productos", req);

    public Task<(bool ok, string? error)> ActualizarAsync(int id, ActualizarProductoRequest req) =>
        PutAsync($"/api/productos/{id}", req);

    public Task<(bool ok, string? error)> EliminarAsync(int id) =>
        DeleteAsync($"/api/productos/{id}");
}
