<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore, isAdmin } from '../stores/auth';
  import { permisosStore } from '../stores/permisos';
  import { cajaApi } from '../api/caja';
  import '../../styles/components/_sidebar.css';

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
    window.addEventListener('hashchange', loadCajaEstado);
    return () => {
      window.removeEventListener('hashchange', loadCajaEstado);
    };
  });

  $: if (currentPath === '/caja') loadCajaEstado();

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
        { href: '/clientes',  label: 'Clientes',             icon: 'bi-people' },
        { href: '/campanas',  label: 'Campañas',             icon: 'bi-megaphone' },
        { href: '/servicios', label: 'Servicios & Productos', icon: 'bi-bag-check' },
        { href: '/stock',     label: 'Stock',                icon: 'bi-box-seam', adminOnly: true },
        { href: '/empleados', label: 'Personal',              icon: 'bi-person-badge', adminOnly: true },
      ],
    },
    {
      label: 'Análisis',
      items: [
        { href: '/estadisticas', label: 'Estadísticas',  icon: 'bi-bar-chart-line', adminOnly: true },
        { href: '/comisiones',   label: 'Comisiones',   icon: 'bi-person-check',           adminOnly: true },
        { href: '/consultas',    label: 'Consultas',    icon: 'bi-database-gear',           adminOnly: true },
        { href: '/reportes',     label: 'Reportes',     icon: 'bi-file-earmark-bar-graph',  adminOnly: true },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { href: '/ayuda',         label: 'Ayuda',          icon: 'bi-question-circle' },
        { href: '/configuracion', label: 'Configuración',  icon: 'bi-gear', adminOnly: true },
      ],
    },
  ];

  function canAccess(item: NavItem): boolean {
    if (item.adminOnly) return $isAdmin;
    if ($isAdmin) return true;
    return $permisosStore.includes(item.href);
  }

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

<nav class="sidebar d-flex flex-column h-100">
  <!-- Logo -->
  <div class="sidebar__logo">
    <span class="sidebar__logo-text">Origen</span>
    <span class="sidebar__logo-sub">Sistema Administrativo</span>
  </div>

  <!-- User -->
  {#if $authStore.user}
    <div class="sidebar__user">
      <div class="sidebar__avatar">{initials}</div>
      <div class="overflow-hidden">
        <div class="sidebar__user-name">{$authStore.user.nombreCompleto}</div>
        <div class="sidebar__user-role">{$authStore.user.rol}</div>
      </div>
    </div>
  {/if}

  <!-- Nav sections -->
  <div class="flex-grow-1 overflow-auto py-2">
    {#each sections as section}
      {@const visibleItems = section.items.filter(canAccess)}
      {#if visibleItems.length > 0}
        <div class="sidebar__section-label">{section.label}</div>
        {#each visibleItems as item}
          <a href="#{item.href}" class="sidebar__link" class:sidebar__link--active={isActive(item.href)}>
            <span class="sidebar__link-icon">
              <i class="bi {item.icon}"></i>
            </span>
            <span class="flex-grow-1">{item.label}</span>
            {#if item.isCaja && cajaAbierta !== null}
              <span class="status-dot {cajaAbierta ? 'status-dot--open' : 'status-dot--closed'}" title={cajaAbierta ? 'Caja abierta' : 'Caja sin abrir'}></span>
            {/if}
          </a>
        {/each}
      {/if}
    {/each}
  </div>
</nav>
