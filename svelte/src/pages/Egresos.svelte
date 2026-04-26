<script lang="ts">
  import { onMount } from 'svelte';
  import { egresoApi, type CrearEgresoRequest } from '../lib/api/egresos';
  import { isAdmin } from '../lib/stores/auth';
  import Spinner from '../lib/components/Spinner.svelte';
  import Pagination from '../lib/components/Pagination.svelte';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';
  import { toast } from '../lib/stores/toast';
  import type { Egreso } from '../lib/types';

  // ── State ─────────────────────────────────────────────────────────────────
  let items: Egreso[] = []; let total = 0; let page = 1; const pageSize = 10;
  let loading = true;

  const today = new Date().toISOString().split('T')[0];
  const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  let desde = thirtyAgo; let hasta = today;

  let showWizard = false; let step = 1;
  let form: Partial<CrearEgresoRequest> = {};
  let saving = false;
  let showReceipt = false;
  let lastEgreso: Egreso | null = null;
  let deleteConfirm = false; let deleteId: number | null = null;

  // ── Category config ────────────────────────────────────────────────────────
  const CATEGORIA_LABELS: Record<string, string> = {
    suministros:   'Insumos y Productos',
    servicios:     'Servicios Externos',
    salarios:      'Salarios y Personal',
    renta:         'Renta y Local',
    marketing:     'Marketing y Publicidad',
    mantenimiento: 'Mantenimiento',
    impuestos:     'Impuestos y Tasas',
    otros:         'Otros',
  };

  const categoriaItems = [
    { key: 'suministros',   label: 'Insumos',
      svg: '<path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.9 18 9 18h12v-2H9.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 23.43 5H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>' },
    { key: 'servicios',     label: 'Servicios',
      svg: '<path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>' },
    { key: 'salarios',      label: 'Salarios',
      svg: '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>' },
    { key: 'renta',         label: 'Renta',
      svg: '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>' },
    { key: 'marketing',     label: 'Marketing',
      svg: '<path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.54.8-1.07 1.2-1.61-.99-.74-2.24-1.68-3.2-2.4-.4.55-.8 1.08-1.2 1.62zM20.4 5.6c-.4-.54-.8-1.07-1.2-1.61-.96.74-2.24 1.65-3.2 2.4.4.54.8 1.07 1.2 1.61.96-.74 2.24-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/>' },
    { key: 'mantenimiento', label: 'Mantenimiento',
      svg: '<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>' },
    { key: 'impuestos',     label: 'Impuestos',
      svg: '<path d="M20 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14H7v-2h4v2zm6-4H7v-2h10v2zm0-4H7V7h10v2z"/>' },
    { key: 'otros',         label: 'Otros',
      svg: '<path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>' },
  ];

  // ── Data loaders ──────────────────────────────────────────────────────────
  async function load() {
    loading = true;
    const res = await egresoApi.listarPaginado(page, pageSize, desde || undefined, hasta || undefined);
    if (res.ok && res.data) {
      if (Array.isArray(res.data)) { items = res.data as unknown as Egreso[]; total = items.length; }
      else { items = res.data.items; total = res.data.total; }
    }
    loading = false;
  }

  onMount(load);

  function openWizard() {
    form = { fecha: today, categoria: '', monto: 0 };
    step = 1; showWizard = true;
  }

  async function save() {
    saving = true;
    const res = await egresoApi.crear(form as CrearEgresoRequest);
    saving = false;
    if (res.ok && res.data) {
      toast('Egreso registrado', 'success');
      lastEgreso = res.data;
      showWizard = false; showReceipt = true;
      load();
    } else toast(res.error ?? 'Error', 'error');
  }

  async function doDelete() {
    if (!deleteId) return;
    const res = await egresoApi.eliminar(deleteId);
    deleteConfirm = false;
    if (res.ok) { toast('Eliminado', 'success'); load(); }
    else toast(res.error ?? 'Error', 'error');
  }

  function fmtDate(s: string) {
    const d = new Date(s);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
  function fmt(v: number) { return `S/ ${v.toFixed(2)}`; }
  function catLabel(key: string) { return CATEGORIA_LABELS[key] ?? key; }

  $: step2Valid = !!(form.descripcion && (form.monto ?? 0) > 0);
</script>

<div class="p-3 p-md-4">
  <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
    <div>
      <h5 class="fw-bold mb-0">Egresos</h5>
      <p class="text-muted small mb-0">Historial de gastos y salidas registradas</p>
    </div>
    <button class="btn btn-danger btn-sm" on:click={openWizard}>+ Registrar Egreso</button>
  </div>

  <!-- Filtros -->
  <div class="card border-0 shadow-sm p-3 mb-3">
    <div class="d-flex gap-2 flex-wrap align-items-end">
      <div>
        <label class="form-label small fw-semibold mb-1" style="text-transform:uppercase;font-size:10px;color:#8a97b0;letter-spacing:.06em">Desde</label>
        <input type="date" class="form-control form-control-sm" style="width:150px" bind:value={desde} />
      </div>
      <div>
        <label class="form-label small fw-semibold mb-1" style="text-transform:uppercase;font-size:10px;color:#8a97b0;letter-spacing:.06em">Hasta</label>
        <input type="date" class="form-control form-control-sm" style="width:150px" bind:value={hasta} />
      </div>
      <button class="btn btn-sm btn-outline-secondary" on:click={() => { page=1; load(); }}>Filtrar</button>
      {#if desde !== thirtyAgo || hasta !== today}
        <button class="btn btn-sm btn-link text-muted p-0" on:click={() => { desde=thirtyAgo; hasta=today; page=1; load(); }}>Limpiar</button>
      {/if}
    </div>
  </div>

  {#if loading}<Spinner />{:else}
    <div class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table table-sm table-hover mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3">Fecha</th>
              <th>Descripción</th>
              <th>Categoría</th>
              <th class="d-none d-md-table-cell">Proveedor</th>
              <th class="text-end">Monto</th>
              {#if $isAdmin}<th class="pe-3"></th>{/if}
            </tr>
          </thead>
          <tbody>
            {#each items as e}
              <tr>
                <td class="ps-3 small text-muted" style="white-space:nowrap">{fmtDate(e.fecha)}</td>
                <td class="small fw-semibold">{e.descripcion}</td>
                <td><span class="cat-badge cat-{e.categoria}">{catLabel(e.categoria)}</span></td>
                <td class="small text-muted d-none d-md-table-cell">{e.proveedor ?? '—'}</td>
                <td class="text-end fw-bold small text-danger">-{fmt(e.monto)}</td>
                {#if $isAdmin}
                  <td class="pe-3 text-end">
                    <button class="btn-icon-sm" title="Eliminar" on:click={() => { deleteId = e.id; deleteConfirm = true; }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                  </td>
                {/if}
              </tr>
            {:else}
              <tr><td colspan="6" class="text-center text-muted py-5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="36" height="36" style="opacity:.2;display:block;margin:0 auto 8px"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
                Sin egresos en el período seleccionado
              </td></tr>
            {/each}
          </tbody>
        </table>
      </div>
      {#if total > pageSize}<div class="p-3"><Pagination {page} {total} {pageSize} onChange={(p) => { page = p; load(); }} /></div>{/if}
    </div>
  {/if}
</div>

<!-- ── Wizard Modal ──────────────────────────────────────────────────────── -->
{#if showWizard}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="modal d-block" style="background:rgba(0,0,0,.5)" on:click|self={() => (showWizard=false)}>
    <div class="modal-dialog modal-dialog-scrollable modal-fullscreen-sm-down">
      <div class="modal-content">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title">Registrar egreso</h5>
          <button class="btn-close" on:click={() => (showWizard=false)}></button>
        </div>

        <!-- Step progress -->
        <div class="px-4 pt-3 pb-0">
          <div class="d-flex align-items-center gap-2">
            {#each ['Categoría', 'Detalle', 'Confirmar'] as label, i}
              {@const n = i + 1}
              <div class="progress-num {step === n ? 'active' : step > n ? 'completed' : ''}">{step > n ? '✓' : n}</div>
              <span class="small {step >= n ? 'text-navy fw-semibold' : 'text-muted'}">{label}</span>
              {#if i < 2}<div class="progress-line {step > n ? 'done' : ''}"></div>{/if}
            {/each}
          </div>
        </div>

        <div class="modal-body pt-3">

          <!-- ── PASO 1: CATEGORÍA ── -->
          {#if step === 1}
            <p class="text-muted small mb-3">Selecciona la categoría que mejor describe este gasto</p>
            <div class="cat-grid mb-3">
              {#each categoriaItems as c}
                <button type="button" class="cat-btn {form.categoria === c.key ? 'active' : ''}" on:click={() => (form.categoria = c.key)}>
                  <span class="cat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">{@html c.svg}</svg>
                  </span>
                  <span class="cat-name">{c.label}</span>
                </button>
              {/each}
            </div>

          <!-- ── PASO 2: DETALLE ── -->
          {:else if step === 2}
            <p class="text-muted small mb-3">Ingresa los datos del gasto en <strong>{catLabel(form.categoria ?? '')}</strong></p>

            <div class="mb-3">
              <label class="form-label" style="font-size:11px;font-weight:700;color:#5a6478;text-transform:uppercase;letter-spacing:.06em">Monto (S/)</label>
              <div style="position:relative">
                <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:1.3rem;font-weight:700;color:#c0392b;pointer-events:none;font-family:var(--font-heading)">-S/</span>
                <input type="number" step="0.01" min="0" bind:value={form.monto}
                  style="width:100%;padding:14px 14px 14px 62px;font-size:1.8rem;font-weight:800;font-family:var(--font-heading);color:#c0392b;border:2.5px solid {(form.monto ?? 0) > 0 ? '#c0392b' : '#d0d8e8'};border-radius:8px;outline:none;background:white;transition:border-color .15s" />
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label small fw-semibold">Descripción *</label>
              <input class="form-control" bind:value={form.descripcion} placeholder="Ej: Compra de tintes, pago de luz…" />
            </div>

            <div class="row g-2 mb-3">
              <div class="col-6">
                <label class="form-label small fw-semibold">Fecha</label>
                <input class="form-control" type="date" bind:value={form.fecha} />
              </div>
              <div class="col-6">
                <label class="form-label small fw-semibold">Proveedor</label>
                <input class="form-control" bind:value={form.proveedor} placeholder="Opcional" />
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label small fw-semibold">N° de comprobante</label>
              <input class="form-control" bind:value={form.comprobante} placeholder="Boleta / Factura (opcional)" />
            </div>

          <!-- ── PASO 3: CONFIRMAR ── -->
          {:else}
            <p class="text-muted small mb-3">Revisa los datos antes de confirmar el registro</p>
            <div class="resumen-card mb-3">
              <div class="resumen-header-label">Resumen del egreso</div>
              <div class="resumen-row">
                <span>Categoría</span>
                <span class="cat-badge cat-{form.categoria}">{catLabel(form.categoria ?? '')}</span>
              </div>
              <div class="resumen-row">
                <span>Descripción</span>
                <span class="fw-semibold">{form.descripcion}</span>
              </div>
              <div class="resumen-row">
                <span>Fecha</span>
                <span>{form.fecha}</span>
              </div>
              {#if form.proveedor}
                <div class="resumen-row"><span>Proveedor</span><span>{form.proveedor}</span></div>
              {/if}
              {#if form.comprobante}
                <div class="resumen-row"><span>Comprobante</span><span>{form.comprobante}</span></div>
              {/if}
              <div class="resumen-row resumen-total">
                <span>Total a registrar</span>
                <span>-{fmt(form.monto ?? 0)}</span>
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-semibold">Observaciones</label>
              <textarea class="form-control" rows="2" bind:value={form.observaciones} placeholder="Notas adicionales (opcional)"></textarea>
            </div>
          {/if}

        </div>

        <div class="modal-footer border-0">
          {#if step > 1}<button class="btn btn-outline-secondary btn-sm" on:click={() => step--}>← Atrás</button>{/if}
          {#if step < 3}
            <button class="btn btn-danger btn-sm" on:click={() => step++}
              disabled={step === 1 ? !form.categoria : !step2Valid}>
              Siguiente →
            </button>
          {:else}
            <button class="btn btn-danger btn-sm" on:click={save} disabled={saving}>
              {#if saving}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
              Confirmar egreso
            </button>
          {/if}
        </div>

      </div>
    </div>
  </div>
{/if}

<!-- ── Receipt Modal ──────────────────────────────────────────────────────── -->
{#if showReceipt && lastEgreso}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="modal d-block" style="background:rgba(0,0,0,.5)" on:click|self={() => (showReceipt=false)}>
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-body text-center p-4">
          <div style="width:56px;height:56px;background:#fdecea;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#c0392b" width="28" height="28"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </div>
          <h5 class="fw-bold">Egreso Registrado</h5>
          <p class="text-muted small">{lastEgreso.descripcion} · {catLabel(lastEgreso.categoria)}</p>
          <p class="fw-bold fs-3 text-danger" style="font-family:var(--font-heading)">-{fmt(lastEgreso.monto)}</p>
          <p class="text-muted small">{fmtDate(lastEgreso.fecha)}</p>
        </div>
        <div class="modal-footer border-0 justify-content-center">
          <button class="btn btn-danger" on:click={() => { showReceipt=false; openWizard(); }}>+ Otro Egreso</button>
          <button class="btn btn-outline-secondary" on:click={() => (showReceipt=false)}>Cerrar</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<ConfirmDialog show={deleteConfirm} message="¿Eliminar este egreso?" onConfirm={doDelete} onCancel={() => (deleteConfirm=false)} />

<style>
  /* ── Categoria grid ──────────────────────────────────────────────────────── */
  .cat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 10px;
  }
  .cat-btn {
    padding: 14px 8px; border: 2px solid #d0d8e8; border-radius: 8px;
    background: white; cursor: pointer; transition: all .15s; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    color: #8a97b0;
  }
  .cat-btn:hover { border-color: #c0392b; background: #fff5f5; color: #c0392b; }
  .cat-btn.active { border-color: #c0392b; background: #fdecea; color: #c0392b; }
  .cat-btn.active .cat-name { color: #c0392b; font-weight: 700; }
  .cat-icon { display: flex; align-items: center; justify-content: center; }
  .cat-name { font-size: 11px; font-weight: 500; color: #5a6478; line-height: 1.2; text-align: center; }
  .cat-btn.active .cat-name { color: #c0392b; }

  /* ── Summary card ────────────────────────────────────────────────────────── */
  .resumen-card {
    background: #fff8f8; border: 1px solid #f0d0d0;
    border-left: 4px solid #c0392b; border-radius: 8px; padding: 18px;
  }
  .resumen-header-label {
    font-size: 10px; font-weight: 700; color: #8a97b0;
    letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;
  }
  .resumen-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 7px 0; border-bottom: 1px solid #f0d8d8; font-size: 13px; color: #5a6478;
  }
  .resumen-row:last-child { border-bottom: none; }
  .resumen-total {
    padding-top: 12px; font-size: 14px; font-weight: 700; color: #c0392b;
  }
  .resumen-total span:last-child { font-family: var(--font-heading); font-size: 1.4rem; }

  /* ── Step progress ───────────────────────────────────────────────────────── */
  .progress-num {
    width: 26px; height: 26px; border-radius: 50%; background: #e8edf4;
    color: #5a6478; display: flex; align-items: center; justify-content: center;
    font-weight: 600; font-size: 12px; flex-shrink: 0;
  }
  .progress-num.active    { background: #c0392b; color: white; }
  .progress-num.completed { background: #2e7d5a; color: white; font-size: 10px; }
  .progress-line { flex: 1; height: 2px; background: #e8edf4; min-width: 20px; }
  .progress-line.done { background: #c0392b; }
  .text-navy { color: var(--navy); }

  /* ── Table badges ────────────────────────────────────────────────────────── */
  .cat-badge {
    display: inline-block; padding: 2px 8px; border-radius: 12px;
    font-size: 11px; font-weight: 600; background: #f0f4ff; color: var(--navy);
    white-space: nowrap;
  }
  .cat-badge.cat-suministros   { background: #e3f2fd; color: #1565c0; }
  .cat-badge.cat-servicios     { background: #ede7f6; color: #6b21a8; }
  .cat-badge.cat-salarios      { background: #fff3e0; color: #e65100; }
  .cat-badge.cat-renta         { background: #e8f5e9; color: #2e7d32; }
  .cat-badge.cat-marketing     { background: #fce4ec; color: #c2185b; }
  .cat-badge.cat-mantenimiento { background: #fff8e1; color: #f57f17; }
  .cat-badge.cat-impuestos     { background: #fdecea; color: #c0392b; }
  .cat-badge.cat-otros         { background: #f0f4ff; color: var(--navy); }

  /* ── Delete button ───────────────────────────────────────────────────────── */
  .btn-icon-sm {
    background: none; border: none; cursor: pointer; color: #8a97b0;
    padding: 4px 6px; border-radius: 4px; transition: color .15s;
  }
  .btn-icon-sm:hover { color: #c0392b; background: #fdecea; }
</style>
