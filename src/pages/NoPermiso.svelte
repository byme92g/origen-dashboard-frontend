<script lang="ts">
  import '../styles/pages/_nopermiso.css';
  import { push } from 'svelte-spa-router';
  import { authStore } from '../lib/stores/auth';
</script>

<div class="nopermiso-wrap">
  <div class="nopermiso-card">
    <div class="nopermiso-icon">
      <i class="bi bi-lock-fill"></i>
    </div>
    <span class="nopermiso-code">403</span>
    <h5 class="nopermiso-title">Sin acceso</h5>
    <p class="nopermiso-desc">
      No tienes permiso para ver esta sección.<br>
      Contacta al administrador si crees que esto es un error.
    </p>
    <div class="nopermiso-user">
      <i class="bi bi-person-circle me-1"></i>
      Sesión: <strong>{$authStore.user?.nombreCompleto ?? $authStore.user?.username ?? '—'}</strong>
      &nbsp;·&nbsp;
      <span class="badge" class:badge-admin={$authStore.user?.rol === 'admin'}
        class:badge-empleado={$authStore.user?.rol !== 'admin'}>
        {$authStore.user?.rol ?? '—'}
      </span>
    </div>
    <button class="btn btn-primary btn-sm mt-3" on:click={() => push('/')}>
      <i class="bi bi-house me-1"></i>Volver al inicio
    </button>
  </div>
</div>
