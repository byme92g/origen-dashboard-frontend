<script lang="ts">
  import '../styles/pages/_clientes.css';
  import { onMount } from 'svelte';
  import { clienteApi } from '../lib/api/clientes';
  import Spinner from '../lib/components/Spinner.svelte';
  import Pagination from '../lib/components/Pagination.svelte';
  import Modal from '../lib/components/Modal.svelte';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';
  import { toast } from '../lib/stores/toast';
  import { isAdmin } from '../lib/stores/auth';
  import type { Cliente, Ingreso, PaginatedResult } from '../lib/types';
  import { fmtDatetime, fmtDate, fmtTime } from '../lib/utils/date';

  let items: Cliente[] = [];
  let total = 0;
  let page = 1;
  const pageSize = 15;
  let loading = true;
  let search = '';
  let searchTimeout: ReturnType<typeof setTimeout>;

  let showModal = false;
  let editing: Partial<Cliente> = {};
  let isEdit = false;
  let saving = false;

  let showConfirm = false;
  let deleteTarget: number | null = null;
  let deleting = false;

  // ── Historial ──────────────────────────────────────────────────────────────
  let showHistorial = false;
  let historialCliente: Cliente | null = null;
  let historialItems: Ingreso[] = [];
  let historialTotal = 0;
  let historialPage = 1;
  const historialPageSize = 8;
  let historialLoading = false;

  async function load() {
    loading = true;
    const res = await clienteApi.listarPaginado(page, pageSize, search || undefined);
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

  function onSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { page = 1; load(); }, 350);
  }

  async function loadHistorial() {
    if (!historialCliente) return;
    historialLoading = true;
    const res = await clienteApi.historial(historialCliente.id, historialPage, historialPageSize);
    if (res.ok && res.data) {
      const d = res.data as unknown as PaginatedResult<Ingreso>;
      historialItems = d.items;
      historialTotal = d.total;
    }
    historialLoading = false;
  }

  function openHistorial(c: Cliente) {
    historialCliente = c;
    historialPage = 1;
    historialItems = [];
    showHistorial = true;
    loadHistorial();
  }

  onMount(load);

  function openCreate() { editing = {}; isEdit = false; showModal = true; }
  function openEdit(c: Cliente) { editing = { ...c }; isEdit = true; showModal = true; }

  async function save() {
    if (!editing.nombre?.trim()) { toast('El nombre es obligatorio', 'error'); return; }
    if (!editing.dni?.trim()) { toast('El DNI es obligatorio', 'error'); return; }
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

  function getConcepto(i: Ingreso): string {
    if (i.detalles && i.detalles.length > 0) {
      const firstName = i.detalles[0].nombre || 'Ítem';
      return i.detalles.length === 1 ? firstName : `${firstName} +${i.detalles.length - 1} más`;
    }
    return i.servicio?.nombre ?? i.producto?.nombre ?? i.paquete?.nombre ?? i.conceptoPersonalizado ?? '—';
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
    <div class="page-panel__search">
      <i class="bi bi-search page-panel__search-icon"></i>
      <input
        type="search"
        class="form-control form-control-sm page-panel__search-input"
        placeholder="Buscar por nombre o DNI…"
        bind:value={search}
        on:input={onSearchInput}
      />
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
                <th>DNI</th>
                <th class="d-none d-md-table-cell">Email</th>
                <th class="d-none d-lg-table-cell">Observaciones</th>
                <th class="pe-3"></th>
              </tr>
            </thead>
            <tbody>
              {#each items as c}
                <tr>
                  <td class="ps-3 fw-semibold small">{c.nombre}</td>
                  <td class="small text-muted">{c.dni || '—'}</td>
                  <td class="small text-muted d-none d-md-table-cell">{c.email ?? '—'}</td>
                  <td class="small text-muted d-none d-lg-table-cell" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{c.observaciones ?? '—'}</td>
                  <td class="pe-3 text-end" style="white-space:nowrap">
                    <button class="btn btn-outline-secondary btn-sm me-1" on:click={() => openHistorial(c)} title="Ver historial">
                      <i class="bi bi-clock-history"></i>
                    </button>
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
                <tr><td colspan="5" class="text-center text-muted py-4">{search ? 'Sin resultados para la búsqueda.' : 'Sin clientes registrados.'}</td></tr>
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

<!-- ── Modal crear/editar ─────────────────────────────────────────────────── -->
<Modal show={showModal} title={isEdit ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => (showModal = false)}>
  <svelte:fragment slot="body">
    <div class="mb-3">
      <label class="form-label small fw-semibold" for="cliente-nombre">Nombre *</label>
      <input class="form-control" id="cliente-nombre" bind:value={editing.nombre} required />
    </div>
    <div class="mb-3">
      <label class="form-label small fw-semibold" for="cliente-dni">DNI *</label>
      <input class="form-control" id="cliente-dni" bind:value={editing.dni} maxlength="8" placeholder="8 dígitos" required />
    </div>
    <div class="mb-3">
      <label class="form-label small fw-semibold" for="cliente-telefono">Teléfono</label>
      <input class="form-control" id="cliente-telefono" bind:value={editing.telefono} />
    </div>
    <div class="mb-3">
      <label class="form-label small fw-semibold" for="cliente-email">Email</label>
      <input class="form-control" id="cliente-email" type="email" bind:value={editing.email} />
    </div>
    <div class="mb-3">
      <label class="form-label small fw-semibold" for="cliente-observaciones">Observaciones</label>
      <textarea class="form-control" id="cliente-observaciones" rows="2" bind:value={editing.observaciones}></textarea>
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

<!-- ── Modal historial ────────────────────────────────────────────────────── -->
{#if showHistorial && historialCliente}
  <div class="modal d-block" style="background:rgba(0,0,0,.5)">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content modal-origen">
        <div class="modal-header border-0 pb-0">
          <div>
            <h5 class="modal-title mb-0">Historial de {historialCliente.nombre}</h5>
            {#if historialCliente.dni}<small class="text-muted">DNI {historialCliente.dni}</small>{/if}
          </div>
          <button class="btn-close" on:click={() => (showHistorial = false)}></button>
        </div>
        <div class="modal-body pt-3">
          {#if historialLoading}
            <div class="text-center py-4"><span class="spinner-border spinner-border-sm"></span></div>
          {:else if historialItems.length === 0}
            <div class="text-center text-muted py-4">
              <i class="bi bi-clock-history" style="font-size:2rem;opacity:.3"></i>
              <div class="mt-2">Sin transacciones registradas</div>
            </div>
          {:else}
            <div class="hist-list">
              {#each historialItems as ingreso}
                <div class="hist-tx">
                  <div class="hist-tx__header">
                    <span class="hist-tx__hora">{fmtDate(ingreso.fecha)} · {fmtTime(ingreso.fecha)}</span>
                    <span class="metodo-badge metodo-badge--{ingreso.metodoPago}" style="font-size:10px">{ingreso.metodoPago}</span>
                    <span class="hist-tx__total">S/ {(ingreso.monto - ingreso.descuento).toFixed(2)}</span>
                  </div>
                  {#if ingreso.detalles && ingreso.detalles.length > 0}
                    {#each ingreso.detalles as d}
                      <div class="hist-item">
                        <span class="hist-item__nombre">{d.nombre || '—'}</span>
                        <span class="hist-item__monto">S/ {d.monto.toFixed(2)}</span>
                      </div>
                    {/each}
                  {:else}
                    <div class="hist-item">
                      <span class="hist-item__nombre">{getConcepto(ingreso)}</span>
                      <span class="hist-item__monto">S/ {(ingreso.monto - ingreso.descuento).toFixed(2)}</span>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
            {#if historialTotal > historialPageSize}
              <div class="pt-3">
                <Pagination page={historialPage} total={historialTotal} pageSize={historialPageSize}
                  onChange={(p) => { historialPage = p; loadHistorial(); }} />
              </div>
            {/if}
          {/if}
        </div>
        <div class="modal-footer border-0 pt-0">
          <div class="text-muted small me-auto">{historialTotal} transacción{historialTotal !== 1 ? 'es' : ''} en total</div>
          <button class="btn btn-secondary btn-sm" on:click={() => (showHistorial = false)}>Cerrar</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<ConfirmDialog
  show={showConfirm}
  message="¿Eliminar este cliente? Esta acción no se puede deshacer."
  onConfirm={doDelete}
  onCancel={() => (showConfirm = false)}
  loading={deleting}
/>
