import { apiGet, apiPost, apiDelete } from './base';
import type { Ingreso, PaginatedResult } from '../types';

export interface PagoMixtoRequest {
  metodoPago: string;
  monto: number;
  referencia?: string;
}

export interface DetalleIngresoRequest {
  tipo: string;
  nombre: string;       // snapshot sent by frontend at checkout time
  productoId?: number;  // only used backend-side for stock deduction
  cantidad: number;
  monto: number;
  precioUnitario: number;
  descuentoPct: number;
}

export interface CrearIngresoRequest {
  clienteId?: number;
  empleadoId?: number;
  tipo: string;
  servicioId?: number;
  productoId?: number;
  paqueteId?: number;
  conceptoPersonalizado?: string;
  cantidad: number;
  monto: number;
  descuento: number;
  metodoPago: string;
  referencia?: string;
  comision: number;
  montoRecibido?: number;
  observaciones?: string;
  detalles?: DetalleIngresoRequest[];
  pagos?: PagoMixtoRequest[];
}

function normalizeIngreso(i: Ingreso): Ingreso {
  return {
    ...i,
    clienteNombre: i.clienteNombre ?? i.cliente?.nombre,
    concepto: i.concepto
      ?? i.servicio?.nombre
      ?? i.producto?.nombre
      ?? i.paquete?.nombre
      ?? i.conceptoPersonalizado
      ?? '-',
  };
}

export const ingresoApi = {
  listar: async (desde?: string, hasta?: string) => {
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const qs = params.toString();
    const res = await apiGet<Ingreso[]>(`/ingresos${qs ? '?' + qs : ''}`);
    if (res.ok && res.data) res.data = res.data.map(normalizeIngreso);
    return res;
  },
  listarPaginado: async (page: number, pageSize = 10, desde?: string, hasta?: string, metodoPago?: string) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    if (metodoPago) params.set('metodoPago', metodoPago);
    const res = await apiGet<PaginatedResult<Ingreso>>(`/ingresos?${params}`);
    if (res.ok && res.data && !Array.isArray(res.data)) res.data.items = res.data.items.map(normalizeIngreso);
    return res;
  },
  obtener: (id: number) => apiGet<Ingreso>(`/ingresos/${id}`),
  crear: (data: CrearIngresoRequest) => apiPost<Ingreso>('/ingresos', data),
  eliminar: (id: number) => apiDelete(`/ingresos/${id}`),
};
