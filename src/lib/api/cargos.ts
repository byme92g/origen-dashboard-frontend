import { apiGet, apiPost, apiDelete } from './base';
import type { Cargo } from '../types';

export const cargoApi = {
  listar: () => apiGet<Cargo[]>('/cargos'),
  crear: (nombre: string) => apiPost<Cargo>('/cargos', { nombre }),
  eliminar: (id: number) => apiDelete(`/cargos/${id}`),
};
