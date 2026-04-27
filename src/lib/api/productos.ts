import { apiGet, apiPost, apiPut, apiDelete } from './base';
import type { Producto, PaginatedResult } from '../types';

export interface CrearProductoRequest {
  nombre: string;
  categoria: string;
  precioVenta: number;
  stockInicial: number;
}

export const productoApi = {
  listar: () => apiGet<Producto[]>('/productos'),
  listarPaginado: (page: number, pageSize = 15) =>
    apiGet<PaginatedResult<Producto>>(`/productos?page=${page}&pageSize=${pageSize}`),
  obtener: (id: number) => apiGet<Producto>(`/productos/${id}`),
  crear: (data: CrearProductoRequest) => apiPost<Producto>('/productos', data),
  actualizar: (id: number, data: Partial<Producto>) => apiPut<Producto>(`/productos/${id}`, data),
  eliminar: (id: number) => apiDelete(`/productos/${id}`),
};
