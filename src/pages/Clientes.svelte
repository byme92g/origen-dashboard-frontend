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
  <div class="page-panel mb-3">
    <div class="page-panel__top">
      <div class="d-flex align-items-center gap-3">
        <div class="page-panel__icon"><i class="bi bi-people"></i></div>
        <div>
          <h5 class="fw-bold mb-0">Clientes</h5>
          <p class="text-muted small mb-0">Directorio de clientes registrados</p>
        </div>
      </div>
      <button class="btn btn-primary btn-sm" on:click={openCreate}>
        <i class="bi bi-plus-lg me-1"></i>Nuevo cliente
      </button>
    </div>
  </div>

  {#if loading}
    <Spinner />
  {:else}
    <div class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-sm table-hover table-origen mb-0">
            <thead class="table-origen table-origen--navy">
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
                      <i class="bi bi-pencil-square"></i>
                    </button>
                    {#if $isAdmin}
                      <button class="btn btn-outline-danger btn-sm" on:click={() => confirmDelete(c.id)} title="Eliminar">
                        <i class="bi bi-trash"></i>
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
