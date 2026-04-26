import { apiGet } from './base';
import type { DashboardData, ReporteResumen } from '../types';

export const reporteApi = {
  dashboard: () => apiGet<DashboardData>('/api/reportes/dashboard'),
  resumen: (desde: string, hasta: string) =>
    apiGet<ReporteResumen>(`/api/reportes/resumen?desde=${desde}&hasta=${hasta}`),
};
