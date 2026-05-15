<script lang="ts">
  import { onMount } from 'svelte';
  import '../styles/pages/_caja.css';
  import { empleadoApi } from '../lib/api/empleados';
  import { cajaApi, getResponsablesStr, type CajaApertura, type CajaMovimiento } from '../lib/api/caja';
  import { isAdmin } from '../lib/stores/auth';
  import Spinner from '../lib/components/Spinner.svelte';
  import Pagination from '../lib/components/Pagination.svelte';
  import type { Empleado } from '../lib/types';
  import { fmtTime, fmtDate, fmtDatetime } from '../lib/utils/date';

  type CajaState = 'loading' | 'closed' | 'open' | 'closing';
  type SubView = 'control' | 'historial' | 'detalle';

  let state: CajaState = 'loading';
  let subView: SubView = 'control';
  let submitting = false;

  let apertura: CajaApertura | null = null;
  let empleados: Empleado[] = [];
  let selectedEmpleadoId: number | undefined = undefined;
  let montoInicial: number | string = '';

  let movimientos: CajaMovimiento[] = [];
  let confirmText = '';

  let historial: CajaApertura[] = [];
  let historialLoading = false;
  let historialPage = 1;
  let historialTotal = 0;
  const historialSize = 20;
  let filterDesde = '';
  let filterHasta = '';
  let filterEmpleadoId: number | undefined = undefined;
  let errorMsg = '';

  // Detalle de caja seleccionada
  let detalleCaja: CajaApertura | null = null;
  let detalleMovs: CajaMovimiento[] = [];
  let detalleLoading = false;

  onMount(async () => {
    const [empRes, estadoRes] = await Promise.all([
      empleadoApi.listar(),
      cajaApi.estado(),
    ]);

    if (empRes.ok && empRes.data) empleados = empRes.data as unknown as Empleado[];

    if (estadoRes.ok && estadoRes.data) {
      const estadoData = estadoRes.data;
      apertura = estadoData.apertura;
      if (apertura) {
        await cargarMovimientos(apertura.id);
        state = 'open';
      } else {
        state = 'closed';
      }
    } else {
      state = 'closed';
    }

    if ($isAdmin) await cargarHistorial();
  });

  async function cargarMovimientos(cajaId: number) {
    const res = await cajaApi.movimientos(cajaId);
    movimientos = res.ok && res.data ? res.data : [];
  }

  async function cargarHistorial() {
    historialLoading = true;
    const res = await cajaApi.historial(historialPage, historialSize, {
      desde: filterDesde || undefined,
      hasta: filterHasta || undefined,
      empleadoId: filterEmpleadoId,
    });
    if (res.ok && res.data) {
      historial = res.data.items;
      historialTotal = res.data.total;
    }
    historialLoading = false;
  }

  async function aplicarFiltros() {
    historialPage = 1;
    await cargarHistorial();
  }

  async function limpiarFiltros() {
    filterDesde = '';
    filterHasta = '';
    filterEmpleadoId = undefined;
    historialPage = 1;
    await cargarHistorial();
  }

  async function abrir() {
    if (selectedEmpleadoId === undefined) {
      errorMsg = 'Selecciona un responsable.';
      return;
    }
    submitting = true;
    errorMsg = '';
    const res = await cajaApi.abrir(Number(montoInicial) || 0, [selectedEmpleadoId]);
    if (res.ok && res.data) {
      apertura = res.data as unknown as CajaApertura;
      movimientos = [];
      state = 'open';
    } else {
      errorMsg = (res as any).error ?? 'No se pudo abrir la caja';
    }
    submitting = false;
  }

  $: totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
  $: totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);
  $: montoInicialValue = Number(montoInicial) || 0;
  $: saldoActual = (apertura?.montoInicial ?? montoInicialValue) + totalIngresos - totalEgresos;

  async function cerrar() {
    if (confirmText !== 'cerrar' || !apertura) return;
    submitting = true;
    errorMsg = '';
    const res = await cajaApi.cerrar(apertura.id, totalIngresos, totalEgresos, saldoActual);
    if (res.ok) {
      if ($isAdmin) await cargarHistorial();
      apertura = null;
      state = 'closed';
      subView = 'control';
      confirmText = '';
      montoInicial = '';
      selectedEmpleadoId = undefined;
      movimientos = [];
    } else {
      errorMsg = (res as any).error ?? 'No se pudo cerrar la caja';
    }
    submitting = false;
  }

  async function verDetalle(caja: CajaApertura) {
    detalleCaja = caja;
    detalleMovs = [];
    detalleLoading = true;
    subView = 'detalle';
    const res = await cajaApi.movimientos(caja.id);
    if (res.ok && res.data) detalleMovs = res.data;
    detalleLoading = false;
  }

  function fmt(v: number) { return `S/ ${v.toFixed(2)}`; }

  function selectEmp(id: number) {
    selectedEmpleadoId = selectedEmpleadoId === id ? undefined : id;
  }

  interface TurnoInfo { turno: number; totalDia: number; }

  function buildTurnoMap(cajas: CajaApertura[]): Map<number, TurnoInfo> {
    const sorted = [...cajas].sort((a, b) =>
      new Date(a.abiertaEn).getTime() - new Date(b.abiertaEn).getTime()
    );
    const byDay = new Map<string, CajaApertura[]>();
    for (const c of sorted) {
      const day = fmtDate(c.abiertaEn);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(c);
    }
    const result = new Map<number, TurnoInfo>();
    for (const dayCajas of byDay.values()) {
      dayCajas.forEach((c, i) =>
        result.set(c.id, { turno: i + 1, totalDia: dayCajas.length })
      );
    }
    return result;
  }

  $: turnoMap = buildTurnoMap(historial);
</script>

<div class="caja">

  <!-- Sub-nav (admin) -->
  {#if $isAdmin && state !== 'loading'}
    <ul class="nav nav-tabs nav-tabs-origen mb-3">
      <li class="nav-item">
        <button class="nav-link" class:active={subView === 'control'} on:click={() => (subView = 'control')}>Control de caja</button>
      </li>
      <li class="nav-item">
        <button class="nav-link" class:active={subView === 'historial' || subView === 'detalle'} on:click={() => (subView = 'historial')}>Historial de cajas</button>
      </li>
    </ul>
  {/if}

  <!-- ─── HISTORIAL ─────────────────────────────────────── -->
  {#if subView === 'historial'}
    <div class="d-flex align-items-center gap-2 mb-3">
      <h6 class="fw-semibold mb-0">Historial de cajas</h6>
      {#if historialTotal > 0}
        <span class="badge rounded-pill" style="background:#e8f0fe;color:#1a2a4a;font-size:11px">{historialTotal} registros</span>
      {/if}
    </div>

    <!-- Filtros -->
    <div class="d-flex flex-wrap gap-2 align-items-end mb-3">
      <div>
        <label class="form-label small mb-1 text-muted">Desde</label>
        <input type="date" class="form-control form-control-sm" bind:value={filterDesde} style="width:140px" />
      </div>
      <div>
        <label class="form-label small mb-1 text-muted">Hasta</label>
        <input type="date" class="form-control form-control-sm" bind:value={filterHasta} style="width:140px" />
      </div>
      <div>
        <label class="form-label small mb-1 text-muted">Responsable</label>
        <select class="form-select form-select-sm" bind:value={filterEmpleadoId} style="width:170px">
          <option value={undefined}>Todos</option>
          {#each empleados as e}
            <option value={e.id}>{e.nombre}</option>
          {/each}
        </select>
      </div>
      <div class="d-flex gap-2" style="padding-bottom:1px">
        <button class="btn btn-sm btn-primary" on:click={aplicarFiltros}>Filtrar</button>
        <button class="btn btn-sm btn-outline-secondary" on:click={limpiarFiltros}>Limpiar</button>
      </div>
    </div>

    {#if historialLoading}
      <Spinner />
    {:else if historial.length === 0}
      <div class="text-center text-muted py-5">Sin cajas cerradas registradas</div>
    {:else}
      <div class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table table-sm table-hover table-origen mb-0">
            <thead class="table-origen">
              <tr>
                <th class="ps-3">Apertura</th>
                <th>Cierre</th>
                <th>Inicial</th>
                <th>Ingresos</th>
                <th>Egresos</th>
                <th>Saldo final</th>
                <th class="pe-3 d-none d-md-table-cell">Responsables</th>
                <th class="pe-3"></th>
              </tr>
            </thead>
            <tbody>
              {#each historial as h}
                {@const ti = turnoMap.get(h.id)}
                <tr>
                  <td class="ps-3 small">
                    {#if ti && ti.totalDia > 1}
                      <span class="badge rounded-pill me-1" style="background:#e8f0fe;color:#1a2a4a;font-size:10px">T{ti.turno}</span>
                    {/if}
                    {fmtDate(h.abiertaEn)} {fmtTime(h.abiertaEn)}
                  </td>
                  <td class="small">{fmtTime(h.cerradaEn)}</td>
                  <td class="small">{fmt(h.montoInicial)}</td>
                  <td class="small" style="color:#2e7d5a;font-weight:600;">+{fmt(h.totalIngresos ?? 0)}</td>
                  <td class="small" style="color:#c0392b;font-weight:600;">−{fmt(h.totalEgresos ?? 0)}</td>
                  <td class="small fw-bold" style="color:#1b3a60;">{fmt(h.saldoFinal ?? 0)}</td>
                  <td class="small text-muted pe-3 d-none d-md-table-cell">{getResponsablesStr(h.responsables) || '—'}</td>
                  <td class="pe-3">
                    <button class="btn btn-sm btn-outline-secondary" on:click={() => verDetalle(h)}>Ver</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <div class="p-3">
          <Pagination page={historialPage} total={historialTotal} pageSize={historialSize}
            onChange={async (p) => { historialPage = p; await cargarHistorial(); }} />
        </div>
      </div>
    {/if}

  <!-- ─── DETALLE DE CAJA ───────────────────────────────── -->
  {:else if subView === 'detalle' && detalleCaja}
    <div class="d-flex align-items-center gap-2 mb-3">
      <button class="btn btn-sm btn-outline-secondary" on:click={() => (subView = 'historial')}>← Historial</button>
      <div>
        <h6 class="fw-semibold mb-0">
          {#if (turnoMap.get(detalleCaja.id)?.totalDia ?? 1) > 1}
            <span class="badge rounded-pill me-1" style="background:#e8f0fe;color:#1a2a4a;font-size:11px">Turno {turnoMap.get(detalleCaja.id)?.turno}</span>
          {/if}
          Caja del {fmtDate(detalleCaja.abiertaEn)}
        </h6>
        <div class="text-muted" style="font-size:12px">
          Apertura: {fmtTime(detalleCaja.abiertaEn)}
          &nbsp;·&nbsp;
          Cierre: {fmtTime(detalleCaja.cerradaEn)}
        </div>
      </div>
    </div>
    <div class="caja__kpis mb-3">
      <div class="caja__kpi">
        <div class="caja__kpi-label">Saldo inicial</div>
        <div class="caja__kpi-value">{fmt(detalleCaja.montoInicial)}</div>
      </div>
      <div class="caja__kpi caja__kpi--ing">
        <div class="caja__kpi-label">Ingresos</div>
        <div class="caja__kpi-value">+{fmt(detalleCaja.totalIngresos ?? 0)}</div>
      </div>
      <div class="caja__kpi caja__kpi--egr">
        <div class="caja__kpi-label">Egresos</div>
        <div class="caja__kpi-value">−{fmt(detalleCaja.totalEgresos ?? 0)}</div>
      </div>
      <div class="caja__kpi caja__kpi--net">
        <div class="caja__kpi-label">Saldo final</div>
        <div class="caja__kpi-value">{fmt(detalleCaja.saldoFinal ?? 0)}</div>
      </div>
    </div>
    <div class="movs">
      <div class="movs__head">
        <span class="movs__head-title">Movimientos</span>
        <span class="movs__head-count">{detalleMovs.length} operaciones</span>
      </div>
      {#if detalleLoading}
        <div style="padding:24px;text-align:center;"><Spinner /></div>
      {:else if detalleMovs.length === 0}
        <div class="movs__empty">Sin movimientos registrados</div>
      {:else}
        {#each detalleMovs as m}
          <div class="movs__row {m.tipo === 'ingreso' ? 'movs__row--ing' : 'movs__row--egr'}">
            <div class="movs__time">{fmtTime(m.fecha)}</div>
            <div>
              <div class="movs__main">{m.concepto}</div>
              {#if m.detalle}<div class="movs__sub">{m.detalle}</div>{/if}
            </div>
            <div class="movs__amt {m.tipo === 'ingreso' ? 'movs__amt--ing' : 'movs__amt--egr'}">
              {m.tipo === 'ingreso' ? '+' : '−'}{fmt(m.monto)}
            </div>
          </div>
        {/each}
      {/if}
    </div>

  <!-- ─── CONTROL DE CAJA ───────────────────────────────── -->
  {:else}

    {#if state === 'loading'}
      <div style="padding-top:48px;display:flex;justify-content:center;">
        <Spinner />
      </div>

    {:else if state === 'closed'}
      <div class="apertura">
        <div class="apertura__card">
          <div class="apertura__header">
            <div class="apertura__header-label">Control de Caja · Origen</div>
            <div class="apertura__header-date">
              {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Lima' })}
            </div>
          </div>
          <div class="apertura__body">
            {#if errorMsg}
              <div class="alert alert-danger py-2 small mb-3">{errorMsg}</div>
            {/if}
            <div style="margin-bottom:18px;">
              <div class="apertura__field">
                <label for="monto-inicial">Monto inicial (S/.)</label>
                <input id="monto-inicial" type="number" step="0.50" min="0" placeholder="0.00"
                       bind:value={montoInicial} style="max-width:180px;" />
              </div>
            </div>
            <div class="apertura__resp">
              <div class="apertura__resp-label">Responsable *</div>
              <div class="apertura__resp-grid">
                {#each empleados.filter(e => e.activo) as e}
                  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
                  <div class="apertura__resp-chip {selectedEmpleadoId === e.id ? 'apertura__resp-chip--sel' : ''}"
                       on:click={() => selectEmp(e.id)}>
                    <span>{e.nombre}</span>
                    <span class="apertura__resp-cargo">{e.cargo}</span>
                  </div>
                {:else}
                  <div style="font-size:12px;color:#8a97b0;">Sin empleados registrados</div>
                {/each}
              </div>
            </div>
            <div class="apertura__footer">
              <button class="btn btn-primary" on:click={abrir} disabled={submitting || selectedEmpleadoId === undefined}>
                {#if submitting}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
                Abrir caja
              </button>
            </div>
          </div>
        </div>
      </div>

    {:else if state === 'open'}
      <div class="caja__topbar">
        <div class="caja__topbar-left">
          <div class="caja__dot"></div>
          <div class="caja__topbar-info">
            <strong>Caja abierta</strong>
            <span>
              Desde el {apertura ? fmtDatetime(apertura.abiertaEn) : '—'}
              {#if apertura?.responsables?.length} · {getResponsablesStr(apertura.responsables)}{/if}
            </span>
          </div>
        </div>
        <button class="caja__btn-cierre" on:click={() => (state = 'closing')}>Cerrar caja</button>
      </div>

      <div class="caja__kpis">
        <div class="caja__kpi">
          <div class="caja__kpi-label">Saldo inicial</div>
          <div class="caja__kpi-value">{fmt(apertura?.montoInicial ?? 0)}</div>
        </div>
        <div class="caja__kpi caja__kpi--ing">
          <div class="caja__kpi-label">Ingresos del día</div>
          <div class="caja__kpi-value">+{fmt(totalIngresos)}</div>
        </div>
        <div class="caja__kpi caja__kpi--egr">
          <div class="caja__kpi-label">Egresos del día</div>
          <div class="caja__kpi-value">−{fmt(totalEgresos)}</div>
        </div>
        <div class="caja__kpi caja__kpi--net">
          <div class="caja__kpi-label">Saldo actual</div>
          <div class="caja__kpi-value">{fmt(saldoActual)}</div>
        </div>
      </div>

      <div class="movs">
        <div class="movs__head">
          <span class="movs__head-title">Movimientos del día</span>
          <span class="movs__head-count">{movimientos.length} operaciones</span>
        </div>
        {#if movimientos.length > 0}
          {#each movimientos as m}
            <div class="movs__row {m.tipo === 'ingreso' ? 'movs__row--ing' : 'movs__row--egr'}">
              <div class="movs__time">{fmtTime(m.fecha)}</div>
              <div>
                <div class="movs__main">{m.concepto}</div>
                {#if m.detalle}<div class="movs__sub">{m.detalle}</div>{/if}
              </div>
              <div class="movs__amt {m.tipo === 'ingreso' ? 'movs__amt--ing' : 'movs__amt--egr'}">
                {m.tipo === 'ingreso' ? '+' : '−'}{fmt(m.monto)}
              </div>
            </div>
          {/each}
        {:else}
          <div class="movs__empty">Sin movimientos registrados hoy</div>
        {/if}
      </div>

    {:else}
      <!-- Cierre de caja -->
      <div class="cierre">
        <div class="cierre__card">
          <div class="cierre__header">
            <div class="cierre__header-title">Cierre de Caja — Origen</div>
            <div class="cierre__header-sub">
              {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' })}
            </div>
          </div>
          <div class="cierre__body">
            {#if errorMsg}
              <div class="alert alert-danger py-2 small mb-3">{errorMsg}</div>
            {/if}
            <div class="cierre__meta">
              Responsable(s): <strong>{apertura ? getResponsablesStr(apertura.responsables) || 'Sin asignar' : 'Sin asignar'}</strong><br/>
              Apertura: <strong>{apertura ? fmtTime(apertura.abiertaEn) : '—'}</strong>
              &nbsp;·&nbsp;
              Cierre: <strong>{new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' })}</strong>
            </div>

            <div class="cierre__kpis">
              <div class="cierre__kpi cierre__kpi--ini">
                <div class="cierre__kpi-label">Saldo inicial</div>
                <div class="cierre__kpi-value">{fmt(apertura?.montoInicial ?? 0)}</div>
              </div>
              <div class="cierre__kpi cierre__kpi--ing">
                <div class="cierre__kpi-label">Ingresos</div>
                <div class="cierre__kpi-value">+{fmt(totalIngresos)}</div>
              </div>
              <div class="cierre__kpi cierre__kpi--egr">
                <div class="cierre__kpi-label">Egresos</div>
                <div class="cierre__kpi-value">−{fmt(totalEgresos)}</div>
              </div>
            </div>

            <div class="cierre__movs">
              {#each movimientos as m}
                <div class="cierre__mov {m.tipo === 'ingreso' ? 'cierre__mov--ing' : 'cierre__mov--egr'}">
                  <span class="cierre__mov-time">{fmtTime(m.fecha)}</span>
                  <span class="cierre__mov-desc">{m.concepto}</span>
                <span class="cierre__mov-amt {m.tipo === 'ingreso' ? 'cierre__mov-amt--ing' : 'cierre__mov-amt--egr'}">{m.tipo === 'ingreso' ? '+' : '−'}{fmt(m.monto)}</span>
                </div>
              {:else}
                <div style="padding:16px;text-align:center;font-size:12px;color:#8a97b0;">Sin movimientos registrados</div>
              {/each}
            </div>

            <div class="cierre__totales">
              <div class="cierre__total-row">
                <span class="cierre__total-label">Saldo inicial</span>
                <span class="cierre__total-value">{fmt(apertura?.montoInicial ?? 0)}</span>
              </div>
              <div class="cierre__total-row">
                <span class="cierre__total-label">Ingresos ({movimientos.filter(m => m.tipo === 'ingreso').length} transacciones)</span>
                <span class="cierre__total-value" style="color:#2e7d5a;">+{fmt(totalIngresos)}</span>
              </div>
              <div class="cierre__total-row">
                <span class="cierre__total-label">Egresos ({movimientos.filter(m => m.tipo === 'egreso').length} transacciones)</span>
                <span class="cierre__total-value" style="color:#c0392b;">−{fmt(totalEgresos)}</span>
              </div>
              <div class="cierre__total-row cierre__total-row--final">
                <span class="cierre__total-label" style="font-size:15px;font-weight:700;color:#1b3a60;">Saldo final</span>
                <span class="cierre__total-value" style="font-size:20px;color:#1b3a60;">{fmt(saldoActual)}</span>
              </div>
            </div>

            <div class="cierre__footer" style="flex-direction:column;gap:10px;">
              <div style="display:flex;align-items:center;gap:8px;width:100%;">
                <span style="font-size:12px;color:#5a6478;flex-shrink:0;">Escribe «cerrar»:</span>
                <input class="form-control" style="flex:1;max-width:180px;padding:6px 10px;font-size:13px;"
                       placeholder="cerrar" bind:value={confirmText} />
              </div>
              <div style="display:flex;gap:8px;justify-content:flex-end;width:100%;">
                <button class="btn btn-outline-secondary btn-sm" on:click={() => (state = 'open')}>Cancelar</button>
                <button class="btn btn-primary btn-sm" on:click={cerrar}
                        disabled={confirmText !== 'cerrar' || submitting}>
                  {#if submitting}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
                  Confirmar cierre
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}

  {/if}

</div>
