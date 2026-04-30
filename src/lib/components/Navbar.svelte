<script lang="ts">
  import { onMount } from 'svelte';
  import { cajaApi } from '../api/caja';
  import { authStore } from '../stores/auth';

  export let onToggleSidebar: () => void = () => {};

  let cajaAbierta: boolean | null = null;

  async function loadCajaEstado() {
    if (!$authStore.authenticated) {
      cajaAbierta = null;
      return;
    }

    const res = await cajaApi.estado();
    if (res.ok && res.data) {
      cajaAbierta = res.data.abierta;
    }
  }

  onMount(() => {
    loadCajaEstado();
    const interval = window.setInterval(loadCajaEstado, 30000);
    window.addEventListener('focus', loadCajaEstado);
    window.addEventListener('hashchange', loadCajaEstado);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', loadCajaEstado);
      window.removeEventListener('hashchange', loadCajaEstado);
    };
  });

  function logout() {
    authStore.logout();
    window.location.hash = '#/login';
  }
</script>

<header class="topbar">
  <button class="hamburger d-md-none" on:click={onToggleSidebar} aria-label="Menú">
    <i class="bi bi-list"></i>
  </button>

  <span class="topbar-title d-none d-md-block">Panel de Control</span>

  {#if cajaAbierta === false}
    <a class="caja-alert" href="#/caja" title="Abrir caja">
      <span class="caja-alert-dot"></span>
      Caja no abierta aún
    </a>
  {:else if cajaAbierta === true}
    <a class="caja-open d-none d-sm-inline-flex" href="#/caja" title="Ver caja abierta">
      Caja abierta
    </a>
  {/if}

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
  .caja-alert,
  .caja-open {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    text-decoration: none;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    padding: 6px 11px;
    white-space: nowrap;
  }
  .caja-alert {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffe08a;
  }
  .caja-alert-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #d4860a;
    box-shadow: 0 0 0 3px rgba(212,134,10,.16);
  }
  .caja-open {
    background: #e8f5ee;
    color: #2e7d5a;
    border: 1px solid #b9e3cb;
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
    font-family: var(--font-heading);
    font-size: 14px;
    font-weight: 600;
    color: var(--navy);
    line-height: 1.2;
  }
  .user-role {
    font-family: var(--font-heading);
    font-size: 12px;
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
