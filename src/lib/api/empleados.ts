import { apiGet, apiPost, apiPut, apiDelete } from './base';
import type { Empleado, PaginatedResult } from '../types';

export const empleadoApi = {
  listar: () => apiGet<Empleado[]>('/empleados'),
  listarPaginado: (page: number, pageSize = 15) =>
    apiGet<PaginatedResult<Empleado>>(`/empleados?page=${page}&pageSize=${pageSize}`),
  obtener: (id: number) => apiGet<Empleado>(`/empleados/${id}`),
  crear: (data: Omit<Empleado, 'id'>) => apiPost<Empleado>('/empleados', data),
  actualizar: (id: number, data: Partial<Empleado>) => apiPut<Empleado>(`/empleados/${id}`, data),
  eliminar: (id: number) => apiDelete(`/empleados/${id}`),
};
