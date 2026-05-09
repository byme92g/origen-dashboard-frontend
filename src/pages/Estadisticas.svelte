<script lang="ts">
  import { onMount } from 'svelte';
  import { reporteApi } from '../lib/api/reportes';
  import EChart from '../lib/components/EChart.svelte';
  import Spinner from '../lib/components/Spinner.svelte';
  import type { ReporteResumen } from '../lib/types';
  import type { EChartsOption } from 'echarts';

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
      const start = new Date(now); start.setDate(now.getDate() - 6);
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
    desde = r.desde; hasta = r.hasta;
    loading = true;
    const res = await reporteApi.resumen(desde, hasta);
    if (res.ok && res.data) data = res.data;
    loading = false;
  }

  onMount(load);

  function setPeriodo(p: Periodo) { periodo = p; if (p !== 'custom') load(); }
  function fmt(v: number) { return `S/ ${v.toFixed(2)}`; }
  function fmtK(v: number) {
    const abs = Math.abs(v);
    const prefix = v < 0 ? '-' : '';
    if (abs >= 1000) return `${prefix}S/ ${(abs / 1000).toFixed(1)}k`;
    return `${prefix}S/ ${abs.toFixed(0)}`;
  }

  $: margen = data && data.resumen.totalIngresos > 0
    ? Math.round((data.resumen.utilidadNeta / data.resumen.totalIngresos) * 100) : 0;

  const FB_COLORS = {
    ingresos: '#2e7d5a',
    egresos: '#c0392b',
    utilidad: '#1b3a60',
    utilidadNeg: '#c0392b',
    comisiones: '#d4a017',
  };

  $: finBars = data ? [
    { key: 'ingresos',  label: 'Ingresos',    value: data.resumen.totalIngresos,    sub: `${data.resumen.cantidadIngresos} txn` },
    { key: 'egresos',   label: 'Egresos',      value: data.resumen.totalEgresos,     sub: `${data.resumen.cantidadEgresos} reg` },
    { key: data.resumen.utilidadNeta >= 0 ? 'utilidad' : 'utilidadNeg', label: 'Utilidad', value: data.resumen.utilidadNeta, sub: `${margen}% margen` },
    { key: 'comisiones',label: 'Comisiones',   value: data.resumen.totalComisiones,  sub: '' },
  ] : [];

  const COLORS = ['#1b3a60', '#2e7d5a', '#d4a017', '#c0392b', '#7b5ea7', '#2196f3', '#ff7043'];

  $: donutTotal = data ? data.porMetodoPago.reduce((s, m) => s + m.total, 0) : 0;

  const tooltipMoney = (params: any) => {
    const p = Array.isArray(params) ? params[0] : params;
    return `${p.name}<br/><strong>${fmt(Number(p.value))}</strong>`;
  };

  $: financialOption = {
    color: finBars.map(b => FB_COLORS[b.key as keyof typeof FB_COLORS] ?? FB_COLORS.ingresos),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: tooltipMoney },
    grid: { left: 52, right: 16, top: 22, bottom: 44, containLabel: true },
    xAxis: {
      type: 'category',
      data: finBars.map(b => b.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#d8e0ec' } },
      axisLabel: { color: '#5a6478', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8a97b0', fontSize: 10, formatter: (v: number) => fmtK(v) },
      splitLine: { lineStyle: { color: '#eef1f6' } },
    },
    series: [{
      type: 'bar',
      data: finBars.map(b => ({
        value: b.value,
        itemStyle: { color: FB_COLORS[b.key as keyof typeof FB_COLORS] ?? FB_COLORS.ingresos, borderRadius: [6, 6, 0, 0] },
      })),
      barMaxWidth: 44,
      label: { show: true, position: 'top', color: '#1b3a60', fontSize: 10, fontWeight: 700, formatter: (p: any) => fmtK(Number(p.value)) },
    }],
  } satisfies EChartsOption;

  $: paymentOption = {
    color: COLORS,
    tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}<br/><strong>${fmt(Number(p.value))}</strong> (${p.percent}%)` },
    legend: { type: 'scroll', orient: 'vertical', right: 0, top: 'middle', itemWidth: 10, itemHeight: 10, textStyle: { color: '#5a6478', fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['50%', '72%'],
      center: ['36%', '50%'],
      avoidLabelOverlap: true,
      label: { show: false },
      emphasis: { label: { show: true, formatter: '{d}%', fontSize: 14, fontWeight: 700 } },
      data: data ? data.porMetodoPago.map(m => ({ name: m.metodo, value: m.total })) : [],
    }],
  } satisfies EChartsOption;

  $: topServicesOption = {
    color: ['#2e7d5a'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: tooltipMoney },
    grid: { left: 128, right: 28, top: 8, bottom: 16, containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: '#8a97b0', formatter: (v: number) => fmtK(v) }, splitLine: { lineStyle: { color: '#eef1f6' } } },
    yAxis: {
      type: 'category',
      data: data ? data.topServicios.map(s => s.nombre).reverse() : [],
      axisTick: { show: false },
      axisLabel: { color: '#1b3a60', fontSize: 11, width: 110, overflow: 'truncate' },
    },
    series: [{
      type: 'bar',
      barMaxWidth: 16,
      data: data ? data.topServicios.map(s => ({ value: s.total, itemStyle: { borderRadius: [0, 6, 6, 0] } })).reverse() : [],
      label: { show: true, position: 'right', color: '#1b3a60', fontSize: 10, formatter: (p: any) => fmtK(Number(p.value)) },
    }],
  } satisfies EChartsOption;

  $: employeeOption = {
    color: ['#d4a017'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: tooltipMoney },
    grid: { left: 128, right: 28, top: 8, bottom: 16, containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: '#8a97b0', formatter: (v: number) => fmtK(v) }, splitLine: { lineStyle: { color: '#eef1f6' } } },
    yAxis: {
      type: 'category',
      data: data ? data.porEmpleado.map(e => e.nombre).reverse() : [],
      axisTick: { show: false },
      axisLabel: { color: '#1b3a60', fontSize: 11, width: 110, overflow: 'truncate' },
    },
    series: [{
      type: 'bar',
      barMaxWidth: 16,
      data: data ? data.porEmpleado.map(e => ({ value: e.ventas, itemStyle: { borderRadius: [0, 6, 6, 0] } })).reverse() : [],
      label: { show: true, position: 'right', color: '#1b3a60', fontSize: 10, formatter: (p: any) => fmtK(Number(p.value)) },
    }],
  } satisfies EChartsOption;

  const periodos: { key: Periodo; label: string }[] = [
    { key: 'semana',    label: '7 días' },
    { key: 'mes',       label: 'Mes' },
    { key: 'trimestre', label: 'Trimestre' },
    { key: 'anio',      label: 'Año' },
    { key: 'custom',    label: 'Rango' },
  ];
</script>

<div class="p-3 p-md-4">
  <div class="page-panel mb-4">
    <div class="page-panel__top">
      <div class="d-flex align-items-center gap-3">
        <div class="page-panel__icon"><i class="bi bi-bar-chart-line"></i></div>
        <div>
          <h5 class="fw-bold mb-0">Estadísticas</h5>
          <p class="text-muted small mb-0">Análisis visual del período seleccionado</p>
        </div>
      </div>
      <button class="btn btn-outline-secondary btn-sm" on:click={load}>
        {#if loading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}Actualizar
      </button>
    </div>
    <div class="page-panel__filters">
      <div class="btn-group btn-group-sm">
        {#each periodos as p}
          <button class="btn btn-outline-secondary" class:active={periodo === p.key} on:click={() => setPeriodo(p.key)}>{p.label}</button>
        {/each}
      </div>
      <i class="bi bi-calendar3 page-panel__filter-cal-icon"></i>
      <div><label class="page-panel__filter-label">Desde</label><input type="date" class="form-control form-control-sm page-panel__filter-date" bind:value={desde} disabled={periodo !== 'custom'} /></div>
      <span class="page-panel__filter-sep">→</span>
      <div><label class="page-panel__filter-label">Hasta</label><input type="date" class="form-control form-control-sm page-panel__filter-date" bind:value={hasta} disabled={periodo !== 'custom'} /></div>
      <button class="btn btn-sm btn-primary" on:click={load} disabled={loading || periodo !== 'custom'}>Aplicar</button>
    </div>
  </div>

  {#if loading && !data}
    <Spinner />
  {:else if data}

    <div class="charts-grid">

      <!-- ── Resumen financiero ── -->
      <section class="chart-card">
        <div class="chart-card-header">
          <span class="chart-title">Resumen financiero</span>
          <span class="chart-period">{data.periodo.desde.slice(0,10)} → {data.periodo.hasta.slice(0,10)}</span>
        </div>
        <div class="chart-card-body chart-body-tight">
          <EChart option={financialOption} height="260px" />
          <div class="metric-strip">
            {#each finBars as b}
              <div class="metric-pill">
                <span>{b.label}</span>
                <strong>{fmt(b.value)}</strong>
                {#if b.sub}<small>{b.sub}</small>{/if}
              </div>
            {/each}
          </div>
        </div>
      </section>

      <!-- ── Métodos de pago — SVG donut ── -->
      <section class="chart-card">
        <div class="chart-card-header">
          <span class="chart-title">Métodos de pago</span>
          <span class="chart-period">{fmt(donutTotal)} total</span>
        </div>
        <div class="chart-card-body chart-body-tight">
          {#if data.porMetodoPago.length === 0}
            <p class="no-data">Sin pagos registrados</p>
          {:else}
            <EChart option={paymentOption} height="260px" />
          {/if}
        </div>
      </section>

      <!-- ── Top servicios — horizontal bar chart ── -->
      <section class="chart-card chart-wide">
        <div class="chart-card-header">
          <span class="chart-title">Top servicios por ingresos</span>
          <span class="chart-period">{data.topServicios.length} servicios en el período</span>
        </div>
        <div class="chart-card-body chart-body-tight">
          {#if data.topServicios.length === 0}
            <p class="no-data">Sin servicios en el período</p>
          {:else}
            <EChart option={topServicesOption} height="{Math.max(240, data.topServicios.length * 42)}px" />
          {/if}
        </div>
      </section>

      <!-- ── Desempeño por empleado ── -->
      <section class="chart-card chart-wide">
        <div class="chart-card-header">
          <span class="chart-title">Desempeño por empleado</span>
          <span class="chart-period">{data.porEmpleado.length} colaboradores activos</span>
        </div>
        <div class="chart-card-body chart-body-tight">
          {#if data.porEmpleado.length === 0}
            <p class="no-data">Sin empleados en el período</p>
          {:else}
            <EChart option={employeeOption} height="{Math.max(240, data.porEmpleado.length * 42)}px" />
          {/if}
        </div>
      </section>

    </div>
  {:else}
    <p class="text-muted">No se pudieron cargar las estadísticas.</p>
  {/if}
</div>

<style>
  /* ── Charts grid ── */
  .charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .chart-wide { grid-column: 1 / -1; }
  .chart-card {
    background: white; border-radius: 10px;
    box-shadow: 0 2px 8px rgba(27,58,96,.08); overflow: hidden;
  }
  .chart-card-header {
    display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
    padding: 14px 20px 12px; border-bottom: 1px solid #f0f4f8;
  }
  .chart-title { font-size: 13px; font-weight: 700; color: #1b3a60; }
  .chart-period { font-size: 11px; color: #8a97b0; white-space: nowrap; }
  .chart-card-body { padding: 16px 20px; }
  .chart-body-tight { min-width: 0; overflow: hidden; }
  .no-data { text-align: center; color: #8a97b0; font-size: 13px; margin: 20px 0; }

  .metric-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    border-top: 1px solid #f0f4f8;
    padding-top: 10px;
  }
  .metric-pill {
    min-width: 0;
    border: 1px solid #edf1f6;
    border-radius: 8px;
    padding: 8px 10px;
    background: #fafbfd;
  }
  .metric-pill span,
  .metric-pill small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .metric-pill span { font-size: 10px; color: #8a97b0; font-weight: 700; text-transform: uppercase; }
  .metric-pill strong { display: block; font-size: 12px; color: #1b3a60; margin-top: 2px; }
  .metric-pill small { font-size: 10px; color: #8a97b0; margin-top: 1px; }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .charts-grid { grid-template-columns: 1fr; }
    .metric-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
</style>
