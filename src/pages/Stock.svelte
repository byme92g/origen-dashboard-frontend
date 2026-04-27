<script lang="ts">
  import { onMount } from 'svelte';
  import { productoApi } from '../lib/api/productos';
  import { isAdmin } from '../lib/stores/auth';
  import Spinner from '../lib/components/Spinner.svelte';
  import Modal from '../lib/components/Modal.svelte';
  import { toast } from '../lib/stores/toast';
  import type { Producto } from '../lib/types';

  type FiltroStock = 'todos' | 'bajo' | 'agotado' | 'inactivo';

  let productos: Producto[] = [];
  let loading = true;
  let filtro: FiltroStock = 'todos';
  let busqueda = '';
  let modal = false;
  let editing: Partial<Producto> = {};
  let saving = false;
  const bajoMinimo = 5;

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
    .filter((p) => `${p.nombre} ${p.categoria}`.toLowerCase().includes(busqueda.trim().toLowerCase()));

  function fmt(v: number) { return `S/ ${v.toFixed(2)}`; }
  function stockClass(p: Producto) {
    if (!p.activo) return 'badge-gray';
    if (p.stock <= 0) return 'badge-red';
    if (p.stock <= bajoMinimo) return 'badge-gold';
    return 'badge-green';
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
  <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
    <div>
      <h5 class="fw-bold mb-0">Control de stock</h5>
      <p class="text-muted small mb-0">Inventario de productos y alertas de disponibilidad</p>
    </div>
    <button class="btn btn-outline-secondary btn-sm" on:click={load}>Actualizar</button>
  </div>

  <div class="kpi-grid mb-4">
    <div class="kpi-card green"><div><div class="kpi-label">Productos activos</div><div class="kpi-value">{activos.length}</div></div></div>
    <div class="kpi-card gold"><div><div class="kpi-label">Stock bajo</div><div class="kpi-value">{bajos.length}</div></div></div>
    <div class="kpi-card red"><div><div class="kpi-label">Agotados</div><div class="kpi-value">{agotados.length}</div></div></div>
    <div class="kpi-card"><div><div class="kpi-label">Valor inventario</div><div class="kpi-value">{fmt(valorizado)}</div></div></div>
  </div>

  <div class="card border-0 shadow-sm p-3 mb-3">
    <div class="d-flex gap-2 flex-wrap align-items-center">
      <input class="form-control form-control-sm stock-search" placeholder="Buscar producto o categoría" bind:value={busqueda} />
      <div class="btn-group btn-group-sm" role="group">
        <button class="btn btn-outline-secondary" class:active={filtro === 'todos'} on:click={() => (filtro = 'todos')}>Todos</button>
        <button class="btn btn-outline-secondary" class:active={filtro === 'bajo'} on:click={() => (filtro = 'bajo')}>Bajo</button>
        <button class="btn btn-outline-secondary" class:active={filtro === 'agotado'} on:click={() => (filtro = 'agotado')}>Agotado</button>
        <button class="btn btn-outline-secondary" class:active={filtro === 'inactivo'} on:click={() => (filtro = 'inactivo')}>Inactivo</button>
      </div>
    </div>
  </div>

  {#if loading}
    <Spinner />
  {:else}
    <div class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table table-sm table-hover table-origen mb-0">
          <thead class="table-origen">
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
            {#each visibles as p}
              <tr class:row-inactive={!p.activo}>
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

    {#if categorias.length}
      <div class="stock-cats mt-3">
        {#each categorias as c}
          {@const count = productos.filter((p) => p.categoria === c).length}
          <span class="stock-cat">{c}<strong>{count}</strong></span>
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
  .stock-search { max-width: 320px; }
  .stock-cats { display: flex; flex-wrap: wrap; gap: 8px; }
  .stock-cat {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 10px; border-radius: 16px; background: #fff;
    color: #5a6478; font-size: 12px; box-shadow: var(--shadow);
  }
  .stock-cat strong {
    background: #eef1f6; color: var(--navy); border-radius: 10px;
    min-width: 22px; text-align: center; padding: 1px 6px;
  }
</style>
