<script lang="ts">
  import { onMount } from 'svelte';
  import { reporteApi } from '../lib/api/reportes';
  import Spinner from '../lib/components/Spinner.svelte';
  import type { ReporteResumen } from '../lib/types';

  type Periodo = 'hoy' | 'semana' | 'mes' | 'mes_ant' | 'año' | 'custom';

  let periodo: Periodo = 'mes';
  let desde = ''; let hasta = '';
  let data: ReporteResumen | null = null;
  let loading = false;

  function getDates(p: Periodo): { desde: string; hasta: string } {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const today = fmt(now);
    if (p === 'hoy') return { desde: today, hasta: today };
    if (p === 'semana') {
      const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1);
      return { desde: fmt(mon), hasta: today };
    }
    if (p === 'mes') return { desde: `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`, hasta: today };
    if (p === 'mes_ant') {
      const first = new Date(now.getFullYear(), now.getMonth()-1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { desde: fmt(first), hasta: fmt(last) };
    }
    if (p === 'año') return { desde: `${now.getFullYear()}-01-01`, hasta: today };
    return { desde, hasta };
  }

  async function load() {
    const dates = getDates(periodo);
    if (!dates.desde || !dates.hasta) return;
    desde = dates.desde; hasta = dates.hasta;
    loading = true;
    const res = await reporteApi.resumen(desde, hasta);
    if (res.ok && res.data) data = res.data;
    loading = false;
  }

  onMount(load);

  function setPeriodo(p: Periodo) { periodo = p; if (p !== 'custom') load(); }

  function fmt(v: number) { return `S/ ${v.toFixed(2)}`; }

  function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportar(tipo: 'csv' | 'pdf') {
    const dates = getDates(periodo);
    if (!dates.desde || !dates.hasta) return;
    const res = tipo === 'csv'
      ? await reporteApi.exportarCsv(dates.desde, dates.hasta)
      : await reporteApi.exportarPdf(dates.desde, dates.hasta);
    if (res.ok && res.blob) {
      saveBlob(res.blob, res.filename ?? `reporte-origen-${dates.desde}-${dates.hasta}.${tipo}`);
    }
  }

  const PERIODOS: { key: Periodo; label: string }[] = [
    { key: 'hoy',     label: 'Hoy' },
    { key: 'semana',  label: 'Esta semana' },
    { key: 'mes',     label: 'Este mes' },
    { key: 'mes_ant', label: 'Mes anterior' },
    { key: 'año',     label: 'Este año' },
    { key: 'custom',  label: 'Personalizado' },
  ];
</script>

<div class="p-3 p-md-4">

  <!-- Toolbar de período -->
  <div class="report-toolbar mb-4">
    <div class="report-toolbar-row mb-2">
      <span class="report-date-label me-1">Período:</span>
      {#each PERIODOS as p}
        <button class="rango-btn" class:active={periodo === p.key} on:click={() => setPeriodo(p.key)}>{p.label}</button>
      {/each}
    </div>
    <div class="report-toolbar-row">
      <span class="report-date-label">Desde:</span>
      <input type="date" class="report-date-input" bind:value={desde} />
      <span class="report-date-label ms-2">Hasta:</span>
      <input type="date" class="report-date-input" bind:value={hasta} />
      <div class="report-toolbar-divider"></div>
      <button class="btn btn-primary btn-sm" on:click={load}>Aplicar rango</button>
      <button class="btn btn-outline-primary btn-sm" on:click={() => exportar('csv')}>Exportar CSV</button>
      <button class="btn btn-outline-primary btn-sm" on:click={() => exportar('pdf')}>Exportar PDF</button>
      {#if loading}<span class="text-muted ms-2" style="font-size:12px;">Cargando...</span>{/if}
    </div>
  </div>

  {#if loading && !data}
    <Spinner />
  {:else if data}
    <!-- KPI Cards -->
    <div class="kpi-grid mb-4">
      <div class="kpi-card green">
        <div class="kpi-icon">
          <i class="bi bi-arrow-down-circle"></i>
        </div>
        <div>
          <div class="kpi-label">Total ingresos</div>
          <div class="kpi-value">{fmt(data.resumen.totalIngresos)}</div>
          <div style="font-size:11px;color:#8a97b0;">{data.resumen.cantidadIngresos} transacciones</div>
        </div>
      </div>
      <div class="kpi-card red">
        <div class="kpi-icon">
          <i class="bi bi-arrow-up-circle"></i>
        </div>
        <div>
          <div class="kpi-label">Total egresos</div>
          <div class="kpi-value">{fmt(data.resumen.totalEgresos)}</div>
          <div style="font-size:11px;color:#8a97b0;">{data.resumen.cantidadEgresos} transacciones</div>
        </div>
      </div>
      <div class="kpi-card {data.resumen.utilidadNeta >= 0 ? 'green' : 'red'}">
        <div class="kpi-icon">
          <i class="bi bi-graph-up-arrow"></i>
        </div>
        <div>
          <div class="kpi-label">Utilidad neta</div>
          <div class="kpi-value">{fmt(data.resumen.utilidadNeta)}</div>
        </div>
      </div>
      <div class="kpi-card gold">
        <div class="kpi-icon">
          <i class="bi bi-person-vcard"></i>
        </div>
        <div>
          <div class="kpi-label">Comisiones</div>
          <div class="kpi-value">{fmt(data.resumen.totalComisiones)}</div>
        </div>
      </div>
    </div>

    <!-- Tablas -->
    <div class="two-col-grid">
      <!-- Top servicios -->
      <div class="card border-0 shadow-sm">
        <div class="card-header-origen"><span class="card-title">Top servicios</span></div>
        <div class="table-responsive">
          <table class="table table-sm table-origen mb-0">
            <thead class="table-origen">
              <tr><th class="ps-3">#</th><th>Servicio</th><th>Cantidad</th><th class="pe-3 text-end">Total</th></tr>
            </thead>
            <tbody>
              {#each data.topServicios as s, i}
                <tr>
                  <td class="ps-3 small text-muted">{i + 1}</td>
                  <td class="small fw-semibold">{s.nombre}</td>
                  <td class="small">{s.cantidad}</td>
                  <td class="pe-3 text-end small" style="color:#2e7d5a;font-weight:600;">{fmt(s.total)}</td>
                </tr>
              {:else}
                <tr><td colspan="4" class="text-center text-muted py-3 small">Sin datos</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Por empleado -->
      <div class="card border-0 shadow-sm">
        <div class="card-header-origen"><span class="card-title">Por empleado</span></div>
        <div class="table-responsive">
          <table class="table table-sm table-origen mb-0">
            <thead class="table-origen">
              <tr><th class="ps-3">Empleado</th><th>Servicios</th><th>Ventas</th><th class="pe-3 text-end">Comisión</th></tr>
            </thead>
            <tbody>
              {#each data.porEmpleado as e}
                <tr>
                  <td class="ps-3 small fw-semibold">{e.nombre}</td>
                  <td class="small">{e.servicios}</td>
                  <td class="small">{fmt(e.ventas)}</td>
                  <td class="pe-3 text-end small" style="color:var(--gold);font-weight:600;">{fmt(e.comision)}</td>
                </tr>
              {:else}
                <tr><td colspan="4" class="text-center text-muted py-3 small">Sin datos</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Por método de pago -->
      <div class="card border-0 shadow-sm" style="grid-column: 1 / -1;">
        <div class="card-header-origen"><span class="card-title">Por método de pago</span></div>
        <div class="card-body">
          {#each data.porMetodoPago as m}
            {@const pct = data.resumen.totalIngresos > 0 ? Math.round(m.total / data.resumen.totalIngresos * 100) : 0}
            <div class="mb-3">
              <div class="d-flex justify-content-between small mb-1">
                <span style="text-transform:capitalize;">{m.metodo}</span>
                <span class="fw-semibold">{fmt(m.total)} <span class="text-muted">({pct}%)</span></span>
              </div>
              <div style="background:#eef1f6;border-radius:4px;height:6px;">
                <div style="background:var(--navy);height:6px;border-radius:4px;width:{pct}%;transition:width .3s;"></div>
              </div>
            </div>
          {:else}
            <p class="text-muted small text-center py-2 mb-0">Sin datos</p>
          {/each}
        </div>
      </div>
    </div>
  {:else if !loading}
    <p class="text-muted">No se pudieron cargar los datos.</p>
  {/if}
</div>

<style>
.report-toolbar {
  background: white; border-radius: 8px;
  box-shadow: 0 2px 8px rgba(27,58,96,.08);
  padding: 16px 20px;
}
.report-toolbar-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.report-toolbar-divider { width: 1px; height: 24px; background: #e0e6f0; margin: 0 4px; flex-shrink: 0; }
.report-date-label { font-size: 11px; font-weight: 600; color: #8a97b0; text-transform: uppercase; letter-spacing: .05em; white-space: nowrap; }
.report-date-input {
  border: 1.5px solid #d0d8e8; border-radius: 6px; padding: 6px 10px;
  font-size: 13px; color: #1b3a60; outline: none; font-family: inherit;
}
.report-date-input:focus { border-color: #1b3a60; }
.rango-btn {
  padding: 6px 16px; border: 1.5px solid #d0d8e8; border-radius: 20px;
  background: white; cursor: pointer; font-size: 12px; font-weight: 600;
  color: #5a6478; transition: all .15s; white-space: nowrap; font-family: inherit;
}
.rango-btn:hover { border-color: #1b3a60; color: #1b3a60; background: #f0f4ff; }
.rango-btn.active { border-color: #1b3a60; background: #1b3a60; color: white; }
</style>
