import { apiGet, apiPost, apiDelete } from './base';
import type { Ingreso, PaginatedResult } from '../types';

export interface CrearIngresoRequest {
  fecha: string;
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
  observaciones?: string;
}

export const ingresoApi = {
  listar: (desde?: string, hasta?: string) => {
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const qs = params.toString();
    return apiGet<Ingreso[]>(`/api/ingresos${qs ? '?' + qs : ''}`);
  },
  listarPaginado: (page: number, pageSize = 10, desde?: string, hasta?: string) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    return apiGet<PaginatedResult<Ingreso>>(`/api/ingresos?${params}`);
  },
  obtener: (id: number) => apiGet<Ingreso>(`/api/ingresos/${id}`),
  crear: (data: CrearIngresoRequest) => apiPost<Ingreso>('/api/ingresos', data),
  eliminar: (id: number) => apiDelete(`/api/ingresos/${id}`),
};
