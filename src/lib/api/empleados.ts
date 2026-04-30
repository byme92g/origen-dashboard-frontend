import { apiGet, apiPost, apiPut, apiDelete } from './base';
import type { Empleado, PaginatedResult } from '../types';

type EmpleadoPayload = Partial<Empleado & { password?: string }>;

export const empleadoApi = {
  listar: () => apiGet<Empleado[]>('/empleados'),
  listarPaginado: (page: number, pageSize = 15) =>
    apiGet<PaginatedResult<Empleado>>(`/empleados?page=${page}&pageSize=${pageSize}`),
  obtener: (id: number) => apiGet<Empleado>(`/empleados/${id}`),
  crear: (data: EmpleadoPayload) => apiPost<Empleado>('/empleados', data),
  actualizar: (id: number, data: EmpleadoPayload) => apiPut<Empleado>(`/empleados/${id}`, data),
  eliminar: (id: number) => apiDelete(`/empleados/${id}`),
};
