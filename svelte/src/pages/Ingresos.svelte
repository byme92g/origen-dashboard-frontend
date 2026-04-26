<script lang="ts">
  import { onMount } from 'svelte';
  import { ingresoApi, type CrearIngresoRequest } from '../lib/api/ingresos';
  import { clienteApi } from '../lib/api/clientes';
  import { empleadoApi } from '../lib/api/empleados';
  import { servicioApi } from '../lib/api/servicios';
  import { productoApi } from '../lib/api/productos';
  import { paqueteApi } from '../lib/api/paquetes';
  import { authStore, isAdmin } from '../lib/stores/auth';
  import Spinner from '../lib/components/Spinner.svelte';
  import Pagination from '../lib/components/Pagination.svelte';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';
  import { toast } from '../lib/stores/toast';
  import type { Ingreso, Cliente, Empleado, Servicio, Producto, Paquete } from '../lib/types';

  // ── State ─────────────────────────────────────────────────────────────────
  let items: Ingreso[] = []; let total = 0; let page = 1; const pageSize = 10;
  let loading = true;

  const today = new Date().toISOString().split('T')[0];
  const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  let desde = thirtyAgo; let hasta = today;

  let showWizard = false; let step = 1;
  let clientes: Cliente[] = []; let empleados: Empleado[] = [];
  let servicios: Servicio[] = []; let productos: Producto[] = []; let paquetes: Paquete[] = [];

  let form: Partial<CrearIngresoRequest> = {};
  let montoRecibido = 0;
  let saving = false;
  let showSummary = false;
  let lastIngreso: Ingreso | null = null;
  let deleteConfirm = false; let deleteId: number | null = null;

  // ── Data loaders ──────────────────────────────────────────────────────────
  async function load() {
    loading = true;
    const res = await ingresoApi.listarPaginado(page, pageSize, desde || undefined, hasta || undefined);
    if (res.ok && res.data) {
      if (Array.isArray(res.data)) { items = res.data as unknown as Ingreso[]; total = items.length; }
      else { items = res.data.items; total = res.data.total; }
    }
    loading = false;
  }

  async function loadCatalogs() {
    const [cr, er, sr, pr, pkr] = await Promise.all([
      clienteApi.listar(), empleadoApi.listar(), servicioApi.listar(), productoApi.listar(), paqueteApi.listar()
    ]);
    if (cr.ok && cr.data) clientes = cr.data as unknown as Cliente[];
    if (er.ok && er.data) empleados = er.data as unknown as Empleado[];
    if (sr.ok && sr.data) servicios = sr.data as unknown as Servicio[];
    if (pr.ok && pr.data) productos = pr.data as unknown as Producto[];
    if (pkr.ok && pkr.data) paquetes = pkr.data as unknown as Paquete[];
  }

  onMount(() => { load(); loadCatalogs(); });

  // ── Wizard ────────────────────────────────────────────────────────────────
  function openWizard() {
    form = { fecha: today, tipo: '', cantidad: 1, monto: 0, descuento: 0, comision: 0, metodoPago: '' };
    montoRecibido = 0;
    if (!$isAdmin && $authStore.user) {
      const emp = empleados.find(e => e.usuarioLogin === $authStore.user!.nombreUsuario);
      if (emp) form.empleadoId = emp.id;
    }
    step = 1; showWizard = true;
  }

  // Auto-fill price/commission when item selected
  $: if (form.tipo === 'servicio' && form.servicioId) {
    const s = servicios.find(x => x.id === form.servicioId);
    if (s) { form.monto = s.precio; form.comision = s.comisionPct; }
  }
  $: if (form.tipo === 'producto' && form.productoId) {
    const p = productos.find(x => x.id === form.productoId);
    if (p) { form.monto = p.precioVenta * (form.cantidad ?? 1); }
  }
  $: if (form.tipo === 'paquete' && form.paqueteId) {
    const pk = paquetes.find(x => x.id === form.paqueteId);
    if (pk) { form.monto = pk.precio - pk.descuento; form.comision = pk.comisionPct; }
  }

  $: selectedServicio = servicios.find(x => x.id === form.servicioId);
  $: selectedProducto = productos.find(x => x.id === form.productoId);
  $: selectedPaquete  = paquetes.find(x => x.id === form.paqueteId);

  $: montoFinal = (form.monto ?? 0) - (form.descuento ?? 0);
  $: vuelto = montoRecibido - montoFinal;
  $: step3Valid = !!form.metodoPago && (form.metodoPago !== 'efectivo' || montoRecibido >= montoFinal);

  async function save() {
    saving = true;
    const res = await ingresoApi.crear(form as CrearIngresoRequest);
    saving = false;
    if (res.ok && res.data) {
      toast('Ingreso registrado', 'success');
      lastIngreso = res.data;
      showWizard = false; showSummary = true;
      load();
    } else toast(res.error ?? 'Error al guardar', 'error');
  }

  async function doDelete() {
    if (!deleteId) return;
    const res = await ingresoApi.eliminar(deleteId);
    deleteConfirm = false;
    if (res.ok) { toast('Eliminado', 'success'); load(); }
    else toast(res.error ?? 'Error', 'error');
  }

  function getConcepto(i: Ingreso): string {
    switch (i.tipo) {
      case 'servicio':     return i.servicio?.nombre ?? 'Servicio';
      case 'producto':     return i.cantidad > 1 ? `${i.cantidad}x ${i.producto?.nombre ?? 'Producto'}` : (i.producto?.nombre ?? 'Producto');
      case 'paquete':      return i.paquete?.nombre ?? 'Paquete';
      case 'personalizado': return i.conceptoPersonalizado ?? 'Personalizado';
      default:             return '—';
    }
  }

  function fmtDate(s: string) {
    const d = new Date(s);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' })
      + ' ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }
  function fmt(v: number) { return `S/ ${v.toFixed(2)}`; }

  const tipoItems = [
    { key: 'servicio', label: 'Servicio',
      svg: '<path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z"/>' },
    { key: 'producto', label: 'Producto',
      svg: '<path d="M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-6-2v2h-4V5h4zM4 20V9h16v11H4z"/>' },
    { key: 'paquete', label: 'Paquete',
      svg: '<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z"/>' },
    { key: 'personalizado', label: 'Personalizado',
      svg: '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>' },
  ];

  const metodoPagoItems = [
    { key: 'efectivo',      label: 'Efectivo',
      content: '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>',
      isSvg: true },
    { key: 'transferencia', label: 'Transferencia',
      content: '<path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zM11.5 1L2 6v2h19V6l-9.5-5z"/>',
      isSvg: true },
    { key: 'yape',          label: 'Yape',    content: 'Y',  isSvg: false, bg: '#6B21A8' },
    { key: 'plin',          label: 'Plin',    content: 'P',  isSvg: false, bg: '#00B4D8' },
    { key: 'pos',           label: 'POS',
      content: '<path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>',
      isSvg: true },
    { key: 'otro',          label: 'Otro',
      content: '<path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>',
      isSvg: true },
  ];
</script>

<div class="p-3 p-md-4">
  <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
    <div>
      <h5 class="fw-bold mb-0">Ingresos</h5>
      <p class="text-muted small mb-0">Historial de transacciones registradas</p>
    </div>
    <button class="btn btn-primary btn-sm" on:click={openWizard}>+ Nuevo Ingreso</button>
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
              <th>Concepto</th>
              <th class="d-none d-md-table-cell">Cliente</th>
              <th class="d-none d-lg-table-cell">Empleado</th>
              <th>Método</th>
              <th class="text-end">Total</th>
              {#if $isAdmin}<th class="pe-3"></th>{/if}
            </tr>
          </thead>
          <tbody>
            {#each items as i}
              <tr>
                <td class="ps-3 small text-muted" style="white-space:nowrap">{fmtDate(i.fecha)}</td>
                <td class="small fw-semibold">{getConcepto(i)}</td>
                <td class="small text-muted d-none d-md-table-cell">{i.cliente?.nombre ?? '—'}</td>
                <td class="small text-muted d-none d-lg-table-cell">{i.empleado?.nombre ?? '—'}</td>
                <td><span class="metodo-badge metodo-{i.metodoPago}">{i.metodoPago}</span></td>
                <td class="text-end fw-bold small text-success">S/ {(i.monto - i.descuento).toFixed(2)}</td>
                {#if $isAdmin}
                  <td class="pe-3 text-end">
                    <button class="btn-icon-sm" title="Eliminar" on:click={() => { deleteId = i.id; deleteConfirm = true; }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                  </td>
                {/if}
              </tr>
            {:else}
              <tr><td colspan="7" class="text-center text-muted py-5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="36" height="36" style="opacity:.2;display:block;margin:0 auto 8px"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
                Sin ingresos en el período seleccionado
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
    <div class="modal-dialog modal-dialog-scrollable modal-fullscreen-sm-down modal-lg">
      <div class="modal-content modal-origen">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title">Registrar ingreso</h5>
          <button class="btn-close" on:click={() => (showWizard=false)}></button>
        </div>

        <!-- Step progress -->
        <div class="px-4 pt-3 pb-0">
          <div class="d-flex align-items-center gap-2">
            {#each ['Tipo y concepto','Involucrados','Pago'] as label, i}
              {@const n = i + 1}
              <div class="progress-num {step === n ? 'active' : step > n ? 'completed' : ''}">{step > n ? '✓' : n}</div>
              <span class="small {step >= n ? 'text-navy fw-semibold' : 'text-muted'}">{label}</span>
              {#if i < 2}<div class="progress-line {step > n ? 'done' : ''}"></div>{/if}
            {/each}
          </div>
        </div>

        <div class="modal-body pt-3">

          <!-- ── PASO 1: TIPO ── -->
          {#if step === 1}
            <p class="text-muted small mb-3">Selecciona qué tipo de ingreso es esta transacción</p>
            <div class="tipo-grid mb-3">
              {#each tipoItems as t}
                <button type="button" class="tipo-btn {form.tipo === t.key ? 'active' : ''}" on:click={() => { form.tipo = t.key; form.servicioId = undefined; form.productoId = undefined; form.paqueteId = undefined; form.conceptoPersonalizado = ''; form.monto = 0; }}>
                  <span class="tipo-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">{@html t.svg}</svg>
                  </span>
                  <span class="tipo-name">{t.label}</span>
                </button>
              {/each}
            </div>

            {#if form.tipo === 'servicio'}
              <div class="mb-3">
                <label class="form-label small fw-semibold">Servicio *</label>
                <select class="form-select" bind:value={form.servicioId}>
                  <option value="">— seleccionar —</option>
                  {#each servicios.filter(s => s.activo) as s}<option value={s.id}>{s.nombre} — S/ {s.precio.toFixed(2)}</option>{/each}
                </select>
              </div>
              {#if selectedServicio}
                <div class="d-flex flex-wrap gap-2 mb-3">
                  <span class="info-chip price">S/ {selectedServicio.precio.toFixed(2)}</span>
                  {#if selectedServicio.comisionPct > 0}<span class="info-chip">{selectedServicio.comisionPct}% comisión</span>{/if}
                  <span class="info-chip">{selectedServicio.duracionMin} min</span>
                </div>
              {/if}
            {:else if form.tipo === 'producto'}
              <div class="mb-3">
                <label class="form-label small fw-semibold">Producto *</label>
                <select class="form-select" bind:value={form.productoId}>
                  <option value="">— seleccionar —</option>
                  {#each productos.filter(p => p.activo && p.stock > 0) as p}<option value={p.id}>{p.nombre} — S/ {p.precioVenta.toFixed(2)} (stock: {p.stock})</option>{/each}
                </select>
              </div>
              {#if selectedProducto}
                <div class="mb-3">
                  <label class="form-label small fw-semibold">Cantidad</label>
                  <input class="form-control" type="number" min="1" max={selectedProducto.stock} bind:value={form.cantidad} style="max-width:120px" />
                </div>
                <div class="d-flex flex-wrap gap-2 mb-3">
                  <span class="info-chip">S/ {selectedProducto.precioVenta.toFixed(2)} c/u</span>
                  <span class="info-chip price">Subtotal: S/ {(selectedProducto.precioVenta * (form.cantidad ?? 1)).toFixed(2)}</span>
                  <span class="info-chip">Stock: {selectedProducto.stock}</span>
                </div>
              {/if}
            {:else if form.tipo === 'paquete'}
              <div class="mb-3">
                <label class="form-label small fw-semibold">Paquete *</label>
                <select class="form-select" bind:value={form.paqueteId}>
                  <option value="">— seleccionar —</option>
                  {#each paquetes.filter(p => p.activo) as p}<option value={p.id}>{p.nombre} — S/ {p.precio.toFixed(2)}</option>{/each}
                </select>
              </div>
              {#if selectedPaquete}
                <div class="d-flex flex-wrap gap-2 mb-3">
                  <span class="info-chip">S/ {selectedPaquete.precio.toFixed(2)}</span>
                  {#if selectedPaquete.descuento > 0}<span class="info-chip warn">-S/ {selectedPaquete.descuento.toFixed(2)} dcto</span>{/if}
                  <span class="info-chip price">Total: S/ {(selectedPaquete.precio - selectedPaquete.descuento).toFixed(2)}</span>
                  {#if selectedPaquete.comisionPct > 0}<span class="info-chip">{selectedPaquete.comisionPct}% comisión</span>{/if}
                </div>
              {/if}
            {:else if form.tipo === 'personalizado'}
              <div class="mb-3">
                <label class="form-label small fw-semibold">Descripción *</label>
                <input class="form-control" bind:value={form.conceptoPersonalizado} placeholder="Ej: Diseño especial, consulta…" />
              </div>
              <div class="mb-3" style="max-width:200px">
                <label class="form-label small fw-semibold">Monto S/ *</label>
                <input class="form-control" type="number" step="0.5" min="0" bind:value={form.monto} />
              </div>
            {/if}

            <div class="mb-3" style="max-width:200px">
              <label class="form-label small fw-semibold">Fecha</label>
              <input class="form-control" type="date" bind:value={form.fecha} />
            </div>

          <!-- ── PASO 2: INVOLUCRADOS ── -->
          {:else if step === 2}
            <p class="text-muted small mb-3">Selecciona el cliente atendido y el empleado responsable (ambos opcionales)</p>
            <div class="mb-3">
              <label class="form-label small fw-semibold">Cliente (opcional)</label>
              <select class="form-select" bind:value={form.clienteId}>
                <option value="">— sin cliente —</option>
                {#each clientes as c}<option value={c.id}>{c.nombre}{c.telefono ? ' · ' + c.telefono : ''}</option>{/each}
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-semibold">Empleado responsable</label>
              {#if !$isAdmin && form.empleadoId}
                {@const emp = empleados.find(e => e.id === form.empleadoId)}
                <div class="emp-locked">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {emp?.nombre ?? '—'} <span style="color:#8a97b0;font-weight:400">· sesión activa</span>
                </div>
              {:else}
                <select class="form-select" bind:value={form.empleadoId} disabled={!$isAdmin}>
                  <option value="">— sin empleado —</option>
                  {#each empleados.filter(e => e.activo) as e}<option value={e.id}>{e.nombre} · {e.cargo}</option>{/each}
                </select>
              {/if}
            </div>
            <div class="mb-3" style="max-width:180px">
              <label class="form-label small fw-semibold">Comisión %</label>
              <input class="form-control" type="number" step="0.01" bind:value={form.comision} />
            </div>

          <!-- ── PASO 3: PAGO ── -->
          {:else}
            <p class="text-muted small mb-3">Elige cómo paga el cliente y confirma el cobro</p>
            <div class="row g-3">
              <div class="col-12 col-lg-7">
                <!-- Método de pago -->
                <label class="form-label" style="font-size:11px;font-weight:600;color:#5a6478;text-transform:uppercase;letter-spacing:.06em">Método de pago</label>
                <div class="pago-grid mb-3">
                  {#each metodoPagoItems as m}
                    <button type="button" class="pago-btn {form.metodoPago === m.key ? 'selected' : ''}" on:click={() => { form.metodoPago = m.key; if (m.key !== 'efectivo') montoRecibido = 0; }}>
                      <div class="pago-icon">
                        {#if m.isSvg}
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="26" height="26">{@html m.content}</svg>
                        {:else}
                          <span class="brand-badge" style="background:{m.bg}">{m.content}</span>
                        {/if}
                      </div>
                      <span>{m.label}</span>
                    </button>
                  {/each}
                </div>

                <!-- Monto recibido (solo efectivo) -->
                {#if form.metodoPago === 'efectivo'}
                  <div class="mb-3">
                    <label class="form-label" style="font-size:11px;font-weight:700;color:#5a6478;text-transform:uppercase;letter-spacing:.06em">Monto recibido (S/)</label>
                    <div style="position:relative">
                      <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:1.3rem;font-weight:700;color:#8a97b0;pointer-events:none;font-family:var(--font-heading)">S/</span>
                      <input type="number" step="0.5" min="0" bind:value={montoRecibido}
                        style="width:100%;padding:14px 14px 14px 46px;font-size:1.8rem;font-weight:800;font-family:var(--font-heading);color:var(--navy);border:2.5px solid {montoRecibido > 0 && montoRecibido >= montoFinal ? '#2e7d5a' : '#d0d8e8'};border-radius:8px;outline:none;background:white;transition:border-color .15s" />
                    </div>
                    {#if montoRecibido > 0 && montoRecibido < montoFinal}
                      <div class="text-danger small mt-1 fw-semibold">Monto insuficiente. Faltan S/ {(montoFinal - montoRecibido).toFixed(2)}</div>
                    {/if}
                  </div>
                {/if}

                <!-- Referencia para digital -->
                {#if form.metodoPago === 'yape' || form.metodoPago === 'plin' || form.metodoPago === 'transferencia'}
                  <div class="mb-3">
                    <label class="form-label small fw-semibold">N° de operación / Referencia</label>
                    <input class="form-control" bind:value={form.referencia} placeholder="Código de operación" />
                  </div>
                {/if}

                <!-- Descuento -->
                <div class="row g-2 mb-3">
                  <div class="col-6">
                    <label class="form-label small fw-semibold">Descuento S/</label>
                    <input class="form-control" type="number" step="0.01" min="0" bind:value={form.descuento} />
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label small fw-semibold">Observaciones</label>
                  <textarea class="form-control" rows="2" bind:value={form.observaciones}></textarea>
                </div>
              </div>

              <!-- Summary sidebar -->
              <div class="col-12 col-lg-5">
                <div class="resumen-card">
                  <div class="resumen-header-label">Resumen del cobro</div>
                  <div class="resumen-row"><span>Concepto</span><span class="fw-semibold">{form.tipo === 'personalizado' ? form.conceptoPersonalizado : (selectedServicio?.nombre ?? selectedProducto?.nombre ?? selectedPaquete?.nombre ?? '—')}</span></div>
                  {#if form.metodoPago}<div class="resumen-row"><span>Método</span><span class="fw-semibold text-capitalize">{form.metodoPago}</span></div>{/if}
                  {#if (form.descuento ?? 0) > 0}<div class="resumen-row"><span>Descuento</span><span class="fw-semibold" style="color:#856404">-S/ {(form.descuento ?? 0).toFixed(2)}</span></div>{/if}
                  <div class="resumen-row resumen-total"><span>Total a cobrar</span><span>S/ {montoFinal.toFixed(2)}</span></div>
                  {#if form.metodoPago === 'efectivo' && montoRecibido > 0}
                    <div style="margin-top:10px;padding:10px;border-radius:8px;background:{vuelto >= 0 ? '#e8f5ee' : '#fdecea'}">
                      <div class="d-flex justify-content-between small"><span style="color:#5a6478">Recibido</span><span class="fw-semibold">S/ {montoRecibido.toFixed(2)}</span></div>
                      <div class="d-flex justify-content-between mt-1"><span class="fw-bold" style="color:{vuelto >= 0 ? '#2e7d5a' : '#c0392b'}">Vuelto</span><span class="fw-bold fs-5" style="font-family:var(--font-heading);color:{vuelto >= 0 ? '#2e7d5a' : '#c0392b'}">{vuelto >= 0 ? '' : '-'}S/ {Math.abs(vuelto).toFixed(2)}</span></div>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/if}
        </div>

        <div class="modal-footer border-0">
          {#if step > 1}<button class="btn btn-outline-secondary btn-sm" on:click={() => step--}>← Atrás</button>{/if}
          {#if step < 3}
            <button class="btn btn-primary btn-sm" on:click={() => step++}
              disabled={step === 1 && (!form.tipo || (form.tipo === 'servicio' && !form.servicioId) || (form.tipo === 'producto' && !form.productoId) || (form.tipo === 'paquete' && !form.paqueteId) || (form.tipo === 'personalizado' && (!form.conceptoPersonalizado || !form.monto)))}>
              Siguiente →
            </button>
          {:else}
            <button class="btn btn-success btn-sm" on:click={save} disabled={saving || !step3Valid}>
              {#if saving}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
              Registrar ingreso
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ── Resumen post-registro ─────────────────────────────────────────────── -->
{#if showSummary && lastIngreso}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="modal d-block" style="background:rgba(0,0,0,.5)" on:click|self={() => (showSummary=false)}>
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content modal-origen">
        <div class="modal-body text-center p-4">
          <div style="width:56px;height:56px;background:#e8f5ee;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2e7d5a" width="28" height="28"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </div>
          <h5 class="fw-bold">¡Ingreso Registrado!</h5>
          <p class="text-muted small">{getConcepto(lastIngreso)}</p>
          <p class="fw-bold fs-3 text-success" style="font-family:var(--font-heading)">S/ {(lastIngreso.monto - lastIngreso.descuento).toFixed(2)}</p>
          <p class="text-muted small">{lastIngreso.metodoPago} · {fmtDate(lastIngreso.fecha)}</p>
        </div>
        <div class="modal-footer border-0 justify-content-center">
          <button class="btn btn-success" on:click={() => { showSummary=false; openWizard(); }}>+ Nuevo Ingreso</button>
          <button class="btn btn-outline-secondary" on:click={() => (showSummary=false)}>Cerrar</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<ConfirmDialog show={deleteConfirm} message="¿Eliminar este ingreso?" onConfirm={doDelete} onCancel={() => (deleteConfirm=false)} />

<style>
  /* ── Tipo grid ───────────────────────────────────────────────────────────── */
  .tipo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 10px;
  }
  .tipo-btn {
    padding: 14px 8px; border: 2px solid #d0d8e8; border-radius: 8px;
    background: white; cursor: pointer; transition: all .15s; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    color: #8a97b0;
  }
  .tipo-btn:hover { border-color: var(--navy); background: #f0f4ff; color: var(--navy); }
  .tipo-btn.active { border-color: var(--navy); background: #eef2fa; color: var(--navy); }
  .tipo-btn.active .tipo-name { color: var(--navy); font-weight: 700; }
  .tipo-name { font-size: 12px; font-weight: 500; color: #5a6478; }
  .tipo-btn.active .tipo-name { color: var(--navy); }

  /* ── Info chips ──────────────────────────────────────────────────────────── */
  .info-chip {
    background: #f0f4ff; border: 1px solid #c8d4f0; border-radius: 20px;
    padding: 3px 10px; font-size: 12px; font-weight: 600; color: var(--navy);
  }
  .info-chip.price { background: #e8f5ee; border-color: #aad4bc; color: #1a5c35; }
  .info-chip.warn  { background: #fff8e7; border-color: #f0d080; color: #856404; }

  /* ── Pago grid ───────────────────────────────────────────────────────────── */
  .pago-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 10px;
  }
  .pago-btn {
    padding: 12px 8px; border: 2px solid #d0d8e8; border-radius: 8px;
    background: white; cursor: pointer; transition: all .15s; text-align: center;
    font-size: 11px; font-weight: 600; color: #5a6478;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
  }
  .pago-btn:hover { border-color: var(--gold); background: #fdf9f3; }
  .pago-btn.selected { border-color: var(--gold); background: #fdf3e3; color: var(--gold); }
  .pago-icon { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; }
  .brand-badge {
    display: inline-flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; border-radius: 8px; color: white; font-weight: 800; font-size: 16px;
  }

  /* ── Empleado locked ─────────────────────────────────────────────────────── */
  .emp-locked {
    padding: 10px 14px; background: #eef3fb; border-radius: 6px;
    border: 1.5px solid #c8d4f0; font-weight: 600; color: var(--navy);
    display: flex; align-items: center; gap: 6px; font-size: 13px;
  }

  /* ── Summary card ────────────────────────────────────────────────────────── */
  .resumen-card {
    background: #f8fafc; border: 1px solid #e0e6f0;
    border-left: 4px solid var(--navy); border-radius: 8px; padding: 18px;
  }
  .resumen-header-label {
    font-size: 10px; font-weight: 700; color: #8a97b0;
    letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;
  }
  .resumen-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 7px 0; border-bottom: 1px solid #edf0f5; font-size: 13px; color: #5a6478;
  }
  .resumen-row:last-child { border-bottom: none; }
  .resumen-total {
    padding-top: 12px; font-size: 14px; font-weight: 700; color: var(--navy);
  }
  .resumen-total span:last-child { font-family: var(--font-heading); font-size: 1.4rem; }

  /* ── Step progress ───────────────────────────────────────────────────────── */
  .progress-num {
    width: 26px; height: 26px; border-radius: 50%; background: #e8edf4;
    color: #5a6478; display: flex; align-items: center; justify-content: center;
    font-weight: 600; font-size: 12px; flex-shrink: 0;
  }
  .progress-num.active    { background: var(--navy); color: white; }
  .progress-num.completed { background: #2e7d5a;     color: white; font-size: 10px; }
  .progress-line { flex: 1; height: 2px; background: #e8edf4; min-width: 20px; }
  .progress-line.done { background: var(--navy); }
  .text-navy { color: var(--navy); }

  /* ── Table ───────────────────────────────────────────────────────────────── */
  .metodo-badge {
    display: inline-block; padding: 2px 8px; border-radius: 12px;
    font-size: 11px; font-weight: 700;
  }
  .metodo-efectivo     { background: #e8f5e9; color: #2e7d32; }
  .metodo-yape         { background: #ede7f6; color: #6b21a8; }
  .metodo-plin         { background: #e0f7fa; color: #00838f; }
  .metodo-transferencia{ background: #e3f2fd; color: #1565c0; }
  .metodo-pos          { background: #fff3e0; color: #e65100; }
  .metodo-otro         { background: #f0f4ff; color: var(--navy); }
  .btn-icon-sm {
    background: none; border: none; cursor: pointer; color: #8a97b0;
    padding: 4px 6px; border-radius: 4px; transition: color .15s;
  }
  .btn-icon-sm:hover { color: #c0392b; background: #fdecea; }
</style>
