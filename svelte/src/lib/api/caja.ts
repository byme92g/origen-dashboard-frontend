import { apiGet, apiPost } from './base';

export interface CajaApertura {
  id: number;
  abiertaEn: string;
  montoInicial: number;
  responsables: string | null;
  cerradaEn: string | null;
  totalIngresos: number | null;
  totalEgresos: number | null;
  saldoFinal: number | null;
  observaciones: string | null;
}

export const cajaApi = {
  estado: () => apiGet<CajaApertura | null>('/api/caja/estado'),

  historial: (page = 1, pageSize = 20) =>
    apiGet<{ items: CajaApertura[]; total: number; page: number; pageSize: number }>(
      `/api/caja/historial?page=${page}&pageSize=${pageSize}`
    ),

  abrir: (montoInicial: number, responsables: string | null) =>
    apiPost<CajaApertura>('/api/caja/abrir', { montoInicial, responsables }),

  cerrar: (id: number, totalIngresos: number, totalEgresos: number, saldoFinal: number, observaciones?: string) =>
    apiPost<void>(`/api/caja/cerrar/${id}`, { totalIngresos, totalEgresos, saldoFinal, observaciones }),
};
