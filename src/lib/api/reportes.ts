import { apiDownload, apiGet } from './base';
import type { DashboardData, ReporteResumen } from '../types';

export const reporteApi = {
  dashboard: async () => {
    const res = await apiGet<any>('/reportes/dashboard');
    if (res.ok && res.data) {
      res.data.ultimasTransacciones = (res.data.ultimasTransacciones ?? []).map((t: any) => ({
        ...t,
        clienteNombre: t.clienteNombre ?? t.cliente,
      }));
    }
    return res as { ok: boolean; data?: DashboardData; error?: string };
  },
  resumen: async (desde: string, hasta: string) => {
    const res = await apiGet<any>(`/reportes/resumen?desde=${desde}&hasta=${hasta}`);
    if (res.ok && res.data) {
      res.data.topServicios = (res.data.topServicios ?? []).map((s: any) => ({
        nombre: s.nombre ?? s.servicio ?? 'Sin nombre',
        cantidad: s.cantidad ?? 0,
        total: s.total ?? 0,
      }));
      res.data.porEmpleado = (res.data.porEmpleado ?? []).map((e: any) => ({
        nombre: e.nombre ?? e.empleado ?? 'Sin empleado',
        servicios: e.servicios ?? 0,
        ventas: e.ventas ?? e.totalVentas ?? 0,
        comision: e.comision ?? e.totalComision ?? 0,
      }));
    }
    return res as { ok: boolean; data?: ReporteResumen; error?: string };
  },
  exportarCsv: async (desde: string, hasta: string) =>
    apiDownload(`/reportes/exportar/csv?desde=${desde}&hasta=${hasta}`),
  exportarPdf: async (desde: string, hasta: string) =>
    apiDownload(`/reportes/exportar/pdf?desde=${desde}&hasta=${hasta}`),
};
