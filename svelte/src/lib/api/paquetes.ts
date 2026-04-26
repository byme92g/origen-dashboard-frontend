import { apiGet, apiPost, apiPut, apiDelete } from './base';
import type { Paquete, PaginatedResult } from '../types';

export const paqueteApi = {
  listar: () => apiGet<Paquete[]>('/paquetes'),
  listarPaginado: (page: number, pageSize = 15) =>
    apiGet<PaginatedResult<Paquete>>(`/paquetes?page=${page}&pageSize=${pageSize}`),
  obtener: (id: number) => apiGet<Paquete>(`/paquetes/${id}`),
  crear: (data: Omit<Paquete, 'id' | 'servicios' | 'productos'> & { servicioIds: number[]; productoIds: number[] }) =>
    apiPost<Paquete>('/paquetes', data),
  actualizar: (id: number, data: Partial<Paquete> & { servicioIds?: number[]; productoIds?: number[] }) =>
    apiPut<Paquete>(`/paquetes/${id}`, data),
  eliminar: (id: number) => apiDelete(`/paquetes/${id}`),
};
