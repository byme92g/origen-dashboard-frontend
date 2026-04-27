<script lang="ts">
  import { onMount } from 'svelte';
  import Router from 'svelte-spa-router';
  import { wrap } from 'svelte-spa-router/wrap';
  import { writable } from 'svelte/store';
  import { authStore } from './lib/stores/auth';
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
  import { push } from 'svelte-spa-router';

  let sidebarOpen = false;
  const currentPath = writable(window.location.hash.replace('#', '') || '/');

  onMount(() => {
    const update = () => currentPath.set(window.location.hash.replace('#', '') || '/');
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  });

  function requireAuth() {
    if (!$authStore.authenticated) {
      push('/login');
      return false;
    }
    return true;
  }

  const routes = {
    '/login': Login,
    '/': wrap({ component: Dashboard, conditions: [requireAuth] }),
    '/clientes': wrap({ component: Clientes, conditions: [requireAuth] }),
    '/empleados': wrap({ component: Empleados, conditions: [requireAuth] }),
    '/servicios': wrap({ component: Servicios, conditions: [requireAuth] }),
    '/ingresos': wrap({ component: Ingresos, conditions: [requireAuth] }),
    '/egresos': wrap({ component: Egresos, conditions: [requireAuth] }),
    '/caja': wrap({ component: Caja, conditions: [requireAuth] }),
    '/reportes': wrap({ component: Reportes, conditions: [requireAuth] }),
    '/stock': wrap({ component: Stock, conditions: [requireAuth] }),
    '/estadisticas': wrap({ component: Estadisticas, conditions: [requireAuth] }),
    '/configuracion': wrap({ component: Configuracion, conditions: [requireAuth] }),
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
