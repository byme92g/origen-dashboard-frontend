import { apiGet, apiPost, apiPut, apiDelete } from './base';
import type { Empleado, PaginatedResult } from '../types';

export const empleadoApi = {
  listar: () => apiGet<Empleado[]>('/api/empleados'),
  listarPaginado: (page: number, pageSize = 15) =>
    apiGet<PaginatedResult<Empleado>>(`/api/empleados?page=${page}&pageSize=${pageSize}`),
  obtener: (id: number) => apiGet<Empleado>(`/api/empleados/${id}`),
  crear: (data: Omit<Empleado, 'id'>) => apiPost<Empleado>('/api/empleados', data),
  actualizar: (id: number, data: Partial<Empleado>) => apiPut<Empleado>(`/api/empleados/${id}`, data),
  eliminar: (id: number) => apiDelete(`/api/empleados/${id}`),
};
