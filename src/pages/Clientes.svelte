<script lang="ts">
  import { onMount } from 'svelte';
  import { clienteApi } from '../lib/api/clientes';
  import Spinner from '../lib/components/Spinner.svelte';
  import Pagination from '../lib/components/Pagination.svelte';
  import Modal from '../lib/components/Modal.svelte';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';
  import { toast } from '../lib/stores/toast';
  import { isAdmin } from '../lib/stores/auth';
  import type { Cliente } from '../lib/types';

  let items: Cliente[] = [];
  let total = 0;
  let page = 1;
  const pageSize = 15;
  let loading = true;

  let showModal = false;
  let editing: Partial<Cliente> = {};
  let isEdit = false;
  let saving = false;

  let showConfirm = false;
  let deleteTarget: number | null = null;
  let deleting = false;

  async function load() {
    loading = true;
    const res = await clienteApi.listarPaginado(page, pageSize);
    if (res.ok && res.data) {
      if (Array.isArray(res.data)) {
        items = res.data as unknown as Cliente[];
        total = items.length;
      } else {
        items = res.data.items;
        total = res.data.total;
      }
    }
    loading = false;
  }

  onMount(load);

  function openCreate() { editing = {}; isEdit = false; showModal = true; }
  function openEdit(c: Cliente) { editing = { ...c }; isEdit = true; showModal = true; }

  async function save() {
    saving = true;
    const res = isEdit && editing.id
      ? await clienteApi.actualizar(editing.id, editing)
      : await clienteApi.crear(editing as Omit<Cliente, 'id' | 'fechaRegistro'>);
    saving = false;
    if (res.ok) {
      toast(isEdit ? 'Cliente actualizado' : 'Cliente creado', 'success');
      showModal = false;
      load();
    } else {
      toast(res.error ?? 'Error al guardar', 'error');
    }
  }

  function confirmDelete(id: number) { deleteTarget = id; showConfirm = true; }
  async function doDelete() {
    if (!deleteTarget) return;
    deleting = true;
    const res = await clienteApi.eliminar(deleteTarget);
    deleting = false;
    showConfirm = false;
    if (res.ok) { toast('Cliente eliminado', 'success'); load(); }
    else toast(res.error ?? 'Error al eliminar', 'error');
  }
</script>

<div class="p-3 p-md-4">
  <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
    <h5 class="fw-bold mb-0">Clientes</h5>
    <button class="btn btn-primary btn-sm" on:click={openCreate}>+ Nuevo cliente</button>
  </div>

  {#if loading}
    <Spinner />
  {:else}
    <div class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-sm table-hover table-origen mb-0">
            <thead class="table-origen">
              <tr>
                <th class="ps-3">Nombre</th>
                <th>Teléfono</th>
                <th class="d-none d-md-table-cell">Email</th>
                <th class="d-none d-lg-table-cell">Observaciones</th>
                <th class="d-none d-lg-table-cell">Registro</th>
                <th class="pe-3"></th>
              </tr>
            </thead>
            <tbody>
              {#each items as c}
                <tr>
                  <td class="ps-3 fw-semibold small">{c.nombre}</td>
                  <td class="small text-muted">{c.telefono ?? '—'}</td>
                  <td class="small text-muted d-none d-md-table-cell">{c.email ?? '—'}</td>
                  <td class="small text-muted d-none d-lg-table-cell" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{c.observaciones ?? '—'}</td>
                  <td class="small text-muted d-none d-lg-table-cell">
                    {new Date(c.fechaRegistro).toLocaleDateString('es-PE')}
                  </td>
                  <td class="pe-3 text-end">
                    <button class="btn btn-outline-secondary btn-sm me-1" on:click={() => openEdit(c)} title="Editar">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    {#if $isAdmin}
                      <button class="btn btn-outline-danger btn-sm" on:click={() => confirmDelete(c.id)} title="Eliminar">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    {/if}
                  </td>
                </tr>
              {:else}
                <tr><td colspan="6" class="text-center text-muted py-4">Sin clientes registrados</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
      {#if total > pageSize}
        <div class="card-footer bg-white border-top-0 pt-0 pb-3 px-3">
          <Pagination {page} {total} {pageSize} onChange={(p) => { page = p; load(); }} />
        </div>
      {/if}
    </div>
  {/if}
</div>

<Modal show={showModal} title={isEdit ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => (showModal = false)}>
  <svelte:fragment slot="body">
    <div class="mb-3">
      <label class="form-label small fw-semibold">Nombre *</label>
      <input class="form-control" bind:value={editing.nombre} required />
    </div>
    <div class="mb-3">
      <label class="form-label small fw-semibold">Teléfono</label>
      <input class="form-control" bind:value={editing.telefono} />
    </div>
    <div class="mb-3">
      <label class="form-label small fw-semibold">Email</label>
      <input class="form-control" type="email" bind:value={editing.email} />
    </div>
    <div class="mb-3">
      <label class="form-label small fw-semibold">Observaciones</label>
      <textarea class="form-control" rows="2" bind:value={editing.observaciones}></textarea>
    </div>
  </svelte:fragment>
  <svelte:fragment slot="footer">
    <button class="btn btn-secondary btn-sm" on:click={() => (showModal = false)}>Cancelar</button>
    <button class="btn btn-primary btn-sm" on:click={save} disabled={saving}>
      {#if saving}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
      Guardar
    </button>
  </svelte:fragment>
</Modal>

<ConfirmDialog
  show={showConfirm}
  message="¿Eliminar este cliente? Esta acción no se puede deshacer."
  onConfirm={doDelete}
  onCancel={() => (showConfirm = false)}
  loading={deleting}
/>
