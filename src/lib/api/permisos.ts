import { apiGet, apiPut } from './base';
import type { ApiResponse } from '../types';

export interface PermisoVista {
  id: number;
  rol: string;
  ruta: string;
  habilitado: boolean;
}

export const permisoApi = {
  misVistas: (): Promise<ApiResponse<string[]>> =>
    apiGet<string[]>('/permisos/mis-vistas'),

  listar: (): Promise<ApiResponse<PermisoVista[]>> =>
    apiGet<PermisoVista[]>('/permisos'),

  actualizar: (rol: string, ruta: string, habilitado: boolean): Promise<ApiResponse<void>> =>
    apiPut<void>(`/permisos/${rol}/${ruta.replace(/^\//, '')}`, { habilitado }),
};
