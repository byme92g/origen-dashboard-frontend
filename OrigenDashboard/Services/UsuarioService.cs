using OrigenDashboard.Models;

namespace OrigenDashboard.Services;

public class UsuarioService(HttpClient http) : ApiBase(http)
{
    public Task<(bool ok, List<UsuarioDto>? data, string? error)> ListarAsync() =>
        GetAsync<List<UsuarioDto>>("/api/usuarios");

    public Task<(bool ok, PagedResult<UsuarioDto>? data, string? error)> ListarPaginadoAsync(int page, int pageSize) =>
        GetAsync<PagedResult<UsuarioDto>>($"/api/usuarios?page={page}&pageSize={pageSize}");

    public Task<(bool ok, UsuarioDto? data, string? error)> CrearAsync(CrearUsuarioRequest req) =>
        PostAsync<UsuarioDto>("/api/usuarios", req);

    public Task<(bool ok, string? error)> ActualizarAsync(int id, ActualizarUsuarioRequest req) =>
        PutAsync($"/api/usuarios/{id}", req);

    public Task<(bool ok, string? error)> EliminarAsync(int id) =>
        DeleteAsync($"/api/usuarios/{id}");
}
