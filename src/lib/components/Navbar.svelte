<script lang="ts">
  import { authStore } from '../stores/auth';
  import '../../styles/components/_navbar.css';

  export let onToggleSidebar: () => void = () => {};

  function logout() {
    authStore.logout();
    window.location.hash = '#/login';
  }
</script>

<header class="topbar">
  <button class="topbar__hamburger d-md-none" on:click={onToggleSidebar} aria-label="Menú">
    <i class="bi bi-list"></i>
  </button>

  <span class="topbar__title d-none d-md-block">Panel de Control</span>

  <div class="ms-auto d-flex align-items-center gap-3">
    {#if $authStore.user}
      <div class="d-none d-sm-flex flex-column align-items-end">
        <span class="topbar__user-name">{$authStore.user.nombreCompleto}</span>
        <span class="topbar__user-role">{$authStore.user.rol}</span>
      </div>
    {/if}
    <button class="topbar__logout" on:click={logout}>Salir</button>
  </div>
</header>
