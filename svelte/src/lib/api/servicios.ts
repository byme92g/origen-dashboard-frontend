import { apiGet, apiPost, apiPut, apiDelete } from './base';
import type { Servicio, PaginatedResult } from '../types';

export const servicioApi = {
  listar: () => apiGet<Servicio[]>('/api/servicios'),
  listarPaginado: (page: number, pageSize = 15) =>
    apiGet<PaginatedResult<Servicio>>(`/api/servicios?page=${page}&pageSize=${pageSize}`),
  obtener: (id: number) => apiGet<Servicio>(`/api/servicios/${id}`),
  crear: (data: Omit<Servicio, 'id'>) => apiPost<Servicio>('/api/servicios', data),
  actualizar: (id: number, data: Partial<Servicio>) => apiPut<Servicio>(`/api/servicios/${id}`, data),
  eliminar: (id: number) => apiDelete(`/api/servicios/${id}`),
};
