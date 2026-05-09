<script lang="ts">
  import { onMount } from 'svelte';
  import { reporteApi } from '../lib/api/reportes';
  import { isAdmin } from '../lib/stores/auth';
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
      icon: 'bi-arrow-down-circle' },
    { href: '#/egresos',  label: 'Registrar Egreso',  color: 'red',
      icon: 'bi-arrow-up-circle' },
    { href: '#/caja',     label: 'Control de Caja',   color: '',
      icon: 'bi-cash-coin' },
    { href: '#/clientes', label: 'Clientes',           color: 'gold', adminOnly: true,
      icon: 'bi-people' },
    { href: '#/servicios', label: 'Servicios y Productos', color: '',
      icon: 'bi-bag-check' },
    { href: '#/stock',     label: 'Stock',             color: 'amber', adminOnly: true,
      icon: 'bi-box-seam' },
    { href: '#/empleados', label: 'Personal',          color: '', adminOnly: true,
      icon: 'bi-person-badge' },
    { href: '#/estadisticas', label: 'Estadísticas',   color: 'amber', adminOnly: true,
      icon: 'bi-bar-chart-line' },
    { href: '#/reportes',  label: 'Reportes',          color: 'gold', adminOnly: true,
      icon: 'bi-file-earmark-bar-graph' },
  ];

  $: visibleQuickActions = quickActions.filter((qa) => !qa.adminOnly || $isAdmin);

  const kpis = (d: DashboardData) => [
    { label: 'Ingresos hoy',    value: fmt(d.kpis.ingresosHoy),     color: 'gold',
      icon: 'bi-arrow-down-circle' },
    { label: 'Egresos mes',     value: fmt(d.kpis.egresosMes),      color: 'red',
      icon: 'bi-arrow-up-circle' },
    { label: 'Utilidad mes',    value: fmt(d.kpis.utilidadMes),     color: 'green',
      icon: 'bi-graph-up-arrow' },
    { label: 'Clientes totales', value: String(d.kpis.totalClientes), color: 'navy',
      icon: 'bi-people' },
    { label: 'Servicios hoy',   value: String(d.kpis.serviciosHoy), color: 'amber',
      icon: 'bi-bag-check' },
  ];
</script>

<div class="p-3 p-md-4">

  <!-- Quick Actions -->
  <div class="dash-section-label">Accesos rápidos</div>
  <div class="quick-actions mb-4">
    {#each visibleQuickActions as qa}
      <a href={qa.href} class="quick-action">
        <div class="qa-icon-wrap {qa.color}">
          <i class="bi {qa.icon}"></i>
        </div>
        <div class="qa-label">{qa.label}</div>
      </a>
    {/each}
  </div>

  {#if loading}
    <Spinner />
  {:else if data}

    <!-- KPI Cards -->
    <div class="dash-section-label">Resumen del día</div>
    <div class="kpi-grid mb-4">
      {#each kpis(data) as kpi}
        <div class="kpi-card kpi-card--{kpi.color}">
          <div class="kpi-card__icon">
            <i class="bi {kpi.icon}"></i>
          </div>
          <div>
            <div class="kpi-card__label">{kpi.label}</div>
            <div class="kpi-card__value">{kpi.value}</div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Bottom two-col -->
    <div class="dash-section-label">Actividad</div>
    <div class="two-col-grid">
      <!-- Últimas transacciones -->
      <div class="card border-0 shadow-sm dashboard-transactions">
        <div class="card-origen__header">
          <span class="card-origen__title">Últimas transacciones hoy</span>
        </div>
        <div class="table-responsive">
          <table class="table table-sm table-hover table-origen mb-0">
            <thead class="table-origen table-origen--navy">
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
                  <td><span class="badge badge-origen badge-origen--navy">{t.metodoPago}</span></td>
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
        <div class="card-origen__header">
          <span class="card-origen__title">Ingresos hoy por método</span>
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
                <div class="progress-bar progress-bar-origen--navy" style="width:{pct}%;border-radius:4px;transition:width .3s"></div>
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
    font-size: 1.35rem;
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

  .dashboard-transactions :global(.table th),
  .dashboard-transactions :global(.table td) {
    padding-left: 16px;
    padding-right: 16px;
  }
  .dashboard-transactions :global(.table th:first-child),
  .dashboard-transactions :global(.table td:first-child) {
    padding-left: 20px;
  }
  .dashboard-transactions :global(.table th:last-child),
  .dashboard-transactions :global(.table td:last-child) {
    padding-right: 20px;
  }

  /* ── Section labels ─────────────────────────────────────────────────────── */
  .dash-section-label {
    font-size: 10px;
    font-weight: 700;
    color: #b0bdd0;
    text-transform: uppercase;
    letter-spacing: .1em;
    margin-bottom: 10px;
  }

  /* ── Responsive (quick-actions only — kpi/two-col-grid in origen.css) ───── */
  @media (max-width: 768px) {
    .quick-actions { grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .quick-action  { padding: 14px 8px 12px; }
    .qa-icon-wrap  { width: 38px; height: 38px; }
    .qa-label      { font-size: 11px; }
  }
</style>
