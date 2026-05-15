import { apiGet, apiDownload } from './base';

export interface ConsultaResultado {
  columnas: string[];
  filas: string[][];
}

export const consultaApi = {
  ejecutar: (tipo: string, desde?: string, hasta?: string, limite?: number) => {
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    if (limite) params.set('limite', String(limite));
    return apiGet<ConsultaResultado>(`/consultas/${tipo}?${params}`);
  },

  exportarCsv: (tipo: string, columnas: string[], filas: string[][]): void => {
    const header = columnas.join(',');
    const rows = filas.map(f => f.map(v => `"${v.replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...rows].join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consulta-${tipo}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
