<script lang="ts">
  import { onMount } from 'svelte';
  import { ingresoApi, type CrearIngresoRequest, type DetalleIngresoRequest, type PagoMixtoRequest } from '../lib/api/ingresos';
  import { cajaApi } from '../lib/api/caja';
  import { clienteApi } from '../lib/api/clientes';
  import { empleadoApi } from '../lib/api/empleados';
  import { servicioApi } from '../lib/api/servicios';
  import { productoApi } from '../lib/api/productos';
  import { paqueteApi } from '../lib/api/paquetes';
  import { authStore, isAdmin } from '../lib/stores/auth';
  import { campanaPreseleccionada } from '../lib/stores/campana';
  import Spinner from '../lib/components/Spinner.svelte';
  import Pagination from '../lib/components/Pagination.svelte';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';
  import { toast } from '../lib/stores/toast';
  import type { Ingreso, IngresoDetalle, Cliente, Empleado, Servicio, Producto, Paquete, Campana } from '../lib/types';
  import { fmtDatetime as _fmtDatetime, limaTodayStr, limaDaysAgoStr } from '../lib/utils/date';
  import '../styles/pages/_ingresos.css';

  // ── State ─────────────────────────────────────────────────────────────────
  let items: Ingreso[] = []; let total = 0; let page = 1; const pageSize = 10;
  let loading = true;

  const today = limaTodayStr();
  const thirtyAgo = limaDaysAgoStr(30);
  let desde = thirtyAgo; let hasta = today;
  let filterMetodo = '';

  let showWizard = false; let step = 1;
  let clientes: Cliente[] = []; let empleados: Empleado[] = [];
  let servicios: Servicio[] = []; let productos: Producto[] = []; let paquetes: Paquete[] = [];

  // Caja state
  let cajaAbierta = false;
  let cajaLoading = true;

  let saving = false;
  let showSummary = false;
  let lastIngreso: Ingreso | null = null;
  let deleteConfirm = false; let deleteId: number | null = null;

  // Detail modal (read-only)
  let showDetail = false;
  let detailIngreso: Ingreso | null = null;
  let detailLoading = false;

  async function openDetail(id: number) {
    showDetail = true;
    detailLoading = true;
    detailIngreso = null;
    const res = await ingresoApi.obtener(id);
    if (res.ok && res.data) detailIngreso = res.data;
    detailLoading = false;
  }
  let montoRecibido: number | string = '';

  // ── Cart (Step 1) ─────────────────────────────────────────────────────────
  interface CartItem {
    uid: string;
    tipo: 'servicio' | 'producto' | 'paquete' | 'personalizado';
    id?: number;
    nombre: string;
    precioUnitario: number;
    descuento: number;
    cantidad: number;
    comisionPct: number;
    stockMax?: number;
  }

  function effectivePrice(item: CartItem) {
    return item.precioUnitario * (1 - item.descuento / 100);
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
    descuento: '' as number | string,
    referencia: '',
    observaciones: '',
  };

  // ── Split payment (Step 3) ────────────────────────────────────────────────
  interface SplitPago { metodoPago: string; monto: number | string; referencia: string; }
  let modoSplit = false;
  let splitPagos: SplitPago[] = [
    { metodoPago: 'yape', monto: '', referencia: '' },
    { metodoPago: 'efectivo', monto: '', referencia: '' },
  ];

  function addSplitPago() {
    splitPagos = [...splitPagos, { metodoPago: 'otro', monto: '', referencia: '' }];
  }
  function removeSplitPago(idx: number) {
    if (splitPagos.length <= 2) return;
    splitPagos = splitPagos.filter((_, i) => i !== idx);
  }
  function enterSplit() {
    // Pre-fill first row with montoFinal so user just adjusts
    splitPagos = [
      { metodoPago: wForm.metodoPago, monto: montoFinal, referencia: wForm.referencia },
      { metodoPago: 'yape', monto: '', referencia: '' },
    ];
    modoSplit = true;
    montoRecibido = '';
  }
  function exitSplit() { modoSplit = false; splitPagos = [{ metodoPago: 'yape', monto: '', referencia: '' }, { metodoPago: 'efectivo', monto: '', referencia: '' }]; }

  // ── Client search (Step 2) ────────────────────────────────────────────────
  let clienteSearch = '';
  let clienteDropdownOpen = false;
  let showAddClienteForm = false;
  let newClienteNombre = '';
  let newClienteDni = '';
  let addingCliente = false;

  // Caja responsible employee
  let cajaEmpleadoId: number | undefined = undefined;
  $: cajaEmp = empleados.find(e => e.id === wForm.empleadoId);

  // ── Computed ──────────────────────────────────────────────────────────────
  $: cartTotal = cart.reduce((s, item) => s + effectivePrice(item) * item.cantidad, 0);
  $: totalComision = cart.reduce((s, item) => s + (item.comisionPct / 100) * effectivePrice(item) * item.cantidad, 0);
  $: descuentoValue = Math.min(Number(wForm.descuento) || 0, cartTotal);
  $: descuentoInvalido = (Number(wForm.descuento) || 0) > cartTotal;
  $: montoRecibidoValue = Number(montoRecibido) || 0;
  $: montoFinal = cartTotal - descuentoValue;
  $: vuelto = montoRecibidoValue - montoFinal;
  $: splitSuma = splitPagos.reduce((s, p) => s + (Number(p.monto) || 0), 0);
  $: splitDiff = Math.abs(splitSuma - montoFinal);
  $: splitValido = splitPagos.length >= 2
    && splitPagos.every(p => !!p.metodoPago && Number(p.monto) > 0)
    && splitDiff < 0.01;
  $: step2Valid = !!wForm.clienteId;
  $: step3Valid = !descuentoInvalido && (modoSplit
    ? splitValido
    : !!wForm.metodoPago && (wForm.metodoPago !== 'efectivo' || montoRecibidoValue >= montoFinal));

  $: filteredItems = (() => {
    const q = itemSearch.toLowerCase();
    const all = [
      ...servicios.filter(s => s.activo && (!q || s.nombre.toLowerCase().includes(q))).map(s => ({
        tipo: 'servicio' as const, id: s.id, nombre: s.nombre, precio: s.precio, descuento: s.descuento, comisionPct: s.comisionPct, extra: `${s.duracionMin} min`, stockMax: undefined as number | undefined
      })),
      ...productos.filter(p => p.activo && p.stock > 0 && (!q || p.nombre.toLowerCase().includes(q))).map(p => ({
        tipo: 'producto' as const, id: p.id, nombre: p.nombre, precio: p.precioVenta, descuento: p.descuento, comisionPct: p.comisionPct, extra: `Stock: ${p.stock}`, stockMax: p.stock as number | undefined
      })),
      ...paquetes.filter(p => p.activo && (!q || p.nombre.toLowerCase().includes(q))).map(p => ({
        tipo: 'paquete' as const, id: p.id, nombre: p.nombre, precio: p.precio, descuento: p.descuento, comisionPct: p.comisionPct, extra: '', stockMax: undefined as number | undefined
      })),
    ];
    return q ? all : all.slice(0, 30);
  })();

  $: filteredClientes = clienteSearch.length >= 1
    ? clientes.filter(c =>
        c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
        (c.dni?.includes(clienteSearch) ?? false)
      ).slice(0, 10)
    : clientes.slice(0, 8);

  // ── Data loaders ──────────────────────────────────────────────────────────
  async function load() {
    loading = true;
    const res = await ingresoApi.listarPaginado(page, pageSize, desde || undefined, hasta || undefined, filterMetodo || undefined);
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

  async function loadCajaEstado() {
    cajaLoading = true;
    const res = await cajaApi.estado();
    if (res.ok && res.data) {
      cajaAbierta = res.data.abierta;
      const responsables = res.data.apertura?.responsables;
      if (responsables?.length > 0) cajaEmpleadoId = responsables[0].empleadoId;
    }
    cajaLoading = false;
  }

  onMount(async () => {
    await Promise.all([load(), loadCatalogs(), loadCajaEstado()]);

    // If a campaign was pre-selected (from popup), open wizard with that item
    const campana = $campanaPreseleccionada;
    if (campana) {
      campanaPreseleccionada.set(null);
      openWizardWithCampana(campana);
    }
  });

  // ── Wizard ────────────────────────────────────────────────────────────────
  function resetWizard() {
    cart = [];
    itemSearch = '';
    showCustomForm = false;
    customNombre = '';
    customMonto = '';
    clienteSearch = '';
    clienteDropdownOpen = false;
    showAddClienteForm = false;
    newClienteNombre = '';
    newClienteDni = '';
    montoRecibido = '';
    modoSplit = false;
    splitPagos = [{ metodoPago: 'yape', monto: '', referencia: '' }, { metodoPago: 'efectivo', monto: '', referencia: '' }];
    wForm = { clienteId: undefined, empleadoId: cajaEmpleadoId, comision: 0, metodoPago: 'efectivo', descuento: '', referencia: '', observaciones: '' };

    const emp = empleados.find(e => e.id === cajaEmpleadoId);
    if (emp) wForm.comision = emp.comisionPct;
  }

  function openWizard() {
    if (!cajaAbierta) { toast('Debes abrir una caja antes de registrar ingresos.', 'error'); return; }
    resetWizard(); step = 1; showWizard = true;
  }

  function openWizardWithCampana(c: Campana) {
    resetWizard();
    // Pre-load the campaign item into cart
    if (c.tipo === 'servicio' && c.servicio) {
      const s = servicios.find(sv => sv.id === c.servicio!.id) ?? { id: c.servicio.id, nombre: c.servicio.nombre, precio: c.servicio.precio, comisionPct: 0, descuento: 0 } as Servicio;
      cart = [{ uid: `servicio-${s.id}-${Date.now()}`, tipo: 'servicio', id: s.id, nombre: s.nombre, precioUnitario: s.precio, descuento: s.descuento ?? 0, cantidad: 1, comisionPct: s.comisionPct ?? 0 }];
    } else if (c.tipo === 'producto' && c.producto) {
      const p = productos.find(pr => pr.id === c.producto!.id);
      if (p) cart = [{ uid: `producto-${p.id}-${Date.now()}`, tipo: 'producto', id: p.id, nombre: p.nombre, precioUnitario: p.precioVenta, descuento: p.descuento ?? 0, cantidad: 1, comisionPct: p.comisionPct ?? 0, stockMax: p.stock }];
    } else if (c.tipo === 'paquete' && c.paquete) {
      const pk = paquetes.find(p => p.id === c.paquete!.id);
      if (pk) cart = [{ uid: `paquete-${pk.id}-${Date.now()}`, tipo: 'paquete', id: pk.id, nombre: pk.nombre, precioUnitario: pk.precio, descuento: pk.descuento ?? 0, cantidad: 1, comisionPct: pk.comisionPct ?? 0 }];
    }
    step = cart.length > 0 ? 2 : 1;
    showWizard = true;
  }

  // ── Cart actions ──────────────────────────────────────────────────────────
  function addToCart(tipo: 'servicio' | 'producto' | 'paquete', id: number, nombre: string, precio: number, comisionPct: number, descuento: number, stockMax?: number) {
    const existing = cart.find(i => i.tipo === tipo && i.id === id);
    if (existing) {
      const atMax = stockMax !== undefined && existing.cantidad >= stockMax;
      if (!atMax) {
        cart = cart.map(i => i.uid === existing.uid ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
    } else {
      cart = [...cart, { uid: `${tipo}-${id}-${Date.now()}`, tipo, id, nombre, precioUnitario: precio, descuento, cantidad: 1, comisionPct, stockMax }];
    }
    itemSearch = '';
    itemDropdownOpen = false;
  }

  function addCustom() {
    const monto = Number(customMonto);
    if (!customNombre.trim() || isNaN(monto) || monto <= 0) return;
    cart = [...cart, { uid: `custom-${Date.now()}`, tipo: 'personalizado', nombre: customNombre.trim(), precioUnitario: monto, descuento: 0, cantidad: 1, comisionPct: 0 }];
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
    if (!newClienteNombre.trim() || !newClienteDni.trim()) return;
    addingCliente = true;
    const res = await clienteApi.crear({ nombre: newClienteNombre.trim(), dni: newClienteDni.trim(), email: undefined, telefono: undefined, observaciones: undefined });
    addingCliente = false;
    if (res.ok && res.data) {
      const nuevo = res.data as unknown as Cliente;
      clientes = [nuevo, ...clientes];
      selectCliente(nuevo);
      showAddClienteForm = false;
      newClienteNombre = '';
      newClienteDni = '';
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
    const allSameTipo = cart.every(i => i.tipo === cart[0].tipo);
    return {
      clienteId: wForm.clienteId ? Number(wForm.clienteId) : undefined,
      empleadoId: wForm.empleadoId ? Number(wForm.empleadoId) : undefined,
      tipo: allSameTipo ? cart[0].tipo : 'personalizado',
      cantidad: cart.reduce((s, i) => s + i.cantidad, 0),
      monto: cartTotal,
      descuento: descuentoValue,
      metodoPago: modoSplit ? 'mixto' : wForm.metodoPago,
      referencia: modoSplit ? undefined : (wForm.referencia || undefined),
      comision: totalComision,
      montoRecibido: !modoSplit && wForm.metodoPago === 'efectivo' && montoRecibidoValue > 0 ? montoRecibidoValue : undefined,
      observaciones: wForm.observaciones || undefined,
      detalles: cart.map(item => ({
        tipo: item.tipo,
        nombre: item.nombre,
        productoId: item.tipo === 'producto' ? item.id : undefined,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        descuentoPct: item.descuento,
        monto: effectivePrice(item) * item.cantidad,
      } as DetalleIngresoRequest)),
      pagos: modoSplit
        ? splitPagos.map(p => ({
            metodoPago: p.metodoPago,
            monto: Number(p.monto),
            referencia: p.referencia || undefined,
          } as PagoMixtoRequest))
        : undefined,
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
  function getConceptoBase(i: Ingreso): string {
    if (i.detalles && i.detalles.length > 0) return i.detalles[0].nombre || 'Ítem';
    return i.servicio?.nombre ?? i.producto?.nombre ?? i.paquete?.nombre ?? i.conceptoPersonalizado ?? '—';
  }
  function getConceptoExtra(i: Ingreso): string | null {
    return i.detalles && i.detalles.length > 1 ? `+${i.detalles.length - 1} más` : null;
  }
  function getConcepto(i: Ingreso): string {
    if (i.detalles && i.detalles.length > 0) {
      if (i.detalles.length === 1) return i.detalles[0].nombre || 'Ítem';
      return `${i.detalles[0].nombre || 'Ítem'} +${i.detalles.length - 1} más`;
    }
    switch (i.tipo) {
      case 'servicio':      return i.servicio?.nombre ?? 'Servicio';
      case 'producto':      return i.cantidad > 1 ? `${i.cantidad}× ${i.producto?.nombre ?? 'Producto'}` : (i.producto?.nombre ?? 'Producto');
      case 'paquete':       return i.paquete?.nombre ?? 'Paquete';
      case 'personalizado': return i.conceptoPersonalizado ?? 'Personalizado';
      default:              return '—';
    }
  }

  const fmtDate = _fmtDatetime;
  function tipoBadgeLabel(tipo: string) {
    switch (tipo) {
      case 'servicio': return 'Serv';
      case 'producto': return 'Prod';
      case 'paquete': return 'Paq';
      default: return 'Otro';
    }
  }

  function detalleNombre(d: IngresoDetalle): string {
    return d.nombre || 'Ítem';
  }

  const metodoPagoItems = [
    { key: 'efectivo',      label: 'Efectivo',      icon: 'bi-cash-stack' },
    { key: 'transferencia', label: 'Transferencia', icon: 'bi-bank' },
    { key: 'yape',          label: 'Yape',          content: 'Y', bg: '#6B21A8' },
    { key: 'plin',          label: 'Plin',          content: 'P', bg: '#00B4D8' },
    { key: 'pos',           label: 'POS',           icon: 'bi-credit-card' },
    { key: 'otro',          label: 'Otro',          icon: 'bi-three-dots' },
  ];
</script>

<div class="p-3 p-md-4">
  <div class="page-panel mb-3">
    <div class="page-panel__top">
      <div class="d-flex align-items-center gap-3">
        <div class="page-panel__icon">
          <i class="bi bi-arrow-down-circle"></i>
        </div>
        <div>
          <h5 class="fw-bold mb-0">Ingresos</h5>
          <p class="text-muted small mb-0">Historial de transacciones registradas</p>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2">
        {#if !cajaLoading && !cajaAbierta}
          <span class="badge bg-warning text-dark small">
            <i class="bi bi-exclamation-triangle me-1"></i>Sin caja abierta
          </span>
        {/if}
        <button class="btn btn-primary btn-sm d-none d-sm-block" on:click={openWizard} disabled={cajaLoading || !cajaAbierta}>
          <i class="bi bi-plus-lg me-1"></i>Nuevo Ingreso
        </button>
      </div>
    </div>
    <div class="d-sm-none px-3 pb-2">
      <button class="btn btn-primary btn-sm w-100 rounded-pill btn-cta-origen" on:click={openWizard} disabled={cajaLoading || !cajaAbierta}>
        <i class="bi bi-plus-lg me-1"></i>Nuevo Ingreso
      </button>
    </div>
    <div class="page-panel__filters">
      <i class="bi bi-calendar3 page-panel__filter-cal-icon"></i>
      <div>
        <label for="ingreso-desde" class="page-panel__filter-label">Desde</label>
        <input id="ingreso-desde" type="date" class="form-control form-control-sm page-panel__filter-date"
          bind:value={desde} on:change={() => { page = 1; load(); }} />
      </div>
      <span class="page-panel__filter-sep">→</span>
      <div>
        <label for="ingreso-hasta" class="page-panel__filter-label">Hasta</label>
        <input id="ingreso-hasta" type="date" class="form-control form-control-sm page-panel__filter-date"
          bind:value={hasta} on:change={() => { page = 1; load(); }} />
      </div>
      <button class="btn btn-sm btn-outline-secondary"
        on:click={() => { desde = today; hasta = today; page = 1; load(); }}>
        Hoy
      </button>
      <select class="form-select form-select-sm" style="width:auto;min-width:130px"
        bind:value={filterMetodo} on:change={() => { page = 1; load(); }}>
        <option value="">Todos los métodos</option>
        {#each metodoPagoItems as m}<option value={m.key}>{m.label}</option>{/each}
      </select>
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
              <th>Concepto</th>
              <th class="d-none d-md-table-cell">Cliente</th>
              <th class="d-none d-lg-table-cell">Empleado</th>
              <th>Método</th>
              <th class="text-end">Total</th>
              <th class="pe-3"></th>
            </tr>
          </thead>
          <tbody>
            {#each items as i}
              <tr>
                <td class="ps-3 small text-muted" style="white-space:nowrap">{fmtDate(i.fecha)}</td>
                <td class="small fw-semibold">
                  {getConceptoBase(i)}{#if getConceptoExtra(i)} <span class="concepto-extra">{getConceptoExtra(i)}</span>{/if}
                </td>
                <td class="small text-muted d-none d-md-table-cell">{i.cliente?.nombre ?? '—'}</td>
                <td class="small text-muted d-none d-lg-table-cell">{i.empleado?.nombre ?? '—'}</td>
                <td><span class="metodo-badge metodo-badge--{i.metodoPago}">{i.metodoPago}</span></td>
                <td class="text-end fw-bold small text-success">S/ {(i.monto - i.descuento).toFixed(2)}</td>
                <td class="pe-3 text-end" style="white-space:nowrap">
                  <button class="btn-icon" title="Ver detalle" on:click={() => openDetail(i.id)}>
                    <i class="bi bi-eye"></i>
                  </button>
                  {#if $isAdmin}
                    <button class="btn-icon ms-1" title="Eliminar" on:click={() => { deleteId = i.id; deleteConfirm = true; }}>
                      <i class="bi bi-trash"></i>
                    </button>
                  {/if}
                </td>
              </tr>
            {:else}
              <tr><td colspan="7" class="text-center text-muted py-5">
                <i class="bi bi-cash-stack item-search__empty-icon"></i>
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
    <div class="modal-dialog modal-fullscreen-sm-down modal-xl">
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
              <div class="wizard__step {step === n ? 'wizard__step--active' : step > n ? 'wizard__step--done' : ''}">{step > n ? '✓' : n}</div>
              <span class="small {step >= n ? 'text-navy fw-semibold' : 'text-muted'}">{label}</span>
              {#if i < 2}<div class="wizard__line {step > n ? 'wizard__line--done' : ''}"></div>{/if}
            {/each}
          </div>
        </div>

        <div class="modal-body pt-3">

          <!-- ── PASO 1: ITEMS ── -->
          {#if step === 1}
            <p class="text-muted small mb-3">Busca y agrega los servicios, productos o paquetes de esta transacción</p>

            <div class="item-search mb-3" style="position:relative">
              <div class="item-search__input-row">
                <i class="bi bi-search item-search__icon"></i>
                <input
                  type="text"
                  class="form-control item-search__input"
                  placeholder="Buscar servicio, producto o paquete…"
                  bind:value={itemSearch}
                  on:input={() => { itemDropdownOpen = true; }}
                  on:focus={() => { itemDropdownOpen = true; }}
                  on:blur={() => setTimeout(() => { itemDropdownOpen = false; }, 150)}
                />
              </div>

              {#if itemDropdownOpen}
                <div class="item-search__dropdown">
                  <div class="item-search__dropdown-header">
                    {#if itemSearch}
                      {filteredItems.length} resultado{filteredItems.length !== 1 ? 's' : ''} para "{itemSearch}"
                    {:else}
                      Catálogo completo — escribe para filtrar
                    {/if}
                  </div>
                  {#each filteredItems as item}
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div class="item-search__result" on:mousedown={() => addToCart(item.tipo, item.id, item.nombre, item.precio, item.comisionPct, item.descuento, item.stockMax)}>
                      <span class="tipo-pill tipo-pill--{item.tipo}">{tipoBadgeLabel(item.tipo)}</span>
                      <span class="item-search__result-name">{item.nombre}</span>
                      {#if item.descuento > 0}
                        <span class="item-search__result-price"><s class="item-search__result-original">S/ {item.precio.toFixed(2)}</s> S/ {(item.precio * (1 - item.descuento / 100)).toFixed(2)}</span>
                        <span class="item-search__result-extra item-search__result-discount">-{item.descuento}%</span>
                      {:else}
                        <span class="item-search__result-price">S/ {item.precio.toFixed(2)}</span>
                        {#if item.extra}<span class="item-search__result-extra">{item.extra}</span>{/if}
                      {/if}
                    </div>
                  {/each}
                  {#if filteredItems.length === 0 && itemSearch}
                    <div class="item-search__empty-msg">Sin resultados para "{itemSearch}"</div>
                  {/if}
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
                  <div class="item-search__result item-search__result--custom" on:mousedown={() => { itemDropdownOpen = false; showCustomForm = true; }}>
                    <span class="tipo-pill tipo-pill--personalizado">+</span>
                    <span>Concepto personalizado</span>
                  </div>
                </div>
              {/if}
            </div>

            {#if showCustomForm}
              <div class="custom-item mb-3">
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

            {#if cart.length > 0}
              <div class="cart mb-3">
                <div class="cart__header">Items seleccionados</div>
                <div style="overflow-x:auto">
                  <table class="table table-sm mb-0" style="min-width:520px;table-layout:fixed">
                    <colgroup>
                      <col style="width:68px" />   <!-- Tipo -->
                      <col />                       <!-- Ítem (auto) -->
                      <col style="width:130px" />   <!-- Cant. -->
                      <col style="width:110px" />   <!-- P. unitario -->
                      <col style="width:90px" />    <!-- Descuento -->
                      <col style="width:110px" />   <!-- Subtotal -->
                      <col style="width:32px" />    <!-- × -->
                    </colgroup>
                    <thead>
                      <tr style="font-size:10px;color:#8a97b0;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e8edf5">
                        <th class="ps-3 fw-semibold border-0">Tipo</th>
                        <th class="fw-semibold border-0">Ítem</th>
                        <th class="text-center fw-semibold border-0">Cant.</th>
                        <th class="text-end fw-semibold border-0">P. unitario</th>
                        <th class="text-end fw-semibold border-0">Descuento</th>
                        <th class="text-end fw-semibold border-0 pe-3">Subtotal</th>
                        <th class="border-0"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each cart as item (item.uid)}
                        <tr style="border-bottom:1px solid #f0f3f8">
                          <td class="ps-3 align-middle py-2" style="border:none">
                            <span class="tipo-pill tipo-pill--{item.tipo}">{tipoBadgeLabel(item.tipo)}</span>
                          </td>
                          <td class="align-middle py-2" style="border:none;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">
                            <span class="small fw-semibold" title={item.nombre}>{item.nombre}</span>
                          </td>
                          <td class="align-middle text-center py-2" style="border:none">
                            <div class="cart__qty">
                              <button class="cart__qty-btn" on:click={() => updateCartQty(item.uid, item.cantidad - 1)} disabled={item.cantidad <= 1}>−</button>
                              <input class="cart__qty-input" type="number" min="1" max={item.stockMax ?? undefined} value={item.cantidad}
                                on:change={(e) => updateCartQty(item.uid, parseInt((e.target as HTMLInputElement).value) || 1)} />
                              <button class="cart__qty-btn" on:click={() => updateCartQty(item.uid, item.cantidad + 1)} disabled={item.stockMax !== undefined && item.cantidad >= item.stockMax}>+</button>
                            </div>
                          </td>
                          <td class="text-end align-middle small py-2" style="border:none;color:#4a5568">
                            S/ {item.precioUnitario.toFixed(2)}
                          </td>
                          <td class="text-end align-middle py-2" style="border:none">
                            {#if item.descuento > 0}
                              <span class="cart__discount-tag">-{item.descuento}%</span>
                            {:else}
                              <span class="text-muted" style="font-size:12px">—</span>
                            {/if}
                          </td>
                          <td class="text-end align-middle fw-bold small pe-3 py-2" style="border:none;color:#1a2a4a">
                            S/ {(effectivePrice(item) * item.cantidad).toFixed(2)}
                          </td>
                          <td class="align-middle py-2" style="border:none">
                            <button class="cart__remove" on:click={() => removeFromCart(item.uid)} title="Quitar">×</button>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                    <tfoot>
                      <tr style="border-top:2px solid #e8edf5">
                        <td colspan="5" class="ps-3 py-2 text-end small fw-semibold" style="border:none;color:#1a2a4a">Total</td>
                        <td class="text-end fw-bold pe-3 py-2" style="border:none;color:#1a2a4a;font-size:1rem">S/ {cartTotal.toFixed(2)}</td>
                        <td style="border:none"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            {:else}
              <div class="cart__empty">
                <i class="bi bi-bag-plus cart__empty-icon"></i>
                Busca un ítem arriba para agregarlo
              </div>
            {/if}

          <!-- ── PASO 2: PARTICIPANTES ── -->
          {:else if step === 2}
            <p class="text-muted small mb-3">Selecciona el cliente atendido y el empleado responsable</p>

            <!-- Client search (required) -->
            <div class="mb-3">
              <label for="ingreso-cliente-search" class="form-label small fw-semibold">
                Cliente <span class="text-danger">*</span>
              </label>
              <div style="position:relative">
                {#if !showAddClienteForm}
                  <div class="combobox__input-row">
                    <input
                      id="ingreso-cliente-search"
                      type="text"
                      class="form-control {!wForm.clienteId && clienteSearch === '' ? '' : ''}"
                      placeholder="Buscar por nombre o DNI…"
                      bind:value={clienteSearch}
                      on:input={() => { clienteDropdownOpen = true; if (wForm.clienteId) { wForm.clienteId = undefined; } }}
                      on:focus={() => { clienteDropdownOpen = true; }}
                      on:blur={() => setTimeout(() => {
                        clienteDropdownOpen = false;
                        if (!wForm.clienteId) clienteSearch = '';
                      }, 150)}
                    />
                    {#if wForm.clienteId || clienteSearch}
                      <button class="combobox__clear" on:mousedown|preventDefault={clearCliente} title="Quitar">×</button>
                    {/if}
                  </div>
                  {#if wForm.clienteId}
                    {@const cl = clientes.find(c => c.id === wForm.clienteId)}
                    <div class="combobox__selected">
                      <i class="bi bi-person"></i>
                      {cl?.nombre ?? ''}
                      {#if cl?.dni}<span class="text-muted"> · DNI {cl.dni}</span>{/if}
                    </div>
                  {/if}
                  {#if clienteDropdownOpen}
                    <div class="combobox__dropdown">
                      {#each filteredClientes as c}
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div class="combobox__item" on:mousedown={() => selectCliente(c)}>
                          <span class="combobox__item-name">{c.nombre}</span>
                          {#if c.dni}<span class="combobox__item-tel">DNI {c.dni}</span>{/if}
                        </div>
                      {/each}
                      <!-- svelte-ignore a11y-no-static-element-interactions -->
                      <div class="combobox__item combobox__item--add" on:mousedown={() => { clienteDropdownOpen = false; showAddClienteForm = true; newClienteNombre = clienteSearch; }}>
                        <i class="bi bi-plus-lg"></i>
                        {clienteSearch ? `Crear "${clienteSearch}"` : 'Nuevo cliente'}
                      </div>
                    </div>
                  {/if}
                {:else}
                  <div class="combobox__add-form">
                    <div class="small fw-semibold text-muted mb-2">Nuevo cliente</div>
                    <div class="row g-2 mb-2">
                      <div class="col-8">
                        <input type="text" class="form-control" placeholder="Nombre *" bind:value={newClienteNombre} />
                      </div>
                      <div class="col-4">
                        <input type="text" class="form-control" placeholder="DNI *" maxlength="8" bind:value={newClienteDni} />
                      </div>
                    </div>
                    <div class="d-flex gap-2">
                      <button class="btn btn-primary btn-sm" on:click={createAndSelectCliente} disabled={!newClienteNombre.trim() || !newClienteDni.trim() || addingCliente}>
                        {#if addingCliente}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
                        Guardar
                      </button>
                      <button class="btn btn-outline-secondary btn-sm" on:click={() => { showAddClienteForm = false; newClienteNombre = ''; newClienteDni = ''; }}>Cancelar</button>
                    </div>
                  </div>
                {/if}
              </div>
              {#if !wForm.clienteId && !showAddClienteForm}
                <div class="small text-danger mt-1">Debes seleccionar o crear un cliente para continuar.</div>
              {/if}
            </div>

            <!-- Employee (locked to caja responsible) -->
            <div class="mb-3">
              <p class="form-label small fw-semibold mb-1">Empleado responsable</p>
              <div class="emp-locked">
                <i class="bi bi-person-badge"></i>
                {cajaEmp?.nombre ?? '—'} <span style="color:#8a97b0;font-weight:400">· responsable de caja</span>
              </div>
            </div>

          <!-- ── PASO 3: PAGO ── -->
          {:else}
            <p class="text-muted small mb-3">Elige cómo paga el cliente y confirma el cobro</p>
            <div class="row g-3">
              <div class="col-12 col-lg-6 d-flex flex-column">
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label class="form-label" style="font-size:11px;font-weight:600;color:#5a6478;text-transform:uppercase;letter-spacing:.06em">Método de pago</label>

                {#if !modoSplit}
                  <!-- Modo normal: botones de método único -->
                  <div class="pago mb-2">
                    {#each metodoPagoItems as m}
                      <button type="button" class="pago__btn {wForm.metodoPago === m.key ? 'pago__btn--selected' : ''}" on:click={() => { wForm.metodoPago = m.key; if (m.key !== 'efectivo') montoRecibido = ''; }}>
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

                  {#if wForm.metodoPago === 'yape' || wForm.metodoPago === 'plin' || wForm.metodoPago === 'transferencia'}
                    <div class="mb-2">
                      <label for="ingreso-referencia" class="form-label small fw-semibold">N° de operación / Referencia</label>
                      <input id="ingreso-referencia" class="form-control" bind:value={wForm.referencia} placeholder="Código de operación" />
                    </div>
                  {/if}

                  <button type="button" class="split-toggle-btn mb-3" on:click={enterSplit}>
                    <i class="bi bi-credit-card-2-back me-1"></i>¿Pagar con más de un método?
                  </button>

                {:else}
                  <!-- Modo split: filas de pago -->
                  <div class="split-pagos mb-2">
                    {#each splitPagos as pago, idx}
                      <div class="split-pago__row">
                        <select class="form-select form-select-sm split-pago__metodo" bind:value={pago.metodoPago}>
                          {#each metodoPagoItems as m}
                            <option value={m.key}>{m.label}</option>
                          {/each}
                        </select>
                        <div class="split-pago__monto-wrap">
                          <span class="split-pago__prefix">S/</span>
                          <input type="number" step="0.01" min="0" class="form-control form-control-sm split-pago__monto" bind:value={pago.monto} placeholder="0.00" />
                        </div>
                        {#if pago.metodoPago === 'yape' || pago.metodoPago === 'plin' || pago.metodoPago === 'transferencia'}
                          <input class="form-control form-control-sm split-pago__ref" bind:value={pago.referencia} placeholder="N° op." />
                        {:else}
                          <span class="split-pago__ref-spacer"></span>
                        {/if}
                        <button type="button" class="split-pago__remove" disabled={splitPagos.length <= 2} on:click={() => removeSplitPago(idx)} aria-label="Quitar">
                          <i class="bi bi-x-lg"></i>
                        </button>
                      </div>
                    {/each}

                    <div class="split-footer">
                      <button type="button" class="btn btn-outline-secondary btn-sm" on:click={addSplitPago}>
                        <i class="bi bi-plus me-1"></i>Agregar método
                      </button>
                      <span class="split-sum {splitDiff < 0.01 ? 'split-sum--ok' : splitSuma > montoFinal ? 'split-sum--over' : 'split-sum--under'}">
                        {#if splitDiff < 0.01}
                          <i class="bi bi-check-circle-fill me-1"></i>S/ {splitSuma.toFixed(2)} ✓
                        {:else if splitSuma > montoFinal}
                          Excede S/ {(splitSuma - montoFinal).toFixed(2)}
                        {:else}
                          Faltan S/ {(montoFinal - splitSuma).toFixed(2)}
                        {/if}
                      </span>
                    </div>
                  </div>

                  <button type="button" class="split-toggle-btn mb-3" on:click={exitSplit}>
                    <i class="bi bi-arrow-left me-1"></i>Volver a método único
                  </button>
                {/if}

                <!-- 1. Descuento -->
                <div class="row g-2 mb-3">
                  <div class="col-6">
                    <label for="ingreso-descuento" class="form-label small fw-semibold">Descuento S/</label>
                    <input id="ingreso-descuento" class="form-control{descuentoInvalido ? ' is-invalid' : ''}" type="number" step="0.01" min="0" max={cartTotal} bind:value={wForm.descuento} placeholder="0.00" />
                    {#if descuentoInvalido}
                      <div class="invalid-feedback">El descuento no puede superar el total (S/ {cartTotal.toFixed(2)})</div>
                    {/if}
                  </div>
                </div>

                <!-- 2. Observaciones -->
                <div class="mb-3">
                  <label for="ingreso-observaciones" class="form-label small fw-semibold">Observaciones</label>
                  <textarea id="ingreso-observaciones" class="form-control" rows="2" bind:value={wForm.observaciones}></textarea>
                </div>

                <!-- 3. Monto recibido — solo modo normal + efectivo -->
                {#if !modoSplit && wForm.metodoPago === 'efectivo'}
                  <div class="mt-auto">
                    <label for="ingreso-monto-recibido" class="form-label" style="font-size:11px;font-weight:700;color:#5a6478;text-transform:uppercase;letter-spacing:.06em">Monto recibido (S/)</label>
                    <div style="position:relative">
                      <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:1.3rem;font-weight:700;color:#8a97b0;pointer-events:none">S/</span>
                      <input id="ingreso-monto-recibido" type="number" step="0.5" min="0" bind:value={montoRecibido}
                        placeholder="0.00"
                        style="width:100%;padding:14px 14px 14px 46px;font-size:1.8rem;font-weight:800;color:var(--navy);border:2.5px solid {montoRecibidoValue > 0 && montoRecibidoValue >= montoFinal ? '#2e7d5a' : '#d0d8e8'};border-radius:8px;outline:none;background:white;transition:border-color .15s" />
                    </div>
                    {#if montoRecibidoValue > 0 && montoRecibidoValue < montoFinal}
                      <div class="text-danger small mt-1 fw-semibold">Monto insuficiente. Faltan S/ {(montoFinal - montoRecibidoValue).toFixed(2)}</div>
                    {/if}
                  </div>
                {/if}
              </div>

              <div class="col-12 col-lg-6 d-flex flex-column">
                <div class="resumen d-flex flex-column h-100">
                  <div class="resumen__header">Resumen del cobro</div>

                  <!-- Items + método + descuento: crecen y empujan el total hacia abajo -->
                  <div class="flex-grow-1">
                    {#each cart as item}
                      <div class="resumen__row">
                        <span class="d-flex align-items-center gap-1 flex-wrap">
                          <span class="tipo-pill tipo-pill--{item.tipo}" style="font-size:9px;padding:1px 5px">{tipoBadgeLabel(item.tipo)}</span>
                          {item.nombre}{item.cantidad > 1 ? ` ×${item.cantidad}` : ''}
                          {#if item.descuento > 0}<span style="font-size:10px;color:var(--amber);font-weight:700">-{item.descuento}%</span>{/if}
                        </span>
                        <span class="fw-semibold">S/ {(effectivePrice(item) * item.cantidad).toFixed(2)}</span>
                      </div>
                    {/each}
                    {#if modoSplit}
                      {#each splitPagos as p}
                        {#if Number(p.monto) > 0}
                          <div class="resumen__row">
                            <span class="text-capitalize">{p.metodoPago}</span>
                            <span class="fw-semibold">S/ {Number(p.monto).toFixed(2)}</span>
                          </div>
                        {/if}
                      {/each}
                    {:else if wForm.metodoPago}
                      <div class="resumen__row"><span>Método</span><span class="fw-semibold text-capitalize">{wForm.metodoPago}</span></div>
                    {/if}
                    {#if descuentoValue > 0}<div class="resumen__row"><span>Descuento</span><span class="fw-semibold" style="color:#856404">-S/ {descuentoValue.toFixed(2)}</span></div>{/if}
                  </div>

                  <!-- Total siempre al fondo -->
                  <div>
                    <div class="resumen__row resumen__row--total"><span>Total a cobrar</span><span>S/ {montoFinal.toFixed(2)}</span></div>
                    {#if !modoSplit && wForm.metodoPago === 'efectivo' && montoRecibidoValue > 0}
                      <div style="margin-top:10px;padding:10px;border-radius:8px;background:{vuelto >= 0 ? '#e8f5ee' : '#fdecea'}">
                        <div class="d-flex justify-content-between small"><span style="color:#5a6478">Recibido</span><span class="fw-semibold">S/ {montoRecibidoValue.toFixed(2)}</span></div>
                        <div class="d-flex justify-content-between mt-1">
                          <span class="fw-bold" style="color:{vuelto >= 0 ? '#2e7d5a' : '#c0392b'}">Vuelto</span>
                          <span class="fw-bold fs-5" style="color:{vuelto >= 0 ? '#2e7d5a' : '#c0392b'}">{vuelto >= 0 ? '' : '-'}S/ {Math.abs(vuelto).toFixed(2)}</span>
                        </div>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>

        <div class="modal-footer border-0">
          {#if step > 1}<button class="btn btn-outline-secondary btn-sm" on:click={() => step--}>← Atrás</button>{/if}
          {#if step < 3}
            <button class="btn btn-primary btn-sm" on:click={() => step++}
              disabled={step === 1 ? cart.length === 0 : !step2Valid}>
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
            <i class="bi bi-check-lg"></i>
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

<!-- ── Modal detalle ingreso (solo lectura) ──────────────────────────────── -->
{#if showDetail}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="modal d-block" style="background:rgba(0,0,0,.5)" on:click|self={() => (showDetail = false)}>
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down modal-lg">
      <div class="modal-content modal-origen">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title">Detalle de ingreso</h5>
          <button class="btn-close" aria-label="Cerrar" on:click={() => (showDetail = false)}></button>
        </div>

        <div class="modal-body pt-3">
          {#if detailLoading}
            <div class="text-center py-5"><Spinner /></div>
          {:else if detailIngreso}
            {@const hasDetalles = !!(detailIngreso.detalles && detailIngreso.detalles.length > 0)}
            {@const totalCobrado = detailIngreso.monto - detailIngreso.descuento}

            <!-- Fecha (ochre) -->
            <div class="d-flex align-items-center gap-2 mb-4">
              <i class="bi bi-calendar3" style="font-size:.9rem;color:#b45309"></i>
              <span class="small fw-semibold" style="color:#b45309">
                {new Date(detailIngreso.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Lima' })}
              </span>
              <span class="small text-muted">
                {new Date(detailIngreso.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' })}
              </span>
              {#if detailIngreso.referencia}
                <span class="small text-muted font-monospace ms-1">· {detailIngreso.referencia}</span>
              {/if}
            </div>

            <!-- 1. Participantes -->
            <div class="di-section">
              <div class="di-section__title">Participantes</div>
              <div class="di-meta">
                <div class="di-meta__row">
                  <span class="di-meta__label">Cliente</span>
                  <span>{detailIngreso.cliente?.nombre ?? detailIngreso.clienteNombre ?? '—'}</span>
                </div>
                <div class="di-meta__row">
                  <span class="di-meta__label">Empleado</span>
                  <span>
                    {detailIngreso.empleado?.nombre ?? '—'}
                    {#if detailIngreso.empleado?.cargo}
                      <span class="text-muted"> · {detailIngreso.empleado.cargo}</span>
                    {/if}
                  </span>
                </div>
              </div>
            </div>

            <!-- 2. Ítems -->
            <div class="di-section mt-4">
              <div class="di-section__title">Ítems</div>

              {#if hasDetalles}
                <table class="di-items-table w-100">
                  <colgroup>
                    <col style="width:62px">
                    <col>
                    <col style="width:80px">
                    <col style="width:52px">
                    <col style="width:44px">
                    <col style="width:90px">
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Tipo</th><th>Ítem</th><th class="text-center">P.&nbsp;unit.</th><th class="text-center">Desc.</th><th class="text-center">Cant.</th><th class="text-end">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each detailIngreso.detalles as d}
                      <tr>
                        <td class="pe-1"><span class="tipo-pill tipo-pill--{d.tipo}">{tipoBadgeLabel(d.tipo)}</span></td>
                        <td class="di-items-table__name">{detalleNombre(d)}</td>
                        <td class="text-center">{d.precioUnitario > 0 ? 'S/ ' + d.precioUnitario.toFixed(2) : '—'}</td>
                        <td class="text-center">{d.descuentoPct > 0 ? d.descuentoPct + '%' : '—'}</td>
                        <td class="text-center text-muted">×{d.cantidad}</td>
                        <td class="text-end fw-semibold">S/ {d.monto.toFixed(2)}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              {:else}
                {@const nombre = detailIngreso.servicio?.nombre ?? detailIngreso.producto?.nombre ?? detailIngreso.paquete?.nombre ?? detailIngreso.conceptoPersonalizado ?? 'Ítem'}
                <table class="di-items-table w-100">
                  <colgroup>
                    <col style="width:62px">
                    <col>
                    <col style="width:80px">
                    <col style="width:52px">
                    <col style="width:44px">
                    <col style="width:90px">
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Tipo</th><th>Ítem</th><th class="text-center">P.&nbsp;unit.</th><th class="text-center">Desc.</th><th class="text-center">Cant.</th><th class="text-end">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="pe-1"><span class="tipo-pill tipo-pill--{detailIngreso.tipo}">{tipoBadgeLabel(detailIngreso.tipo)}</span></td>
                      <td class="di-items-table__name">{nombre}</td>
                      <td class="text-center">—</td>
                      <td class="text-center">—</td>
                      <td class="text-center text-muted">×{detailIngreso.cantidad}</td>
                      <td class="text-end fw-semibold">S/ {detailIngreso.monto.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              {/if}

              <!-- Totales -->
              <div class="di-totales">
                {#if detailIngreso.descuento > 0}
                  <div class="di-totales__row">
                    <span>Subtotal</span>
                    <span>S/ {detailIngreso.monto.toFixed(2)}</span>
                  </div>
                  <div class="di-totales__row">
                    <span>Descuento</span>
                    <span style="color:#856404">−S/ {detailIngreso.descuento.toFixed(2)}</span>
                  </div>
                {/if}
                {#if detailIngreso.pagos && detailIngreso.pagos.length >= 2}
                  <!-- Pago mixto: desglose por método -->
                  {#each detailIngreso.pagos as pago}
                    <div class="di-totales__row">
                      <div class="d-flex align-items-center gap-2">
                        <span class="metodo-badge metodo-badge--{pago.metodoPago}" style="font-size:10px">{pago.metodoPago}</span>
                        {#if pago.referencia}<span class="font-monospace text-muted" style="font-size:10px">· {pago.referencia}</span>{/if}
                      </div>
                      <span>S/ {pago.monto.toFixed(2)}</span>
                    </div>
                  {/each}
                  <div class="di-totales__row di-totales__row--final">
                    <span>Total cobrado</span>
                    <span>S/ {totalCobrado.toFixed(2)}</span>
                  </div>
                {:else}
                <div class="di-totales__row di-totales__row--final">
                  <span>Total cobrado</span>
                  <div class="d-flex align-items-center gap-2">
                    <span class="metodo-badge metodo-badge--{detailIngreso.metodoPago}" style="font-size:10px">{detailIngreso.metodoPago}</span>
                    <span>S/ {totalCobrado.toFixed(2)}</span>
                  </div>
                </div>
                {/if}
                {#if detailIngreso.montoRecibido}
                  {@const vuelto = detailIngreso.montoRecibido - totalCobrado}
                  <div class="di-totales__row" style="color:#5a6478">
                    <span>Recibido</span>
                    <span>S/ {detailIngreso.montoRecibido.toFixed(2)}</span>
                  </div>
                  <div class="di-totales__row" style="color:#5a6478">
                    <span>Vuelto</span>
                    <span>S/ {Math.abs(vuelto).toFixed(2)}</span>
                  </div>
                {/if}
              </div>
            </div>

            <!-- 3. Observaciones -->
            {#if detailIngreso.observaciones}
              <div class="di-section mt-4">
                <div class="di-section__title">Observaciones</div>
                <p class="small mb-0" style="white-space:pre-wrap;color:#4a5568">{detailIngreso.observaciones}</p>
              </div>
            {/if}

          {:else}
            <div class="text-center text-muted py-5">No se pudo cargar el detalle.</div>
          {/if}
        </div>

        <div class="modal-footer border-0">
          <button class="btn btn-secondary btn-sm" on:click={() => (showDetail = false)}>Cerrar</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<ConfirmDialog show={deleteConfirm} message="¿Eliminar este ingreso?" onConfirm={doDelete} onCancel={() => (deleteConfirm=false)} />
