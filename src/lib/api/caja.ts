import { apiGet, apiPost } from './base';

export interface CajaResponsable {
  empleadoId: number;
  empleado?: { id: number; nombre: string; cargo?: string } | null;
}

export interface CajaApertura {
  id: number;
  abiertaEn: string;
  montoInicial: number;
  responsables: CajaResponsable[];
  cerradaEn: string | null;
  totalIngresos: number | null;
  totalEgresos: number | null;
  saldoFinal: number | null;
  observaciones: string | null;
}

export interface CajaEstadoResponse {
  apertura: CajaApertura | null;
  montoInicial: number;
  totalIngresos: number;
  totalEgresos: number;
  saldoActual: number;
  abierta: boolean;
}

export interface CajaMovimiento {
  id: number;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  concepto: string;
  monto: number;
  detalle?: string;
}

export function getResponsablesStr(responsables: CajaResponsable[] | null | undefined): string {
  if (!responsables?.length) return '';
  return responsables
    .map(r => r.empleado?.nombre ?? `Emp #${r.empleadoId}`)
    .join(', ');
}

export const cajaApi = {
  estado: () => apiGet<CajaEstadoResponse>('/caja/estado'),

  historial: (page = 1, pageSize = 20, filters?: { desde?: string; hasta?: string; empleadoId?: number }) => {
    const p = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters?.desde) p.set('desde', filters.desde);
    if (filters?.hasta) p.set('hasta', filters.hasta);
    if (filters?.empleadoId != null) p.set('empleadoId', String(filters.empleadoId));
    return apiGet<{ items: CajaApertura[]; total: number; page: number; pageSize: number }>(
      `/caja/historial?${p}`
    );
  },

  movimientos: (id: number) =>
    apiGet<CajaMovimiento[]>(`/caja/${id}/movimientos`),

  abrir: (montoInicial: number, responsableIds: number[]) =>
    apiPost<CajaApertura>('/caja/abrir', { montoInicial, responsableIds }),

  cerrar: (id: number, totalIngresos: number, totalEgresos: number, saldoFinal: number, observaciones?: string) =>
    apiPost<void>(`/caja/cerrar/${id}`, { totalIngresos, totalEgresos, saldoFinal, observaciones }),
};
