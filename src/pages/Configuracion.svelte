<script lang="ts">
  import { usuarioApi } from '../lib/api/usuarios';
  import { authStore } from '../lib/stores/auth';
  import { toast } from '../lib/stores/toast';
  import { config } from '../lib/config';

  type NegocioConfig = {
    nombre: string;
    ruc: string;
    telefono: string;
    direccion: string;
    email: string;
  };

  const negocioKey = 'origen_negocio_config';
  const defaultNegocio: NegocioConfig = {
    nombre: 'Origen Capilar Estética',
    ruc: '',
    telefono: '',
    direccion: '',
    email: '',
  };

  function loadNegocio(): NegocioConfig {
    try {
      const raw = localStorage.getItem(negocioKey);
      return raw ? { ...defaultNegocio, ...JSON.parse(raw) } : defaultNegocio;
    } catch {
      return defaultNegocio;
    }
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

  $: user = $authStore.user;

  function saveNegocio() {
    savingNegocio = true;
    localStorage.setItem(negocioKey, JSON.stringify(negocio));
    savingNegocio = false;
    toast('Datos del negocio guardados', 'success');
  }

  async function savePerfil() {
    if (!user) return;
    if (perfil.password && perfil.password !== perfil.confirmPassword) {
      toast('Las contraseñas no coinciden', 'error');
      return;
    }

    savingPerfil = true;
    const res = await usuarioApi.actualizar(user.id, {
      nombreCompleto: perfil.nombreCompleto,
      rol: user.rol,
      activo: true,
      password: perfil.password || undefined,
    });
    savingPerfil = false;

    if (res.ok) {
      const updatedUser = { ...user, nombreCompleto: perfil.nombreCompleto };
      localStorage.setItem('origen_user', JSON.stringify(updatedUser));
      authStore.refresh();
      perfil.password = '';
      perfil.confirmPassword = '';
      toast('Configuración actualizada', 'success');
    } else {
      toast(res.error ?? 'No se pudo actualizar la configuración', 'error');
    }
  }
</script>

<div class="p-3 p-md-4">
  <div class="page-panel mb-4">
    <div class="page-panel__top">
      <div class="d-flex align-items-center gap-3">
        <div class="page-panel__icon"><i class="bi bi-gear"></i></div>
        <div>
          <h5 class="fw-bold mb-0">Configuración</h5>
          <p class="text-muted small mb-0">Datos del negocio y seguridad de la cuenta administradora</p>
        </div>
      </div>
    </div>
  </div>

  <div class="config-grid">
    <section class="card border-0 shadow-sm">
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

    <section class="card border-0 shadow-sm">
      <div class="card-origen__header"><span class="card-origen__title">Cuenta administradora</span></div>
      <div class="card-body">
        <div class="account-box mb-3">
          <div class="account-avatar">{user?.nombreCompleto?.slice(0, 1).toUpperCase() ?? 'A'}</div>
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

    <section class="card border-0 shadow-sm config-wide">
      <div class="card-origen__header"><span class="card-origen__title">Parámetros activos</span></div>
      <div class="card-body">
        <div class="settings-list">
          <div><span>Autenticación</span><strong>JWT con expiración</strong></div>
          <div><span>Rol requerido</span><strong>Admin</strong></div>
          <div><span>API frontend</span><strong>{config.apiUrl}</strong></div>
          <div><span>Persistencia negocio</span><strong>Local del navegador</strong></div>
        </div>
      </div>
    </section>
  </div>
</div>

<style>
  .config-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .config-wide { grid-column: 1 / -1; }
  .account-box { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f4f6fa; border-radius: 8px; }
  .account-avatar {
    width: 40px; height: 40px; border-radius: 50%; background: var(--gold);
    color: white; display: flex; align-items: center; justify-content: center;
    font-weight: 700;
  }
  .settings-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .settings-list div { padding: 12px; background: #f8fafc; border: 1px solid #eef1f6; border-radius: 8px; }
  .settings-list span { display: block; color: #8a97b0; font-size: 11px; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
  .settings-list strong { color: var(--navy); font-size: 13px; word-break: break-word; }
  @media (max-width: 768px) {
    .config-grid, .settings-list { grid-template-columns: 1fr; }
    .config-wide { grid-column: auto; }
  }
</style>
