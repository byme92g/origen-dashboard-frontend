namespace OrigenDashboard.Models;

// ── Auth ──────────────────────────────────────────────────────────────────
public record LoginRequest(string NombreUsuario, string Password);

public record LoginResponse(
    bool Ok,
    string Token,
    int ExpiraEn,
    UsuarioInfo Usuario
);

public record UsuarioInfo(int Id, string NombreUsuario, string NombreCompleto, string Rol);

// ── Empleados ─────────────────────────────────────────────────────────────
public record EmpleadoDto(int Id, string Nombre, string Cargo, decimal ComisionPct, string? UsuarioLogin, bool Activo, DateTime CreadoEn);
public record CrearEmpleadoRequest(string Nombre, string Cargo, decimal ComisionPct, string? UsuarioLogin);
public record ActualizarEmpleadoRequest(string Nombre, string Cargo, decimal ComisionPct, string? UsuarioLogin, bool Activo);

// ── Clientes ──────────────────────────────────────────────────────────────
public record ClienteDto(int Id, string Nombre, string? Telefono, string? Email, string? Observaciones, DateTime FechaRegistro);
public record CrearClienteRequest(string Nombre, string? Telefono, string? Email, string? Observaciones);
public record ActualizarClienteRequest(string Nombre, string? Telefono, string? Email, string? Observaciones);

// ── Servicios ─────────────────────────────────────────────────────────────
public record ServicioDto(int Id, string Nombre, string Categoria, decimal Precio, int DuracionMin, decimal ComisionPct, bool Activo);
public record CrearServicioRequest(string Nombre, string Categoria, decimal Precio, int DuracionMin, decimal ComisionPct);
public record ActualizarServicioRequest(string Nombre, string Categoria, decimal Precio, int DuracionMin, decimal ComisionPct, bool Activo);

// ── Productos ─────────────────────────────────────────────────────────────
public record ProductoDto(int Id, string Nombre, string Categoria, decimal PrecioVenta, int Stock, bool Activo);
public record CrearProductoRequest(string Nombre, string Categoria, decimal PrecioVenta, int StockInicial);
public record ActualizarProductoRequest(string Nombre, string Categoria, decimal PrecioVenta, int Stock, bool Activo);

// ── Paquetes ──────────────────────────────────────────────────────────────
public record PaqueteDto(int Id, string Nombre, string? Descripcion, decimal Precio, decimal Descuento, decimal ComisionPct, bool Activo, List<PaqueteServicioDto> Servicios, List<PaqueteProductoDto> Productos);
public record PaqueteServicioDto(int Id, int ServicioId, ServicioDto Servicio);
public record PaqueteProductoDto(int Id, int ProductoId, ProductoDto Producto, int Cantidad);
public record CrearPaqueteRequest(string Nombre, string? Descripcion, decimal Precio, decimal Descuento, List<int> ServicioIds, List<int> ProductoIds, decimal ComisionPct = 0);
public record ActualizarPaqueteRequest(string Nombre, string? Descripcion, decimal Precio, decimal Descuento, bool Activo, List<int> ServicioIds, List<int> ProductoIds, decimal ComisionPct = 0);

// ── Ingresos ──────────────────────────────────────────────────────────────
public record IngresoDto(
    int Id, DateTime Fecha,
    int? ClienteId, ClienteDto? Cliente,
    int? EmpleadoId, EmpleadoDto? Empleado,
    string Tipo,
    int? ServicioId, ServicioDto? Servicio,
    int? ProductoId, ProductoDto? Producto,
    int? PaqueteId, PaqueteDto? Paquete,
    string? ConceptoPersonalizado,
    int Cantidad,
    decimal Monto, decimal Descuento,
    string MetodoPago, string? Referencia,
    decimal Comision, string? Observaciones
);

public record CrearIngresoRequest(
    DateTime Fecha,
    int? ClienteId, int? EmpleadoId,
    string Tipo,
    int? ServicioId, int? ProductoId, int? PaqueteId,
    string? ConceptoPersonalizado,
    decimal Monto, decimal Descuento,
    string MetodoPago, string? Referencia,
    decimal Comision, string? Observaciones,
    int Cantidad = 1
);

// ── Egresos ───────────────────────────────────────────────────────────────
public record EgresoDto(int Id, DateTime Fecha, string Categoria, string Descripcion, decimal Monto, string? Proveedor, string? Comprobante, string? Observaciones);
public record CrearEgresoRequest(DateTime Fecha, string Categoria, string Descripcion, decimal Monto, string? Proveedor, string? Comprobante, string? Observaciones);

// ── Reportes ──────────────────────────────────────────────────────────────
public record DashboardData(KpisData Kpis, IEnumerable<TransaccionResumen> UltimasTransacciones, IEnumerable<MetodoPagoResumen> PorMetodoPago);
public record KpisData(decimal IngresosHoy, decimal EgresosMes, decimal UtilidadMes, int TotalClientes, int ServiciosHoy);
public record TransaccionResumen(int Id, DateTime Fecha, string Cliente, string Concepto, decimal Monto, decimal Descuento, string MetodoPago);
public record MetodoPagoResumen(string Metodo, decimal Total);

public record ResumenReporte(
    PeriodoData Periodo,
    ResumenData Resumen,
    IEnumerable<MetodoPagoResumen> PorMetodoPago,
    IEnumerable<ServicioResumen> TopServicios,
    IEnumerable<EmpleadoResumen> PorEmpleado
);
public record PeriodoData(DateTime Desde, DateTime Hasta);
public record ResumenData(decimal TotalIngresos, decimal TotalEgresos, decimal UtilidadNeta, decimal TotalComisiones, int CantidadIngresos, int CantidadEgresos);
public record ServicioResumen(string Servicio, decimal Total, int Cantidad);
public record EmpleadoResumen(string Empleado, decimal TotalVentas, decimal TotalComision, int Servicios);

// ── Usuarios ──────────────────────────────────────────────────────────────
public record UsuarioDto(int Id, string NombreUsuario, string NombreCompleto, string Rol, bool Activo);
public record CrearUsuarioRequest(string NombreCompleto, string NombreUsuario, string Password, string Rol);
public record ActualizarUsuarioRequest(string NombreCompleto, string? Password, string Rol, bool Activo);

// ── API wrapper ───────────────────────────────────────────────────────────
public record ApiResponse<T>(bool Ok, T? Data, string? Error);

// ── Paginación ────────────────────────────────────────────────────────────
public record PagedResult<T>(IEnumerable<T> Items, int Total, int Page, int PageSize);
