export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResult<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

export interface UsuarioInfo {
  id: number;
  nombreUsuario: string;
  nombreCompleto: string;
  rol: string;
}

export interface Cliente {
  id: number;
  nombre: string;
  dni: string;
  telefono?: string;
  email?: string;
  observaciones?: string;
  fechaRegistro: string;
}

export interface Cargo {
  id: number;
  nombre: string;
}

export interface Empleado {
  id: number;
  nombre: string;
  cargo: string;
  comisionPct: number;
  usuarioLogin?: string;
  activo: boolean;
}

export interface Usuario {
  id: number;
  nombreUsuario: string;
  nombreCompleto: string;
  rol: string;
  activo: boolean;
}

export interface Servicio {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  duracionMin: number;
  comisionPct: number;
  descuento: number;
  activo: boolean;
}

export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  precioVenta: number;
  stock: number;
  comisionPct: number;
  descuento: number;
  activo: boolean;
}

export interface PaqueteServicio {
  id: number;
  paqueteId: number;
  servicioId: number;
  servicio?: Servicio;
}

export interface PaqueteProducto {
  id: number;
  paqueteId: number;
  productoId: number;
  cantidad: number;
  producto?: Producto;
}

export interface Paquete {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  descuento: number;
  comisionPct: number;
  activo: boolean;
  servicios?: PaqueteServicio[];
  productos?: PaqueteProducto[];
}

export interface IngresoDetalle {
  id: number;
  ingresoId: number;
  tipo: string;
  nombre: string; // snapshot — immutable after creation
  cantidad: number;
  precioUnitario: number;
  descuentoPct: number;
  monto: number;
}

export interface IngresoMetodoPago {
  id: number;
  ingresoId: number;
  metodoPago: string;
  monto: number;
  referencia?: string;
}

export interface Ingreso {
  id: number;
  fecha: string;
  tipo: string;
  concepto?: string;
  clienteNombre?: string;
  conceptoPersonalizado?: string;
  servicioId?: number;
  productoId?: number;
  paqueteId?: number;
  cantidad: number;
  monto: number;
  descuento: number;
  metodoPago: string;
  referencia?: string;
  comision: number;
  montoRecibido?: number;
  observaciones?: string;
  clienteId?: number;
  empleadoId?: number;
  cliente?: { id: number; nombre: string };
  empleado?: { id: number; nombre: string; cargo: string };
  servicio?: { id: number; nombre: string; precio: number };
  producto?: { id: number; nombre: string; precioVenta: number };
  paquete?: { id: number; nombre: string; precio: number };
  detalles?: IngresoDetalle[];
  pagos?: IngresoMetodoPago[];
}

export interface Egreso {
  id: number;
  fecha: string;
  categoriaId: number;
  categoria: { id: number; nombre: string } | string;
  descripcion: string;
  monto: number;
  proveedor?: string;
  comprobante?: string;
  observaciones?: string;
  metodoPago?: string;
  empleadoId?: number;
  empleado?: { id: number; nombre: string };
}

export interface Campana {
  id: number;
  titulo: string;
  descripcion?: string;
  tipo: 'servicio' | 'producto' | 'paquete';
  servicioId?: number;
  productoId?: number;
  paqueteId?: number;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  creadoEn: string;
  servicio?: { id: number; nombre: string; precio: number };
  producto?: { id: number; nombre: string; precioVenta: number };
  paquete?: { id: number; nombre: string; precio: number };
}

export interface DashboardKpis {
  ingresosHoy: number;
  egresosHoy: number;
  utilidadHoy: number;
  totalClientes: number;
  serviciosHoy: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  ultimasTransacciones: Ingreso[];
  porMetodoPago: { metodo: string; total: number }[];
}

export interface ComisionTransaccion {
  ingresoId: number;
  fecha: string;
  concepto: string;
  monto: number;
  comision: number;
  metodoPago: string;
}

export interface ComisionEmpleado {
  empleadoId: number;
  nombre: string;
  cargo: string;
  cantidadTransacciones: number;
  totalVentas: number;
  totalComision: number;
  transacciones: ComisionTransaccion[];
}

export interface ReporteResumen {
  periodo: { desde: string; hasta: string };
  resumen: {
    totalIngresos: number;
    totalEgresos: number;
    utilidadNeta: number;
    totalComisiones: number;
    cantidadIngresos: number;
    cantidadEgresos: number;
  };
  porMetodoPago: { metodo: string; total: number }[];
  topServicios: { nombre: string; cantidad: number; total: number }[];
  porEmpleado: { nombre: string; servicios: number; ventas: number; comision: number }[];
}
