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

  const PERIODOS: { key: Periodo; label: string }[] = [
    { key: 'hoy', label: 'Hoy' },
    { key: 'semana', label: 'Esta semana' },
    { key: 'mes', label: 'Este mes' },
    { key: 'mes_ant', label: 'Mes anterior' },
    { key: 'año', label: 'Este año' },
    { key: 'custom', label: 'Personalizado' },
  ];
</script>

<div class="p-3 p-md-4">
  <h5 class="fw-bold mb-4">Reportes</h5>

  <!-- Selector período -->
  <div class="d-flex flex-wrap gap-2 mb-3">
    {#each PERIODOS as p}
      <button class="btn btn-sm {periodo===p.key ? 'btn-primary' : 'btn-outline-secondary'}" on:click={() => setPeriodo(p.key)}>{p.label}</button>
    {/each}
  </div>

  {#if periodo === 'custom'}
    <div class="d-flex gap-2 mb-3 flex-wrap align-items-end">
      <div><label class="form-label small">Desde</label><input type="date" class="form-control form-control-sm" bind:value={desde} /></div>
      <div><label class="form-label small">Hasta</label><input type="date" class="form-control form-control-sm" bind:value={hasta} /></div>
      <button class="btn btn-primary btn-sm" on:click={load}>Consultar</button>
    </div>
  {/if}

  {#if loading}
    <Spinner />
  {:else if data}
    <!-- KPIs -->
    <div class="row g-3 mb-4">
      {#each [
        { label: 'Total ingresos', value: fmt(data.resumen.totalIngresos), color: 'success', sub: `${data.resumen.cantidadIngresos} transacciones` },
        { label: 'Total egresos', value: fmt(data.resumen.totalEgresos), color: 'danger', sub: `${data.resumen.cantidadEgresos} transacciones` },
        { label: 'Utilidad neta', value: fmt(data.resumen.utilidadNeta), color: 'primary', sub: '' },
        { label: 'Total comisiones', value: fmt(data.resumen.totalComisiones), color: 'warning', sub: '' },
      ] as k}
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body p-3">
              <p class="text-muted small mb-1">{k.label}</p>
              <p class="fw-bold fs-5 mb-0 text-{k.color}">{k.value}</p>
              {#if k.sub}<p class="text-muted small mb-0">{k.sub}</p>{/if}
            </div>
          </div>
        </div>
      {/each}
    </div>

    <div class="row g-3">
      <!-- Top servicios -->
      <div class="col-12 col-lg-6">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white fw-semibold small border-0 pt-3">Top servicios</div>
          <div class="table-responsive">
            <table class="table table-sm mb-0">
              <thead class="table-light"><tr><th class="ps-3">Servicio</th><th>Cantidad</th><th class="pe-3 text-end">Total</th></tr></thead>
              <tbody>
                {#each data.topServicios as s}
                  <tr>
                    <td class="ps-3 small fw-semibold">{s.nombre}</td>
                    <td class="small">{s.cantidad}</td>
                    <td class="pe-3 text-end small text-success">{fmt(s.total)}</td>
                  </tr>
                {:else}
                  <tr><td colspan="3" class="text-center text-muted py-3 small">Sin datos</td></tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Por empleado -->
      <div class="col-12 col-lg-6">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white fw-semibold small border-0 pt-3">Por empleado</div>
          <div class="table-responsive">
            <table class="table table-sm mb-0">
              <thead class="table-light"><tr><th class="ps-3">Empleado</th><th>Servicios</th><th>Ventas</th><th class="pe-3 text-end">Comisión</th></tr></thead>
              <tbody>
                {#each data.porEmpleado as e}
                  <tr>
                    <td class="ps-3 small fw-semibold">{e.nombre}</td>
                    <td class="small">{e.servicios}</td>
                    <td class="small">{fmt(e.ventas)}</td>
                    <td class="pe-3 text-end small text-warning">{fmt(e.comision)}</td>
                  </tr>
                {:else}
                  <tr><td colspan="4" class="text-center text-muted py-3 small">Sin datos</td></tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Por método de pago -->
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white fw-semibold small border-0 pt-3">Por método de pago</div>
          <div class="card-body">
            {#each data.porMetodoPago as m}
              {@const max = Math.max(...data.porMetodoPago.map(x => x.total))}
              <div class="mb-3">
                <div class="d-flex justify-content-between small mb-1"><span>{m.metodo}</span><span class="fw-semibold">{fmt(m.total)}</span></div>
                <div class="progress" style="height:10px">
                  <div class="progress-bar bg-primary" style="width:{max > 0 ? (m.total / max * 100).toFixed(0) : 0}%"></div>
                </div>
              </div>
            {:else}
              <p class="text-muted small text-center">Sin datos</p>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {:else}
    <p class="text-muted">No se pudieron cargar los datos.</p>
  {/if}
</div>
