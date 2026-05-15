import { apiGet, apiPost, apiPut, apiDelete } from './base';
import type { Cliente, Ingreso, PaginatedResult } from '../types';

export const clienteApi = {
  listar: () => apiGet<Cliente[]>('/clientes'),
  listarPaginado: (page: number, pageSize = 15, search?: string) =>
    apiGet<PaginatedResult<Cliente>>(`/clientes?page=${page}&pageSize=${pageSize}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  obtener: (id: number) => apiGet<Cliente>(`/clientes/${id}`),
  historial: (id: number, page = 1, pageSize = 10) =>
    apiGet<PaginatedResult<Ingreso>>(`/clientes/${id}/historial?page=${page}&pageSize=${pageSize}`),
  crear: (data: Omit<Cliente, 'id' | 'fechaRegistro'>) => apiPost<Cliente>('/clientes', data),
  actualizar: (id: number, data: Partial<Cliente>) => apiPut<Cliente>(`/clientes/${id}`, data),
  eliminar: (id: number) => apiDelete(`/clientes/${id}`),
};
