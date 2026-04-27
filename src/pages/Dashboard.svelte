<script lang="ts">
  import { onMount } from 'svelte';
  import { reporteApi } from '../lib/api/reportes';
  import Spinner from '../lib/components/Spinner.svelte';
  import type { DashboardData } from '../lib/types';

  let data: DashboardData | null = null;
  let loading = true;

  onMount(async () => {
    const res = await reporteApi.dashboard();
    if (res.ok && res.data) data = res.data;
    loading = false;
  });

  function fmt(v: number) { return `S/ ${v.toFixed(2)}`; }

  const quickActions = [
    { href: '#/ingresos', label: 'Registrar Ingreso', color: 'green',
      svg: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>' },
    { href: '#/egresos',  label: 'Registrar Egreso',  color: 'red',
      svg: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>' },
    { href: '#/caja',     label: 'Control de Caja',   color: '',
      svg: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>' },
    { href: '#/clientes', label: 'Clientes',           color: 'gold',
      svg: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
    { href: '#/servicios', label: 'Servicios',         color: '',
      svg: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>' },
    { href: '#/stock',     label: 'Stock',             color: 'amber',
      svg: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>' },
    { href: '#/empleados', label: 'Personal',          color: '',
      svg: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
    { href: '#/estadisticas', label: 'Estadísticas',   color: 'amber',
      svg: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
    { href: '#/reportes',  label: 'Reportes',          color: 'gold',
      svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' },
  ];

  const kpis = (d: DashboardData) => [
    { label: 'Ingresos hoy',    value: fmt(d.kpis.ingresosHoy),     color: 'gold',
      svg: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>' },
    { label: 'Egresos mes',     value: fmt(d.kpis.egresosMes),      color: 'red',
      svg: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>' },
    { label: 'Utilidad mes',    value: fmt(d.kpis.utilidadMes),     color: 'green',
      svg: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>' },
    { label: 'Clientes totales', value: String(d.kpis.totalClientes), color: '',
      svg: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
    { label: 'Servicios hoy',   value: String(d.kpis.serviciosHoy), color: 'amber',
      svg: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>' },
  ];
</script>

<div class="p-3 p-md-4">

  <!-- Quick Actions -->
  <div class="quick-actions mb-4">
    {#each quickActions as qa}
      <a href={qa.href} class="quick-action">
        <div class="qa-icon-wrap {qa.color}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            {@html qa.svg}
          </svg>
        </div>
        <div class="qa-label">{qa.label}</div>
      </a>
    {/each}
  </div>

  {#if loading}
    <Spinner />
  {:else if data}

    <!-- KPI Cards -->
    <div class="kpi-grid mb-4">
      {#each kpis(data) as kpi}
        <div class="kpi-card {kpi.color}">
          <div class="kpi-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              {@html kpi.svg}
            </svg>
          </div>
          <div>
            <div class="kpi-label">{kpi.label}</div>
            <div class="kpi-value">{kpi.value}</div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Bottom two-col -->
    <div class="two-col-grid">
      <!-- Últimas transacciones -->
      <div class="card border-0 shadow-sm">
        <div class="card-header-origen">
          <span class="card-title">Últimas transacciones hoy</span>
        </div>
        <div class="table-responsive">
          <table class="table table-sm table-hover table-navy mb-0">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Concepto</th>
                <th>Método</th>
                <th class="text-end">Total</th>
              </tr>
            </thead>
            <tbody>
              {#each data.ultimasTransacciones as t}
                <tr>
                  <td class="text-muted">{t.clienteNombre ?? '—'}</td>
                  <td>{t.concepto}</td>
                  <td><span class="badge badge-navy">{t.metodoPago}</span></td>
                  <td class="text-end fw-semibold">{fmt(t.monto - t.descuento)}</td>
                </tr>
              {:else}
                <tr><td colspan="4" class="text-center text-muted py-3">Sin transacciones hoy</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Por método de pago -->
      <div class="card border-0 shadow-sm">
        <div class="card-header-origen">
          <span class="card-title">Ingresos hoy por método</span>
        </div>
        <div class="card-body">
          {#each data.porMetodoPago as m}
            {@const pct = data.kpis.ingresosHoy > 0 ? Math.round(m.total / data.kpis.ingresosHoy * 100) : 0}
            <div class="mb-3">
              <div class="d-flex justify-content-between small mb-1">
                <span class="text-capitalize">{m.metodo}</span>
                <span class="fw-semibold">{fmt(m.total)} <span class="text-muted">({pct}%)</span></span>
              </div>
              <div class="progress" style="height:6px;background:#eef1f6;border-radius:4px">
                <div class="progress-bar bg-primary" style="width:{pct}%;border-radius:4px;transition:width .3s"></div>
              </div>
            </div>
          {:else}
            <p class="text-muted small text-center py-2 mb-0">Sin datos hoy</p>
          {/each}
        </div>
      </div>
    </div>

  {:else}
    <p class="text-muted">No se pudieron cargar los datos.</p>
  {/if}
</div>

<style>
  /* ── Quick Actions ───────────────────────────────────────────────────────── */
  .quick-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
  }
  .quick-action {
    background: white;
    border-radius: 12px;
    padding: 20px 12px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    color: #3a4560;
    border: 1.5px solid #e8edf4;
    transition: border-color .15s, transform .15s, box-shadow .15s;
  }
  .quick-action:hover {
    border-color: var(--navy);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(27,58,96,.14);
    color: var(--navy);
  }
  .qa-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(27,58,96,.08);
    color: var(--navy);
    transition: background .15s;
  }
  .qa-icon-wrap.green  { background: rgba(46,125,90,.1);   color: #2e7d5a; }
  .qa-icon-wrap.red    { background: rgba(192,57,43,.1);   color: #c0392b; }
  .qa-icon-wrap.gold   { background: rgba(160,120,56,.1);  color: var(--gold); }
  .qa-icon-wrap.amber  { background: rgba(212,134,10,.1);  color: #d4860a; }
  .quick-action:hover .qa-icon-wrap        { background: rgba(27,58,96,.12); }
  .quick-action:hover .qa-icon-wrap.green  { background: rgba(46,125,90,.18); }
  .quick-action:hover .qa-icon-wrap.red    { background: rgba(192,57,43,.18); }
  .quick-action:hover .qa-icon-wrap.gold   { background: rgba(160,120,56,.18); }
  .quick-action:hover .qa-icon-wrap.amber  { background: rgba(212,134,10,.18); }
  .qa-label {
    font-size: 12px;
    font-weight: 500;
    text-align: center;
    line-height: 1.3;
  }

  /* ── Responsive (quick-actions only — kpi/two-col-grid in origen.css) ───── */
  @media (max-width: 768px) {
    .quick-actions { grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .quick-action  { padding: 14px 8px 12px; }
    .qa-icon-wrap  { width: 38px; height: 38px; }
    .qa-label      { font-size: 11px; }
  }
</style>
