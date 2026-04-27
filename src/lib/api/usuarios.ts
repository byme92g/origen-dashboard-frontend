import { apiGet, apiPost, apiPut, apiDelete } from './base';
import type { Usuario, PaginatedResult } from '../types';

export const usuarioApi = {
  listar: () => apiGet<Usuario[]>('/usuarios'),
  listarPaginado: (page: number, pageSize = 15) =>
    apiGet<PaginatedResult<Usuario>>(`/usuarios?page=${page}&pageSize=${pageSize}`),
  crear: (data: { nombreCompleto: string; nombreUsuario: string; password: string; rol: string }) =>
    apiPost<Usuario>('/usuarios', data),
  actualizar: (id: number, data: Partial<Usuario & { password?: string }>) =>
    apiPut<Usuario>(`/usuarios/${id}`, data),
  eliminar: (id: number) => apiDelete(`/usuarios/${id}`),
};
