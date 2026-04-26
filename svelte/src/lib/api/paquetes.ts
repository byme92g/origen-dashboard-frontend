import { apiGet, apiPost, apiPut, apiDelete } from './base';
import type { Paquete, PaginatedResult } from '../types';

export const paqueteApi = {
  listar: () => apiGet<Paquete[]>('/api/paquetes'),
  listarPaginado: (page: number, pageSize = 15) =>
    apiGet<PaginatedResult<Paquete>>(`/api/paquetes?page=${page}&pageSize=${pageSize}`),
  obtener: (id: number) => apiGet<Paquete>(`/api/paquetes/${id}`),
  crear: (data: Omit<Paquete, 'id' | 'servicios' | 'productos'> & { servicioIds: number[]; productoIds: number[] }) =>
    apiPost<Paquete>('/api/paquetes', data),
  actualizar: (id: number, data: Partial<Paquete> & { servicioIds?: number[]; productoIds?: number[] }) =>
    apiPut<Paquete>(`/api/paquetes/${id}`, data),
  eliminar: (id: number) => apiDelete(`/api/paquetes/${id}`),
};
