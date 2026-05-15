<script lang="ts">
  import { onMount } from 'svelte';
  import { empleadoApi } from '../lib/api/empleados';
  import { usuarioApi } from '../lib/api/usuarios';
  import { cargoApi } from '../lib/api/cargos';
  import Spinner from '../lib/components/Spinner.svelte';
  import Pagination from '../lib/components/Pagination.svelte';
  import Modal from '../lib/components/Modal.svelte';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';
  import { toast } from '../lib/stores/toast';
  import { authStore } from '../lib/stores/auth';
  import type { Empleado, Usuario, Cargo } from '../lib/types';

  let tab: 'empleados' | 'admins' = 'empleados';

  // Empleados
  let empleados: Empleado[] = [];
  let empTotal = 0; let empPage = 1; const empSize = 15;
  let empLoading = true;
  let empInactivos = false;
  let empModal = false; let empEdit: Partial<Empleado & { password?: string }> = {}; let empIsEdit = false; let empSaving = false;
  let loginAutoSync = false;
  let cargos: Cargo[] = [];
  let empConfirm = false; let empDeleteId: number | null = null; let empDeleting = false;

  // Admins
  let usuarios: Usuario[] = [];
  let usrPage = 1; const usrSize = 15;
  let usrLoading = true;
  let usrModal = false; let usrEdit: any = {}; let usrIsEdit = false; let usrSaving = false;
  let usrConfirm = false; let usrDeleteId: number | null = null; let usrDeleting = false;
  let pwdModal = false; let pwdUser: Usuario | null = null; let pwdValue = ''; let pwdSaving = false;
  $: admins = usuarios.filter((u) => u.rol === 'admin');
  $: pagedAdmins = admins.slice((usrPage - 1) * usrSize, usrPage * usrSize);
  $: usrTotal = admins.length;
  $: currentAdminId = $authStore.user?.id;

  async function loadEmpleados() {
    empLoading = true;
    const res = await empleadoApi.listarPaginado(empPage, empSize, empInactivos);
    if (res.ok && res.data) {
      if (Array.isArray(res.data)) { empleados = res.data as unknown as Empleado[]; empTotal = empleados.length; }
      else { empleados = res.data.items; empTotal = res.data.total; }
    }
    empLoading = false;
  }

  async function loadUsuarios() {
    usrLoading = true;
    const res = await usuarioApi.listar();
    if (res.ok && res.data) usuarios = res.data;
    usrLoading = false;
  }

  async function loadCargos() {
    const res = await cargoApi.listar();
    if (res.ok && res.data) cargos = res.data;
  }

  onMount(() => { loadEmpleados(); loadUsuarios(); loadCargos(); });

  // Empleados CRUD
  async function saveEmp() {
    if (!empEdit.usuarioLogin?.trim()) {
      toast('Ingresa el usuario de acceso.', 'error');
      return;
    }

    if (!empIsEdit && !empEdit.password?.trim()) {
      toast('Ingresa la contraseña inicial.', 'error');
      return;
    }

    empSaving = true;
    const res = empIsEdit && empEdit.id
      ? await empleadoApi.actualizar(empEdit.id, empEdit)
      : await empleadoApi.crear(empEdit);
    empSaving = false;
    if (res.ok) { toast(empIsEdit ? 'Actualizado' : 'Creado', 'success'); empModal = false; loadEmpleados(); loadUsuarios(); }
    else toast(res.error ?? 'Error', 'error');
  }

  async function deleteEmp() {
    if (!empDeleteId) return;
    empDeleting = true;
    const res = await empleadoApi.eliminar(empDeleteId);
    empDeleting = false;
    empConfirm = false;
    if (res.ok) { toast('Empleado desactivado', 'success'); loadEmpleados(); }
    else toast(res.error ?? 'Error', 'error');
  }

  async function reactivarEmp(empleado: Empleado) {
    const res = await empleadoApi.actualizar(empleado.id, { ...empleado, activo: true, password: '' });
    if (res.ok) { toast('Empleado reactivado', 'success'); loadEmpleados(); }
    else toast(res.error ?? 'Error', 'error');
  }

  // Admins CRUD
  async function saveUsr() {
    usrSaving = true;
    const payload = { ...usrEdit, rol: 'admin' };
    const res = usrIsEdit && usrEdit.id
      ? await usuarioApi.actualizar(usrEdit.id, payload)
      : await usuarioApi.crear(payload);
    usrSaving = false;
    if (res.ok) { toast(usrIsEdit ? 'Actualizado' : 'Creado', 'success'); usrModal = false; loadUsuarios(); }
    else toast(res.error ?? 'Error', 'error');
  }

  async function deleteUsr() {
    if (!usrDeleteId) return;
    usrDeleting = true;
    const res = await usuarioApi.eliminar(usrDeleteId);
    usrDeleting = false;
    usrConfirm = false;
    if (res.ok) { toast('Eliminado', 'success'); loadUsuarios(); }
    else toast(res.error ?? 'Error', 'error');
  }

  function usuarioDeEmpleado(empleado: Empleado) {
    if (!empleado.usuarioLogin) return null;
    return usuarios.find((u) => u.nombreUsuario === empleado.usuarioLogin) ?? null;
  }

  function sugerirLogin(nombre: string): string {
    const sinAcentos = nombre.trim().toLowerCase()
      .normalize('NFD').replace(/\p{Mn}/gu, '');
    const partes = sinAcentos.split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '';
    if (partes.length === 1) return partes[0];
    return `${partes[0]}.${partes[1]}`;
  }

  function onNombreInput() {
    if (!empIsEdit && loginAutoSync) {
      empEdit.usuarioLogin = sugerirLogin(empEdit.nombre ?? '');
    }
  }

  function onLoginInput() {
    loginAutoSync = false;
  }

  function openNewEmpleado() {
    empEdit = {};
    empIsEdit = false;
    loginAutoSync = true;
    empModal = true;
  }

  function openEditEmpleado(empleado: Empleado) {
    empEdit = { ...empleado, password: '' };
    empIsEdit = true;
    empModal = true;
  }

  function openPasswordModal(usuario: Usuario) {
    pwdUser = usuario;
    pwdValue = '';
    pwdModal = true;
  }

  async function savePassword() {
    if (!pwdUser) return;
    if (!pwdValue.trim()) {
      toast('Ingresa una contraseña.', 'error');
      return;
    }

    pwdSaving = true;
    const res = await usuarioApi.actualizar(pwdUser.id, { ...pwdUser, password: pwdValue });
    pwdSaving = false;

    if (res.ok) {
      toast('Contraseña actualizada', 'success');
      pwdModal = false;
      loadUsuarios();
    } else {
      toast(res.error ?? 'Error', 'error');
    }
  }
</script>

<div class="p-3 p-md-4">
  <div class="page-panel mb-3">
    <div class="page-panel__top">
      <div class="d-flex align-items-center gap-3">
        <div class="page-panel__icon"><i class="bi bi-person-badge"></i></div>
        <div>
          <h5 class="fw-bold mb-0">Personal</h5>
          <p class="text-muted small mb-0">Empleados y administradores del sistema</p>
        </div>
      </div>
    </div>
  </div>

  <div class="d-flex align-items-end justify-content-between mb-3 flex-wrap gap-2">
    <ul class="nav nav-tabs nav-tabs-origen mb-0">
      <li class="nav-item">
        <button class="nav-link" class:active={tab === 'empleados'} on:click={() => (tab = 'empleados')}>Empleados</button>
      </li>
      <li class="nav-item">
        <button class="nav-link" class:active={tab === 'admins'} on:click={() => (tab = 'admins')}>Admins</button>
      </li>
    </ul>
    {#if tab === 'empleados'}
      <div class="d-flex align-items-center gap-2">
        <div class="form-check form-switch mb-0">
          <input class="form-check-input" type="checkbox" id="chkInactivos" bind:checked={empInactivos} on:change={() => { empPage = 1; loadEmpleados(); }} />
          <label class="form-check-label small text-muted" for="chkInactivos">Ver inactivos</label>
        </div>
        <button class="btn btn-primary btn-sm" on:click={openNewEmpleado}>
          <i class="bi bi-plus-lg me-1"></i>Nuevo empleado
        </button>
      </div>
    {:else}
      <button class="btn btn-primary btn-sm" on:click={() => { usrEdit = { rol: 'admin' }; usrIsEdit = false; usrModal = true; }}>
        <i class="bi bi-plus-lg me-1"></i>Nuevo admin
      </button>
    {/if}
  </div>

  {#if tab === 'empleados'}
    {#if empLoading}<Spinner />{:else}
      <div class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table table-sm table-hover table-origen mb-0">
            <thead class="table-origen table-origen--navy">
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
                {@const cuenta = usuarioDeEmpleado(e)}
                <tr>
                  <td class="ps-3 fw-semibold small">{e.nombre}</td>
                  <td class="small">{e.cargo}</td>
                  <td class="small">{e.comisionPct}%</td>
                  <td class="small text-muted d-none d-md-table-cell">{e.usuarioLogin ?? '—'}</td>
                  <td><span class="badge badge-origen {e.activo ? 'badge-origen--green' : 'badge-origen--gray'}">{e.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td class="pe-3 text-end">
                    <div class="d-flex gap-1 justify-content-end">
                      <button class="btn btn-sm btn-outline-secondary" on:click={() => openEditEmpleado(e)} title="Editar">
                        <i class="bi bi-pencil-square"></i>
                      </button>
                      {#if cuenta && cuenta.rol !== 'admin'}
                        <button class="btn btn-sm btn-outline-secondary" on:click={() => openPasswordModal(cuenta)} title="Cambiar contraseña">
                          <i class="bi bi-key"></i>
                        </button>
                      {/if}
                      {#if !e.usuarioLogin || e.usuarioLogin !== $authStore.user?.nombreUsuario}
                        {#if e.activo}
                          <button class="btn btn-sm btn-outline-danger" on:click={() => { empDeleteId = e.id; empConfirm = true; }} title="Desactivar">
                            <i class="bi bi-person-dash"></i>
                          </button>
                        {:else}
                          <button class="btn btn-sm btn-outline-success" on:click={() => reactivarEmp(e)} title="Reactivar">
                            <i class="bi bi-person-check"></i>
                          </button>
                        {/if}
                      {/if}
                    </div>
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
    {#if usrLoading}<Spinner />{:else}
      <div class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table table-sm table-hover table-origen mb-0">
            <thead class="table-origen table-origen--navy">
              <tr>
                <th class="ps-3">Usuario</th>
                <th>Nombre completo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th class="pe-3"></th>
              </tr>
            </thead>
            <tbody>
              {#each pagedAdmins as u}
                <tr>
                  <td class="ps-3 fw-semibold small">{u.nombreUsuario}</td>
                  <td class="small">{u.nombreCompleto}</td>
                  <td><span class="badge badge-origen {u.rol === 'admin' ? 'badge-origen--navy' : 'badge-origen--gold'}">{u.rol}</span></td>
                  <td><span class="badge badge-origen {u.activo ? 'badge-origen--green' : 'badge-origen--gray'}">{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td class="pe-3 text-end">
                    <div class="d-flex gap-1 justify-content-end">
                      {#if u.id === currentAdminId}
                        <button class="btn btn-sm btn-outline-secondary" on:click={() => { usrEdit = {...u}; usrIsEdit = true; usrModal = true; }} title="Editar">
                          <i class="bi bi-pencil-square"></i>
                        </button>
                      {:else}
                        <span class="small text-muted">Protegido</span>
                      {/if}
                    </div>
                  </td>
                </tr>
              {:else}
                <tr><td colspan="5" class="text-center text-muted py-4">Sin admins</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
        {#if usrTotal > usrSize}
          <div class="p-3"><Pagination page={usrPage} total={usrTotal} pageSize={usrSize} onChange={(p) => { usrPage = p; }} /></div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<!-- Modales empleados -->
<Modal show={empModal} title={empIsEdit ? 'Editar empleado' : 'Nuevo empleado'} onClose={() => (empModal = false)}>
  <svelte:fragment slot="body">
    <div class="mb-3"><label for="emp-nombre" class="form-label small fw-semibold">Nombre *</label><input id="emp-nombre" class="form-control" bind:value={empEdit.nombre} on:input={onNombreInput} /></div>
    <div class="mb-3">
      <label for="emp-cargo" class="form-label small fw-semibold">Cargo *</label>
      <select id="emp-cargo" class="form-select" bind:value={empEdit.cargo}>
        <option value="">— Seleccionar cargo —</option>
        {#each cargos as c}
          <option value={c.nombre}>{c.nombre}</option>
        {/each}
      </select>
      {#if cargos.length === 0}
        <div class="form-text text-warning">No hay cargos configurados. Agrégalos en Configuración → Cargos.</div>
      {/if}
    </div>
    <div class="mb-3"><label for="emp-comision" class="form-label small fw-semibold">Comisión %</label><input id="emp-comision" class="form-control" type="number" min="0" max="100" bind:value={empEdit.comisionPct} /></div>
    <div class="mb-3">
      <label for="emp-usuario" class="form-label small fw-semibold">Usuario de acceso *</label>
      <input id="emp-usuario" class="form-control" bind:value={empEdit.usuarioLogin} on:input={onLoginInput} placeholder={!empIsEdit ? (sugerirLogin(empEdit.nombre ?? '') || 'ej. pedro.suarez') : ''} />
    </div>
    <div class="mb-3">
      <label for="emp-password" class="form-label small fw-semibold">{empIsEdit ? 'Nueva contraseña de acceso' : 'Contraseña de acceso *'}</label>
      <input id="emp-password" class="form-control" type="password" bind:value={empEdit.password} placeholder={empIsEdit ? 'Dejar vacío para no cambiar' : ''} />
    </div>
  </svelte:fragment>
  <svelte:fragment slot="footer">
    <button class="btn btn-secondary btn-sm" on:click={() => (empModal = false)}>Cancelar</button>
    <button class="btn btn-primary btn-sm" on:click={saveEmp} disabled={empSaving}>
      {#if empSaving}<span class="spinner-border spinner-border-sm me-1"></span>{/if}Guardar
    </button>
  </svelte:fragment>
</Modal>

<!-- Modales admins -->
<Modal show={usrModal} title={usrIsEdit ? 'Editar admin' : 'Nuevo admin'} onClose={() => (usrModal = false)}>
  <svelte:fragment slot="body">
    <div class="mb-3"><label for="usr-nombre" class="form-label small fw-semibold">Nombre completo *</label><input id="usr-nombre" class="form-control" bind:value={usrEdit.nombreCompleto} /></div>
    {#if !usrIsEdit}
      <div class="mb-3"><label for="usr-usuario" class="form-label small fw-semibold">Usuario *</label><input id="usr-usuario" class="form-control" bind:value={usrEdit.nombreUsuario} /></div>
      <div class="mb-3"><label for="usr-password" class="form-label small fw-semibold">Contraseña *</label><input id="usr-password" class="form-control" type="password" bind:value={usrEdit.password} /></div>
    {:else}
      <div class="mb-3"><label for="usr-nueva-password" class="form-label small fw-semibold">Nueva contraseña</label><input id="usr-nueva-password" class="form-control" type="password" bind:value={usrEdit.password} placeholder="Dejar vacío para no cambiar" /></div>
    {/if}
    <input type="hidden" bind:value={usrEdit.rol} />
    {#if usrIsEdit}
      <div class="mb-3">
        <label for="usr-estado" class="form-label small fw-semibold">Estado</label>
        <select id="usr-estado" class="form-select" bind:value={usrEdit.activo}>
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

<ConfirmDialog show={empConfirm} message="¿Desactivar este empleado?" onConfirm={deleteEmp} onCancel={() => (empConfirm = false)} loading={empDeleting} />
<ConfirmDialog show={usrConfirm} message="¿Eliminar este admin?" onConfirm={deleteUsr} onCancel={() => (usrConfirm = false)} loading={usrDeleting} />

<Modal show={pwdModal} title="Cambiar contraseña" onClose={() => (pwdModal = false)}>
  <svelte:fragment slot="body">
    <div class="mb-3">
      <label for="pwd-usuario" class="form-label small fw-semibold">Usuario</label>
      <input id="pwd-usuario" class="form-control" value={pwdUser?.nombreUsuario ?? ''} disabled />
    </div>
    <div class="mb-3">
      <label for="pwd-nueva" class="form-label small fw-semibold">Nueva contraseña *</label>
      <input id="pwd-nueva" class="form-control" type="password" bind:value={pwdValue} />
    </div>
  </svelte:fragment>
  <svelte:fragment slot="footer">
    <button class="btn btn-secondary btn-sm" on:click={() => (pwdModal = false)}>Cancelar</button>
    <button class="btn btn-primary btn-sm" on:click={savePassword} disabled={pwdSaving}>
      {#if pwdSaving}<span class="spinner-border spinner-border-sm me-1"></span>{/if}Guardar
    </button>
  </svelte:fragment>
</Modal>
