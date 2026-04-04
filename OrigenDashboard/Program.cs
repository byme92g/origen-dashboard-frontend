using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Microsoft.JSInterop;
using MudBlazor.Services;
using OrigenDashboard;
using OrigenDashboard.Auth;
using OrigenDashboard.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

// ── MudBlazor ────────────────────────────────────────────────────────────
builder.Services.AddMudServices();

// ── URL base de la API ────────────────────────────────────────────────────
var apiBaseConfig = builder.Configuration["ApiBaseUrl"];
var apiBase = string.IsNullOrWhiteSpace(apiBaseConfig)
    ? builder.HostEnvironment.BaseAddress
    : apiBaseConfig;

// ── Auth service ──────────────────────────────────────────────────────────
// Usa un HttpClient plain (sin handler) solo para el endpoint de login.
// No pasa por IHttpClientFactory → evita el Lazy recursivo.
builder.Services.AddScoped<AuthService>(sp =>
{
    var js = sp.GetRequiredService<IJSRuntime>();
    var http = new HttpClient { BaseAddress = new Uri(apiBase) };
    return new AuthService(http, js);
});

// ── HttpClient principal (con Bearer token) ───────────────────────────────
// Se construye manualmente para evitar el bug de IHttpClientFactory + Lazy en WASM.
builder.Services.AddScoped<HttpClient>(sp =>
{
    var js = sp.GetRequiredService<IJSRuntime>();
    var handler = new AuthorizedHandler(js)
    {
        InnerHandler = new HttpClientHandler()
    };
    return new HttpClient(handler) { BaseAddress = new Uri(apiBase) };
});

// ── API Services ──────────────────────────────────────────────────────────
builder.Services.AddScoped<EmpleadoService>();
builder.Services.AddScoped<ClienteService>();
builder.Services.AddScoped<ServicioService>();
builder.Services.AddScoped<ProductoService>();
builder.Services.AddScoped<PaqueteService>();
builder.Services.AddScoped<IngresoService>();
builder.Services.AddScoped<EgresoService>();
builder.Services.AddScoped<ReporteService>();
builder.Services.AddScoped<UsuarioService>();

await builder.Build().RunAsync();
