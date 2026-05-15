<script lang="ts">
  import { onMount } from 'svelte';
  import Router from 'svelte-spa-router';
  import { wrap } from 'svelte-spa-router/wrap';
  import { writable } from 'svelte/store';
  import { authStore, isAdmin } from './lib/stores/auth';
  import { permisosStore } from './lib/stores/permisos';
  import { campanaPreseleccionada } from './lib/stores/campana';
  import { campanaApi } from './lib/api/campanas';
  import { permisoApi } from './lib/api/permisos';
  import { cajaApi } from './lib/api/caja';
  import { toast } from './lib/stores/toast';
  import Navbar from './lib/components/Navbar.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import Toast from './lib/components/Toast.svelte';
  import Login from './pages/Login.svelte';
  import Dashboard from './pages/Dashboard.svelte';
  import Clientes from './pages/Clientes.svelte';
  import Empleados from './pages/Empleados.svelte';
  import Servicios from './pages/Servicios.svelte';
  import Ingresos from './pages/Ingresos.svelte';
  import Egresos from './pages/Egresos.svelte';
  import Caja from './pages/Caja.svelte';
  import Reportes from './pages/Reportes.svelte';
  import Stock from './pages/Stock.svelte';
  import Estadisticas from './pages/Estadisticas.svelte';
  import Configuracion from './pages/Configuracion.svelte';
  import Comisiones from './pages/Comisiones.svelte';
  import Campanas from './pages/Campanas.svelte';
  import Consultas from './pages/Consultas.svelte';
  import Ayuda from './pages/Ayuda.svelte';
  import NoPermiso from './pages/NoPermiso.svelte';
  import NotFound from './pages/NotFound.svelte';
  import { push } from 'svelte-spa-router';
  import type { Campana } from './lib/types';
  import { limaHour, msUntilLima6PM } from './lib/utils/date';

  let sidebarOpen = false;
  const currentPath = writable(window.location.hash.replace('#', '') || '/');

  let reminderInterval: ReturnType<typeof setInterval> | null = null;

  async function checkCajaReminder() {
    if (!$authStore.authenticated) return;
    if (limaHour() < 18) return;
    const res = await cajaApi.estado();
    if (res.ok && (res.data as any)?.abierta) {
      toast('Recuerda cerrar la caja al terminar el turno.', 'warning', 0);
    }
  }

  function setupCajaReminder() {
    if (reminderInterval) return;
    if (limaHour() >= 18) {
      checkCajaReminder();
      reminderInterval = setInterval(checkCajaReminder, 30 * 60 * 1000);
    } else {
      setTimeout(() => {
        checkCajaReminder();
        reminderInterval = setInterval(checkCajaReminder, 30 * 60 * 1000);
      }, msUntilLima6PM());
    }
  }

  // Campaign popup state
  let campanasActivas: Campana[] = [];
  let showCampanaPopup = false;
  let popupIndex = 0;
  let campanasChecked = false;

  onMount(async () => {
    const update = () => {
      const path = window.location.hash.replace('#', '') || '/';
      currentPath.set(path);
      if (path === '/login') authStore.refresh();
    };
    window.addEventListener('hashchange', update);

    // Refresh permisos from API on every page load
    if ($authStore.authenticated) {
      const res = await permisoApi.misVistas();
      if (res.ok && res.data) permisosStore.set(res.data);
      setupCajaReminder();
    }

    return () => {
      window.removeEventListener('hashchange', update);
      if (reminderInterval) clearInterval(reminderInterval);
    };
  });

  // Reset flag on logout so popup fires again on next login
  $: if (!$authStore.authenticated) campanasChecked = false;

  // Show campaign popup once per login
  $: if ($authStore.authenticated && !campanasChecked) {
    campanasChecked = true;
    campanaApi.activas().then(res => {
      if (res.ok && res.data && res.data.length > 0) {
        campanasActivas = res.data;
        popupIndex = 0;
        showCampanaPopup = true;
      }
    });
  }

  function closeCampanaPopup() {
    showCampanaPopup = false;
    campanasActivas = [];
  }

  function goToCampana(c: Campana) {
    showCampanaPopup = false;
    campanaPreseleccionada.set(c);
    push('/ingresos');
  }

  function requireAuth() {
    if (!$authStore.authenticated) { push('/login'); return false; }
    return true;
  }

  function requireAdmin() {
    if (!$authStore.authenticated) { push('/login'); return false; }
    if ($authStore.user?.rol !== 'admin') { push('/no-permiso'); return false; }
    return true;
  }

  function requirePermiso(ruta: string) {
    return () => {
      if (!$authStore.authenticated) { push('/login'); return false; }
      if ($authStore.user?.rol === 'admin') return true;
      if ($permisosStore.includes(ruta)) return true;
      push('/no-permiso');
      return false;
    };
  }

  const routes = {
    '/login': Login,
    '/': wrap({ component: Dashboard, conditions: [requireAuth] }),
    '/clientes': wrap({ component: Clientes, conditions: [requirePermiso('/clientes')] }),
    '/empleados': wrap({ component: Empleados, conditions: [requireAdmin] }),
    '/servicios': wrap({ component: Servicios, conditions: [requirePermiso('/servicios')] }),
    '/ingresos': wrap({ component: Ingresos, conditions: [requirePermiso('/ingresos')] }),
    '/egresos': wrap({ component: Egresos, conditions: [requirePermiso('/egresos')] }),
    '/caja': wrap({ component: Caja, conditions: [requirePermiso('/caja')] }),
    '/reportes': wrap({ component: Reportes, conditions: [requireAdmin] }),
    '/stock': wrap({ component: Stock, conditions: [requireAdmin] }),
    '/estadisticas': wrap({ component: Estadisticas, conditions: [requireAdmin] }),
    '/comisiones': wrap({ component: Comisiones, conditions: [requireAdmin] }),
    '/consultas': wrap({ component: Consultas, conditions: [requireAdmin] }),
    '/configuracion': wrap({ component: Configuracion, conditions: [requireAdmin] }),
    '/campanas': wrap({ component: Campanas, conditions: [requirePermiso('/campanas')] }),
    '/ayuda': wrap({ component: Ayuda, conditions: [requireAuth] }),
    '/no-permiso': wrap({ component: NoPermiso, conditions: [requireAuth] }),
    '*': NotFound,
  };

  $: isLoginPage = $currentPath === '/login';
</script>

{#if isLoginPage || !$authStore.authenticated}
  <Router {routes} />
{:else}
  <div class="d-flex vh-100 overflow-hidden">
    <!-- Sidebar desktop -->
    <aside class="d-none d-md-flex flex-column bg-white border-end" style="width:220px;flex-shrink:0">
      <Sidebar currentPath={$currentPath} />
    </aside>

    <!-- Sidebar mobile offcanvas -->
    {#if sidebarOpen}
      <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <div class="position-fixed top-0 start-0 w-100 h-100 d-md-none" style="z-index:1040;background:rgba(0,0,0,.5)" on:click={() => (sidebarOpen=false)}>
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <aside class="bg-white h-100" style="width:220px" on:click|stopPropagation>
          <Sidebar currentPath={$currentPath} />
        </aside>
      </div>
    {/if}

    <!-- Main content -->
    <div class="d-flex flex-column flex-grow-1 overflow-hidden">
      <Navbar onToggleSidebar={() => (sidebarOpen = !sidebarOpen)} />
      <main class="flex-grow-1 overflow-auto bg-light">
        <Router {routes} />
      </main>
    </div>
  </div>
{/if}

<Toast />

<!-- ── Campaign Toast ──────────────────────────────────────────────────── -->
{#if showCampanaPopup && campanasActivas.length > 0}
  {@const c = campanasActivas[popupIndex]}
  <div class="campana-toast">
    <div class="campana-toast__header">
      <div class="campana-toast__meta">
        <span class="campana-toast__label">Campaña activa · {popupIndex + 1}/{campanasActivas.length}</span>
        <strong class="campana-toast__title">{c.titulo}</strong>
      </div>
      <button class="btn-close btn-close-white" on:click={closeCampanaPopup}></button>
    </div>
    <div class="campana-toast__body">
      <div class="campana-toast__product">
        <div class="campana-toast__product-info">
          <span class="campana-toast__product-label">Producto a promocionar</span>
          <span class="campana-toast__product-name">
            {#if c.tipo === 'servicio'}{c.servicio?.nombre ?? 'Servicio'}
            {:else if c.tipo === 'producto'}{c.producto?.nombre ?? 'Producto'}
            {:else}{c.paquete?.nombre ?? 'Paquete'}
            {/if}
          </span>
          <span class="campana-toast__product-price">
            S/ {(c.tipo === 'servicio' ? c.servicio?.precio : c.tipo === 'producto' ? c.producto?.precioVenta : c.paquete?.precio)?.toFixed(2) ?? '—'}
          </span>
        </div>
        <div class="campana-toast__date">
          <i class="bi bi-calendar3"></i>
          {new Date(c.fechaFin).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', timeZone: 'America/Lima' })}
        </div>
      </div>
    </div>
    <div class="campana-toast__footer">
      {#if campanasActivas.length > 1}
        <button class="btn btn-outline-secondary btn-sm"
          on:click={() => { popupIndex = (popupIndex + 1) % campanasActivas.length; }}>
          Ver siguiente →
        </button>
      {/if}
      <button class="btn btn-primary btn-sm flex-grow-1" on:click={() => goToCampana(c)}>
        <i class="bi bi-plus-lg me-1"></i>Registrar venta
      </button>
    </div>
  </div>
{/if}
