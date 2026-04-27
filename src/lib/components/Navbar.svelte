<script lang="ts">
  import { authStore } from '../stores/auth';

  export let onToggleSidebar: () => void = () => {};

  function logout() {
    authStore.logout();
    window.location.hash = '#/login';
  }
</script>

<header class="topbar">
  <button class="hamburger d-md-none" on:click={onToggleSidebar} aria-label="Menú">
    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  </button>

  <span class="topbar-title d-none d-md-block">Panel de Control</span>

  <div class="ms-auto d-flex align-items-center gap-3">
    {#if $authStore.user}
      <div class="d-none d-sm-flex flex-column align-items-end">
        <span class="user-name">{$authStore.user.nombreCompleto}</span>
        <span class="user-role">{$authStore.user.rol}</span>
      </div>
    {/if}
    <button class="btn-logout" on:click={logout}>Salir</button>
  </div>
</header>

<style>
  .topbar {
    height: 60px;
    background: white;
    border-bottom: 1px solid #e8edf4;
    display: flex;
    align-items: center;
    padding: 0 24px;
    gap: 16px;
    box-shadow: 0 1px 4px rgba(27,58,96,.06);
    flex-shrink: 0;
  }
  .topbar-title {
    font-family: var(--font-heading);
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--navy);
  }
  .hamburger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    color: var(--navy);
    padding: 0;
    transition: background .15s;
  }
  .hamburger:hover { background: #eef2fa; }
  .user-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--navy);
    line-height: 1.2;
  }
  .user-role {
    font-size: 10px;
    color: #8a97b0;
    text-transform: capitalize;
  }
  .btn-logout {
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: 6px;
    border: 1px solid #d0d8e8;
    background: transparent;
    color: #5a6478;
    cursor: pointer;
    transition: all .15s;
  }
  .btn-logout:hover {
    background: #fdecea;
    border-color: #c0392b;
    color: #c0392b;
  }
</style>
