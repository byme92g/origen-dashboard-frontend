<script lang="ts">
  import { onMount } from 'svelte';
  import { egresoApi, type CategoriaEgreso, type CrearEgresoRequest } from '../lib/api/egresos';
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
  let deleteConfirm = false; let deleteId: number | null = null; let deleting = false;

  // ── Category config ────────────────────────────────────────────────────────
  const fallbackCategorias: CategoriaEgreso[] = [
    { key: 1, label: 'Insumos y productos' },
    { key: 2, label: 'Servicios y utilidades' },
    { key: 3, label: 'Sueldos y comisiones' },
    { key: 4, label: 'Alquiler' },
    { key: 5, label: 'Marketing y publicidad' },
    { key: 6, label: 'Equipos y mantenimiento' },
    { key: 7, label: 'Impuestos' },
    { key: 8, label: 'Otros' },
  ];
  let categorias: CategoriaEgreso[] = fallbackCategorias;
  let categoriaLabels: Record<string | number, string> = Object.fromEntries(fallbackCategorias.map((c) => [c.key, c.label]));

  const categoriaIcons: Record<string, string> = {
    suministros: 'bi-basket',
    servicios: 'bi-lightning-charge',
    salarios: 'bi-person-vcard',
    renta: 'bi-house-door',
    marketing: 'bi-megaphone',
    equipos: 'bi-tools',
    impuestos: 'bi-receipt',
    otros: 'bi-three-dots',
  };

  function normalizeCategory(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function categoriaIconKey(categoria: CategoriaEgreso): string {
    const label = normalizeCategory(categoria.label);
    if (label.includes('insumo') || label.includes('producto')) return 'suministros';
    if (label.includes('servicio') || label.includes('utilidad')) return 'servicios';
    if (label.includes('sueldo') || label.includes('comision') || label.includes('salario')) return 'salarios';
    if (label.includes('alquiler') || label.includes('renta')) return 'renta';
    if (label.includes('marketing') || label.includes('publicidad')) return 'marketing';
    if (label.includes('equipo') || label.includes('mantenimiento')) return 'equipos';
    if (label.includes('impuesto')) return 'impuestos';
    return 'otros';
  }

  function categoriaDisplayLabel(categoria: CategoriaEgreso): string {
    const label = normalizeCategory(categoria.label);
    if (label.includes('servicio') && label.includes('utilidad')) return 'Utilidades';
    if (label.includes('sueldo') && label.includes('comision')) return 'Sueldos';
    if (label.includes('marketing') && label.includes('publicidad')) return 'Marketing';
    if (label.includes('equipo') && label.includes('mantenimiento')) return 'Equipos';
    if (label.includes('insumo') && label.includes('producto')) return 'Insumos';
    return categoria.label;
  }

  $: categoriaItems = categorias.map((c) => ({
    ...c,
    shortLabel: categoriaDisplayLabel(c),
    icon: categoriaIcons[categoriaIconKey(c)] ?? categoriaIcons.otros,
  }));

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

  async function loadCategorias() {
    const res = await egresoApi.getCategorias();
    if (res.ok && res.data?.length) {
      categorias = res.data;
      categoriaLabels = Object.fromEntries(res.data.map((c) => [c.key, c.label]));
    }
  }

  onMount(() => {
    loadCategorias();
    load();
  });

  function openWizard() {
    form = { fecha: today, categoriaId: 0 };
    step = 1; showWizard = true;
  }

  async function save() {
    saving = true;
    const res = await egresoApi.crear(form as CrearEgresoRequest);
    saving = false;
    if (res.ok && res.data) {
      toast('Egreso registrado', 'success');
      // Backend wraps response as { egreso, message }
      lastEgreso = (res.data as any).egreso ?? res.data;
      showWizard = false; showReceipt = true;
      load();
    } else toast(res.error ?? 'Error', 'error');
  }

  async function doDelete() {
    if (!deleteId) return;
    deleting = true;
    const res = await egresoApi.eliminar(deleteId);
    deleting = false;
    deleteConfirm = false;
    if (res.ok) { toast('Eliminado', 'success'); load(); }
    else toast(res.error ?? 'Error', 'error');
  }

  function fmtDate(s: string) {
    const d = new Date(s);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
  function fmt(v: number) { return `S/. ${v.toFixed(2)}`; }
  function catLabel(key: string | number | { id: number; nombre: string } | undefined | null): string {
    if (!key && key !== 0) return '—';
    if (typeof key === 'object') return key.nombre;
    return categoriaLabels[key] ?? String(key);
  }

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
        <table class="table table-sm table-hover table-origen mb-0">
          <thead class="table-origen">
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
                <td><span class="cat-badge">{catLabel(e.categoria)}</span></td>
                <td class="small text-muted d-none d-md-table-cell">{e.proveedor ?? '—'}</td>
                <td class="text-end fw-bold small text-danger">-{fmt(e.monto)}</td>
                {#if $isAdmin}
                  <td class="pe-3 text-end">
                    <button class="btn-icon-sm" title="Eliminar" on:click={() => { deleteId = e.id; deleteConfirm = true; }}>
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                {/if}
              </tr>
            {:else}
              <tr><td colspan="6" class="text-center text-muted py-5">
                <i class="bi bi-cash-stack empty-icon"></i>
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
  <div class="modal d-block" style="background:rgba(0,0,0,.5)">
    <div class="modal-dialog modal-dialog-scrollable modal-fullscreen-sm-down">
      <div class="modal-content modal-origen">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title">Registrar egreso</h5>
          <button class="btn-close" aria-label="Cerrar" on:click={() => (showWizard=false)}></button>
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
                <button type="button" class="cat-btn {form.categoriaId === c.key ? 'active' : ''}" on:click={() => (form.categoriaId = Number(c.key))}>
                  <span class="cat-icon">
                    <i class="bi {c.icon}"></i>
                  </span>
                  <span class="cat-name">{c.shortLabel}</span>
                </button>
              {/each}
            </div>

          <!-- ── PASO 2: DETALLE ── -->
          {:else if step === 2}
            <p class="text-muted small mb-3">Ingresa los datos del gasto en <strong>{catLabel(form.categoriaId)}</strong></p>

            <div class="mb-3">
              <label class="form-label" style="font-size:11px;font-weight:700;color:#5a6478;text-transform:uppercase;letter-spacing:.06em">Monto (S/)</label>
              <div style="position:relative">
                <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:1.3rem;font-weight:700;color:#c0392b;pointer-events:none">S/.</span>
                <input type="number" step="0.01" min="0" bind:value={form.monto}
                  placeholder="0.00"
                  style="width:100%;padding:14px 14px 14px 62px;font-size:1.8rem;font-weight:800;color:#c0392b;border:2.5px solid {(form.monto ?? 0) > 0 ? '#c0392b' : '#d0d8e8'};border-radius:8px;outline:none;background:white;transition:border-color .15s" />
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
                <span class="cat-badge">{catLabel(form.categoriaId)}</span>
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
                <span>- {fmt(form.monto ?? 0)}</span>
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
              disabled={step === 1 ? !form.categoriaId : !step2Valid}>
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
  <div class="modal d-block" style="background:rgba(0,0,0,.5)">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content modal-origen">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title">Egreso registrado</h5>
          <button class="btn-close" aria-label="Cerrar" on:click={() => (showReceipt=false)}></button>
        </div>
        <div class="modal-body text-center p-4">
          <div style="width:56px;height:56px;background:#fdecea;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
            <i class="bi bi-check-lg"></i>
          </div>
          <p class="text-muted small">{lastEgreso.descripcion} · {catLabel(lastEgreso.categoria ?? lastEgreso.categoriaId)}</p>
          <p class="fw-bold fs-3 text-danger">- {fmt(lastEgreso.monto)}</p>
          <p class="text-muted small">{fmtDate(lastEgreso.fecha)}</p>
        </div>
        <div class="modal-footer border-0 justify-content-center">
          <button class="btn btn-danger" on:click={() => { showReceipt=false; openWizard(); }}>+ Otro Egreso</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<ConfirmDialog show={deleteConfirm} message="¿Eliminar este egreso?" onConfirm={doDelete} onCancel={() => (deleteConfirm=false)} loading={deleting} />

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
  .cat-icon .bi { font-size: 22px; line-height: 1; }
  .cat-name { font-size: 11px; font-weight: 500; color: #5a6478; line-height: 1.2; text-align: center; }
  .cat-btn.active .cat-name { color: #c0392b; }
  .empty-icon {
    display: block;
    margin: 0 auto 8px;
    font-size: 36px;
    line-height: 1;
    opacity: .2;
  }

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
  .resumen-total span:last-child { font-size: 1.4rem; }

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

  /* ── Delete button ───────────────────────────────────────────────────────── */
  .btn-icon-sm {
    background: none; border: none; cursor: pointer; color: #8a97b0;
    padding: 4px 6px; border-radius: 4px; transition: color .15s;
  }
  .btn-icon-sm:hover { color: #c0392b; background: #fdecea; }
</style>
