import { apiGet, apiPost, apiPut, apiDelete } from './base';
import type { Cliente, PaginatedResult } from '../types';

export const clienteApi = {
  listar: () => apiGet<Cliente[]>('/api/clientes'),
  listarPaginado: (page: number, pageSize = 15) =>
    apiGet<PaginatedResult<Cliente>>(`/api/clientes?page=${page}&pageSize=${pageSize}`),
  obtener: (id: number) => apiGet<Cliente>(`/api/clientes/${id}`),
  crear: (data: Omit<Cliente, 'id' | 'fechaRegistro'>) => apiPost<Cliente>('/api/clientes', data),
  actualizar: (id: number, data: Partial<Cliente>) => apiPut<Cliente>(`/api/clientes/${id}`, data),
  eliminar: (id: number) => apiDelete(`/api/clientes/${id}`),
};
