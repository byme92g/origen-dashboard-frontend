import { apiGet, apiPost, apiPut, apiDelete } from './base';
import type { Cliente, PaginatedResult } from '../types';

export const clienteApi = {
  listar: () => apiGet<Cliente[]>('/clientes'),
  listarPaginado: (page: number, pageSize = 15) =>
    apiGet<PaginatedResult<Cliente>>(`/clientes?page=${page}&pageSize=${pageSize}`),
  obtener: (id: number) => apiGet<Cliente>(`/clientes/${id}`),
  crear: (data: Omit<Cliente, 'id' | 'fechaRegistro'>) => apiPost<Cliente>('/clientes', data),
  actualizar: (id: number, data: Partial<Cliente>) => apiPut<Cliente>(`/clientes/${id}`, data),
  eliminar: (id: number) => apiDelete(`/clientes/${id}`),
};
