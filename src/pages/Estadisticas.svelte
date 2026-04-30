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
  function pct(value: number, max: number) { return max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0; }

  $: margen = data && data.resumen.totalIngresos > 0
    ? Math.round((data.resumen.utilidadNeta / data.resumen.totalIngresos) * 100) : 0;
  $: maxServicio = data ? Math.max(1, ...data.topServicios.map(s => s.total)) : 1;
  $: maxEmpleado = data ? Math.max(1, ...data.porEmpleado.map(e => e.ventas)) : 1;

  // ── Financial bar chart ──────────────────────────────────────────────────────
  const FB_W = 52;
  const FB_GAP = 22;
  const FB_MAX_H = 108;
  const FB_BASE_Y = 138;
  // 4 bars + 3 gaps + left/right padding
  const FB_SVG_W = 4 * FB_W + 3 * FB_GAP + 44;
  const FB_SVG_H = 185;
  const FB_COLORS = {
    ingresos:   { bar: '#2e7d5a', bg: '#e8f5ee', text: '#2e7d5a' },
    egresos:    { bar: '#c0392b', bg: '#fdecea', text: '#c0392b' },
    utilidad:   { bar: '#1b3a60', bg: '#eef2fa', text: '#1b3a60' },
    utilidadNeg:{ bar: '#c0392b', bg: '#fdecea', text: '#c0392b' },
    comisiones: { bar: '#d4a017', bg: '#fef9e7', text: '#d4a017' },
  };

  $: finBars = data ? [
    { key: 'ingresos',  label: 'Ingresos',    value: data.resumen.totalIngresos,    sub: `${data.resumen.cantidadIngresos} txn` },
    { key: 'egresos',   label: 'Egresos',      value: data.resumen.totalEgresos,     sub: `${data.resumen.cantidadEgresos} reg` },
    { key: data.resumen.utilidadNeta >= 0 ? 'utilidad' : 'utilidadNeg', label: 'Utilidad', value: data.resumen.utilidadNeta, sub: `${margen}% margen` },
    { key: 'comisiones',label: 'Comisiones',   value: data.resumen.totalComisiones,  sub: '' },
  ] : [];

  $: maxFin = finBars.length ? Math.max(1, ...finBars.map(b => Math.abs(b.value))) : 1;

  function finBarH(value: number): number {
    return Math.max(6, (Math.abs(value) / maxFin) * FB_MAX_H);
  }
  function finBarY(value: number): number {
    return value >= 0 ? FB_BASE_Y - finBarH(value) : FB_BASE_Y;
  }
  function finBarX(i: number): number {
    return 22 + i * (FB_W + FB_GAP);
  }

  // Grid tick values (4 evenly spaced, including 0 as baseline)
  $: gridTicks = maxFin > 0 ? [0.25, 0.5, 0.75, 1.0].map(f => maxFin * f) : [];

  // ── Donut chart ──────────────────────────────────────────────────────────────
  const DONUT_R = 54;
  const DONUT_C = 70;
  const COLORS = ['#1b3a60', '#2e7d5a', '#d4a017', '#c0392b', '#7b5ea7', '#2196f3', '#ff7043'];

  function donutSegments(items: { metodo: string; total: number }[]) {
    const total = items.reduce((s, i) => s + i.total, 0);
    if (total === 0) return [];
    const circumference = 2 * Math.PI * DONUT_R;
    let offset = 0;
    return items.map((item, idx) => {
      const fraction = item.total / total;
      const dash = fraction * circumference;
      const seg = { fraction, dash, offset, color: COLORS[idx % COLORS.length], label: item.metodo, pct: Math.round(fraction * 100), amount: item.total };
      offset += dash;
      return seg;
    });
  }

  $: segments = data ? donutSegments(data.porMetodoPago) : [];
  $: donutTotal = data ? data.porMetodoPago.reduce((s, m) => s + m.total, 0) : 0;

  const periodos: { key: Periodo; label: string }[] = [
    { key: 'semana',    label: '7 días' },
    { key: 'mes',       label: 'Mes' },
    { key: 'trimestre', label: 'Trimestre' },
    { key: 'anio',      label: 'Año' },
    { key: 'custom',    label: 'Rango' },
  ];
</script>

<div class="p-3 p-md-4">
  <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
    <div>
      <h5 class="fw-bold mb-0">Estadísticas</h5>
      <p class="text-muted small mb-0">Análisis visual del período seleccionado</p>
    </div>
    <button class="btn btn-outline-secondary btn-sm" on:click={load}>
      {#if loading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}Actualizar
    </button>
  </div>

  <!-- Period toolbar -->
  <div class="stats-toolbar mb-4">
    <div class="btn-group btn-group-sm">
      {#each periodos as p}
        <button class="btn btn-outline-secondary" class:active={periodo === p.key} on:click={() => setPeriodo(p.key)}>{p.label}</button>
      {/each}
    </div>
    <input type="date" class="form-control form-control-sm stats-date" bind:value={desde} disabled={periodo !== 'custom'} />
    <input type="date" class="form-control form-control-sm stats-date" bind:value={hasta} disabled={periodo !== 'custom'} />
    <button class="btn btn-primary btn-sm" on:click={load} disabled={loading}>Aplicar</button>
  </div>

  {#if loading && !data}
    <Spinner />
  {:else if data}

    <div class="charts-grid">

      <!-- ── Resumen financiero — vertical SVG bar chart ── -->
      <section class="chart-card">
        <div class="chart-card-header">
          <span class="chart-title">Resumen financiero</span>
          <span class="chart-period">{data.periodo.desde.slice(0,10)} → {data.periodo.hasta.slice(0,10)}</span>
        </div>
        <div class="chart-card-body">
          <svg viewBox="0 0 {FB_SVG_W} {FB_SVG_H}" class="fin-svg" role="img" aria-label="Resumen financiero">
            <!-- Grid lines -->
            {#each gridTicks as tick, i}
              {@const gy = FB_BASE_Y - ((i + 1) / gridTicks.length) * FB_MAX_H}
              <line x1="0" y1={gy} x2={FB_SVG_W} y2={gy} stroke="#eef1f6" stroke-width="1" />
              <text x="18" y={gy + 4} text-anchor="end" class="grid-label">{fmtK(tick)}</text>
            {/each}
            <!-- Baseline -->
            <line x1="0" y1={FB_BASE_Y} x2={FB_SVG_W} y2={FB_BASE_Y} stroke="#d0d9e8" stroke-width="1.5" />

            {#each finBars as b, i}
              {@const colors = FB_COLORS[b.key as keyof typeof FB_COLORS] ?? FB_COLORS.ingresos}
              {@const h = finBarH(b.value)}
              {@const x = finBarX(i)}
              {@const y = finBarY(b.value)}
              <!-- Background column -->
              <rect x={x} y={FB_BASE_Y - FB_MAX_H} width={FB_W} height={FB_MAX_H} rx="4" fill={colors.bg} opacity="0.5" />
              <!-- Value bar -->
              <rect x={x} y={y} width={FB_W} height={h} rx="4" fill={colors.bar} />
              <!-- Value label -->
              <text x={x + FB_W / 2} y={y - 7} text-anchor="middle" class="bar-value" fill={colors.text}>{fmtK(b.value)}</text>
              <!-- Sub (txn / margin) -->
              {#if b.sub}
                <text x={x + FB_W / 2} y={FB_BASE_Y + 14} text-anchor="middle" class="bar-sub">{b.sub}</text>
              {/if}
              <!-- Label -->
              <text x={x + FB_W / 2} y={FB_BASE_Y + 27} text-anchor="middle" class="bar-label">{b.label}</text>
            {/each}
          </svg>
        </div>
      </section>

      <!-- ── Métodos de pago — SVG donut ── -->
      <section class="chart-card">
        <div class="chart-card-header">
          <span class="chart-title">Métodos de pago</span>
          <span class="chart-period">{fmt(donutTotal)} total</span>
        </div>
        <div class="chart-card-body donut-layout">
          {#if data.porMetodoPago.length === 0}
            <p class="no-data">Sin pagos registrados</p>
          {:else}
            <svg viewBox="0 0 140 140" class="donut-svg">
              {#each segments as seg}
                <circle
                  cx={DONUT_C} cy={DONUT_C} r={DONUT_R}
                  fill="none"
                  stroke={seg.color}
                  stroke-width="22"
                  stroke-dasharray="{seg.dash} {2 * Math.PI * DONUT_R - seg.dash}"
                  stroke-dashoffset="{-(seg.offset - 2 * Math.PI * DONUT_R * 0.25)}"
                  style="transition: stroke-dasharray .3s"
                />
              {/each}
              <text x={DONUT_C} y={DONUT_C - 4} text-anchor="middle" class="donut-center-label">Total</text>
              <text x={DONUT_C} y={DONUT_C + 14} text-anchor="middle" class="donut-center-value">
                {donutTotal.toFixed(0)}
              </text>
            </svg>
            <div class="donut-legend">
              {#each segments as seg}
                <div class="legend-item">
                  <span class="legend-dot" style="background:{seg.color}"></span>
                  <span class="legend-label text-capitalize">{seg.label}</span>
                  <span class="legend-amount">{fmt(seg.amount)}</span>
                  <span class="legend-pct">{seg.pct}%</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </section>

      <!-- ── Top servicios — horizontal bar chart ── -->
      <section class="chart-card chart-wide">
        <div class="chart-card-header">
          <span class="chart-title">Top servicios por ingresos</span>
          <span class="chart-period">{data.topServicios.length} servicios en el período</span>
        </div>
        <div class="chart-card-body">
          {#if data.topServicios.length === 0}
            <p class="no-data">Sin servicios en el período</p>
          {:else}
            {#each data.topServicios as s, i}
              <div class="hbar-row">
                <div class="hbar-label">
                  <span class="hbar-rank">{i + 1}</span>
                  <span class="hbar-name">{s.nombre}</span>
                </div>
                <div class="hbar-track">
                  <div class="hbar-fill green" style="width:{pct(s.total, maxServicio)}%"></div>
                </div>
                <div class="hbar-values">
                  <span class="hbar-main">{fmt(s.total)}</span>
                  <span class="hbar-sub">{s.cantidad} serv.</span>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </section>

      <!-- ── Desempeño por empleado ── -->
      <section class="chart-card chart-wide">
        <div class="chart-card-header">
          <span class="chart-title">Desempeño por empleado</span>
          <span class="chart-period">{data.porEmpleado.length} colaboradores activos</span>
        </div>
        <div class="chart-card-body">
          {#if data.porEmpleado.length === 0}
            <p class="no-data">Sin empleados en el período</p>
          {:else}
            {#each data.porEmpleado as e}
              <div class="emp-row">
                <div class="emp-info">
                  <div class="emp-name">{e.nombre}</div>
                  <div class="emp-meta">{e.servicios} servicios · comisión {fmt(e.comision)}</div>
                </div>
                <div class="emp-bar-wrap">
                  <div class="emp-bar" style="width:{pct(e.ventas, maxEmpleado)}%"></div>
                </div>
                <div class="emp-total">{fmt(e.ventas)}</div>
              </div>
            {/each}
          {/if}
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
  .no-data { text-align: center; color: #8a97b0; font-size: 13px; margin: 20px 0; }

  /* ── Financial SVG bar chart ── */
  .fin-svg { width: 100%; height: auto; overflow: visible; }
  .grid-label { font-size: 8px; fill: #b0bdd0; }
  .bar-value  { font-size: 9px; font-weight: 700; }
  .bar-sub    { font-size: 8px; fill: #8a97b0; }
  .bar-label  { font-size: 10px; font-weight: 600; fill: #5a6478; }

  /* ── Donut chart ── */
  .donut-layout { display: flex; align-items: center; gap: 20px; }
  .donut-svg { width: 140px; height: 140px; flex-shrink: 0; transform: rotate(-90deg); }
  .donut-center-label {
    font-size: 10px; fill: #8a97b0; font-weight: 600; text-transform: uppercase; letter-spacing: .5px;
    transform: rotate(90deg); transform-origin: 70px 70px;
  }
  .donut-center-value {
    font-size: 16px; fill: #1b3a60; font-weight: 800;
    transform: rotate(90deg); transform-origin: 70px 70px;
  }
  .donut-legend { flex: 1; display: flex; flex-direction: column; gap: 7px; min-width: 0; }
  .legend-item { display: flex; align-items: center; gap: 7px; font-size: 12px; }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .legend-label { flex: 1; color: #5a6478; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .legend-amount { font-size: 11px; color: #8a97b0; flex-shrink: 0; }
  .legend-pct { font-weight: 700; color: #1b3a60; flex-shrink: 0; min-width: 32px; text-align: right; }

  /* ── Horizontal bar chart ── */
  .hbar-row { display: grid; grid-template-columns: 150px 1fr 110px; align-items: center; gap: 10px; margin-bottom: 14px; }
  .hbar-row:last-child { margin-bottom: 0; }
  .hbar-label { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .hbar-rank { font-size: 11px; font-weight: 700; color: #8a97b0; width: 16px; flex-shrink: 0; }
  .hbar-name { font-size: 12px; font-weight: 600; color: #1b3a60; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hbar-track { height: 10px; background: #eef1f6; border-radius: 8px; overflow: hidden; }
  .hbar-fill { height: 100%; border-radius: 8px; transition: width .3s ease; }
  .hbar-fill.green { background: linear-gradient(90deg, #2e7d5a, #4ade80); }
  .hbar-values { text-align: right; }
  .hbar-main { display: block; font-size: 12px; font-weight: 700; color: #1b3a60; }
  .hbar-sub { font-size: 10px; color: #8a97b0; }

  /* ── Employee bars ── */
  .emp-row { display: grid; grid-template-columns: 160px 1fr 110px; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f0f4f8; }
  .emp-row:last-child { border-bottom: none; }
  .emp-name { font-size: 13px; font-weight: 600; color: #1b3a60; }
  .emp-meta { font-size: 11px; color: #8a97b0; margin-top: 1px; }
  .emp-bar-wrap { height: 10px; background: #eef1f6; border-radius: 8px; overflow: hidden; }
  .emp-bar { height: 100%; background: linear-gradient(90deg, #d4a017, #f5c518); border-radius: 8px; transition: width .3s ease; }
  .emp-total { font-size: 13px; font-weight: 700; color: #1b3a60; text-align: right; }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .charts-grid { grid-template-columns: 1fr; }
    .hbar-row { grid-template-columns: 90px 1fr 80px; }
    .emp-row { grid-template-columns: 1fr; gap: 4px; }
    .donut-layout { flex-direction: column; }
  }
</style>
