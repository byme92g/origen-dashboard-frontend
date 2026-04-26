<script lang="ts">
  import { onMount } from 'svelte';
  import { reporteApi } from '../lib/api/reportes';
  import Spinner from '../lib/components/Spinner.svelte';
  import type { ReporteResumen } from '../lib/types';

  type Periodo = 'semana' | 'mes' | 'trimestre' | 'anio' | 'custom';

  let periodo: Periodo = 'mes';
  let desde = '';
  let hasta = '';
  let data: ReporteResumen | null = null;
  let loading = true;

  function fmtDate(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function range(p: Periodo) {
    const now = new Date();
    if (p === 'semana') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return { desde: fmtDate(start), hasta: fmtDate(now) };
    }
    if (p === 'trimestre') {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { desde: fmtDate(start), hasta: fmtDate(now) };
    }
    if (p === 'anio') return { desde: `${now.getFullYear()}-01-01`, hasta: fmtDate(now) };
    if (p === 'custom') return { desde, hasta };
    return { desde: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, hasta: fmtDate(now) };
  }

  async function load() {
    const r = range(periodo);
    if (!r.desde || !r.hasta) return;
    desde = r.desde;
    hasta = r.hasta;
    loading = true;
    const res = await reporteApi.resumen(desde, hasta);
    if (res.ok && res.data) data = res.data;
    loading = false;
  }

  onMount(load);

  function setPeriodo(p: Periodo) {
    periodo = p;
    if (p !== 'custom') load();
  }

  function fmt(v: number) { return `S/ ${v.toFixed(2)}`; }
  function pct(value: number, max: number) { return max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0; }

  $: margen = data && data.resumen.totalIngresos > 0
    ? Math.round((data.resumen.utilidadNeta / data.resumen.totalIngresos) * 100)
    : 0;
  $: maxServicio = data ? Math.max(0, ...data.topServicios.map((s) => s.total)) : 0;
  $: maxEmpleado = data ? Math.max(0, ...data.porEmpleado.map((e) => e.ventas)) : 0;
  $: maxMetodo = data ? Math.max(0, ...data.porMetodoPago.map((m) => m.total)) : 0;

  const periodos: { key: Periodo; label: string }[] = [
    { key: 'semana', label: '7 días' },
    { key: 'mes', label: 'Mes' },
    { key: 'trimestre', label: 'Trimestre' },
    { key: 'anio', label: 'Año' },
    { key: 'custom', label: 'Rango' },
  ];
</script>

<div class="p-3 p-md-4">
  <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
    <div>
      <h5 class="fw-bold mb-0">Estadísticas</h5>
      <p class="text-muted small mb-0">Lectura visual de ventas, utilidad, métodos de pago y desempeño</p>
    </div>
    <button class="btn btn-outline-secondary btn-sm" on:click={load}>Actualizar</button>
  </div>

  <div class="stats-toolbar mb-4">
    <div class="btn-group btn-group-sm">
      {#each periodos as p}
        <button class="btn btn-outline-secondary" class:active={periodo === p.key} on:click={() => setPeriodo(p.key)}>{p.label}</button>
      {/each}
    </div>
    <input type="date" class="form-control form-control-sm stats-date" bind:value={desde} disabled={periodo !== 'custom'} />
    <input type="date" class="form-control form-control-sm stats-date" bind:value={hasta} disabled={periodo !== 'custom'} />
    <button class="btn btn-primary btn-sm" on:click={load}>Aplicar</button>
  </div>

  {#if loading && !data}
    <Spinner />
  {:else if data}
    <div class="kpi-grid mb-4">
      <div class="kpi-card green"><div><div class="kpi-label">Ingresos</div><div class="kpi-value">{fmt(data.resumen.totalIngresos)}</div></div></div>
      <div class="kpi-card red"><div><div class="kpi-label">Egresos</div><div class="kpi-value">{fmt(data.resumen.totalEgresos)}</div></div></div>
      <div class="kpi-card {data.resumen.utilidadNeta >= 0 ? 'green' : 'red'}"><div><div class="kpi-label">Utilidad neta</div><div class="kpi-value">{fmt(data.resumen.utilidadNeta)}</div></div></div>
      <div class="kpi-card gold"><div><div class="kpi-label">Margen</div><div class="kpi-value">{margen}%</div></div></div>
    </div>

    <div class="stats-grid">
      <section class="card border-0 shadow-sm">
        <div class="card-header-origen"><span class="card-title">Top servicios</span></div>
        <div class="card-body">
          {#each data.topServicios as s, i}
            <div class="chart-row">
              <div class="chart-head"><span>{i + 1}. {s.nombre}</span><strong>{fmt(s.total)}</strong></div>
              <div class="chart-track"><div class="chart-bar green" style="width:{pct(s.total, maxServicio)}%"></div></div>
              <div class="chart-meta">{s.cantidad} servicios</div>
            </div>
          {:else}
            <p class="text-muted small text-center mb-0">Sin servicios en el período</p>
          {/each}
        </div>
      </section>

      <section class="card border-0 shadow-sm">
        <div class="card-header-origen"><span class="card-title">Métodos de pago</span></div>
        <div class="card-body">
          {#each data.porMetodoPago as m}
            <div class="chart-row">
              <div class="chart-head"><span class="text-capitalize">{m.metodo}</span><strong>{fmt(m.total)}</strong></div>
              <div class="chart-track"><div class="chart-bar navy" style="width:{pct(m.total, maxMetodo)}%"></div></div>
            </div>
          {:else}
            <p class="text-muted small text-center mb-0">Sin pagos registrados</p>
          {/each}
        </div>
      </section>

      <section class="card border-0 shadow-sm stats-wide">
        <div class="card-header-origen"><span class="card-title">Desempeño por empleado</span></div>
        <div class="card-body">
          {#each data.porEmpleado as e}
            <div class="employee-row">
              <div>
                <div class="fw-semibold small">{e.nombre}</div>
                <div class="text-muted" style="font-size:11px;">{e.servicios} servicios · comisión {fmt(e.comision)}</div>
              </div>
              <div class="employee-bar"><div style="width:{pct(e.ventas, maxEmpleado)}%"></div></div>
              <strong class="small">{fmt(e.ventas)}</strong>
            </div>
          {:else}
            <p class="text-muted small text-center mb-0">Sin empleados en el período</p>
          {/each}
        </div>
      </section>
    </div>
  {:else}
    <p class="text-muted">No se pudieron cargar las estadísticas.</p>
  {/if}
</div>

<style>
  .stats-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .stats-date { width: 150px; }
  .stats-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .stats-wide { grid-column: 1 / -1; }
  .chart-row { margin-bottom: 16px; }
  .chart-row:last-child { margin-bottom: 0; }
  .chart-head { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; margin-bottom: 6px; }
  .chart-head span { color: #1a1a2e; font-weight: 600; }
  .chart-head strong { white-space: nowrap; color: #1b3a60; }
  .chart-track { height: 8px; background: #eef1f6; border-radius: 8px; overflow: hidden; }
  .chart-bar { height: 100%; border-radius: 8px; transition: width .2s; }
  .chart-bar.green { background: #2e7d5a; }
  .chart-bar.navy { background: var(--navy); }
  .chart-meta { margin-top: 4px; color: #8a97b0; font-size: 11px; }
  .employee-row { display: grid; grid-template-columns: minmax(130px, 1fr) 2fr auto; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #eef1f6; }
  .employee-row:last-child { border-bottom: 0; }
  .employee-bar { height: 8px; background: #eef1f6; border-radius: 8px; overflow: hidden; }
  .employee-bar div { height: 100%; background: var(--gold); border-radius: 8px; }
  @media (max-width: 768px) {
    .stats-grid { grid-template-columns: 1fr; }
    .employee-row { grid-template-columns: 1fr; gap: 6px; }
  }
</style>
