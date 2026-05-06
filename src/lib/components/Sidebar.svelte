<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore, isAdmin } from '../stores/auth';
  import { cajaApi } from '../api/caja';

  export let currentPath: string = '/';

  type NavItem = { href: string; label: string; icon: string; adminOnly?: boolean; isCaja?: boolean };
  type Section = { label: string; items: NavItem[] };

  let cajaAbierta: boolean | null = null;

  async function loadCajaEstado() {
    if (!$authStore.authenticated) { cajaAbierta = null; return; }
    const res = await cajaApi.estado();
    if (res.ok && res.data) cajaAbierta = res.data.abierta;
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

  const sections: Section[] = [
    {
      label: 'Principal',
      items: [
        { href: '/', label: 'Dashboard', icon: 'bi-grid-1x2' },
      ],
    },
    {
      label: 'Finanzas & Operaciones',
      items: [
        { href: '/ingresos', label: 'Ingresos',        icon: 'bi-arrow-down-circle' },
        { href: '/egresos',  label: 'Egresos',         icon: 'bi-arrow-up-circle' },
        { href: '/caja',     label: 'Control de Caja', icon: 'bi-cash-coin', isCaja: true },
      ],
    },
    {
      label: 'Gestión',
      items: [
        { href: '/clientes',  label: 'Clientes',             icon: 'bi-people', adminOnly: true },
        { href: '/servicios', label: 'Servicios & Productos', icon: 'bi-bag-check' },
        { href: '/stock',     label: 'Stock',                icon: 'bi-box-seam', adminOnly: true },
        { href: '/empleados', label: 'Personal',              icon: 'bi-person-badge', adminOnly: true },
      ],
    },
    {
      label: 'Análisis',
      items: [
        { href: '/estadisticas', label: 'Estadísticas', icon: 'bi-bar-chart-line', adminOnly: true },
        { href: '/reportes',     label: 'Reportes',     icon: 'bi-file-earmark-bar-graph', adminOnly: true },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { href: '/configuracion', label: 'Configuración', icon: 'bi-gear', adminOnly: true },
      ],
    },
  ];

  function isActive(href: string) {
    if (href === '/') return currentPath === '/' || currentPath === '';
    return currentPath.startsWith(href);
  }

$: initials =
  $authStore.user?.nombreCompleto
    ?.trim()
    ?.split(/\s+/)
    ?.map((w: string) => w?.[0] ?? '')
    ?.join('')
    ?.slice(0, 2)
    ?.toUpperCase() || '?';
</script>

<nav class="sidebar-nav d-flex flex-column h-100">
  <!-- Logo -->
  <div class="sidebar-logo">
    <span class="sidebar-logo-text">Origen</span>
    <span class="sidebar-logo-sub">Sistema Administrativo</span>
  </div>

  <!-- User -->
  {#if $authStore.user}
    <div class="sidebar-user">
      <div class="sidebar-avatar">{initials}</div>
      <div class="overflow-hidden">
        <div class="sidebar-user-name">{$authStore.user.nombreCompleto}</div>
        <div class="sidebar-user-role">{$authStore.user.rol}</div>
      </div>
    </div>
  {/if}

  <!-- Nav sections -->
  <div class="flex-grow-1 overflow-auto py-2">
    {#each sections as section}
      {@const visibleItems = section.items.filter(item => !item.adminOnly || $isAdmin)}
      {#if visibleItems.length > 0}
        <div class="sidebar-section-label">{section.label}</div>
        {#each visibleItems as item}
          <a href="#{item.href}" class="nav-link-item" class:active={isActive(item.href)}>
            <span class="nav-icon">
              <i class="bi {item.icon}"></i>
            </span>
            <span class="flex-grow-1">{item.label}</span>
            {#if item.isCaja && cajaAbierta !== null}
              <span class="caja-dot {cajaAbierta ? 'dot-open' : 'dot-closed'}" title={cajaAbierta ? 'Caja abierta' : 'Caja sin abrir'}></span>
            {/if}
          </a>
        {/each}
      {/if}
    {/each}
  </div>
</nav>

<style>
  .sidebar-nav {
    background: var(--navy);
  }
  .sidebar-logo {
    padding: 20px 20px 16px;
    border-bottom: 1px solid rgba(255,255,255,.10);
    flex-shrink: 0;
  }
  .sidebar-logo-text {
    font-family: var(--font-heading);
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--gold-light);
    letter-spacing: .05em;
    display: block;
  }
  .sidebar-logo-sub {
    font-family: var(--font-heading);
    font-size: 10px;
    font-weight: 500;
    color: rgba(255,255,255,.45);
    text-transform: uppercase;
    letter-spacing: .12em;
  }
  .sidebar-user {
    padding: 14px 20px;
    border-bottom: 1px solid rgba(255,255,255,.08);
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .sidebar-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--gold);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 12px;
    color: white;
    flex-shrink: 0;
  }
  .sidebar-user-name {
    font-family: var(--font-heading);
    font-size: 14px;
    font-weight: 600;
    color: rgba(255,255,255,.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sidebar-user-role {
    font-family: var(--font-heading);
    font-size: 12px;
    color: rgba(255,255,255,.45);
    text-transform: capitalize;
  }
  .sidebar-section-label {
    font-family: var(--font-heading);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .12em;
    color: rgba(255,255,255,.30);
    padding: 14px 20px 4px;
  }
  .nav-link-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 20px;
    color: rgba(255,255,255,.65);
    text-decoration: none;
    font-family: var(--font-heading);
    font-size: 15px;
    font-weight: 400;
    border-left: 3px solid transparent;
    transition: background .15s, color .15s;
  }
  .nav-link-item:hover {
    background: rgba(255,255,255,.07);
    color: white;
  }
  .nav-link-item.active {
    background: rgba(160,120,56,.15);
    border-left-color: var(--gold-light);
    color: var(--gold-light);
    font-weight: 600;
  }
  .nav-icon {
    width: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .caja-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  }
  .dot-open  { background: #4db87a; box-shadow: 0 0 0 2px rgba(77,184,122,.25); }
  .dot-closed { background: #f0a030; box-shadow: 0 0 0 2px rgba(240,160,48,.25); }
</style>
