import { apiGet, apiPost, apiPut, apiDelete } from './base';
import type { Campana } from '../types';

export interface CrearCampanaRequest {
  titulo: string;
  descripcion?: string;
  tipo: 'servicio' | 'producto' | 'paquete';
  servicioId?: number;
  productoId?: number;
  paqueteId?: number;
  fechaInicio: string;
  fechaFin: string;
}

export interface ActualizarCampanaRequest extends CrearCampanaRequest {
  activo: boolean;
}

export const campanaApi = {
  listar: () => apiGet<Campana[]>('/campanas'),
  activas: () => apiGet<Campana[]>('/campanas/activas'),
  obtener: (id: number) => apiGet<Campana>(`/campanas/${id}`),
  crear: (data: CrearCampanaRequest) => apiPost<Campana>('/campanas', data),
  actualizar: (id: number, data: ActualizarCampanaRequest) => apiPut<Campana>(`/campanas/${id}`, data),
  eliminar: (id: number) => apiDelete(`/campanas/${id}`),
};
