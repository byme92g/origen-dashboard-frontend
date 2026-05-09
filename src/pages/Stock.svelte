<script lang="ts">
  import { onMount } from 'svelte';
  import { productoApi } from '../lib/api/productos';
  import { isAdmin } from '../lib/stores/auth';
  import Spinner from '../lib/components/Spinner.svelte';
  import Modal from '../lib/components/Modal.svelte';
  import Pagination from '../lib/components/Pagination.svelte';
  import { toast } from '../lib/stores/toast';
  import type { Producto } from '../lib/types';

  type FiltroStock = 'todos' | 'bajo' | 'agotado' | 'inactivo';

  let productos: Producto[] = [];
  let loading = true;
  let filtro: FiltroStock = 'todos';
  let selectedCategorias: string[] = [];
  let busqueda = '';
  let modal = false;
  let editing: Partial<Producto> = {};
  let saving = false;
  const bajoMinimo = 5;
  let page = 1;
  const pageSize = 20;

  function toggleCategoria(cat: string) {
    selectedCategorias = selectedCategorias.includes(cat)
      ? selectedCategorias.filter(c => c !== cat)
      : [...selectedCategorias, cat];
  }

  async function load() {
    loading = true;
    const res = await productoApi.listar();
    if (res.ok && res.data) productos = res.data;
    else toast(res.error ?? 'No se pudo cargar el stock', 'error');
    loading = false;
  }

  onMount(load);

  $: activos = productos.filter((p) => p.activo);
  $: agotados = activos.filter((p) => p.stock <= 0);
  $: bajos = activos.filter((p) => p.stock > 0 && p.stock <= bajoMinimo);
  $: valorizado = activos.reduce((sum, p) => sum + p.stock * p.precioVenta, 0);
  $: categorias = [...new Set(productos.map((p) => p.categoria).filter(Boolean))].sort();
  $: visibles = productos
    .filter((p) => {
      if (filtro === 'bajo') return p.activo && p.stock > 0 && p.stock <= bajoMinimo;
      if (filtro === 'agotado') return p.activo && p.stock <= 0;
      if (filtro === 'inactivo') return !p.activo;
      return true;
    })
    .filter((p) => selectedCategorias.length === 0 || selectedCategorias.includes(p.categoria))
    .filter((p) => `${p.nombre} ${p.categoria}`.toLowerCase().includes(busqueda.trim().toLowerCase()));

  $: { filtro; busqueda; selectedCategorias; page = 1; }
  $: paged = visibles.slice((page - 1) * pageSize, page * pageSize);

  function fmt(v: number) { return `S/ ${v.toFixed(2)}`; }
  function stockClass(p: Producto) {
    if (!p.activo) return 'badge-origen--gray';
    if (p.stock <= 0) return 'badge-origen--red';
    if (p.stock <= bajoMinimo) return 'badge-origen--gold';
    return 'badge-origen--green';
  }
  function stockLabel(p: Producto) {
    if (!p.activo) return 'Inactivo';
    if (p.stock <= 0) return 'Agotado';
    if (p.stock <= bajoMinimo) return 'Stock bajo';
    return 'Disponible';
  }

  function openEdit(producto: Producto) {
    editing = { ...producto };
    modal = true;
  }

  async function save() {
    if (!editing.id) return;
    saving = true;
    const res = await productoApi.actualizar(editing.id, editing);
    saving = false;
    if (res.ok) {
      toast('Stock actualizado', 'success');
      modal = false;
      load();
    } else {
      toast(res.error ?? 'Error al guardar', 'error');
    }
  }
</script>

<div class="p-3 p-md-4">
  <div class="page-panel mb-3">
    <div class="page-panel__top">
      <div class="d-flex align-items-center gap-3">
        <div class="page-panel__icon"><i class="bi bi-box-seam"></i></div>
        <div>
          <h5 class="fw-bold mb-0">Control de stock</h5>
          <p class="text-muted small mb-0">Inventario de productos y alertas de disponibilidad</p>
        </div>
      </div>
      <button class="btn btn-outline-secondary btn-sm" on:click={load}>Actualizar</button>
    </div>
    <div class="page-panel__filters">
      <input class="form-control form-control-sm" style="width:220px;" placeholder="Buscar producto o categoría" bind:value={busqueda} />
      <div class="btn-group btn-group-sm" role="group">
        <button class="btn btn-outline-secondary" class:active={filtro === 'todos'} on:click={() => (filtro = 'todos')}>Todos</button>
        <button class="btn btn-outline-secondary" class:active={filtro === 'bajo'} on:click={() => (filtro = 'bajo')}>Bajo</button>
        <button class="btn btn-outline-secondary" class:active={filtro === 'agotado'} on:click={() => (filtro = 'agotado')}>Agotado</button>
        <button class="btn btn-outline-secondary" class:active={filtro === 'inactivo'} on:click={() => (filtro = 'inactivo')}>Inactivo</button>
      </div>
    </div>
  </div>

  <div class="kpi-grid mb-4">
    <div class="kpi-card kpi-card--green"><div><div class="kpi-card__label">Productos activos</div><div class="kpi-card__value">{activos.length}</div></div></div>
    <div class="kpi-card kpi-card--gold"><div><div class="kpi-card__label">Stock bajo</div><div class="kpi-card__value">{bajos.length}</div></div></div>
    <div class="kpi-card kpi-card--red"><div><div class="kpi-card__label">Agotados</div><div class="kpi-card__value">{agotados.length}</div></div></div>
    <div class="kpi-card"><div><div class="kpi-card__label">Valor inventario</div><div class="kpi-card__value">{fmt(valorizado)}</div></div></div>
  </div>


  {#if loading}
    <Spinner />
  {:else}
    <div class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table table-sm table-hover table-origen mb-0">
          <thead class="table-origen table-origen--navy">
            <tr>
              <th class="ps-3">Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Estado</th>
              <th class="d-none d-md-table-cell text-end">Valorizado</th>
              {#if $isAdmin}<th class="pe-3"></th>{/if}
            </tr>
          </thead>
          <tbody>
            {#each paged as p}
              <tr class:row-origen--inactive={!p.activo}>
                <td class="ps-3 fw-semibold small">{p.nombre}</td>
                <td class="small">{p.categoria || '-'}</td>
                <td class="small">{fmt(p.precioVenta)}</td>
                <td><span class="badge badge-origen {stockClass(p)}">{p.stock} unid.</span></td>
                <td><span class="badge badge-origen {stockClass(p)}">{stockLabel(p)}</span></td>
                <td class="d-none d-md-table-cell text-end small fw-semibold">{fmt(p.stock * p.precioVenta)}</td>
                {#if $isAdmin}
                  <td class="pe-3 text-end">
                    <button class="btn btn-sm btn-outline-secondary" on:click={() => openEdit(p)}>Ajustar</button>
                  </td>
                {/if}
              </tr>
            {:else}
              <tr><td colspan="7" class="text-center text-muted py-4">Sin productos para el filtro seleccionado</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <div class="mt-3">
      <Pagination {page} total={visibles.length} {pageSize} onChange={(p) => { page = p; }} />
    </div>

    {#if categorias.length}
      <div class="stock-cats mt-3">
        {#if selectedCategorias.length > 0}
          <button class="stock-cat stock-cat-clear" on:click={() => (selectedCategorias = [])}>
            ✕ Limpiar filtro
          </button>
        {/if}
        {#each categorias as c}
          {@const count = productos.filter((p) => p.categoria === c).length}
          <button
            class="stock-cat {selectedCategorias.includes(c) ? 'active' : ''}"
            on:click={() => toggleCategoria(c)}
          >{c}<strong>{count}</strong></button>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<Modal show={modal} title="Ajustar producto" onClose={() => (modal = false)}>
  <svelte:fragment slot="body">
    <div class="mb-3">
      <label for="stock-producto" class="form-label small fw-semibold">Producto</label>
      <input id="stock-producto" class="form-control" bind:value={editing.nombre} />
    </div>
    <div class="row g-3">
      <div class="col-6">
        <label for="stock-categoria" class="form-label small fw-semibold">Categoría</label>
        <input id="stock-categoria" class="form-control" bind:value={editing.categoria} />
      </div>
      <div class="col-6">
        <label for="stock-precio" class="form-label small fw-semibold">Precio venta</label>
        <input id="stock-precio" class="form-control" type="number" step="0.01" bind:value={editing.precioVenta} />
      </div>
      <div class="col-6">
        <label for="stock-actual" class="form-label small fw-semibold">Stock actual</label>
        <input id="stock-actual" class="form-control" type="number" min="0" bind:value={editing.stock} />
      </div>
      <div class="col-6">
        <label for="stock-estado" class="form-label small fw-semibold">Estado</label>
        <select id="stock-estado" class="form-select" bind:value={editing.activo}>
          <option value={true}>Activo</option>
          <option value={false}>Inactivo</option>
        </select>
      </div>
    </div>
  </svelte:fragment>
  <svelte:fragment slot="footer">
    <button class="btn btn-secondary btn-sm" on:click={() => (modal = false)}>Cancelar</button>
    <button class="btn btn-primary btn-sm" on:click={save} disabled={saving}>
      {#if saving}<span class="spinner-border spinner-border-sm me-1"></span>{/if}Guardar
    </button>
  </svelte:fragment>
</Modal>

<style>
  .stock-cats { display: flex; flex-wrap: wrap; gap: 8px; }
  .stock-cat {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 10px; border-radius: 16px; background: #fff;
    color: #5a6478; font-size: 12px; box-shadow: var(--shadow);
    border: 1.5px solid transparent; cursor: pointer;
    transition: all .15s; font-family: inherit;
  }
  .stock-cat:hover { border-color: var(--navy); color: var(--navy); }
  .stock-cat.active {
    background: var(--navy); color: white; border-color: var(--navy);
  }
  .stock-cat.active strong { background: rgba(255,255,255,.2); color: white; }
  .stock-cat strong {
    background: #eef1f6; color: var(--navy); border-radius: 10px;
    min-width: 22px; text-align: center; padding: 1px 6px;
  }
  .stock-cat-clear {
    background: #fdecea; color: #c0392b; border-color: #f5c6cb;
  }
  .stock-cat-clear:hover { background: #f8d7da; border-color: #c0392b; }
</style>
