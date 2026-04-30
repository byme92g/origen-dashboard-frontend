<script lang="ts">
  import { onMount } from 'svelte';
  import { ingresoApi, type CrearIngresoRequest, type DetalleIngresoRequest } from '../lib/api/ingresos';
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

  let saving = false;
  let showSummary = false;
  let lastIngreso: Ingreso | null = null;
  let deleteConfirm = false; let deleteId: number | null = null;
  let montoRecibido = 0;

  // ── Cart (Step 1) ─────────────────────────────────────────────────────────
  interface CartItem {
    uid: string;
    tipo: 'servicio' | 'producto' | 'paquete' | 'personalizado';
    id?: number;
    nombre: string;
    precioUnitario: number;
    cantidad: number;
    stockMax?: number;
  }
  let cart: CartItem[] = [];
  let itemSearch = '';
  let itemDropdownOpen = false;
  let showCustomForm = false;
  let customNombre = '';
  let customMonto: number | string = '';

  // ── Form (Steps 2 & 3) ────────────────────────────────────────────────────
  let wForm = {
    clienteId: undefined as number | undefined,
    empleadoId: undefined as number | undefined,
    comision: 0,
    metodoPago: 'efectivo',
    descuento: 0,
    referencia: '',
    observaciones: '',
  };

  // ── Client search (Step 2) ────────────────────────────────────────────────
  let clienteSearch = '';
  let clienteDropdownOpen = false;
  let showAddClienteForm = false;
  let newClienteNombre = '';
  let newClienteTelefono = '';
  let addingCliente = false;

  // ── Computed ──────────────────────────────────────────────────────────────
  $: cartTotal = cart.reduce((s, item) => s + item.precioUnitario * item.cantidad, 0);
  $: montoFinal = cartTotal - (wForm.descuento ?? 0);
  $: vuelto = montoRecibido - montoFinal;
  $: step3Valid = !!wForm.metodoPago && (wForm.metodoPago !== 'efectivo' || montoRecibido >= montoFinal);

  $: filteredItems = (() => {
    const q = itemSearch.toLowerCase();
    const all = [
      ...servicios.filter(s => s.activo && (!q || s.nombre.toLowerCase().includes(q))).map(s => ({
        tipo: 'servicio' as const, id: s.id, nombre: s.nombre, precio: s.precio, extra: `${s.duracionMin} min`, stockMax: undefined as number | undefined
      })),
      ...productos.filter(p => p.activo && p.stock > 0 && (!q || p.nombre.toLowerCase().includes(q))).map(p => ({
        tipo: 'producto' as const, id: p.id, nombre: p.nombre, precio: p.precioVenta, extra: `Stock: ${p.stock}`, stockMax: p.stock as number | undefined
      })),
      ...paquetes.filter(p => p.activo && (!q || p.nombre.toLowerCase().includes(q))).map(p => ({
        tipo: 'paquete' as const, id: p.id, nombre: p.nombre, precio: p.precio - p.descuento, extra: '', stockMax: undefined as number | undefined
      })),
    ];
    return q ? all : all.slice(0, 30);
  })();

  $: filteredClientes = clienteSearch.length >= 1
    ? clientes.filter(c =>
        c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
        (c.telefono?.includes(clienteSearch) ?? false)
      ).slice(0, 10)
    : clientes.slice(0, 8);

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
    cart = [];
    itemSearch = '';
    showCustomForm = false;
    customNombre = '';
    customMonto = '';
    clienteSearch = '';
    clienteDropdownOpen = false;
    showAddClienteForm = false;
    newClienteNombre = '';
    newClienteTelefono = '';
    montoRecibido = 0;
    wForm = { clienteId: undefined, empleadoId: undefined, comision: 0, metodoPago: 'efectivo', descuento: 0, referencia: '', observaciones: '' };

    if (!$isAdmin && $authStore.user) {
      const emp = empleados.find(e => e.usuarioLogin === $authStore.user!.nombreUsuario);
      if (emp) { wForm.empleadoId = emp.id; wForm.comision = emp.comisionPct; }
    }
    step = 1; showWizard = true;
  }

  // ── Cart actions ──────────────────────────────────────────────────────────
  function addToCart(tipo: 'servicio' | 'producto' | 'paquete', id: number, nombre: string, precio: number, stockMax?: number) {
    const existing = cart.find(i => i.tipo === tipo && i.id === id);
    if (existing) {
      const atMax = stockMax !== undefined && existing.cantidad >= stockMax;
      if (!atMax) {
        cart = cart.map(i => i.uid === existing.uid ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
    } else {
      cart = [...cart, { uid: `${tipo}-${id}-${Date.now()}`, tipo, id, nombre, precioUnitario: precio, cantidad: 1, stockMax }];
    }
    itemSearch = '';
    itemDropdownOpen = false;
  }

  function addCustom() {
    const monto = Number(customMonto);
    if (!customNombre.trim() || isNaN(monto) || monto <= 0) return;
    cart = [...cart, { uid: `custom-${Date.now()}`, tipo: 'personalizado', nombre: customNombre.trim(), precioUnitario: monto, cantidad: 1 }];
    customNombre = '';
    customMonto = '';
    showCustomForm = false;
  }

  function removeFromCart(uid: string) {
    cart = cart.filter(i => i.uid !== uid);
  }

  function updateCartQty(uid: string, qty: number) {
    cart = cart.map(item => {
      if (item.uid !== uid) return item;
      const n = Math.max(1, Math.round(qty));
      return { ...item, cantidad: item.stockMax ? Math.min(n, item.stockMax) : n };
    });
  }

  // ── Client actions ────────────────────────────────────────────────────────
  function selectCliente(c: Cliente) {
    wForm.clienteId = c.id;
    clienteSearch = c.nombre;
    clienteDropdownOpen = false;
  }

  function clearCliente() {
    wForm.clienteId = undefined;
    clienteSearch = '';
  }

  async function createAndSelectCliente() {
    if (!newClienteNombre.trim()) return;
    addingCliente = true;
    const res = await clienteApi.crear({ nombre: newClienteNombre.trim(), telefono: newClienteTelefono.trim() || undefined, email: undefined, observaciones: undefined });
    addingCliente = false;
    if (res.ok && res.data) {
      const nuevo = res.data as unknown as Cliente;
      clientes = [...clientes, nuevo];
      selectCliente(nuevo);
      showAddClienteForm = false;
      newClienteNombre = '';
      newClienteTelefono = '';
      toast('Cliente creado', 'success');
    } else {
      toast('Error al crear cliente', 'error');
    }
  }

  function onEmpleadoChange() {
    const emp = empleados.find(e => e.id === Number(wForm.empleadoId));
    wForm.comision = emp?.comisionPct ?? 0;
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  function buildPayload(): CrearIngresoRequest {
    const base = {
      clienteId: wForm.clienteId ? Number(wForm.clienteId) : undefined,
      empleadoId: wForm.empleadoId ? Number(wForm.empleadoId) : undefined,
      descuento: wForm.descuento ?? 0,
      metodoPago: wForm.metodoPago,
      referencia: wForm.referencia || undefined,
      comision: wForm.comision ?? 0,
      observaciones: wForm.observaciones || undefined,
    };

    if (cart.length === 1) {
      const item = cart[0];
      return {
        ...base,
        tipo: item.tipo,
        servicioId: item.tipo === 'servicio' ? item.id : undefined,
        productoId: item.tipo === 'producto' ? item.id : undefined,
        paqueteId: item.tipo === 'paquete' ? item.id : undefined,
        conceptoPersonalizado: item.tipo === 'personalizado' ? item.nombre : undefined,
        cantidad: item.cantidad,
        monto: item.precioUnitario * item.cantidad,
      };
    }

    const allSameTipo = cart.every(i => i.tipo === cart[0].tipo);
    return {
      ...base,
      tipo: allSameTipo ? cart[0].tipo : 'personalizado',
      cantidad: cart.length,
      monto: cartTotal,
      detalles: cart.map(item => ({
        tipo: item.tipo,
        servicioId: item.tipo === 'servicio' ? item.id : undefined,
        productoId: item.tipo === 'producto' ? item.id : undefined,
        paqueteId: item.tipo === 'paquete' ? item.id : undefined,
        conceptoPersonalizado: item.tipo === 'personalizado' ? item.nombre : undefined,
        cantidad: item.cantidad,
        monto: item.precioUnitario * item.cantidad,
      } as DetalleIngresoRequest)),
    };
  }

  async function save() {
    saving = true;
    const res = await ingresoApi.crear(buildPayload());
    saving = false;
    if (res.ok && res.data) {
      toast('Ingreso registrado', 'success');
      lastIngreso = (res.data as any)?.ingreso ?? res.data;
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

  // ── Display helpers ───────────────────────────────────────────────────────
  function getConcepto(i: Ingreso): string {
    if (i.detalles && i.detalles.length > 0) {
      if (i.detalles.length === 1) {
        const d = i.detalles[0];
        return d.servicio?.nombre ?? d.producto?.nombre ?? d.paquete?.nombre ?? d.conceptoPersonalizado ?? 'Item';
      }
      const first = i.detalles[0];
      const fn = first.servicio?.nombre ?? first.producto?.nombre ?? first.paquete?.nombre ?? first.conceptoPersonalizado ?? 'Item';
      return `${fn} +${i.detalles.length - 1} más`;
    }
    switch (i.tipo) {
      case 'servicio':      return i.servicio?.nombre ?? 'Servicio';
      case 'producto':      return i.cantidad > 1 ? `${i.cantidad}× ${i.producto?.nombre ?? 'Producto'}` : (i.producto?.nombre ?? 'Producto');
      case 'paquete':       return i.paquete?.nombre ?? 'Paquete';
      case 'personalizado': return i.conceptoPersonalizado ?? 'Personalizado';
      default:              return '—';
    }
  }

  function fmtDate(s: string) {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' })
      + ' ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }
  function tipoBadgeLabel(tipo: string) {
    switch (tipo) {
      case 'servicio': return 'Serv';
      case 'producto': return 'Prod';
      case 'paquete': return 'Paq';
      default: return 'Otro';
    }
  }

  const metodoPagoItems = [
    { key: 'efectivo',      label: 'Efectivo',
      content: '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>',
      isSvg: true },
    { key: 'transferencia', label: 'Transferencia',
      content: '<path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zM11.5 1L2 6v2h19V6l-9.5-5z"/>',
      isSvg: true },
    { key: 'yape',  label: 'Yape', content: 'Y', isSvg: false, bg: '#6B21A8' },
    { key: 'plin',  label: 'Plin', content: 'P', isSvg: false, bg: '#00B4D8' },
    { key: 'pos',   label: 'POS',
      content: '<path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>',
      isSvg: true },
    { key: 'otro',  label: 'Otro',
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
  <div class="modal d-block" style="background:rgba(0,0,0,.5)">
    <div class="modal-dialog modal-fullscreen-sm-down modal-lg">
      <div class="modal-content modal-origen" style="min-height: 580px">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title">Registrar ingreso</h5>
          <button class="btn-close" aria-label="Cerrar" on:click={() => (showWizard=false)}></button>
        </div>

        <!-- Step progress -->
        <div class="px-4 pt-3 pb-0">
          <div class="d-flex align-items-center gap-2">
            {#each ['Items','Participantes','Pago'] as label, i}
              {@const n = i + 1}
              <div class="progress-num {step === n ? 'active' : step > n ? 'completed' : ''}">{step > n ? '✓' : n}</div>
              <span class="small {step >= n ? 'text-navy fw-semibold' : 'text-muted'}">{label}</span>
              {#if i < 2}<div class="progress-line {step > n ? 'done' : ''}"></div>{/if}
            {/each}
          </div>
        </div>

        <div class="modal-body pt-3">

          <!-- ── PASO 1: ITEMS ── -->
          {#if step === 1}
            <p class="text-muted small mb-3">Busca y agrega los servicios, productos o paquetes de esta transacción</p>

            <!-- Search -->
            <div class="item-search-wrap mb-3" style="position:relative">
              <div class="search-input-row">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input
                  type="text"
                  class="form-control search-input"
                  placeholder="Buscar servicio, producto o paquete…"
                  bind:value={itemSearch}
                  on:input={() => { itemDropdownOpen = true; }}
                  on:focus={() => { itemDropdownOpen = true; }}
                  on:blur={() => setTimeout(() => { itemDropdownOpen = false; }, 150)}
                />
              </div>

              {#if itemDropdownOpen}
                <div class="search-dropdown">
                  <div class="search-dd-header">
                    {#if itemSearch}
                      {filteredItems.length} resultado{filteredItems.length !== 1 ? 's' : ''} para "{itemSearch}"
                    {:else}
                      Catálogo completo — escribe para filtrar
                    {/if}
                  </div>
                  {#each filteredItems as item}
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div class="search-result" on:mousedown={() => addToCart(item.tipo, item.id, item.nombre, item.precio, item.stockMax)}>
                      <span class="tipo-pill tipo-pill-{item.tipo}">{tipoBadgeLabel(item.tipo)}</span>
                      <span class="result-name">{item.nombre}</span>
                      <span class="result-price">S/ {item.precio.toFixed(2)}</span>
                      {#if item.extra}<span class="result-extra">{item.extra}</span>{/if}
                    </div>
                  {/each}
                  {#if filteredItems.length === 0 && itemSearch}
                    <div class="search-empty">Sin resultados para "{itemSearch}"</div>
                  {/if}
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
                  <div class="search-result search-result-custom" on:mousedown={() => { itemDropdownOpen = false; showCustomForm = true; }}>
                    <span class="tipo-pill tipo-pill-personalizado">+</span>
                    <span>Concepto personalizado</span>
                  </div>
                </div>
              {/if}
            </div>

            <!-- Custom form -->
            {#if showCustomForm}
              <div class="custom-item-form mb-3">
                <div class="row g-2 mb-2">
                  <div class="col-8">
                    <input type="text" class="form-control" placeholder="Descripción *" bind:value={customNombre} />
                  </div>
                  <div class="col-4">
                    <input type="number" class="form-control" placeholder="S/ precio" step="0.5" min="0.01" bind:value={customMonto} />
                  </div>
                </div>
                <div class="d-flex gap-2">
                  <button class="btn btn-primary btn-sm" on:click={addCustom}
                    disabled={!customNombre.trim() || !customMonto || Number(customMonto) <= 0}>
                    Agregar
                  </button>
                  <button class="btn btn-outline-secondary btn-sm" on:click={() => { showCustomForm = false; customNombre = ''; customMonto = ''; }}>Cancelar</button>
                </div>
              </div>
            {/if}

            <!-- Cart -->
            {#if cart.length > 0}
              <div class="cart-list mb-3">
                <div class="cart-header">Items seleccionados</div>
                {#each cart as item (item.uid)}
                  <div class="cart-row">
                    <span class="tipo-pill tipo-pill-{item.tipo}">{tipoBadgeLabel(item.tipo)}</span>
                    <span class="cart-nombre">{item.nombre}</span>
                    <div class="cart-qty-wrap">
                      <button class="qty-btn" on:click={() => updateCartQty(item.uid, item.cantidad - 1)} disabled={item.cantidad <= 1}>−</button>
                      <input class="qty-input" type="number" min="1" max={item.stockMax ?? undefined} value={item.cantidad}
                        on:change={(e) => updateCartQty(item.uid, parseInt((e.target as HTMLInputElement).value) || 1)} />
                      <button class="qty-btn" on:click={() => updateCartQty(item.uid, item.cantidad + 1)} disabled={item.stockMax !== undefined && item.cantidad >= item.stockMax}>+</button>
                    </div>
                    <span class="cart-subtotal">S/ {(item.precioUnitario * item.cantidad).toFixed(2)}</span>
                    <button class="cart-remove" on:click={() => removeFromCart(item.uid)} title="Quitar">×</button>
                  </div>
                {/each}
                <div class="cart-total-row">
                  <span>Total</span>
                  <span class="fw-bold">S/ {cartTotal.toFixed(2)}</span>
                </div>
              </div>
            {:else}
              <div class="cart-empty">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="28" height="28" style="opacity:.25;display:block;margin:0 auto 6px"><path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
                Busca un ítem arriba para agregarlo
              </div>
            {/if}

          <!-- ── PASO 2: PARTICIPANTES ── -->
          {:else if step === 2}
            <p class="text-muted small mb-3">Selecciona el cliente atendido y el empleado responsable</p>

            <!-- Client search -->
            <div class="mb-3">
              <label class="form-label small fw-semibold">Cliente (opcional)</label>
              <div style="position:relative">
                {#if !showAddClienteForm}
                  <div class="combobox-input-row">
                    <input
                      type="text"
                      class="form-control"
                      placeholder="Buscar por nombre o teléfono…"
                      bind:value={clienteSearch}
                      on:input={() => { clienteDropdownOpen = true; if (wForm.clienteId) { wForm.clienteId = undefined; } }}
                      on:focus={() => { clienteDropdownOpen = true; }}
                      on:blur={() => setTimeout(() => {
                        clienteDropdownOpen = false;
                        if (!wForm.clienteId) clienteSearch = '';
                      }, 150)}
                    />
                    {#if wForm.clienteId || clienteSearch}
                      <button class="combobox-clear" on:mousedown|preventDefault={clearCliente} title="Quitar">×</button>
                    {/if}
                  </div>
                  {#if wForm.clienteId}
                    {@const cl = clientes.find(c => c.id === wForm.clienteId)}
                    <div class="selected-cliente">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                      {cl?.nombre ?? ''}
                      {#if cl?.telefono}<span class="text-muted"> · {cl.telefono}</span>{/if}
                    </div>
                  {/if}
                  {#if clienteDropdownOpen}
                    <div class="combobox-dropdown">
                      {#each filteredClientes as c}
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div class="combobox-item" on:mousedown={() => selectCliente(c)}>
                          <span class="combobox-item-name">{c.nombre}</span>
                          {#if c.telefono}<span class="combobox-item-tel">{c.telefono}</span>{/if}
                        </div>
                      {/each}
                      <!-- svelte-ignore a11y-no-static-element-interactions -->
                      <div class="combobox-item combobox-add-item" on:mousedown={() => { clienteDropdownOpen = false; showAddClienteForm = true; newClienteNombre = clienteSearch; }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        {clienteSearch ? `Crear "${clienteSearch}"` : 'Nuevo cliente'}
                      </div>
                    </div>
                  {/if}
                {:else}
                  <div class="add-cliente-form">
                    <div class="small fw-semibold text-muted mb-2">Nuevo cliente</div>
                    <div class="row g-2 mb-2">
                      <div class="col-8">
                        <input type="text" class="form-control" placeholder="Nombre *" bind:value={newClienteNombre} />
                      </div>
                      <div class="col-4">
                        <input type="text" class="form-control" placeholder="Teléfono" bind:value={newClienteTelefono} />
                      </div>
                    </div>
                    <div class="d-flex gap-2">
                      <button class="btn btn-primary btn-sm" on:click={createAndSelectCliente} disabled={!newClienteNombre.trim() || addingCliente}>
                        {#if addingCliente}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
                        Guardar
                      </button>
                      <button class="btn btn-outline-secondary btn-sm" on:click={() => { showAddClienteForm = false; newClienteNombre = ''; newClienteTelefono = ''; }}>Cancelar</button>
                    </div>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Employee -->
            <div class="mb-3">
              <label class="form-label small fw-semibold">Empleado responsable</label>
              {#if !$isAdmin && wForm.empleadoId}
                {@const emp = empleados.find(e => e.id === wForm.empleadoId)}
                <div class="emp-locked">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {emp?.nombre ?? '—'} <span style="color:#8a97b0;font-weight:400">· sesión activa</span>
                </div>
              {:else}
                <select class="form-select" bind:value={wForm.empleadoId} on:change={onEmpleadoChange} disabled={!$isAdmin}>
                  <option value="">— sin empleado —</option>
                  {#each empleados.filter(e => e.activo) as e}<option value={e.id}>{e.nombre} · {e.cargo}</option>{/each}
                </select>
              {/if}
            </div>

            <!-- Commission (read-only, from employee) -->
            <div class="mb-3" style="max-width:220px">
              <label class="form-label small fw-semibold">Comisión %</label>
              <div class="d-flex align-items-center gap-2">
                <input class="form-control" type="number" value={wForm.comision} disabled style="max-width:100px" />
                <span class="small text-muted">del empleado</span>
              </div>
              {#if !wForm.empleadoId}
                <div class="form-text">Selecciona un empleado para ver su comisión</div>
              {/if}
            </div>

          <!-- ── PASO 3: PAGO ── -->
          {:else}
            <p class="text-muted small mb-3">Elige cómo paga el cliente y confirma el cobro</p>
            <div class="row g-3">
              <div class="col-12 col-lg-6">
                <!-- Método de pago -->
                <label class="form-label" style="font-size:11px;font-weight:600;color:#5a6478;text-transform:uppercase;letter-spacing:.06em">Método de pago</label>
                <div class="pago-grid mb-3">
                  {#each metodoPagoItems as m}
                    <button type="button" class="pago-btn {wForm.metodoPago === m.key ? 'selected' : ''}" on:click={() => { wForm.metodoPago = m.key; if (m.key !== 'efectivo') montoRecibido = 0; }}>
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
                {#if wForm.metodoPago === 'efectivo'}
                  <div class="mb-3">
                    <label class="form-label" style="font-size:11px;font-weight:700;color:#5a6478;text-transform:uppercase;letter-spacing:.06em">Monto recibido (S/)</label>
                    <div style="position:relative">
                      <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:1.3rem;font-weight:700;color:#8a97b0;pointer-events:none">S/</span>
                      <input type="number" step="0.5" min="0" bind:value={montoRecibido}
                        on:focus={(e) => (e.target as HTMLInputElement).select()}
                        style="width:100%;padding:14px 14px 14px 46px;font-size:1.8rem;font-weight:800;color:var(--navy);border:2.5px solid {montoRecibido > 0 && montoRecibido >= montoFinal ? '#2e7d5a' : '#d0d8e8'};border-radius:8px;outline:none;background:white;transition:border-color .15s" />
                    </div>
                    {#if montoRecibido > 0 && montoRecibido < montoFinal}
                      <div class="text-danger small mt-1 fw-semibold">Monto insuficiente. Faltan S/ {(montoFinal - montoRecibido).toFixed(2)}</div>
                    {/if}
                  </div>
                {/if}

                <!-- Referencia para digital -->
                {#if wForm.metodoPago === 'yape' || wForm.metodoPago === 'plin' || wForm.metodoPago === 'transferencia'}
                  <div class="mb-3">
                    <label class="form-label small fw-semibold">N° de operación / Referencia</label>
                    <input class="form-control" bind:value={wForm.referencia} placeholder="Código de operación" />
                  </div>
                {/if}

                <!-- Descuento -->
                <div class="row g-2 mb-3">
                  <div class="col-6">
                    <label class="form-label small fw-semibold">Descuento S/</label>
                    <input class="form-control" type="number" step="0.01" min="0" bind:value={wForm.descuento}
                      on:focus={(e) => (e.target as HTMLInputElement).select()} />
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label small fw-semibold">Observaciones</label>
                  <textarea class="form-control" rows="2" bind:value={wForm.observaciones}></textarea>
                </div>
              </div>

              <!-- Summary sidebar -->
              <div class="col-12 col-lg-6">
                <div class="resumen-card">
                  <div class="resumen-header-label">Resumen del cobro</div>

                  <!-- Items -->
                  {#each cart as item}
                    <div class="resumen-row">
                      <span class="d-flex align-items-center gap-1">
                        <span class="tipo-pill tipo-pill-{item.tipo}" style="font-size:9px;padding:1px 5px">{tipoBadgeLabel(item.tipo)}</span>
                        {item.nombre}{item.cantidad > 1 ? ` ×${item.cantidad}` : ''}
                      </span>
                      <span class="fw-semibold">S/ {(item.precioUnitario * item.cantidad).toFixed(2)}</span>
                    </div>
                  {/each}

                  {#if wForm.metodoPago}<div class="resumen-row"><span>Método</span><span class="fw-semibold text-capitalize">{wForm.metodoPago}</span></div>{/if}
                  {#if (wForm.descuento ?? 0) > 0}<div class="resumen-row"><span>Descuento</span><span class="fw-semibold" style="color:#856404">-S/ {(wForm.descuento ?? 0).toFixed(2)}</span></div>{/if}
                  <div class="resumen-row resumen-total"><span>Total a cobrar</span><span>S/ {montoFinal.toFixed(2)}</span></div>

                  {#if wForm.metodoPago === 'efectivo' && montoRecibido > 0}
                    <div style="margin-top:10px;padding:10px;border-radius:8px;background:{vuelto >= 0 ? '#e8f5ee' : '#fdecea'}">
                      <div class="d-flex justify-content-between small"><span style="color:#5a6478">Recibido</span><span class="fw-semibold">S/ {montoRecibido.toFixed(2)}</span></div>
                      <div class="d-flex justify-content-between mt-1">
                        <span class="fw-bold" style="color:{vuelto >= 0 ? '#2e7d5a' : '#c0392b'}">Vuelto</span>
                        <span class="fw-bold fs-5" style="color:{vuelto >= 0 ? '#2e7d5a' : '#c0392b'}">{vuelto >= 0 ? '' : '-'}S/ {Math.abs(vuelto).toFixed(2)}</span>
                      </div>
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
              disabled={step === 1 && cart.length === 0}>
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
  <div class="modal d-block" style="background:rgba(0,0,0,.5)">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content modal-origen">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title">Ingreso registrado</h5>
          <button class="btn-close" aria-label="Cerrar" on:click={() => (showSummary=false)}></button>
        </div>
        <div class="modal-body text-center p-4">
          <div style="width:56px;height:56px;background:#e8f5ee;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2e7d5a" width="28" height="28"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </div>
          <h5 class="fw-bold">¡Ingreso Registrado!</h5>
          <p class="text-muted small">{getConcepto(lastIngreso)}</p>
          <p class="fw-bold fs-3 text-success">S/ {((lastIngreso.monto ?? 0) - (lastIngreso.descuento ?? 0)).toFixed(2)}</p>
          <p class="text-muted small">{lastIngreso.metodoPago} · {fmtDate(lastIngreso.fecha)}</p>
        </div>
        <div class="modal-footer border-0 justify-content-center">
          <button class="btn btn-success" on:click={() => { showSummary=false; openWizard(); }}>+ Nuevo Ingreso</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<ConfirmDialog show={deleteConfirm} message="¿Eliminar este ingreso?" onConfirm={doDelete} onCancel={() => (deleteConfirm=false)} />

<style>
  /* ── Item search ─────────────────────────────────────────────────────────── */
  .item-search-wrap { position: relative; }
  .search-input-row {
    display: flex; align-items: center; gap: 8px;
    border: 1.5px solid #d0d8e8; border-radius: 8px;
    padding: 8px 12px; background: white; transition: border-color .15s;
  }
  .search-input-row:focus-within { border-color: var(--navy); box-shadow: 0 0 0 3px rgba(27,58,96,.10); }
  .search-icon { color: #8a97b0; flex-shrink: 0; }
  .search-input {
    border: none !important; padding: 0 !important; outline: none !important;
    box-shadow: none !important; font-size: 13px; background: transparent;
  }
  .search-dropdown {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0;
    background: white; border: 1px solid #e0e6f0; border-radius: 8px;
    box-shadow: 0 4px 16px rgba(27,58,96,.14); z-index: 100; max-height: 260px; overflow-y: auto;
  }
  .search-result {
    display: flex; align-items: center; gap: 8px; padding: 9px 14px;
    cursor: pointer; border-bottom: 1px solid #f0f2f6; transition: background .1s;
  }
  .search-result:last-child { border-bottom: none; }
  .search-result:hover { background: #f5f7fb; }
  .search-result-custom { color: var(--navy); font-size: 12px; font-weight: 600; }
  .search-result-custom:hover { background: #eef2fa; }
  .result-name { flex: 1; font-size: 13px; color: #1a1a2e; }
  .result-price { font-size: 12px; font-weight: 600; color: #2e7d5a; white-space: nowrap; }
  .result-extra { font-size: 11px; color: #8a97b0; white-space: nowrap; }
  .search-empty { padding: 12px 14px; font-size: 12px; color: #8a97b0; font-style: italic; }
  .search-dd-header {
    padding: 7px 14px; font-size: 10px; font-weight: 600; color: #8a97b0;
    text-transform: uppercase; letter-spacing: .06em;
    background: #f8fafc; border-bottom: 1px solid #f0f2f6;
  }

  /* ── Tipo pills ──────────────────────────────────────────────────────────── */
  .tipo-pill {
    display: inline-block; font-size: 10px; font-weight: 700; border-radius: 4px;
    padding: 2px 6px; flex-shrink: 0; text-transform: uppercase; letter-spacing: .03em;
  }
  .tipo-pill-servicio     { background: #e8f5ee; color: #1a5c35; }
  .tipo-pill-producto     { background: #e3f2fd; color: #1565c0; }
  .tipo-pill-paquete      { background: #fdf3e3; color: var(--gold); }
  .tipo-pill-personalizado{ background: #f0f2f5; color: #5a6478; }

  /* ── Custom item form ────────────────────────────────────────────────────── */
  .custom-item-form {
    background: #f8fafc; border: 1px dashed #c8d4f0; border-radius: 8px; padding: 14px;
  }

  /* ── Cart ────────────────────────────────────────────────────────────────── */
  .cart-list {
    border: 1px solid #e0e6f0; border-radius: 8px; overflow: hidden;
  }
  .cart-header {
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
    color: #8a97b0; background: #f8fafc; padding: 8px 14px; border-bottom: 1px solid #e0e6f0;
  }
  .cart-row {
    display: flex; align-items: center; gap: 8px; padding: 9px 14px;
    border-bottom: 1px solid #f0f2f6; background: white;
  }
  .cart-nombre { flex: 1; font-size: 13px; color: #1a1a2e; }
  .cart-qty-wrap { display: flex; align-items: center; gap: 4px; }
  .qty-btn {
    width: 24px; height: 24px; border: 1px solid #d0d8e8; border-radius: 4px;
    background: white; cursor: pointer; font-size: 14px; line-height: 1;
    display: flex; align-items: center; justify-content: center; color: var(--navy);
    transition: background .1s;
  }
  .qty-btn:hover:not(:disabled) { background: #eef2fa; }
  .qty-btn:disabled { opacity: .4; cursor: default; }
  .qty-input {
    width: 48px; text-align: center; border: 1px solid #d0d8e8; border-radius: 4px;
    padding: 2px 4px; font-size: 13px;
  }
  .qty-fixed { font-size: 12px; color: #8a97b0; min-width: 28px; text-align: center; }
  .cart-subtotal { font-size: 13px; font-weight: 600; color: #2e7d5a; white-space: nowrap; min-width: 72px; text-align: right; }
  .cart-remove {
    background: none; border: none; cursor: pointer; font-size: 16px;
    color: #c0c8d8; padding: 0 4px; line-height: 1; border-radius: 4px; transition: color .1s;
  }
  .cart-remove:hover { color: #c0392b; }
  .cart-total-row {
    display: flex; justify-content: space-between; padding: 10px 14px;
    background: #f8fafc; font-size: 13px; color: var(--navy); border-top: 1px solid #e0e6f0;
  }
  .cart-empty {
    text-align: center; padding: 28px 16px; color: #8a97b0;
    font-size: 13px; background: #f8fafc; border: 1px dashed #d0d8e8; border-radius: 8px;
    margin-bottom: 16px;
  }

  /* ── Client combobox ─────────────────────────────────────────────────────── */
  .combobox-input-row { display: flex; align-items: center; gap: 6px; }
  .combobox-clear {
    background: none; border: 1px solid #d0d8e8; border-radius: 6px;
    cursor: pointer; font-size: 14px; color: #8a97b0; padding: 6px 10px;
    transition: all .1s; flex-shrink: 0;
  }
  .combobox-clear:hover { color: #c0392b; border-color: #c0392b; background: #fdecea; }
  .selected-cliente {
    display: inline-flex; align-items: center; gap: 5px; margin-top: 6px;
    font-size: 12px; font-weight: 600; color: var(--navy);
    background: #eef3fb; border: 1px solid #c8d4f0; border-radius: 6px; padding: 4px 10px;
  }
  .combobox-dropdown {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0;
    background: white; border: 1px solid #e0e6f0; border-radius: 8px;
    box-shadow: 0 4px 16px rgba(27,58,96,.14); z-index: 100; max-height: 220px; overflow-y: auto;
  }
  .combobox-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 9px 14px; cursor: pointer; border-bottom: 1px solid #f0f2f6; transition: background .1s;
  }
  .combobox-item:last-child { border-bottom: none; }
  .combobox-item:hover { background: #f5f7fb; }
  .combobox-item-name { font-size: 13px; color: #1a1a2e; }
  .combobox-item-tel { font-size: 11px; color: #8a97b0; }
  .combobox-add-item {
    color: var(--navy); font-size: 12px; font-weight: 600; gap: 6px; justify-content: flex-start;
  }
  .combobox-add-item:hover { background: #eef2fa; }
  .add-cliente-form {
    background: #f8fafc; border: 1px dashed #c8d4f0; border-radius: 8px; padding: 14px; margin-top: 8px;
  }

  /* ── Empleado locked ─────────────────────────────────────────────────────── */
  .emp-locked {
    padding: 10px 14px; background: #eef3fb; border-radius: 6px;
    border: 1.5px solid #c8d4f0; font-weight: 600; color: var(--navy);
    display: flex; align-items: center; gap: 6px; font-size: 13px;
  }

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

  /* ── Summary card ────────────────────────────────────────────────────────── */
  .resumen-card {
    background: #f8fafc; border: 1px solid #e0e6f0;
    border-left: 4px solid var(--navy); border-radius: 8px; padding: 18px;
    height: 100%;
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
  .resumen-total span:last-child { font-size: 1.4rem; }

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
