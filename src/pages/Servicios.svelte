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
  let deleting = false; let togglingId: number | null = null;

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
    editing = { activo: true };
    isEdit = false; deleteType = type;
    if (type === 'paquetes') { selectedServIds = []; selectedPrdIds = []; loadAllForPaquete(); }
    modal = true;
  }

  function openEdit(item: any, type: string) {
    editing = { ...item }; isEdit = true; deleteType = type;
    if (type === 'paquetes') {
      selectedServIds = (item.servicios ?? []).map((s: any) => s.servicioId);
      selectedPrdIds = (item.productos ?? []).map((p: any) => p.productoId);
      loadAllForPaquete();
    }
    modal = true;
  }

  async function toggleActivo(item: any, type: string) {
    togglingId = item.id;
    const updated = { ...item, activo: !item.activo };
    let res: any;
    if (type === 'servicios') {
      res = await servicioApi.actualizar(item.id, updated);
    } else {
      const payload = {
        ...updated,
        servicioIds: (item.servicios ?? []).map((s: any) => s.servicioId),
        productoIds: (item.productos ?? []).map((p: any) => p.productoId),
      };
      res = await paqueteApi.actualizar(item.id, payload);
    }
    togglingId = null;
    if (res?.ok) {
      toast(item.activo ? 'Desactivado' : 'Activado', 'success');
      if (type === 'servicios') loadServicios();
      else loadPaquetes();
    } else {
      toast(res?.error ?? 'Error', 'error');
    }
  }

  async function save() {
    saving = true;
    let res;
    if (deleteType === 'servicios') {
      const payload = {
        ...editing,
        precio: Number(editing.precio ?? 0),
        duracionMin: Number(editing.duracionMin ?? 0),
        comisionPct: Number(editing.comisionPct ?? 0),
      };
      res = isEdit ? await servicioApi.actualizar(editing.id, payload) : await servicioApi.crear(payload);
    } else if (deleteType === 'productos') {
      const payload = isEdit
        ? { ...editing, precioVenta: Number(editing.precioVenta ?? 0), stock: Number(editing.stock ?? 0) }
        : { ...editing, precioVenta: Number(editing.precioVenta ?? 0), stockInicial: Number(editing.stock ?? 0) };
      res = isEdit ? await productoApi.actualizar(editing.id, payload) : await productoApi.crear(payload);
    } else {
      const payload = {
        ...editing,
        precio: Number(editing.precio ?? 0),
        descuento: Number(editing.descuento ?? 0),
        comisionPct: Number(editing.comisionPct ?? 0),
        servicioIds: selectedServIds,
        productoIds: selectedPrdIds,
      };
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
    deleting = true;
    let res;
    if (deleteType === 'servicios') res = await servicioApi.eliminar(deleteId);
    else if (deleteType === 'productos') res = await productoApi.eliminar(deleteId);
    else res = await paqueteApi.eliminar(deleteId);
    deleting = false;
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
  <div class="page-panel mb-3">
    <div class="page-panel__top">
      <div class="d-flex align-items-center gap-3">
        <div class="page-panel__icon"><i class="bi bi-bag-check"></i></div>
        <div>
          <h5 class="fw-bold mb-0">Servicios y productos</h5>
          <p class="text-muted small mb-0">Catálogo de servicios, productos y paquetes</p>
        </div>
      </div>
    </div>
  </div>

  <div class="d-flex align-items-end justify-content-between mb-3 flex-wrap gap-2">
    <ul class="nav nav-tabs nav-tabs-origen mb-0">
      <li class="nav-item"><button class="nav-link" class:active={tab==='servicios'} on:click={() => (tab='servicios')}>Servicios</button></li>
      <li class="nav-item"><button class="nav-link" class:active={tab==='productos'} on:click={() => (tab='productos')}>Productos</button></li>
      <li class="nav-item"><button class="nav-link" class:active={tab==='paquetes'} on:click={() => (tab='paquetes')}>Paquetes</button></li>
    </ul>
    {#if tab === 'servicios'}
      <button class="btn btn-primary btn-sm" on:click={() => openNew('servicios')}><i class="bi bi-plus-lg me-1"></i>Nuevo servicio</button>
    {:else if tab === 'productos'}
      <button class="btn btn-primary btn-sm" on:click={() => openNew('productos')}><i class="bi bi-plus-lg me-1"></i>Nuevo producto</button>
    {:else}
      <button class="btn btn-primary btn-sm" on:click={() => openNew('paquetes')}><i class="bi bi-plus-lg me-1"></i>Nuevo paquete</button>
    {/if}
  </div>

  {#if tab === 'servicios'}
    {#if svcLoading}<Spinner />{:else}
      <div class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table table-sm table-hover table-origen mb-0">
            <thead class="table-origen table-origen--navy">
              <tr><th class="ps-3">Nombre</th><th>Categoría</th><th>Precio</th><th class="d-none d-md-table-cell">Duración</th><th>Comisión</th><th>Estado</th><th class="pe-3"></th></tr>
            </thead>
            <tbody>
              {#each servicios as s}
                <tr class:row-origen--inactive={!s.activo}>
                  <td class="ps-3 fw-semibold small">{s.nombre}</td>
                  <td class="small">{s.categoria}</td>
                  <td class="small">S/ {s.precio.toFixed(2)}</td>
                  <td class="small d-none d-md-table-cell">{s.duracionMin} min</td>
                  <td class="small">{s.comisionPct}%</td>
                  <td><span class="badge badge-origen {s.activo ? 'badge-origen--green' : 'badge-origen--gray'}">{s.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td class="pe-3 text-end">
                    <div class="d-flex gap-1 justify-content-end">
                      <button class="btn btn-sm btn-outline-secondary" on:click={() => openEdit(s, 'servicios')} title="Editar">
                        <i class="bi bi-pencil-square"></i>
                      </button>
                      <button class="btn btn-sm {s.activo ? 'btn-outline-secondary' : 'btn-outline-success'}" on:click={() => toggleActivo(s, 'servicios')} disabled={togglingId === s.id} title="{s.activo ? 'Desactivar' : 'Activar'}">
                        {#if togglingId === s.id}<span class="spinner-border spinner-border-sm me-1"></span>{/if}{s.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button class="btn btn-sm btn-outline-danger" on:click={() => { deleteId = s.id; deleteType = 'servicios'; confirm = true; }} title="Eliminar">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              {:else}<tr><td colspan="7" class="text-center text-muted py-4">Sin servicios registrados</td></tr>{/each}
            </tbody>
          </table>
        </div>
        {#if svcTotal > pageSize}<div class="p-3"><Pagination page={svcPage} total={svcTotal} {pageSize} onChange={(p) => { svcPage = p; loadServicios(); }} /></div>{/if}
      </div>
    {/if}

  {:else if tab === 'productos'}
    {#if prdLoading}<Spinner />{:else}
      <div class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table table-sm table-hover table-origen mb-0">
            <thead class="table-origen table-origen--navy">
              <tr><th class="ps-3">Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th class="pe-3"></th></tr>
            </thead>
            <tbody>
              {#each productos as p}
                <tr class:row-origen--inactive={!p.activo}>
                  <td class="ps-3 fw-semibold small">{p.nombre}</td>
                  <td class="small">{p.categoria}</td>
                  <td class="small">S/ {p.precioVenta.toFixed(2)}</td>
                  <td><span class="badge badge-origen {p.stock <= 0 ? 'badge-origen--red' : p.stock <= 5 ? 'badge-origen--gold' : 'badge-origen--green'}">{p.stock} unid.</span></td>
                  <td><span class="badge badge-origen {p.activo ? 'badge-origen--green' : 'badge-origen--gray'}">{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td class="pe-3 text-end">
                    <div class="d-flex gap-1 justify-content-end">
                      <button class="btn btn-sm btn-outline-secondary" on:click={() => openEdit(p, 'productos')} title="Editar">
                        <i class="bi bi-pencil-square"></i>
                      </button>
                      <button class="btn btn-sm btn-outline-danger" on:click={() => { deleteId = p.id; deleteType = 'productos'; confirm = true; }} title="Eliminar">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
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
    {#if pkgLoading}<Spinner />{:else}
      <div class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table table-sm table-hover table-origen mb-0">
            <thead class="table-origen table-origen--navy">
              <tr><th class="ps-3">Nombre</th><th class="d-none d-md-table-cell">Descripción</th><th>Precio</th><th>Descuento</th><th>Incluye</th><th>Estado</th><th class="pe-3"></th></tr>
            </thead>
            <tbody>
              {#each paquetes as pkg}
                <tr class:row-origen--inactive={!pkg.activo}>
                  <td class="ps-3 fw-semibold small">{pkg.nombre}</td>
                  <td class="small text-muted d-none d-md-table-cell">{pkg.descripcion ?? '—'}</td>
                  <td class="small">S/ {pkg.precio.toFixed(2)}</td>
                  <td class="small">
                    {#if pkg.descuento > 0}
                      <span class="badge badge-origen badge-origen--green">{pkg.descuento}%</span>
                    {:else}
                      <span class="text-muted">—</span>
                    {/if}
                  </td>
                  <td class="small">
                    {#each (pkg.servicios ?? []) as s}
                      <span class="pk-chip">{s.servicio?.nombre ?? '?'}</span>
                    {/each}
                    {#each (pkg.productos ?? []) as p}
                      <span class="pk-chip pk-chip--green">{p.producto?.nombre ?? '?'}</span>
                    {/each}
                    {#if !(pkg.servicios?.length) && !(pkg.productos?.length)}
                      <span class="text-muted">—</span>
                    {/if}
                  </td>
                  <td><span class="badge badge-origen {pkg.activo ? 'badge-origen--green' : 'badge-origen--gray'}">{pkg.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td class="pe-3 text-end">
                    <div class="d-flex gap-1 justify-content-end">
                      <button class="btn btn-sm btn-outline-secondary" on:click={() => openEdit(pkg, 'paquetes')} title="Editar">
                        <i class="bi bi-pencil-square"></i>
                      </button>
                      <button class="btn btn-sm {pkg.activo ? 'btn-outline-secondary' : 'btn-outline-success'}" on:click={() => toggleActivo(pkg, 'paquetes')} disabled={togglingId === pkg.id} title="{pkg.activo ? 'Desactivar' : 'Activar'}">
                        {#if togglingId === pkg.id}<span class="spinner-border spinner-border-sm me-1"></span>{/if}{pkg.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button class="btn btn-sm btn-outline-danger" on:click={() => { deleteId = pkg.id; deleteType = 'paquetes'; confirm = true; }} title="Eliminar">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              {:else}<tr><td colspan="7" class="text-center text-muted py-4">Sin paquetes registrados</td></tr>{/each}
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
        <div class="col-6 col-md-4"><label class="form-label small fw-semibold">Precio S/ *</label><input class="form-control" type="number" step="0.01" bind:value={editing.precio} placeholder="0.00" /></div>
        <div class="col-6 col-md-4"><label class="form-label small fw-semibold">Duración (min)</label><input class="form-control" type="number" bind:value={editing.duracionMin} placeholder="0" /></div>
        <div class="col-6 col-md-4"><label class="form-label small fw-semibold">Comisión %</label><input class="form-control" type="number" bind:value={editing.comisionPct} placeholder="0" /></div>
        {#if isEdit}<div class="col-6"><label class="form-label small fw-semibold">Estado</label><select class="form-select" bind:value={editing.activo}><option value={true}>Activo</option><option value={false}>Inactivo</option></select></div>{/if}
      </div>
    {:else if deleteType === 'productos'}
      <div class="row g-3">
        <div class="col-12 col-md-6"><label class="form-label small fw-semibold">Nombre *</label><input class="form-control" bind:value={editing.nombre} /></div>
        <div class="col-12 col-md-6"><label class="form-label small fw-semibold">Categoría *</label><input class="form-control" bind:value={editing.categoria} /></div>
        <div class="col-6"><label class="form-label small fw-semibold">Precio venta S/ *</label><input class="form-control" type="number" step="0.01" bind:value={editing.precioVenta} placeholder="0.00" /></div>
        <div class="col-6"><label class="form-label small fw-semibold">Stock inicial</label><input class="form-control" type="number" bind:value={editing.stock} placeholder="0" /></div>
        {#if isEdit}<div class="col-6"><label class="form-label small fw-semibold">Estado</label><select class="form-select" bind:value={editing.activo}><option value={true}>Activo</option><option value={false}>Inactivo</option></select></div>{/if}
      </div>
    {:else}
      <div class="row g-3">
        <div class="col-12 col-md-6"><label class="form-label small fw-semibold">Nombre *</label><input class="form-control" bind:value={editing.nombre} /></div>
        <div class="col-6 col-md-3"><label class="form-label small fw-semibold">Precio S/ *</label><input class="form-control" type="number" step="0.01" bind:value={editing.precio} placeholder="0.00" /></div>
        <div class="col-6 col-md-3"><label class="form-label small fw-semibold">Descuento %</label><input class="form-control" type="number" bind:value={editing.descuento} placeholder="0" /></div>
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

<ConfirmDialog show={confirm} message="¿Eliminar este elemento? Esta acción no se puede deshacer." onConfirm={doDelete} onCancel={() => (confirm = false)} loading={deleting} />
