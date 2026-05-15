<script lang="ts">
  import '../styles/pages/_estadisticas.css';
  import { onMount } from 'svelte';
  import { reporteApi } from '../lib/api/reportes';
  import EChart from '../lib/components/EChart.svelte';
  import Spinner from '../lib/components/Spinner.svelte';
  import type { ReporteResumen } from '../lib/types';
  import type { EChartsOption } from 'echarts';
  import { limaTodayStr, limaDaysAgoStr } from '../lib/utils/date';

  type Periodo = 'semana' | 'mes' | 'trimestre' | 'anio' | 'custom';

  let periodo: Periodo = 'mes';
  let desde = '';
  let hasta = '';
  let data: ReporteResumen | null = null;
  let loading = true;

  function range(p: Periodo) {
    const today = limaTodayStr();
    const [y, m] = today.split('-').map(Number);
    if (p === 'semana') return { desde: limaDaysAgoStr(6), hasta: today };
    if (p === 'trimestre') {
      const pm2 = m - 2 <= 0 ? m + 10 : m - 2;
      const py2 = m - 2 <= 0 ? y - 1 : y;
      return { desde: `${py2}-${String(pm2).padStart(2, '0')}-01`, hasta: today };
    }
    if (p === 'anio') return { desde: `${y}-01-01`, hasta: today };
    if (p === 'custom') return { desde, hasta };
    return { desde: `${y}-${String(m).padStart(2, '0')}-01`, hasta: today };
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
    grid: { left: 52, right: 16, top: 32, bottom: 44, containLabel: true },
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
        itemStyle: { color: FB_COLORS[b.key as keyof typeof FB_COLORS] ?? FB_COLORS.ingresos, borderRadius: b.value >= 0 ? [6, 6, 0, 0] : [0, 0, 6, 6] },
        label: { show: true, position: b.value < 0 ? 'bottom' : 'top', color: '#1b3a60', fontSize: 10, fontWeight: 700, formatter: (p: any) => fmtK(Number(p.value)) },
      })),
      barMaxWidth: 44,
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
    grid: { left: 128, right: 52, top: 8, bottom: 16, containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: '#8a97b0', formatter: (v: number) => fmtK(v), hideOverlap: true }, splitLine: { lineStyle: { color: '#eef1f6' } } },
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
    grid: { left: 128, right: 52, top: 8, bottom: 16, containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: '#8a97b0', formatter: (v: number) => fmtK(v), hideOverlap: true }, splitLine: { lineStyle: { color: '#eef1f6' } } },
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

<div class="p-2 p-md-4">
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
      <div><label class="page-panel__filter-label" for="est-desde">Desde</label><input type="date" id="est-desde" class="form-control form-control-sm page-panel__filter-date" bind:value={desde} disabled={periodo !== 'custom'} /></div>
      <span class="page-panel__filter-sep">→</span>
      <div><label class="page-panel__filter-label" for="est-hasta">Hasta</label><input type="date" id="est-hasta" class="form-control form-control-sm page-panel__filter-date" bind:value={hasta} disabled={periodo !== 'custom'} /></div>
      <button class="btn btn-sm btn-primary" on:click={load} disabled={loading || periodo !== 'custom'}>Aplicar</button>
    </div>
  </div>

  {#if loading && !data}
    <Spinner />
  {:else if data}

    <div class="charts-grid">

      <!-- ── Resumen financiero ── -->
      <section class="charts-grid__card">
        <div class="charts-grid__card-header">
          <span class="charts-grid__card-title">Resumen financiero</span>
          <span class="charts-grid__card-period">{data.periodo.desde.slice(0,10)} → {data.periodo.hasta.slice(0,10)}</span>
        </div>
        <div class="charts-grid__card-body charts-grid__card-body--tight">
          <EChart option={financialOption} height="260px" />
          <div class="metric-strip">
            {#each finBars as b}
              <div class="metric-strip__pill">
                <span>{b.label}</span>
                <strong>{fmt(b.value)}</strong>
                {#if b.sub}<small>{b.sub}</small>{/if}
              </div>
            {/each}
          </div>
        </div>
      </section>

      <!-- ── Métodos de pago — SVG donut ── -->
      <section class="charts-grid__card">
        <div class="charts-grid__card-header">
          <span class="charts-grid__card-title">Métodos de pago</span>
          <span class="charts-grid__card-period">{fmt(donutTotal)} total</span>
        </div>
        <div class="charts-grid__card-body charts-grid__card-body--tight">
          {#if data.porMetodoPago.length === 0}
            <p class="charts-grid__no-data">Sin pagos registrados</p>
          {:else}
            <EChart option={paymentOption} height="260px" />
          {/if}
        </div>
      </section>

      <!-- ── Top servicios — horizontal bar chart ── -->
      <section class="charts-grid__card charts-grid__item--wide">
        <div class="charts-grid__card-header">
          <span class="charts-grid__card-title">Top servicios por ingresos</span>
          <span class="charts-grid__card-period">{data.topServicios.length} servicios en el período</span>
        </div>
        <div class="charts-grid__card-body charts-grid__card-body--tight">
          {#if data.topServicios.length === 0}
            <p class="charts-grid__no-data">Sin servicios en el período</p>
          {:else}
            <EChart option={topServicesOption} height="{Math.max(240, data.topServicios.length * 42)}px" />
          {/if}
        </div>
      </section>

      <!-- ── Desempeño por empleado ── -->
      <section class="charts-grid__card charts-grid__item--wide">
        <div class="charts-grid__card-header">
          <span class="charts-grid__card-title">Desempeño por empleado</span>
          <span class="charts-grid__card-period">{data.porEmpleado.length} colaboradores activos</span>
        </div>
        <div class="charts-grid__card-body charts-grid__card-body--tight">
          {#if data.porEmpleado.length === 0}
            <p class="charts-grid__no-data">Sin empleados en el período</p>
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
