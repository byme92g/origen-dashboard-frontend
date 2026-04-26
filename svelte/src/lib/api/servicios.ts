import { apiGet, apiPost, apiPut, apiDelete } from './base';
import type { Servicio, PaginatedResult } from '../types';

export const servicioApi = {
  listar: () => apiGet<Servicio[]>('/servicios'),
  listarPaginado: (page: number, pageSize = 15) =>
    apiGet<PaginatedResult<Servicio>>(`/servicios?page=${page}&pageSize=${pageSize}`),
  obtener: (id: number) => apiGet<Servicio>(`/servicios/${id}`),
  crear: (data: Omit<Servicio, 'id'>) => apiPost<Servicio>('/servicios', data),
  actualizar: (id: number, data: Partial<Servicio>) => apiPut<Servicio>(`/servicios/${id}`, data),
  eliminar: (id: number) => apiDelete(`/servicios/${id}`),
};
