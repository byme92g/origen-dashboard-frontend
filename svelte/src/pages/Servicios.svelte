<script lang="ts">
  import { onMount } from 'svelte';
  import { servicioApi } from '../lib/api/servicios';
  import { productoApi } from '../lib/api/productos';
  import { paqueteApi } from '../lib/api/paquetes';
  import Spinner from '../lib/components/Spinner.svelte';
  import Pagination from '../lib/components/Pagination.svelte';
  import Modal from '../lib/components/Modal.svelte';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';
  import { toast } from '../lib/stores/toast';
  import type { Servicio, Producto, Paquete } from '../lib/types';

  let tab: 'servicios' | 'productos' | 'paquetes' = 'servicios';

  let servicios: Servicio[] = []; let svcTotal = 0; let svcPage = 1;
  let productos: Producto[] = []; let prdTotal = 0; let prdPage = 1;
  let paquetes: Paquete[] = []; let pkgTotal = 0; let pkgPage = 1;
  const pageSize = 15;

  let svcLoading = true; let prdLoading = true; let pkgLoading = true;
  let modal = false; let editing: any = {}; let isEdit = false; let saving = false;
  let confirm = false; let deleteId: number | null = null; let deleteType = '';

  // All servicios/productos for paquete selector
  let allServicios: Servicio[] = [];
  let allProductos: Producto[] = [];
  let selectedServIds: number[] = [];
  let selectedPrdIds: number[] = [];

  async function loadServicios() {
    svcLoading = true;
    const res = await servicioApi.listarPaginado(svcPage, pageSize);
    if (res.ok && res.data) {
      if (Array.isArray(res.data)) { servicios = res.data as unknown as Servicio[]; svcTotal = servicios.length; }
      else { servicios = res.data.items; svcTotal = res.data.total; }
    }
    svcLoading = false;
  }

  async function loadProductos() {
    prdLoading = true;
    const res = await productoApi.listarPaginado(prdPage, pageSize);
    if (res.ok && res.data) {
      if (Array.isArray(res.data)) { productos = res.data as unknown as Producto[]; prdTotal = productos.length; }
      else { productos = res.data.items; prdTotal = res.data.total; }
    }
    prdLoading = false;
  }

  async function loadPaquetes() {
    pkgLoading = true;
    const res = await paqueteApi.listarPaginado(pkgPage, pageSize);
    if (res.ok && res.data) {
      if (Array.isArray(res.data)) { paquetes = res.data as unknown as Paquete[]; pkgTotal = paquetes.length; }
      else { paquetes = res.data.items; pkgTotal = res.data.total; }
    }
    pkgLoading = false;
  }

  async function loadAllForPaquete() {
    const [sr, pr] = await Promise.all([servicioApi.listar(), productoApi.listar()]);
    if (sr.ok && sr.data) allServicios = sr.data as unknown as Servicio[];
    if (pr.ok && pr.data) allProductos = pr.data as unknown as Producto[];
  }

  onMount(() => { loadServicios(); loadProductos(); loadPaquetes(); });

  function openNew(type: string) {
    editing = type === 'servicios' ? { comisionPct: 0, activo: true } : type === 'productos' ? { stock: 0, activo: true } : { descuento: 0, comisionPct: 0, activo: true };
    isEdit = false; deleteType = type;
    if (type === 'paquetes') { selectedServIds = []; selectedPrdIds = []; loadAllForPaquete(); }
    modal = true;
  }

  function openEdit(item: any, type: string) {
    editing = { ...item }; isEdit = true; deleteType = type;
    if (type === 'paquetes') {
      selectedServIds = (item.servicios ?? []).map((s: any) => s.id);
      selectedPrdIds = (item.productos ?? []).map((p: any) => p.id);
      loadAllForPaquete();
    }
    modal = true;
  }

  async function save() {
    saving = true;
    let res;
    if (deleteType === 'servicios') {
      res = isEdit ? await servicioApi.actualizar(editing.id, editing) : await servicioApi.crear(editing);
    } else if (deleteType === 'productos') {
      res = isEdit ? await productoApi.actualizar(editing.id, editing) : await productoApi.crear(editing);
    } else {
      const payload = { ...editing, servicioIds: selectedServIds, productoIds: selectedPrdIds };
      res = isEdit ? await paqueteApi.actualizar(editing.id, payload) : await paqueteApi.crear(payload);
    }
    saving = false;
    if (res.ok) {
      toast('Guardado', 'success'); modal = false;
      if (deleteType === 'servicios') loadServicios();
      else if (deleteType === 'productos') loadProductos();
      else loadPaquetes();
    } else toast(res.error ?? 'Error', 'error');
  }

  async function doDelete() {
    if (!deleteId) return;
    let res;
    if (deleteType === 'servicios') res = await servicioApi.eliminar(deleteId);
    else if (deleteType === 'productos') res = await productoApi.eliminar(deleteId);
    else res = await paqueteApi.eliminar(deleteId);
    confirm = false;
    if (res.ok) {
      toast('Eliminado', 'success');
      if (deleteType === 'servicios') loadServicios();
      else if (deleteType === 'productos') loadProductos();
      else loadPaquetes();
    } else toast(res.error ?? 'Error', 'error');
  }

  function toggleId(arr: number[], id: number) {
    return arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];
  }
</script>

<div class="p-3 p-md-4">
  <h5 class="fw-bold mb-3">Servicios y productos</h5>

  <ul class="nav nav-tabs mb-3">
    <li class="nav-item"><button class="nav-link" class:active={tab==='servicios'} on:click={() => (tab='servicios')}>Servicios</button></li>
    <li class="nav-item"><button class="nav-link" class:active={tab==='productos'} on:click={() => (tab='productos')}>Productos</button></li>
    <li class="nav-item"><button class="nav-link" class:active={tab==='paquetes'} on:click={() => (tab='paquetes')}>Paquetes</button></li>
  </ul>

  {#if tab === 'servicios'}
    <div class="d-flex justify-content-end mb-3">
      <button class="btn btn-primary btn-sm" on:click={() => openNew('servicios')}>+ Nuevo servicio</button>
    </div>
    {#if svcLoading}<Spinner />{:else}
      <div class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0">
            <thead class="table-light">
              <tr><th class="ps-3">Nombre</th><th>Categoría</th><th>Precio</th><th class="d-none d-md-table-cell">Duración</th><th>Comisión</th><th>Estado</th><th class="pe-3"></th></tr>
            </thead>
            <tbody>
              {#each servicios as s}
                <tr>
                  <td class="ps-3 fw-semibold small">{s.nombre}</td>
                  <td class="small">{s.categoria}</td>
                  <td class="small">S/ {s.precio.toFixed(2)}</td>
                  <td class="small d-none d-md-table-cell">{s.duracionMin} min</td>
                  <td class="small">{s.comisionPct}%</td>
                  <td><span class="badge bg-{s.activo ? 'success' : 'secondary'}">{s.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td class="pe-3 text-end">
                    <button class="btn btn-sm btn-outline-secondary me-1" on:click={() => openEdit(s, 'servicios')}>✏️</button>
                    <button class="btn btn-sm btn-outline-danger" on:click={() => { deleteId = s.id; deleteType = 'servicios'; confirm = true; }}>🗑️</button>
                  </td>
                </tr>
              {:else}<tr><td colspan="7" class="text-center text-muted py-4">Sin servicios</td></tr>{/each}
            </tbody>
          </table>
        </div>
        {#if svcTotal > pageSize}<div class="p-3"><Pagination page={svcPage} total={svcTotal} {pageSize} onChange={(p) => { svcPage = p; loadServicios(); }} /></div>{/if}
      </div>
    {/if}

  {:else if tab === 'productos'}
    <div class="d-flex justify-content-end mb-3">
      <button class="btn btn-primary btn-sm" on:click={() => openNew('productos')}>+ Nuevo producto</button>
    </div>
    {#if prdLoading}<Spinner />{:else}
      <div class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0">
            <thead class="table-light">
              <tr><th class="ps-3">Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th class="pe-3"></th></tr>
            </thead>
            <tbody>
              {#each productos as p}
                <tr>
                  <td class="ps-3 fw-semibold small">{p.nombre}</td>
                  <td class="small">{p.categoria}</td>
                  <td class="small">S/ {p.precioVenta.toFixed(2)}</td>
                  <td><span class="badge bg-{p.stock <= 3 ? 'danger' : p.stock <= 10 ? 'warning' : 'success'}">{p.stock}</span></td>
                  <td><span class="badge bg-{p.activo ? 'success' : 'secondary'}">{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td class="pe-3 text-end">
                    <button class="btn btn-sm btn-outline-secondary me-1" on:click={() => openEdit(p, 'productos')}>✏️</button>
                    <button class="btn btn-sm btn-outline-danger" on:click={() => { deleteId = p.id; deleteType = 'productos'; confirm = true; }}>🗑️</button>
                  </td>
                </tr>
              {:else}<tr><td colspan="6" class="text-center text-muted py-4">Sin productos</td></tr>{/each}
            </tbody>
          </table>
        </div>
        {#if prdTotal > pageSize}<div class="p-3"><Pagination page={prdPage} total={prdTotal} {pageSize} onChange={(p) => { prdPage = p; loadProductos(); }} /></div>{/if}
      </div>
    {/if}

  {:else}
    <div class="d-flex justify-content-end mb-3">
      <button class="btn btn-primary btn-sm" on:click={() => openNew('paquetes')}>+ Nuevo paquete</button>
    </div>
    {#if pkgLoading}<Spinner />{:else}
      <div class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0">
            <thead class="table-light">
              <tr><th class="ps-3">Nombre</th><th>Precio</th><th>Descuento</th><th class="d-none d-md-table-cell">Items</th><th>Estado</th><th class="pe-3"></th></tr>
            </thead>
            <tbody>
              {#each paquetes as pkg}
                <tr>
                  <td class="ps-3 fw-semibold small">{pkg.nombre}</td>
                  <td class="small">S/ {pkg.precio.toFixed(2)}</td>
                  <td class="small">{pkg.descuento}%</td>
                  <td class="small d-none d-md-table-cell">{(pkg.servicios?.length ?? 0) + (pkg.productos?.length ?? 0)} items</td>
                  <td><span class="badge bg-{pkg.activo ? 'success' : 'secondary'}">{pkg.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td class="pe-3 text-end">
                    <button class="btn btn-sm btn-outline-secondary me-1" on:click={() => openEdit(pkg, 'paquetes')}>✏️</button>
                    <button class="btn btn-sm btn-outline-danger" on:click={() => { deleteId = pkg.id; deleteType = 'paquetes'; confirm = true; }}>🗑️</button>
                  </td>
                </tr>
              {:else}<tr><td colspan="6" class="text-center text-muted py-4">Sin paquetes</td></tr>{/each}
            </tbody>
          </table>
        </div>
        {#if pkgTotal > pageSize}<div class="p-3"><Pagination page={pkgPage} total={pkgTotal} {pageSize} onChange={(p) => { pkgPage = p; loadPaquetes(); }} /></div>{/if}
      </div>
    {/if}
  {/if}
</div>

<Modal show={modal} title="{isEdit ? 'Editar' : 'Nuevo'} {deleteType.slice(0,-1)}" onClose={() => (modal = false)} size="lg">
  <svelte:fragment slot="body">
    {#if deleteType === 'servicios'}
      <div class="row g-3">
        <div class="col-12 col-md-6"><label class="form-label small fw-semibold">Nombre *</label><input class="form-control" bind:value={editing.nombre} /></div>
        <div class="col-12 col-md-6"><label class="form-label small fw-semibold">Categoría *</label><input class="form-control" bind:value={editing.categoria} /></div>
        <div class="col-6 col-md-4"><label class="form-label small fw-semibold">Precio S/ *</label><input class="form-control" type="number" step="0.01" bind:value={editing.precio} /></div>
        <div class="col-6 col-md-4"><label class="form-label small fw-semibold">Duración (min)</label><input class="form-control" type="number" bind:value={editing.duracionMin} /></div>
        <div class="col-6 col-md-4"><label class="form-label small fw-semibold">Comisión %</label><input class="form-control" type="number" bind:value={editing.comisionPct} /></div>
        {#if isEdit}<div class="col-6"><label class="form-label small fw-semibold">Estado</label><select class="form-select" bind:value={editing.activo}><option value={true}>Activo</option><option value={false}>Inactivo</option></select></div>{/if}
      </div>
    {:else if deleteType === 'productos'}
      <div class="row g-3">
        <div class="col-12 col-md-6"><label class="form-label small fw-semibold">Nombre *</label><input class="form-control" bind:value={editing.nombre} /></div>
        <div class="col-12 col-md-6"><label class="form-label small fw-semibold">Categoría *</label><input class="form-control" bind:value={editing.categoria} /></div>
        <div class="col-6"><label class="form-label small fw-semibold">Precio venta S/ *</label><input class="form-control" type="number" step="0.01" bind:value={editing.precioVenta} /></div>
        <div class="col-6"><label class="form-label small fw-semibold">Stock inicial</label><input class="form-control" type="number" bind:value={editing.stock} /></div>
        {#if isEdit}<div class="col-6"><label class="form-label small fw-semibold">Estado</label><select class="form-select" bind:value={editing.activo}><option value={true}>Activo</option><option value={false}>Inactivo</option></select></div>{/if}
      </div>
    {:else}
      <div class="row g-3">
        <div class="col-12 col-md-6"><label class="form-label small fw-semibold">Nombre *</label><input class="form-control" bind:value={editing.nombre} /></div>
        <div class="col-6 col-md-3"><label class="form-label small fw-semibold">Precio S/ *</label><input class="form-control" type="number" step="0.01" bind:value={editing.precio} /></div>
        <div class="col-6 col-md-3"><label class="form-label small fw-semibold">Descuento %</label><input class="form-control" type="number" bind:value={editing.descuento} /></div>
        <div class="col-12"><label class="form-label small fw-semibold">Descripción</label><textarea class="form-control" rows="2" bind:value={editing.descripcion}></textarea></div>
        <div class="col-12">
          <label class="form-label small fw-semibold">Servicios incluidos</label>
          <div class="d-flex flex-wrap gap-2">
            {#each allServicios as s}
              <button type="button" class="btn btn-sm {selectedServIds.includes(s.id) ? 'btn-primary' : 'btn-outline-secondary'}" on:click={() => (selectedServIds = toggleId(selectedServIds, s.id))}>{s.nombre}</button>
            {/each}
          </div>
        </div>
        <div class="col-12">
          <label class="form-label small fw-semibold">Productos incluidos</label>
          <div class="d-flex flex-wrap gap-2">
            {#each allProductos as p}
              <button type="button" class="btn btn-sm {selectedPrdIds.includes(p.id) ? 'btn-primary' : 'btn-outline-secondary'}" on:click={() => (selectedPrdIds = toggleId(selectedPrdIds, p.id))}>{p.nombre}</button>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="footer">
    <button class="btn btn-secondary btn-sm" on:click={() => (modal = false)}>Cancelar</button>
    <button class="btn btn-primary btn-sm" on:click={save} disabled={saving}>
      {#if saving}<span class="spinner-border spinner-border-sm me-1"></span>{/if}Guardar
    </button>
  </svelte:fragment>
</Modal>

<ConfirmDialog show={confirm} message="¿Eliminar este elemento?" onConfirm={doDelete} onCancel={() => (confirm = false)} />
