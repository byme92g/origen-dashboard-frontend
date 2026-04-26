<script lang="ts">
  import { onMount } from 'svelte';
  import { ingresoApi } from '../lib/api/ingresos';
  import { egresoApi } from '../lib/api/egresos';
  import { empleadoApi } from '../lib/api/empleados';
  import { cajaApi, type CajaApertura } from '../lib/api/caja';
  import { isAdmin } from '../lib/stores/auth';
  import Spinner from '../lib/components/Spinner.svelte';
  import type { Empleado, Ingreso, Egreso } from '../lib/types';

  type CajaState = 'loading' | 'closed' | 'open' | 'closing';

  let state: CajaState = 'loading';
  let submitting = false;

  let apertura: CajaApertura | null = null;
  let empleados: Empleado[] = [];
  let selectedEmpleados: number[] = [];
  let montoInicial = 0;

  let ingresos: Ingreso[] = [];
  let egresos: Egreso[] = [];
  let confirmText = '';

  let historial: CajaApertura[] = [];
  let errorMsg = '';

  onMount(async () => {
    const [empRes, estadoRes] = await Promise.all([
      empleadoApi.listar(),
      cajaApi.estado(),
    ]);

    if (empRes.ok && empRes.data) empleados = empRes.data as unknown as Empleado[];

    if (estadoRes.ok) {
      apertura = estadoRes.data ?? null;
      if (apertura) {
        await cargarMovimientos();
        state = 'open';
      } else {
        state = 'closed';
      }
    } else {
      state = 'closed';
    }

    await cargarHistorial();
  });

  async function cargarMovimientos() {
    const hoy = new Date().toISOString().split('T')[0];
    const [ir, er] = await Promise.all([ingresoApi.listar(hoy, hoy), egresoApi.listar(hoy, hoy)]);
    if (ir.ok && ir.data) ingresos = ir.data as unknown as Ingreso[];
    if (er.ok && er.data) egresos = er.data as unknown as Egreso[];
  }

  async function cargarHistorial() {
    const res = await cajaApi.historial(1, 30);
    if (res.ok && res.data) historial = (res.data as any).items ?? [];
  }

  async function abrir() {
    submitting = true;
    errorMsg = '';
    const responsables = selectedEmpleados
      .map(id => empleados.find(e => e.id === id)?.nombre ?? '')
      .filter(Boolean).join(', ') || null;

    const res = await cajaApi.abrir(montoInicial, responsables);
    if (res.ok && res.data) {
      apertura = res.data as unknown as CajaApertura;
      await cargarMovimientos();
      state = 'open';
    } else {
      errorMsg = (res as any).error ?? 'No se pudo abrir la caja';
    }
    submitting = false;
  }

  $: totalIngresos = ingresos.reduce((s, i) => s + i.monto, 0);
  $: totalEgresos = egresos.reduce((s, e) => s + e.monto, 0);
  $: saldoActual = (apertura?.montoInicial ?? montoInicial) + totalIngresos - totalEgresos;

  async function cerrar() {
    if (confirmText !== 'cerrar' || !apertura) return;
    submitting = true;
    errorMsg = '';
    const res = await cajaApi.cerrar(apertura.id, totalIngresos, totalEgresos, saldoActual);
    if (res.ok) {
      await cargarHistorial();
      apertura = null;
      state = 'closed';
      confirmText = '';
      montoInicial = 0;
      selectedEmpleados = [];
      ingresos = [];
      egresos = [];
    } else {
      errorMsg = (res as any).error ?? 'No se pudo cerrar la caja';
    }
    submitting = false;
  }

  function fmt(v: number) { return `S/ ${v.toFixed(2)}`; }

  function toggleEmp(id: number) {
    selectedEmpleados = selectedEmpleados.includes(id)
      ? selectedEmpleados.filter(x => x !== id)
      : [...selectedEmpleados, id];
  }
</script>

<div class="p-3 p-md-4">
  <h5 class="fw-bold mb-4">Caja</h5>

  {#if state === 'loading'}
    <Spinner />

  {:else if state === 'closed'}
    <div class="card border-0 shadow-sm p-4" style="max-width:480px">
      <h6 class="fw-semibold mb-3">Apertura de caja</h6>
      {#if errorMsg}
        <div class="alert alert-danger py-2 small mb-3">{errorMsg}</div>
      {/if}
      <div class="mb-3">
        <label class="form-label small fw-semibold">Monto inicial S/</label>
        <input class="form-control" type="number" step="0.01" min="0" bind:value={montoInicial} />
      </div>
      <div class="mb-3">
        <label class="form-label small fw-semibold">Responsable(s)</label>
        <div class="d-flex flex-wrap gap-2 mt-1">
          {#each empleados.filter(e => e.activo) as e}
            <button type="button" class="btn btn-sm {selectedEmpleados.includes(e.id) ? 'btn-primary' : 'btn-outline-secondary'}" on:click={() => toggleEmp(e.id)}>{e.nombre}</button>
          {/each}
        </div>
      </div>
      <button class="btn btn-success" on:click={abrir} disabled={submitting}>
        {#if submitting}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
        Abrir caja
      </button>
    </div>

  {:else if state === 'open'}
    <!-- KPIs -->
    <div class="row g-3 mb-4">
      {#each [
        { label: 'Monto inicial', value: fmt(apertura?.montoInicial ?? 0), color: 'secondary' },
        { label: 'Ingresos del día', value: fmt(totalIngresos), color: 'success' },
        { label: 'Egresos del día', value: fmt(totalEgresos), color: 'danger' },
        { label: 'Saldo actual', value: fmt(saldoActual), color: 'primary' },
      ] as k}
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm">
            <div class="card-body p-3">
              <p class="text-muted small mb-1">{k.label}</p>
              <p class="fw-bold fs-5 mb-0 text-{k.color}">{k.value}</p>
            </div>
          </div>
        </div>
      {/each}
    </div>

    {#if apertura?.responsables}
      <p class="text-muted small mb-3">Responsables: <strong>{apertura.responsables}</strong></p>
    {/if}

    <!-- Movimientos -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold small border-0 pt-3">Movimientos del día</div>
      <div class="table-responsive">
        <table class="table table-sm mb-0">
          <thead class="table-light">
            <tr><th class="ps-3">Hora</th><th>Descripción</th><th>Tipo</th><th class="pe-3 text-end">Monto</th></tr>
          </thead>
          <tbody>
            {#each ingresos as i}
              <tr>
                <td class="ps-3 small text-muted">{new Date(i.fecha).toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })}</td>
                <td class="small">{i.concepto}</td>
                <td><span class="badge bg-success-subtle text-success">Ingreso</span></td>
                <td class="pe-3 text-end small fw-semibold text-success">{fmt(i.monto)}</td>
              </tr>
            {/each}
            {#each egresos as e}
              <tr>
                <td class="ps-3 small text-muted">{new Date(e.fecha).toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })}</td>
                <td class="small">{e.descripcion}</td>
                <td><span class="badge bg-danger-subtle text-danger">Egreso</span></td>
                <td class="pe-3 text-end small fw-semibold text-danger">- {fmt(e.monto)}</td>
              </tr>
            {:else}
              {#if ingresos.length === 0}<tr><td colspan="4" class="text-center text-muted py-3">Sin movimientos hoy</td></tr>{/if}
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <button class="btn btn-outline-danger" on:click={() => (state = 'closing')}>Cerrar caja</button>

  {:else}
    <!-- Closing confirmation -->
    <div class="card border-0 shadow-sm p-4" style="max-width:480px">
      <h6 class="fw-semibold mb-3">Resumen de cierre</h6>
      {#if errorMsg}
        <div class="alert alert-danger py-2 small mb-3">{errorMsg}</div>
      {/if}
      <div class="p-3 rounded bg-light mb-3">
        <div class="d-flex justify-content-between mb-2"><span class="text-muted small">Monto inicial</span><span>{fmt(apertura?.montoInicial ?? 0)}</span></div>
        <div class="d-flex justify-content-between mb-2"><span class="text-muted small">Total ingresos</span><span class="text-success">{fmt(totalIngresos)}</span></div>
        <div class="d-flex justify-content-between mb-2"><span class="text-muted small">Total egresos</span><span class="text-danger">- {fmt(totalEgresos)}</span></div>
        <div class="d-flex justify-content-between fw-bold"><span>Saldo final</span><span class="text-primary">{fmt(saldoActual)}</span></div>
      </div>
      <div class="mb-3">
        <label class="form-label small fw-semibold">Escribe "cerrar" para confirmar</label>
        <input class="form-control" bind:value={confirmText} placeholder="cerrar" />
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary" on:click={() => (state = 'open')}>Volver</button>
        <button class="btn btn-danger" on:click={cerrar} disabled={confirmText !== 'cerrar' || submitting}>
          {#if submitting}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
          Confirmar cierre
        </button>
      </div>
    </div>
  {/if}

  <!-- Historial (admin) -->
  {#if $isAdmin && historial.length > 0}
    <div class="mt-4">
      <h6 class="fw-semibold mb-3">Historial de cierres</h6>
      <div class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table table-sm mb-0">
            <thead class="table-light">
              <tr><th class="ps-3">Fecha</th><th>Inicial</th><th>Ingresos</th><th>Egresos</th><th>Saldo final</th><th class="pe-3 d-none d-md-table-cell">Responsables</th></tr>
            </thead>
            <tbody>
              {#each historial as h}
                <tr>
                  <td class="ps-3 small">{new Date(h.cerradaEn!).toLocaleDateString('es-PE', { dateStyle: 'medium' })}</td>
                  <td class="small">{fmt(h.montoInicial)}</td>
                  <td class="small text-success">{fmt(h.totalIngresos ?? 0)}</td>
                  <td class="small text-danger">{fmt(h.totalEgresos ?? 0)}</td>
                  <td class="small fw-semibold text-primary">{fmt(h.saldoFinal ?? 0)}</td>
                  <td class="small text-muted pe-3 d-none d-md-table-cell">{h.responsables ?? '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  {/if}
</div>
