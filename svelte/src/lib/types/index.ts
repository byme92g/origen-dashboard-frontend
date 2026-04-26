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
  telefono?: string;
  email?: string;
  observaciones?: string;
  fechaRegistro: string;
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
  activo: boolean;
}

export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  precioVenta: number;
  stock: number;
  activo: boolean;
}

export interface Paquete {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  descuento: number;
  comisionPct: number;
  activo: boolean;
  servicios?: Servicio[];
  productos?: Producto[];
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
  observaciones?: string;
  clienteId?: number;
  empleadoId?: number;
  cliente?: { id: number; nombre: string };
  empleado?: { id: number; nombre: string; cargo: string };
  servicio?: { id: number; nombre: string; precio: number };
  producto?: { id: number; nombre: string; precioVenta: number };
  paquete?: { id: number; nombre: string; precio: number };
}

export interface Egreso {
  id: number;
  fecha: string;
  categoria: string;
  descripcion: string;
  monto: number;
  proveedor?: string;
  comprobante?: string;
  observaciones?: string;
}

export interface DashboardKpis {
  ingresosHoy: number;
  egresosMes: number;
  utilidadMes: number;
  totalClientes: number;
  serviciosHoy: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  ultimasTransacciones: Ingreso[];
  porMetodoPago: { metodo: string; total: number }[];
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
