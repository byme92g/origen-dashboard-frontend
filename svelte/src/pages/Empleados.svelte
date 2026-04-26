<script lang="ts">
  import { onMount } from 'svelte';
  import { empleadoApi } from '../lib/api/empleados';
  import { usuarioApi } from '../lib/api/usuarios';
  import Spinner from '../lib/components/Spinner.svelte';
  import Pagination from '../lib/components/Pagination.svelte';
  import Modal from '../lib/components/Modal.svelte';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';
  import { toast } from '../lib/stores/toast';
  import type { Empleado, Usuario } from '../lib/types';

  let tab: 'empleados' | 'usuarios' = 'empleados';

  // Empleados
  let empleados: Empleado[] = [];
  let empTotal = 0; let empPage = 1; const empSize = 15;
  let empLoading = true;
  let empModal = false; let empEdit: Partial<Empleado> = {}; let empIsEdit = false; let empSaving = false;
  let empConfirm = false; let empDeleteId: number | null = null;

  // Usuarios
  let usuarios: Usuario[] = [];
  let usrTotal = 0; let usrPage = 1; const usrSize = 15;
  let usrLoading = true;
  let usrModal = false; let usrEdit: any = {}; let usrIsEdit = false; let usrSaving = false;
  let usrConfirm = false; let usrDeleteId: number | null = null;

  async function loadEmpleados() {
    empLoading = true;
    const res = await empleadoApi.listarPaginado(empPage, empSize);
    if (res.ok && res.data) {
      if (Array.isArray(res.data)) { empleados = res.data as unknown as Empleado[]; empTotal = empleados.length; }
      else { empleados = res.data.items; empTotal = res.data.total; }
    }
    empLoading = false;
  }

  async function loadUsuarios() {
    usrLoading = true;
    const res = await usuarioApi.listarPaginado(usrPage, usrSize);
    if (res.ok && res.data) {
      if (Array.isArray(res.data)) { usuarios = res.data as unknown as Usuario[]; usrTotal = usuarios.length; }
      else { usuarios = res.data.items; usrTotal = res.data.total; }
    }
    usrLoading = false;
  }

  onMount(() => { loadEmpleados(); loadUsuarios(); });

  // Empleados CRUD
  async function saveEmp() {
    empSaving = true;
    const res = empIsEdit && empEdit.id
      ? await empleadoApi.actualizar(empEdit.id, empEdit)
      : await empleadoApi.crear(empEdit as Omit<Empleado, 'id'>);
    empSaving = false;
    if (res.ok) { toast(empIsEdit ? 'Actualizado' : 'Creado', 'success'); empModal = false; loadEmpleados(); }
    else toast(res.error ?? 'Error', 'error');
  }

  async function deleteEmp() {
    if (!empDeleteId) return;
    const res = await empleadoApi.eliminar(empDeleteId);
    empConfirm = false;
    if (res.ok) { toast('Eliminado', 'success'); loadEmpleados(); }
    else toast(res.error ?? 'Error', 'error');
  }

  // Usuarios CRUD
  async function saveUsr() {
    usrSaving = true;
    const res = usrIsEdit && usrEdit.id
      ? await usuarioApi.actualizar(usrEdit.id, usrEdit)
      : await usuarioApi.crear(usrEdit);
    usrSaving = false;
    if (res.ok) { toast(usrIsEdit ? 'Actualizado' : 'Creado', 'success'); usrModal = false; loadUsuarios(); }
    else toast(res.error ?? 'Error', 'error');
  }

  async function deleteUsr() {
    if (!usrDeleteId) return;
    const res = await usuarioApi.eliminar(usrDeleteId);
    usrConfirm = false;
    if (res.ok) { toast('Eliminado', 'success'); loadUsuarios(); }
    else toast(res.error ?? 'Error', 'error');
  }
</script>

<div class="p-3 p-md-4">
  <h5 class="fw-bold mb-3">Personal</h5>

  <ul class="nav nav-tabs mb-3">
    <li class="nav-item">
      <button class="nav-link" class:active={tab === 'empleados'} on:click={() => (tab = 'empleados')}>Empleados</button>
    </li>
    <li class="nav-item">
      <button class="nav-link" class:active={tab === 'usuarios'} on:click={() => (tab = 'usuarios')}>Usuarios del sistema</button>
    </li>
  </ul>

  {#if tab === 'empleados'}
    <div class="d-flex justify-content-end mb-3">
      <button class="btn btn-primary btn-sm" on:click={() => { empEdit = {}; empIsEdit = false; empModal = true; }}>+ Nuevo empleado</button>
    </div>
    {#if empLoading}<Spinner />{:else}
      <div class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">Nombre</th>
                <th>Cargo</th>
                <th>Comisión</th>
                <th class="d-none d-md-table-cell">Cuenta</th>
                <th>Estado</th>
                <th class="pe-3"></th>
              </tr>
            </thead>
            <tbody>
              {#each empleados as e}
                <tr>
                  <td class="ps-3 fw-semibold small">{e.nombre}</td>
                  <td class="small">{e.cargo}</td>
                  <td class="small">{e.comisionPct}%</td>
                  <td class="small text-muted d-none d-md-table-cell">{e.usuarioLogin ?? '—'}</td>
                  <td><span class="badge bg-{e.activo ? 'success' : 'secondary'}">{e.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td class="pe-3 text-end">
                    <button class="btn btn-sm btn-outline-secondary me-1" on:click={() => { empEdit = {...e}; empIsEdit = true; empModal = true; }}>✏️</button>
                    <button class="btn btn-sm btn-outline-danger" on:click={() => { empDeleteId = e.id; empConfirm = true; }}>🗑️</button>
                  </td>
                </tr>
              {:else}
                <tr><td colspan="6" class="text-center text-muted py-4">Sin empleados</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
        {#if empTotal > empSize}
          <div class="p-3"><Pagination page={empPage} total={empTotal} pageSize={empSize} onChange={(p) => { empPage = p; loadEmpleados(); }} /></div>
        {/if}
      </div>
    {/if}

  {:else}
    <div class="d-flex justify-content-end mb-3">
      <button class="btn btn-primary btn-sm" on:click={() => { usrEdit = { rol: 'empleado' }; usrIsEdit = false; usrModal = true; }}>+ Nuevo usuario</button>
    </div>
    {#if usrLoading}<Spinner />{:else}
      <div class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">Usuario</th>
                <th>Nombre completo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th class="pe-3"></th>
              </tr>
            </thead>
            <tbody>
              {#each usuarios as u}
                <tr>
                  <td class="ps-3 fw-semibold small">{u.nombreUsuario}</td>
                  <td class="small">{u.nombreCompleto}</td>
                  <td><span class="badge bg-{u.rol === 'admin' ? 'primary' : 'secondary'}">{u.rol}</span></td>
                  <td><span class="badge bg-{u.activo ? 'success' : 'secondary'}">{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td class="pe-3 text-end">
                    <button class="btn btn-sm btn-outline-secondary me-1" on:click={() => { usrEdit = {...u}; usrIsEdit = true; usrModal = true; }}>✏️</button>
                    <button class="btn btn-sm btn-outline-danger" on:click={() => { usrDeleteId = u.id; usrConfirm = true; }}>🗑️</button>
                  </td>
                </tr>
              {:else}
                <tr><td colspan="5" class="text-center text-muted py-4">Sin usuarios</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
        {#if usrTotal > usrSize}
          <div class="p-3"><Pagination page={usrPage} total={usrTotal} pageSize={usrSize} onChange={(p) => { usrPage = p; loadUsuarios(); }} /></div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<!-- Modales empleados -->
<Modal show={empModal} title={empIsEdit ? 'Editar empleado' : 'Nuevo empleado'} onClose={() => (empModal = false)}>
  <svelte:fragment slot="body">
    <div class="mb-3"><label class="form-label small fw-semibold">Nombre *</label><input class="form-control" bind:value={empEdit.nombre} /></div>
    <div class="mb-3"><label class="form-label small fw-semibold">Cargo *</label><input class="form-control" bind:value={empEdit.cargo} /></div>
    <div class="mb-3"><label class="form-label small fw-semibold">Comisión %</label><input class="form-control" type="number" min="0" max="100" bind:value={empEdit.comisionPct} /></div>
    <div class="mb-3"><label class="form-label small fw-semibold">Usuario login</label><input class="form-control" bind:value={empEdit.usuarioLogin} /></div>
    {#if empIsEdit}
      <div class="mb-3">
        <label class="form-label small fw-semibold">Estado</label>
        <select class="form-select" bind:value={empEdit.activo}>
          <option value={true}>Activo</option>
          <option value={false}>Inactivo</option>
        </select>
      </div>
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="footer">
    <button class="btn btn-secondary btn-sm" on:click={() => (empModal = false)}>Cancelar</button>
    <button class="btn btn-primary btn-sm" on:click={saveEmp} disabled={empSaving}>
      {#if empSaving}<span class="spinner-border spinner-border-sm me-1"></span>{/if}Guardar
    </button>
  </svelte:fragment>
</Modal>

<!-- Modales usuarios -->
<Modal show={usrModal} title={usrIsEdit ? 'Editar usuario' : 'Nuevo usuario'} onClose={() => (usrModal = false)}>
  <svelte:fragment slot="body">
    <div class="mb-3"><label class="form-label small fw-semibold">Nombre completo *</label><input class="form-control" bind:value={usrEdit.nombreCompleto} /></div>
    {#if !usrIsEdit}
      <div class="mb-3"><label class="form-label small fw-semibold">Usuario *</label><input class="form-control" bind:value={usrEdit.nombreUsuario} /></div>
      <div class="mb-3"><label class="form-label small fw-semibold">Contraseña *</label><input class="form-control" type="password" bind:value={usrEdit.password} /></div>
    {:else}
      <div class="mb-3"><label class="form-label small fw-semibold">Nueva contraseña</label><input class="form-control" type="password" bind:value={usrEdit.password} placeholder="Dejar vacío para no cambiar" /></div>
    {/if}
    <div class="mb-3">
      <label class="form-label small fw-semibold">Rol</label>
      <select class="form-select" bind:value={usrEdit.rol}>
        <option value="empleado">Empleado</option>
        <option value="admin">Admin</option>
      </select>
    </div>
    {#if usrIsEdit}
      <div class="mb-3">
        <label class="form-label small fw-semibold">Estado</label>
        <select class="form-select" bind:value={usrEdit.activo}>
          <option value={true}>Activo</option>
          <option value={false}>Inactivo</option>
        </select>
      </div>
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="footer">
    <button class="btn btn-secondary btn-sm" on:click={() => (usrModal = false)}>Cancelar</button>
    <button class="btn btn-primary btn-sm" on:click={saveUsr} disabled={usrSaving}>
      {#if usrSaving}<span class="spinner-border spinner-border-sm me-1"></span>{/if}Guardar
    </button>
  </svelte:fragment>
</Modal>

<ConfirmDialog show={empConfirm} message="¿Eliminar este empleado?" onConfirm={deleteEmp} onCancel={() => (empConfirm = false)} />
<ConfirmDialog show={usrConfirm} message="¿Eliminar este usuario?" onConfirm={deleteUsr} onCancel={() => (usrConfirm = false)} />
