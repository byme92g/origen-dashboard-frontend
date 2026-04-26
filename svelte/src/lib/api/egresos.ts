import { apiGet, apiPost, apiDelete } from './base';
import type { Egreso, PaginatedResult } from '../types';

export interface CrearEgresoRequest {
  fecha: string;
  categoria: string;
  descripcion: string;
  monto: number;
  proveedor?: string;
  comprobante?: string;
  observaciones?: string;
}

export interface CategoriaEgreso {
  key: string;
  label: string;
}

export const egresoApi = {
  getCategorias: () => apiGet<CategoriaEgreso[]>('/api/egresos/categorias'),
  listar: (desde?: string, hasta?: string) => {
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const qs = params.toString();
    return apiGet<Egreso[]>(`/api/egresos${qs ? '?' + qs : ''}`);
  },
  listarPaginado: (page: number, pageSize = 10, desde?: string, hasta?: string) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    return apiGet<PaginatedResult<Egreso>>(`/api/egresos?${params}`);
  },
  obtener: (id: number) => apiGet<Egreso>(`/api/egresos/${id}`),
  crear: (data: CrearEgresoRequest) => apiPost<Egreso>('/api/egresos', data),
  eliminar: (id: number) => apiDelete(`/api/egresos/${id}`),
};
