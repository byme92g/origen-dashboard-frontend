<script lang="ts">
  import { onMount } from 'svelte';
  import { empleadoApi } from '../lib/api/empleados';
  import { cajaApi, getResponsablesStr, type CajaApertura, type CajaMovimiento } from '../lib/api/caja';
  import { isAdmin } from '../lib/stores/auth';
  import Spinner from '../lib/components/Spinner.svelte';
  import Pagination from '../lib/components/Pagination.svelte';
  import type { Empleado } from '../lib/types';

  type CajaState = 'loading' | 'closed' | 'open' | 'closing';
  type SubView = 'control' | 'historial' | 'detalle';

  let state: CajaState = 'loading';
  let subView: SubView = 'control';
  let submitting = false;

  let apertura: CajaApertura | null = null;
  let empleados: Empleado[] = [];
  let selectedEmpleados: number[] = [];
  let montoInicial: number | string = '';

  let movimientos: CajaMovimiento[] = [];
  let confirmText = '';

  let historial: CajaApertura[] = [];
  let historialLoading = false;
  let historialPage = 1;
  const historialSize = 15;
  let errorMsg = '';

  $: historialPaged = historial.slice((historialPage - 1) * historialSize, historialPage * historialSize);

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
    const res = await cajaApi.historial(1, 50);
    if (res.ok && res.data) historial = (res.data as any).items ?? [];
    historialLoading = false;
  }

  async function abrir() {
    if (selectedEmpleados.length === 0) {
      errorMsg = 'Selecciona al menos un responsable.';
      return;
    }
    submitting = true;
    errorMsg = '';
    const res = await cajaApi.abrir(Number(montoInicial) || 0, selectedEmpleados);
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
      selectedEmpleados = [];
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

  function toggleEmp(id: number) {
    selectedEmpleados = selectedEmpleados.includes(id)
      ? selectedEmpleados.filter(x => x !== id)
      : [...selectedEmpleados, id];
  }

  function fmtTime(iso: string | null | undefined) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  function fmtDatetime(iso: string | null | undefined) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' })
      + ' ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="caja-wrap">

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
              {#each historialPaged as h}
                <tr>
                  <td class="ps-3 small">{fmtDatetime(h.abiertaEn)}</td>
                  <td class="small">{fmtDatetime(h.cerradaEn)}</td>
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
          <Pagination page={historialPage} total={historial.length} pageSize={historialSize} onChange={(p) => { historialPage = p; }} />
        </div>
      </div>
    {/if}

  <!-- ─── DETALLE DE CAJA ───────────────────────────────── -->
  {:else if subView === 'detalle' && detalleCaja}
    <div class="d-flex align-items-center gap-2 mb-3">
      <button class="btn btn-sm btn-outline-secondary" on:click={() => (subView = 'historial')}>← Historial</button>
      <h6 class="fw-semibold mb-0">Caja del {fmtDatetime(detalleCaja.abiertaEn)}</h6>
    </div>
    <div class="caja-kpis mb-3">
      <div class="caja-kpi">
        <div class="caja-kpi-label">Saldo inicial</div>
        <div class="caja-kpi-value">{fmt(detalleCaja.montoInicial)}</div>
      </div>
      <div class="caja-kpi ing">
        <div class="caja-kpi-label">Ingresos</div>
        <div class="caja-kpi-value">+{fmt(detalleCaja.totalIngresos ?? 0)}</div>
      </div>
      <div class="caja-kpi egr">
        <div class="caja-kpi-label">Egresos</div>
        <div class="caja-kpi-value">−{fmt(detalleCaja.totalEgresos ?? 0)}</div>
      </div>
      <div class="caja-kpi net">
        <div class="caja-kpi-label">Saldo final</div>
        <div class="caja-kpi-value">{fmt(detalleCaja.saldoFinal ?? 0)}</div>
      </div>
    </div>
    <div class="movs-card">
      <div class="movs-head">
        <span class="movs-head-title">Movimientos</span>
        <span class="movs-head-count">{detalleMovs.length} operaciones</span>
      </div>
      {#if detalleLoading}
        <div style="padding:24px;text-align:center;"><Spinner /></div>
      {:else if detalleMovs.length === 0}
        <div class="movs-empty">Sin movimientos registrados</div>
      {:else}
        {#each detalleMovs as m}
          <div class="mov-row {m.tipo === 'ingreso' ? 'is-ing' : 'is-egr'}">
            <div class="mov-time">{fmtTime(m.fecha)}</div>
            <div>
              <div class="mov-main">{m.concepto}</div>
              {#if m.detalle}<div class="mov-sub">{m.detalle}</div>{/if}
            </div>
            <div class="mov-amt {m.tipo === 'ingreso' ? 'ing' : 'egr'}">
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
      <div class="apertura-outer">
        <div class="apertura-card">
          <div class="apertura-header">
            <div class="apertura-header-label">Control de Caja · Origen</div>
            <div class="apertura-header-date">
              {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <div class="apertura-body">
            {#if errorMsg}
              <div class="alert alert-danger py-2 small mb-3">{errorMsg}</div>
            {/if}
            <div style="margin-bottom:18px;">
              <div class="afield">
                <label for="monto-inicial">Monto inicial (S/.)</label>
                <input id="monto-inicial" type="number" step="0.50" min="0" placeholder="0.00"
                       bind:value={montoInicial} style="max-width:180px;" />
              </div>
            </div>
            <div class="resp-section">
              <div class="resp-section-label">Responsable(s) *</div>
              <div class="resp-grid">
                {#each empleados.filter(e => e.activo) as e}
                  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
                  <div class="resp-chip {selectedEmpleados.includes(e.id) ? 'sel' : ''}"
                       on:click={() => toggleEmp(e.id)}>
                    <span>{e.nombre}</span>
                    <span class="resp-cargo">{e.cargo}</span>
                  </div>
                {:else}
                  <div style="font-size:12px;color:#8a97b0;">Sin empleados registrados</div>
                {/each}
              </div>
            </div>
            <div class="apertura-footer">
              <button class="btn btn-primary" on:click={abrir} disabled={submitting || selectedEmpleados.length === 0}>
                {#if submitting}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
                Abrir caja
              </button>
            </div>
          </div>
        </div>
      </div>

    {:else if state === 'open'}
      <div class="caja-topbar">
        <div class="caja-topbar-left">
          <div class="caja-dot"></div>
          <div class="caja-topbar-info">
            <strong>Caja abierta</strong>
            <span>
              Desde las {apertura ? fmtTime(apertura.abiertaEn) : '—'}
              {#if apertura?.responsables?.length} · {getResponsablesStr(apertura.responsables)}{/if}
            </span>
          </div>
        </div>
        <button class="btn-cierre" on:click={() => (state = 'closing')}>Cerrar caja</button>
      </div>

      <div class="caja-kpis">
        <div class="caja-kpi">
          <div class="caja-kpi-label">Saldo inicial</div>
          <div class="caja-kpi-value">{fmt(apertura?.montoInicial ?? 0)}</div>
        </div>
        <div class="caja-kpi ing">
          <div class="caja-kpi-label">Ingresos del día</div>
          <div class="caja-kpi-value">+{fmt(totalIngresos)}</div>
        </div>
        <div class="caja-kpi egr">
          <div class="caja-kpi-label">Egresos del día</div>
          <div class="caja-kpi-value">−{fmt(totalEgresos)}</div>
        </div>
        <div class="caja-kpi net">
          <div class="caja-kpi-label">Saldo actual</div>
          <div class="caja-kpi-value">{fmt(saldoActual)}</div>
        </div>
      </div>

      <div class="movs-card">
        <div class="movs-head">
          <span class="movs-head-title">Movimientos del día</span>
          <span class="movs-head-count">{movimientos.length} operaciones</span>
        </div>
        {#if movimientos.length > 0}
          {#each movimientos as m}
            <div class="mov-row {m.tipo === 'ingreso' ? 'is-ing' : 'is-egr'}">
              <div class="mov-time">{fmtTime(m.fecha)}</div>
              <div>
                <div class="mov-main">{m.concepto}</div>
                {#if m.detalle}<div class="mov-sub">{m.detalle}</div>{/if}
              </div>
              <div class="mov-amt {m.tipo === 'ingreso' ? 'ing' : 'egr'}">
                {m.tipo === 'ingreso' ? '+' : '−'}{fmt(m.monto)}
              </div>
            </div>
          {/each}
        {:else}
          <div class="movs-empty">Sin movimientos registrados hoy</div>
        {/if}
      </div>

    {:else}
      <!-- Cierre de caja -->
      <div class="cierre-outer">
        <div class="cierre-card">
          <div class="cierre-top">
            <div class="cierre-top-title">Cierre de Caja — Origen</div>
            <div class="cierre-top-sub">
              {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div class="cierre-body">
            {#if errorMsg}
              <div class="alert alert-danger py-2 small mb-3">{errorMsg}</div>
            {/if}
            <div class="cierre-meta">
              Responsable(s): <strong>{apertura ? getResponsablesStr(apertura.responsables) || 'Sin asignar' : 'Sin asignar'}</strong><br/>
              Apertura: <strong>{apertura ? fmtTime(apertura.abiertaEn) : '—'}</strong>
              &nbsp;·&nbsp;
              Cierre: <strong>{new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</strong>
            </div>

            <div class="cierre-kpis">
              <div class="ck ini">
                <div class="ck-label">Saldo inicial</div>
                <div class="ck-value">{fmt(apertura?.montoInicial ?? 0)}</div>
              </div>
              <div class="ck ing">
                <div class="ck-label">Ingresos</div>
                <div class="ck-value">+{fmt(totalIngresos)}</div>
              </div>
              <div class="ck egr">
                <div class="ck-label">Egresos</div>
                <div class="ck-value">−{fmt(totalEgresos)}</div>
              </div>
            </div>

            <div class="cierre-movs">
              {#each movimientos as m}
                <div class="cierre-mov {m.tipo === 'ingreso' ? 'is-ing' : 'is-egr'}">
                  <span class="cierre-mov-time">{fmtTime(m.fecha)}</span>
                  <span class="cierre-mov-desc">{m.concepto}</span>
                <span class="cierre-mov-amt {m.tipo === 'ingreso' ? 'ing' : 'egr'}">{m.tipo === 'ingreso' ? '+' : '−'}{fmt(m.monto)}</span>
                </div>
              {:else}
                <div style="padding:16px;text-align:center;font-size:12px;color:#8a97b0;">Sin movimientos registrados</div>
              {/each}
            </div>

            <div class="cierre-totales">
              <div class="cierre-total-row">
                <span class="cierre-total-label">Saldo inicial</span>
                <span class="cierre-total-value">{fmt(apertura?.montoInicial ?? 0)}</span>
              </div>
              <div class="cierre-total-row">
                <span class="cierre-total-label">Ingresos ({movimientos.filter(m => m.tipo === 'ingreso').length} transacciones)</span>
                <span class="cierre-total-value" style="color:#2e7d5a;">+{fmt(totalIngresos)}</span>
              </div>
              <div class="cierre-total-row">
                <span class="cierre-total-label">Egresos ({movimientos.filter(m => m.tipo === 'egreso').length} transacciones)</span>
                <span class="cierre-total-value" style="color:#c0392b;">−{fmt(totalEgresos)}</span>
              </div>
              <div class="cierre-total-row final">
                <span class="cierre-total-label" style="font-size:15px;font-weight:700;color:#1b3a60;">Saldo final</span>
                <span class="cierre-total-value" style="font-size:20px;color:#1b3a60;">{fmt(saldoActual)}</span>
              </div>
            </div>

            <div class="cierre-footer" style="flex-direction:column;gap:10px;">
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

<style>
/* ── Layout ───────────────────────────────────────────── */
.caja-wrap { max-width: 820px; margin: 0 auto; padding: 16px; }

/* ── Apertura (caja cerrada) ──────────────────────────────── */
.apertura-outer { display: flex; justify-content: center; padding-top: 32px; }
.apertura-card {
  background: white; border-radius: 10px;
  box-shadow: 0 2px 16px rgba(27,58,96,.13);
  width: 100%; max-width: 460px; overflow: hidden;
}
.apertura-header {
  background: linear-gradient(135deg, #1b3a60 0%, #1e4a7a 100%);
  color: white; padding: 22px 32px 18px;
}
.apertura-header-label {
  font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px;
  opacity: .7; margin-bottom: 4px;
}
.apertura-header-date { font-size: 18px; font-weight: 700; text-transform: capitalize; }
.apertura-body { padding: 24px 32px 28px; }
.afield { display: flex; flex-direction: column; gap: 5px; }
.afield label { font-size: 12px; font-weight: 600; color: #5a6478; text-transform: uppercase; letter-spacing: .5px; }
.afield input {
  padding: 9px 12px; border: 1.5px solid #e0e8f0; border-radius: 6px;
  font-size: 14px; color: #1b3a60; font-family: inherit; background: white;
  transition: border-color .15s;
}
.afield input:focus { outline: none; border-color: #1b3a60; }
.resp-section { margin-bottom: 20px; margin-top: 4px; }
.resp-section-label { font-size: 12px; font-weight: 600; color: #5a6478; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 10px; }
.resp-grid { display: flex; flex-wrap: wrap; gap: 7px; }
.resp-chip {
  display: flex; align-items: center; gap: 7px;
  padding: 7px 12px; border: 1.5px solid #dce5f0; border-radius: 20px;
  cursor: pointer; font-size: 13px; color: #5a6478;
  background: #f8fafc; transition: all .15s; user-select: none;
}
.resp-chip:hover { border-color: #a0b4cc; background: #f0f4f9; }
.resp-chip.sel { border-color: #1b3a60; background: #eef2fa; color: #1b3a60; font-weight: 600; }
.resp-cargo { font-size: 10px; color: #8a97b0; font-weight: 400; }
.resp-chip.sel .resp-cargo { color: #5a6478; }
.apertura-footer { display: flex; justify-content: flex-end; padding-top: 4px; }

/* ── Top bar (caja abierta) ───────────────────────────────── */
.caja-topbar {
  background: linear-gradient(135deg, #1b3a60 0%, #1e4a7a 100%);
  border-radius: 10px; color: white;
  box-shadow: 0 2px 10px rgba(27,58,96,.25);
  padding: 14px 22px; margin-bottom: 12px;
  display: flex; align-items: center; justify-content: space-between;
}
.caja-topbar-left { display: flex; align-items: center; gap: 10px; }
.caja-dot {
  width: 9px; height: 9px; border-radius: 50%; background: #4ade80; flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(74,222,128,.25);
  animation: pulse-dot 2s infinite;
}
@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 3px rgba(74,222,128,.25); }
  50%       { box-shadow: 0 0 0 5px rgba(74,222,128,.12); }
}
.caja-topbar-info :global(strong) { font-size: 13px; color: white; display: block; font-weight: 700; }
.caja-topbar-info span { font-size: 12px; color: rgba(255,255,255,.65); }
.btn-cierre {
  background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.25);
  color: white; padding: 6px 14px; border-radius: 6px; font-size: 12px;
  font-weight: 500; cursor: pointer; transition: background .15s;
}
.btn-cierre:hover { background: rgba(255,255,255,.2); }

/* ── KPIs ─────────────────────────────────────────────── */
.caja-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
.caja-kpi {
  border-radius: 10px; padding: 15px 18px;
  box-shadow: 0 2px 8px rgba(27,58,96,.08);
  background: white; border-left: 3px solid #d8e1ec;
}
.caja-kpi-label { font-size: 10px; color: #8a97b0; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 5px; font-weight: 600; }
.caja-kpi-value { font-size: 18px; font-weight: 800; color: #1b3a60; }
.caja-kpi.ing { background: #f0faf5; border-left-color: #2e7d5a; }
.caja-kpi.ing .caja-kpi-label { color: #2e7d5a; }
.caja-kpi.ing .caja-kpi-value { color: #2e7d5a; }
.caja-kpi.egr { background: #fef6f6; border-left-color: #c0392b; }
.caja-kpi.egr .caja-kpi-label { color: #c0392b; }
.caja-kpi.egr .caja-kpi-value { color: #c0392b; }
.caja-kpi.net { background: linear-gradient(135deg, #1b3a60 0%, #1e4a7a 100%); border-left-color: #1b3a60; }
.caja-kpi.net .caja-kpi-label { color: rgba(255,255,255,.65); }
.caja-kpi.net .caja-kpi-value { color: white; }

/* ── Movimientos ──────────────────────────────────────── */
.movs-card {
  background: white; border-radius: 10px;
  box-shadow: 0 2px 8px rgba(27,58,96,.08);
  overflow: hidden; margin-bottom: 12px;
}
.movs-head {
  padding: 13px 20px; border-bottom: 1px solid #f0f4f8;
  display: flex; justify-content: space-between; align-items: center;
}
.movs-head-title { font-size: 13px; font-weight: 700; color: #1b3a60; }
.movs-head-count { font-size: 12px; color: #8a97b0; }
.mov-row {
  display: grid; grid-template-columns: 48px 1fr auto;
  gap: 12px; padding: 10px 20px;
  border-bottom: 1px solid #f8fafc; align-items: center;
  border-left: 3px solid transparent; transition: background .12s;
}
.mov-row.is-ing { border-left-color: #2e7d5a; }
.mov-row.is-egr { border-left-color: #c0392b; }
.mov-row:last-child { border-bottom: none; }
.mov-row:hover { background: #fafbfd; }
.mov-time { font-size: 12px; color: #8a97b0; font-weight: 500; }
.mov-main { font-size: 13px; font-weight: 600; color: #1b3a60; }
.mov-sub { font-size: 11px; color: #8a97b0; margin-top: 1px; }
.mov-amt { font-size: 13px; font-weight: 700; white-space: nowrap; }
.mov-amt.ing { color: #2e7d5a; }
.mov-amt.egr { color: #c0392b; }
.movs-empty { padding: 36px; text-align: center; font-size: 13px; color: #8a97b0; }

/* ── Cierre ───────────────────────────────────────────── */
.cierre-outer { display: flex; justify-content: center; }
.cierre-card {
  background: white; border-radius: 10px;
  box-shadow: 0 2px 16px rgba(27,58,96,.13);
  overflow: hidden; width: 100%; max-width: 500px;
}
.cierre-top {
  background: linear-gradient(135deg, #1b3a60 0%, #1e4a7a 100%);
  color: white; padding: 22px 28px;
}
.cierre-top-title { font-size: 16px; font-weight: 700; letter-spacing: .3px; }
.cierre-top-sub { font-size: 12px; opacity: .7; margin-top: 3px; text-transform: capitalize; }
.cierre-body { padding: 20px 28px; }
.cierre-meta { font-size: 12px; color: #8a97b0; margin-bottom: 18px; line-height: 1.9; }
.cierre-meta :global(strong) { color: #1b3a60; }
.cierre-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px; }
.ck { border-radius: 8px; padding: 10px 12px; text-align: center; }
.ck-label { font-size: 10px; text-transform: uppercase; letter-spacing: .5px; font-weight: 600; margin-bottom: 3px; }
.ck-value { font-size: 16px; font-weight: 800; margin-top: 2px; }
.ck.ini { background: #eef2fa; }
.ck.ini .ck-label { color: #5a6478; }
.ck.ini .ck-value { color: #1b3a60; }
.ck.ing { background: #e8f5ee; }
.ck.ing .ck-label { color: #2e7d5a; }
.ck.ing .ck-value { color: #2e7d5a; }
.ck.egr { background: #fdecea; }
.ck.egr .ck-label { color: #c0392b; }
.ck.egr .ck-value { color: #c0392b; }
.cierre-movs {
  border: 1px solid #e8edf4; border-radius: 8px;
  overflow: hidden; margin-bottom: 18px;
  max-height: 210px; overflow-y: auto;
}
.cierre-mov {
  display: flex; justify-content: space-between; align-items: center;
  padding: 7px 12px; border-bottom: 1px solid #f0f4f8; font-size: 12px;
  border-left: 2px solid transparent;
}
.cierre-mov:last-child { border-bottom: none; }
.cierre-mov.is-ing { border-left-color: #2e7d5a; }
.cierre-mov.is-egr { border-left-color: #c0392b; }
.cierre-mov-time { color: #8a97b0; width: 36px; flex-shrink: 0; }
.cierre-mov-desc { flex: 1; color: #5a6478; padding: 0 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cierre-mov-amt { font-weight: 600; white-space: nowrap; }
.cierre-mov-amt.ing { color: #2e7d5a; }
.cierre-mov-amt.egr { color: #c0392b; }
.cierre-totales { border-top: 1px solid #f0f4f8; padding-top: 14px; }
.cierre-total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.cierre-total-row.final {
  border-top: 2px solid #1b3a60; padding-top: 12px; margin-top: 10px;
  background: #eef2fa; padding: 10px 12px; border-radius: 6px;
}
.cierre-total-label { color: #5a6478; }
.cierre-total-value { font-weight: 700; color: #1b3a60; }
.cierre-footer {
  display: flex; gap: 10px; justify-content: flex-end;
  margin-top: 20px; padding-top: 20px; border-top: 1px solid #f0f4f8;
}

/* ── Responsive ───────────────────────────────────────── */
@media (max-width: 600px) {
  .caja-wrap { padding: 12px; }
  .caja-kpis { grid-template-columns: repeat(2, 1fr); }
  .caja-kpi-value { font-size: 15px; }
  .apertura-header { padding: 18px 20px 14px; }
  .apertura-body { padding: 18px 20px 22px; }
  .mov-row { grid-template-columns: 40px 1fr auto; padding: 9px 14px; }
}
</style>
