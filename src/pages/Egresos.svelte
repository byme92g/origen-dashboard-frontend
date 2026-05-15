<script lang="ts">
  import { onMount } from 'svelte';
  import { egresoApi, type CategoriaEgreso, type CrearEgresoRequest } from '../lib/api/egresos';
  import { cajaApi } from '../lib/api/caja';
  import { isAdmin } from '../lib/stores/auth';
  import Spinner from '../lib/components/Spinner.svelte';
  import Pagination from '../lib/components/Pagination.svelte';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';
  import { toast } from '../lib/stores/toast';
  import type { Egreso } from '../lib/types';
  import { fmtDateField, limaTodayStr, limaDaysAgoStr } from '../lib/utils/date';
  import '../styles/pages/_egresos.css';

  // ── State ─────────────────────────────────────────────────────────────────
  let items: Egreso[] = []; let total = 0; let page = 1; const pageSize = 10;
  let loading = true;

  const today = limaTodayStr();
  const thirtyAgo = limaDaysAgoStr(30);
  let desde = thirtyAgo; let hasta = today;
  let filterMetodo = '';

  let showWizard = false; let step = 1;
  let form: Partial<CrearEgresoRequest> = {};
  let saving = false;
  let showReceipt = false;
  let lastEgreso: Egreso | null = null;
  let deleteConfirm = false; let deleteId: number | null = null; let deleting = false;

  // Caja state
  let cajaAbierta = false;
  let cajaResponsable: string | null = null;
  let cajaLoading = true;

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
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
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
    const res = await egresoApi.listarPaginado(page, pageSize, desde || undefined, hasta || undefined, filterMetodo || undefined);
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

  async function loadCajaEstado() {
    cajaLoading = true;
    const res = await cajaApi.estado();
    if (res.ok && res.data) {
      cajaAbierta = res.data.abierta;
      if (res.data.abierta && res.data.apertura?.responsables?.length > 0) {
        cajaResponsable = res.data.apertura.responsables.map((r: any) => r.empleado?.nombre ?? r.empleadoId).join(', ');
      }
    }
    cajaLoading = false;
  }

  onMount(() => {
    loadCategorias();
    load();
    loadCajaEstado();
  });

  function openWizard() {
    if (!cajaAbierta) {
      toast('Debes abrir una caja antes de registrar egresos.', 'error');
      return;
    }
    form = { fecha: today, categoriaId: 0, metodoPago: 'efectivo' };
    step = 1; showWizard = true;
  }

  async function save() {
    saving = true;
    const res = await egresoApi.crear(form as CrearEgresoRequest);
    saving = false;
    if (res.ok && res.data) {
      toast('Egreso registrado', 'success');
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

  const fmtDate = fmtDateField;
  function fmt(v: number) { return `S/. ${v.toFixed(2)}`; }
  function catLabel(key: string | number | { id: number; nombre: string } | undefined | null): string {
    if (!key && key !== 0) return '—';
    if (typeof key === 'object') return key.nombre;
    return categoriaLabels[key] ?? String(key);
  }

  const metodoPagoItems = [
    { key: 'efectivo',      label: 'Efectivo',      icon: 'bi-cash-stack' },
    { key: 'transferencia', label: 'Transferencia', icon: 'bi-bank' },
    { key: 'yape',          label: 'Yape',          content: 'Y', bg: '#6B21A8' },
    { key: 'plin',          label: 'Plin',          content: 'P', bg: '#00B4D8' },
    { key: 'pos',           label: 'POS',           icon: 'bi-credit-card' },
    { key: 'otro',          label: 'Otro',          icon: 'bi-three-dots' },
  ];

  $: step2Valid = !!(form.descripcion && (form.monto ?? 0) > 0);
</script>

<div class="p-3 p-md-4">
  <div class="page-panel mb-3">
    <div class="page-panel__top">
      <div class="d-flex align-items-center gap-3">
        <div class="page-panel__icon"><i class="bi bi-arrow-up-circle"></i></div>
        <div>
          <h5 class="fw-bold mb-0">Egresos</h5>
          <p class="text-muted small mb-0">Historial de gastos y salidas registradas</p>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2">
        {#if !cajaLoading && !cajaAbierta}
          <span class="badge bg-warning text-dark small">
            <i class="bi bi-exclamation-triangle me-1"></i>Sin caja abierta
          </span>
        {/if}
        <button class="btn btn-danger btn-sm d-none d-sm-block" on:click={openWizard} disabled={cajaLoading || !cajaAbierta}>
          <i class="bi bi-plus-lg me-1"></i>Registrar Egreso
        </button>
      </div>
    </div>
    <div class="d-sm-none px-3 pb-2">
      <button class="btn btn-danger btn-sm w-100 rounded-pill btn-cta-origen" on:click={openWizard} disabled={cajaLoading || !cajaAbierta}>
        <i class="bi bi-plus-lg me-1"></i>Registrar Egreso
      </button>
    </div>
    <div class="page-panel__filters">
      <i class="bi bi-calendar3 page-panel__filter-cal-icon"></i>
      <div>
        <label for="egreso-desde" class="page-panel__filter-label">Desde</label>
        <input id="egreso-desde" type="date" class="form-control form-control-sm page-panel__filter-date"
          bind:value={desde} on:change={() => { page = 1; load(); }} />
      </div>
      <span class="page-panel__filter-sep">→</span>
      <div>
        <label for="egreso-hasta" class="page-panel__filter-label">Hasta</label>
        <input id="egreso-hasta" type="date" class="form-control form-control-sm page-panel__filter-date"
          bind:value={hasta} on:change={() => { page = 1; load(); }} />
      </div>
      <div>
        <label for="egreso-metodo" class="page-panel__filter-label">Método</label>
        <select id="egreso-metodo" class="form-select form-select-sm page-panel__filter-date"
          bind:value={filterMetodo} on:change={() => { page = 1; load(); }}>
          <option value="">Todos</option>
          {#each metodoPagoItems as m}<option value={m.key}>{m.label}</option>{/each}
        </select>
      </div>
      <button class="btn btn-sm btn-outline-secondary"
        on:click={() => { desde = today; hasta = today; page = 1; load(); }}>
        Hoy
      </button>
      {#if desde !== thirtyAgo || hasta !== today || filterMetodo}
        <button class="btn btn-sm btn-link text-muted p-0"
          on:click={() => { desde = thirtyAgo; hasta = today; filterMetodo = ''; page = 1; load(); }}>
          Limpiar
        </button>
      {/if}
    </div>
  </div>

  {#if loading}<Spinner />{:else}
    <div class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table table-sm table-hover table-origen mb-0">
          <thead class="table-origen table-origen--navy">
            <tr>
              <th class="ps-3">Fecha</th>
              <th>Descripción</th>
              <th>Categoría</th>
              <th class="d-none d-md-table-cell">Proveedor</th>
              <th class="d-none d-sm-table-cell">Método</th>
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
                <td class="d-none d-sm-table-cell">
                  {#if e.metodoPago}
                    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
                    <span class="metodo-badge metodo-badge--{e.metodoPago} metodo-badge--clickable"
                      title="Filtrar por {e.metodoPago}"
                      on:click={() => { filterMetodo = e.metodoPago ?? ''; page = 1; load(); }}>
                      {e.metodoPago}
                    </span>
                  {:else}—{/if}
                </td>
                <td class="text-end fw-bold small text-danger">-{fmt(e.monto)}</td>
                {#if $isAdmin}
                  <td class="pe-3 text-end">
                    <button class="btn-icon" title="Eliminar" on:click={() => { deleteId = e.id; deleteConfirm = true; }}>
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                {/if}
              </tr>
            {:else}
              <tr><td colspan="7" class="text-center text-muted py-5">
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

        <!-- Responsable de caja -->
        {#if cajaResponsable}
          <div class="px-4 pt-2">
            <div class="small" style="background:#f0f4ff;border-radius:8px;padding:8px 12px;color:#5a6478">
              <i class="bi bi-person-badge me-1" style="color:#1a2a4a"></i>
              Responsable: <strong style="color:#1a2a4a">{cajaResponsable}</strong>
            </div>
          </div>
        {/if}

        <!-- Step progress -->
        <div class="px-4 pt-3 pb-0">
          <div class="d-flex align-items-center gap-2 wizard--expense">
            {#each ['Categoría', 'Detalle', 'Confirmar'] as label, i}
              {@const n = i + 1}
              <div class="wizard__step {step === n ? 'wizard__step--active' : step > n ? 'wizard__step--done' : ''}">{step > n ? '✓' : n}</div>
              <span class="small {step >= n ? 'text-navy fw-semibold' : 'text-muted'}">{label}</span>
              {#if i < 2}<div class="wizard__line {step > n ? 'wizard__line--done' : ''}"></div>{/if}
            {/each}
          </div>
        </div>

        <div class="modal-body pt-3">

          <!-- ── PASO 1: CATEGORÍA ── -->
          {#if step === 1}
            <p class="text-muted small mb-3">Selecciona la categoría que mejor describe este gasto</p>
            <div class="cat-grid mb-3">
              {#each categoriaItems as c}
                <button type="button" class="cat-grid__btn {form.categoriaId === c.key ? 'cat-grid__btn--active' : ''}" on:click={() => (form.categoriaId = Number(c.key))}>
                  <span class="cat-grid__icon"><i class="bi {c.icon}"></i></span>
                  <span class="cat-grid__name">{c.shortLabel}</span>
                </button>
              {/each}
            </div>

          <!-- ── PASO 2: DETALLE ── -->
          {:else if step === 2}
            <p class="text-muted small mb-3">Ingresa los datos del gasto en <strong>{catLabel(form.categoriaId)}</strong></p>

            <div class="mb-3">
              <label for="egreso-monto" class="form-label" style="font-size:11px;font-weight:700;color:#5a6478;text-transform:uppercase;letter-spacing:.06em">Monto (S/)</label>
              <div style="position:relative">
                <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:1.3rem;font-weight:700;color:#c0392b;pointer-events:none">S/.</span>
                <input id="egreso-monto" type="number" step="0.01" min="0" bind:value={form.monto}
                  placeholder="0.00"
                  style="width:100%;padding:14px 14px 14px 62px;font-size:1.8rem;font-weight:800;color:#c0392b;border:2.5px solid {(form.monto ?? 0) > 0 ? '#c0392b' : '#d0d8e8'};border-radius:8px;outline:none;background:white;transition:border-color .15s" />
              </div>
            </div>

            <div class="mb-3">
              <label for="egreso-descripcion" class="form-label small fw-semibold">Descripción *</label>
              <input id="egreso-descripcion" class="form-control" bind:value={form.descripcion} placeholder="Ej: Compra de tintes, pago de luz…" />
            </div>

            <div class="row g-2 mb-3">
              <div class="col-6">
                <label for="egreso-fecha" class="form-label small fw-semibold">Fecha</label>
                <input id="egreso-fecha" class="form-control" type="date" bind:value={form.fecha} />
              </div>
              <div class="col-6">
                <label for="egreso-proveedor" class="form-label small fw-semibold">Proveedor</label>
                <input id="egreso-proveedor" class="form-control" bind:value={form.proveedor} placeholder="Opcional" />
              </div>
            </div>

            <div class="mb-3">
              <label for="egreso-comprobante" class="form-label small fw-semibold">N° de comprobante</label>
              <input id="egreso-comprobante" class="form-control" bind:value={form.comprobante} placeholder="Boleta / Factura (opcional)" />
            </div>

            <div class="mb-3">
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="form-label" style="font-size:11px;font-weight:600;color:#5a6478;text-transform:uppercase;letter-spacing:.06em">Método de pago</label>
              <div class="pago pago--expense">
                {#each metodoPagoItems as m}
                  <button type="button" class="pago__btn {form.metodoPago === m.key ? 'pago__btn--selected' : ''}" on:click={() => (form.metodoPago = m.key)}>
                    <div class="pago__icon">
                      {#if m.icon}
                        <i class="bi {m.icon}"></i>
                      {:else}
                        <span class="pago__brand" style="background:{m.bg}">{m.content}</span>
                      {/if}
                    </div>
                    <span>{m.label}</span>
                  </button>
                {/each}
              </div>
            </div>

          <!-- ── PASO 3: CONFIRMAR ── -->
          {:else}
            <p class="text-muted small mb-3">Revisa los datos antes de confirmar el registro</p>
            <div class="resumen--expense mb-3">
              <div class="resumen__header">Resumen del egreso</div>
              <div class="resumen__row"><span>Categoría</span><span class="cat-badge">{catLabel(form.categoriaId)}</span></div>
              <div class="resumen__row"><span>Descripción</span><span class="fw-semibold">{form.descripcion}</span></div>
              <div class="resumen__row"><span>Fecha</span><span>{form.fecha}</span></div>
              {#if form.proveedor}<div class="resumen__row"><span>Proveedor</span><span>{form.proveedor}</span></div>{/if}
              {#if form.comprobante}<div class="resumen__row"><span>Comprobante</span><span>{form.comprobante}</span></div>{/if}
              {#if form.metodoPago}<div class="resumen__row"><span>Método de pago</span><span class="metodo-badge metodo-badge--{form.metodoPago}">{form.metodoPago}</span></div>{/if}
              {#if cajaResponsable}<div class="resumen__row"><span>Responsable</span><span class="fw-semibold">{cajaResponsable}</span></div>{/if}
              <div class="resumen__row resumen__row--total"><span>Total a registrar</span><span>- {fmt(form.monto ?? 0)}</span></div>
            </div>
            <div class="mb-3">
              <label for="egreso-observaciones" class="form-label small fw-semibold">Observaciones</label>
              <textarea id="egreso-observaciones" class="form-control" rows="2" bind:value={form.observaciones} placeholder="Notas adicionales (opcional)"></textarea>
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
