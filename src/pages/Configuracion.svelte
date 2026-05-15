<script lang="ts">
  import { onMount } from 'svelte';
  import { usuarioApi } from '../lib/api/usuarios';
  import { cargoApi } from '../lib/api/cargos';
  import { permisoApi } from '../lib/api/permisos';
  import type { PermisoVista } from '../lib/api/permisos';
  import { authStore } from '../lib/stores/auth';
  import { toast } from '../lib/stores/toast';
  import type { Cargo } from '../lib/types';
  import '../styles/pages/_configuracion.css';

  type Tab = 'negocio' | 'cuenta' | 'cargos' | 'permisos';
  let tab: Tab = 'negocio';

  type NegocioConfig = {
    nombre: string; ruc: string; telefono: string; direccion: string; email: string;
  };

  const negocioKey = 'origen_negocio_config';
  const defaultNegocio: NegocioConfig = { nombre: 'Origen Capilar Estética', ruc: '', telefono: '', direccion: '', email: '' };

  function loadNegocio(): NegocioConfig {
    try {
      const raw = localStorage.getItem(negocioKey);
      return raw ? { ...defaultNegocio, ...JSON.parse(raw) } : defaultNegocio;
    } catch { return defaultNegocio; }
  }

  let negocio = loadNegocio();
  let perfil = {
    nombreCompleto: $authStore.user?.nombreCompleto ?? '',
    rol: $authStore.user?.rol ?? 'admin',
    password: '',
    confirmPassword: '',
  };
  let savingPerfil = false;
  let savingNegocio = false;

  // Cargos
  let cargos: Cargo[] = [];
  let cargosLoading = false;
  let nuevoCargo = '';
  let savingCargo = false;
  let deletingId: number | null = null;

  $: user = $authStore.user;

  async function loadCargos() {
    cargosLoading = true;
    const res = await cargoApi.listar();
    if (res.ok && res.data) cargos = res.data;
    cargosLoading = false;
  }

  onMount(loadCargos);

  function saveNegocio() {
    savingNegocio = true;
    localStorage.setItem(negocioKey, JSON.stringify(negocio));
    savingNegocio = false;
    toast('Datos del negocio guardados', 'success');
  }

  async function savePerfil() {
    if (!user) return;
    if (perfil.password && perfil.password !== perfil.confirmPassword) {
      toast('Las contraseñas no coinciden', 'error'); return;
    }
    savingPerfil = true;
    const res = await usuarioApi.actualizar(user.id, {
      nombreCompleto: perfil.nombreCompleto, rol: user.rol, activo: true,
      password: perfil.password || undefined,
    });
    savingPerfil = false;
    if (res.ok) {
      const updatedUser = { ...user, nombreCompleto: perfil.nombreCompleto };
      localStorage.setItem('origen_user', JSON.stringify(updatedUser));
      authStore.refresh();
      perfil.password = ''; perfil.confirmPassword = '';
      toast('Configuración actualizada', 'success');
    } else {
      toast(res.error ?? 'No se pudo actualizar la configuración', 'error');
    }
  }

  async function agregarCargo() {
    const nombre = nuevoCargo.trim();
    if (!nombre) return;
    savingCargo = true;
    const res = await cargoApi.crear(nombre);
    savingCargo = false;
    if (res.ok && res.data) {
      cargos = [...cargos, res.data].sort((a, b) => a.nombre.localeCompare(b.nombre));
      nuevoCargo = '';
    } else {
      toast(res.error ?? 'Error al crear cargo', 'error');
    }
  }

  async function eliminarCargo(id: number) {
    deletingId = id;
    const res = await cargoApi.eliminar(id);
    deletingId = null;
    if (res.ok) cargos = cargos.filter(c => c.id !== id);
    else toast(res.error ?? 'Error al eliminar', 'error');
  }

  function onNuevoCargoKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') agregarCargo();
  }

  // Permisos
  const rutaLabels: Record<string, string> = {
    '/':              'Dashboard',
    '/ingresos':      'Ingresos',
    '/egresos':       'Egresos',
    '/caja':          'Control de Caja',
    '/clientes':      'Clientes',
    '/campanas':      'Campañas',
    '/servicios':     'Servicios & Productos',
    '/stock':         'Stock',
    '/empleados':     'Personal',
    '/estadisticas':  'Estadísticas',
    '/comisiones':    'Comisiones',
    '/reportes':      'Reportes',
    '/ayuda':         'Ayuda',
  };

  let permisos: PermisoVista[] = [];
  let permisosLoading = false;
  let savingPermiso: string | null = null;

  async function loadPermisos() {
    permisosLoading = true;
    const res = await permisoApi.listar();
    if (res.ok && res.data) permisos = res.data;
    permisosLoading = false;
  }

  async function togglePermiso(p: PermisoVista) {
    const key = `${p.rol}-${p.ruta}`;
    savingPermiso = key;
    const res = await permisoApi.actualizar(p.rol, p.ruta, !p.habilitado);
    savingPermiso = null;
    if (res.ok) {
      permisos = permisos.map(x =>
        x.rol === p.rol && x.ruta === p.ruta ? { ...x, habilitado: !x.habilitado } : x
      );
    } else {
      toast(res.error ?? 'Error al actualizar permiso', 'error');
    }
  }

  $: if (tab === 'permisos' && permisos.length === 0 && !permisosLoading) loadPermisos();
</script>

<div class="p-3 p-md-4">
  <div class="page-panel mb-4">
    <div class="page-panel__top">
      <div class="d-flex align-items-center gap-3">
        <div class="page-panel__icon"><i class="bi bi-gear"></i></div>
        <div>
          <h5 class="fw-bold mb-0">Configuración</h5>
          <p class="text-muted small mb-0">Datos del negocio y parámetros del sistema</p>
        </div>
      </div>
    </div>
  </div>

  <ul class="nav nav-tabs nav-tabs-origen mb-4">
    <li class="nav-item"><button class="nav-link" class:active={tab === 'negocio'} on:click={() => tab = 'negocio'}>Negocio</button></li>
    <li class="nav-item"><button class="nav-link" class:active={tab === 'cuenta'} on:click={() => tab = 'cuenta'}>Cuenta</button></li>
    <li class="nav-item"><button class="nav-link" class:active={tab === 'cargos'} on:click={() => tab = 'cargos'}>Cargos</button></li>
    <li class="nav-item"><button class="nav-link" class:active={tab === 'permisos'} on:click={() => tab = 'permisos'}>Permisos</button></li>
  </ul>

  {#if tab === 'negocio'}
    <div class="config-grid">
      <section class="card border-0 shadow-sm config-grid__wide">
        <div class="card-origen__header"><span class="card-origen__title">Negocio</span></div>
        <div class="card-body">
          <div class="mb-3">
            <label for="cfg-negocio-nombre" class="form-label small fw-semibold">Nombre comercial</label>
            <input id="cfg-negocio-nombre" class="form-control" bind:value={negocio.nombre} />
          </div>
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label for="cfg-negocio-ruc" class="form-label small fw-semibold">RUC</label>
              <input id="cfg-negocio-ruc" class="form-control" bind:value={negocio.ruc} />
            </div>
            <div class="col-12 col-md-6">
              <label for="cfg-negocio-telefono" class="form-label small fw-semibold">Teléfono</label>
              <input id="cfg-negocio-telefono" class="form-control" bind:value={negocio.telefono} />
            </div>
            <div class="col-12">
              <label for="cfg-negocio-direccion" class="form-label small fw-semibold">Dirección</label>
              <input id="cfg-negocio-direccion" class="form-control" bind:value={negocio.direccion} />
            </div>
            <div class="col-12">
              <label for="cfg-negocio-email" class="form-label small fw-semibold">Email</label>
              <input id="cfg-negocio-email" class="form-control" type="email" bind:value={negocio.email} />
            </div>
          </div>
        </div>
        <div class="card-footer bg-white border-0 text-end">
          <button class="btn btn-primary btn-sm" on:click={saveNegocio} disabled={savingNegocio}>Guardar negocio</button>
        </div>
      </section>

    </div>

  {:else if tab === 'cuenta'}
    <div class="config-grid">
      <section class="card border-0 shadow-sm config-grid__wide">
        <div class="card-origen__header"><span class="card-origen__title">Cuenta administradora</span></div>
        <div class="card-body">
          <div class="account-box mb-3">
            <div class="account-box__avatar">{user?.nombreCompleto?.slice(0, 1).toUpperCase() ?? 'A'}</div>
            <div>
              <div class="fw-semibold">{user?.nombreUsuario}</div>
              <div class="text-muted small text-capitalize">{user?.rol}</div>
            </div>
          </div>
          <div class="mb-3">
            <label for="cfg-perfil-nombre" class="form-label small fw-semibold">Nombre completo</label>
            <input id="cfg-perfil-nombre" class="form-control" bind:value={perfil.nombreCompleto} />
          </div>
          <div class="mb-3">
            <label for="cfg-perfil-password" class="form-label small fw-semibold">Nueva contraseña</label>
            <input id="cfg-perfil-password" class="form-control" type="password" bind:value={perfil.password} placeholder="Dejar vacío para no cambiar" />
          </div>
          <div class="mb-3">
            <label for="cfg-perfil-confirm" class="form-label small fw-semibold">Confirmar contraseña</label>
            <input id="cfg-perfil-confirm" class="form-control" type="password" bind:value={perfil.confirmPassword} placeholder="Repite la nueva contraseña" />
          </div>
        </div>
        <div class="card-footer bg-white border-0 text-end">
          <button class="btn btn-primary btn-sm" on:click={savePerfil} disabled={savingPerfil || !user}>
            {#if savingPerfil}<span class="spinner-border spinner-border-sm me-1"></span>{/if}Guardar cuenta
          </button>
        </div>
      </section>
    </div>

  {:else if tab === 'cargos'}
    <div class="card border-0 shadow-sm">
      <div class="card-origen__header">
        <span class="card-origen__title">Cargos de empleados</span>
        <span class="text-muted small">{cargos.length} cargos</span>
      </div>
      <div class="card-body">
        {#if cargosLoading}
          <p class="text-muted small">Cargando...</p>
        {:else}
          <div class="cargo-list">
            {#each cargos as c (c.id)}
              <span class="cargo-pill">
                {c.nombre}
                <button
                  class="cargo-pill__del"
                  on:click={() => eliminarCargo(c.id)}
                  disabled={deletingId === c.id}
                  title="Eliminar"
                >
                  {#if deletingId === c.id}
                    <span class="spinner-border spinner-border-sm" style="width:10px;height:10px;"></span>
                  {:else}
                    <i class="bi bi-x"></i>
                  {/if}
                </button>
              </span>
            {:else}
              <span class="text-muted small">Sin cargos registrados</span>
            {/each}
          </div>
          <div class="cargo-add mt-3">
            <input
              class="form-control form-control-sm cargo-add__input"
              bind:value={nuevoCargo}
              on:keydown={onNuevoCargoKeydown}
              placeholder="Nuevo cargo (ej: Estilista)"
              maxlength="60"
            />
            <button class="btn btn-sm btn-primary cargo-add__btn" on:click={agregarCargo} disabled={savingCargo || !nuevoCargo.trim()}>
              {#if savingCargo}<span class="spinner-border spinner-border-sm"></span>{:else}<i class="bi bi-plus-lg"></i>{/if}
            </button>
          </div>
        {/if}
      </div>
    </div>
  {:else if tab === 'permisos'}
    <div class="card border-0 shadow-sm">
      <div class="card-origen__header">
        <span class="card-origen__title">Permisos por rol</span>
        <span class="text-muted small">Configura qué secciones puede acceder cada rol</span>
      </div>
      <div class="card-body p-0">
        {#if permisosLoading}
          <div class="text-center py-4 text-muted small">Cargando permisos...</div>
        {:else}
          <div class="p-3">
            <div class="alert alert-info border-0 small mb-3" style="background:#e8f0fe">
              <i class="bi bi-info-circle me-1"></i>
              Los administradores siempre tienen acceso completo. Aquí configuras el acceso para empleados.
            </div>
            <div class="table-responsive">
              <table class="table table-sm table-origen mb-0">
                <thead class="table-origen table-origen--navy">
                  <tr>
                    <th class="ps-3">Sección</th>
                    <th>Ruta</th>
                    <th class="text-center">Empleado</th>
                  </tr>
                </thead>
                <tbody>
                  {#each permisos as p (p.id)}
                    {@const label = rutaLabels[p.ruta] ?? p.ruta}
                    {@const key = `${p.rol}-${p.ruta}`}
                    <tr>
                      <td class="ps-3 fw-semibold small">{label}</td>
                      <td class="small text-muted">{p.ruta}</td>
                      <td class="text-center">
                        <div class="form-check form-switch d-inline-block mb-0">
                          <input
                            class="form-check-input"
                            type="checkbox"
                            role="switch"
                            id="perm-{key}"
                            checked={p.habilitado}
                            disabled={savingPermiso === key || p.ruta === '/'}
                            on:change={() => togglePermiso(p)}
                          />
                        </div>
                      </td>
                    </tr>
                  {:else}
                    <tr><td colspan="3" class="text-center text-muted py-3 small">Sin permisos cargados</td></tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
