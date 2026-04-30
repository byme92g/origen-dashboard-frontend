<script lang="ts">
  import { authStore, isAdmin } from '../stores/auth';

  export let currentPath: string = '/';

  type NavItem = { href: string; label: string; svg: string; adminOnly?: boolean };
  type Section = { label: string; items: NavItem[] };

  const sections: Section[] = [
    {
      label: 'Principal',
      items: [
        { href: '/', label: 'Dashboard', svg: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>' },
      ],
    },
    {
      label: 'Finanzas & Operaciones',
      items: [
        { href: '/ingresos', label: 'Ingresos',        svg: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>' },
        { href: '/egresos',  label: 'Egresos',         svg: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>' },
        { href: '/caja',     label: 'Control de Caja', svg: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>' },
      ],
    },
    {
      label: 'Gestión',
      items: [
        { href: '/clientes',  label: 'Clientes',             svg: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
        { href: '/servicios', label: 'Servicios & Productos', svg: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>' },
        { href: '/stock',     label: 'Stock',                svg: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>' },
        { href: '/empleados', label: 'Personal',              svg: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', adminOnly: true },
      ],
    },
    {
      label: 'Análisis',
      items: [
        { href: '/estadisticas', label: 'Estadísticas', svg: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>' },
        { href: '/reportes',     label: 'Reportes',     svg: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { href: '/configuracion', label: 'Configuración', svg: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>', adminOnly: true },
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                {@html item.svg}
              </svg>
            </span>
            <span>{item.label}</span>
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
    font-size: 13px;
    font-weight: 600;
    color: rgba(255,255,255,.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sidebar-user-role {
    font-family: var(--font-heading);
    font-size: 11px;
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
    font-size: 14px;
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
</style>
