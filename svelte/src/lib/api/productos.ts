import { apiGet, apiPost, apiPut, apiDelete } from './base';
import type { Producto, PaginatedResult } from '../types';

export interface CrearProductoRequest {
  nombre: string;
  categoria: string;
  precioVenta: number;
  stockInicial: number;
}

export const productoApi = {
  listar: () => apiGet<Producto[]>('/api/productos'),
  listarPaginado: (page: number, pageSize = 15) =>
    apiGet<PaginatedResult<Producto>>(`/api/productos?page=${page}&pageSize=${pageSize}`),
  obtener: (id: number) => apiGet<Producto>(`/api/productos/${id}`),
  crear: (data: CrearProductoRequest) => apiPost<Producto>('/api/productos', data),
  actualizar: (id: number, data: Partial<Producto>) => apiPut<Producto>(`/api/productos/${id}`, data),
  eliminar: (id: number) => apiDelete(`/api/productos/${id}`),
};
