import { apiGet, apiPost, apiPut, apiDelete } from './base';
import type { Usuario, PaginatedResult } from '../types';

export const usuarioApi = {
  listar: () => apiGet<Usuario[]>('/api/usuarios'),
  listarPaginado: (page: number, pageSize = 15) =>
    apiGet<PaginatedResult<Usuario>>(`/api/usuarios?page=${page}&pageSize=${pageSize}`),
  crear: (data: { nombreCompleto: string; nombreUsuario: string; password: string; rol: string }) =>
    apiPost<Usuario>('/api/usuarios', data),
  actualizar: (id: number, data: Partial<Usuario & { password?: string }>) =>
    apiPut<Usuario>(`/api/usuarios/${id}`, data),
  eliminar: (id: number) => apiDelete(`/api/usuarios/${id}`),
};
