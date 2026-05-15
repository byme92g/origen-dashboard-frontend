<script lang="ts">
  import { onMount } from 'svelte';
  import { reporteApi } from '../lib/api/reportes';
  import Spinner from '../lib/components/Spinner.svelte';
  import { toast } from '../lib/stores/toast';
  import type { ComisionEmpleado } from '../lib/types';
  import '../styles/pages/_comisiones.css';
  import { fmtDatetime as _fmtDatetime, limaTodayStr, limaDaysAgoStr } from '../lib/utils/date';

  const today = limaTodayStr();
  const [ly, lm] = today.split('-').map(Number);
  const firstOfMonth = `${ly}-${String(lm).padStart(2, '0')}-01`;

  let desde = firstOfMonth;
  let hasta = today;
  let data: ComisionEmpleado[] = [];
  let loading = true;
  let expanded = new Set<number>();

  // ── Filtro empleado (frontend) ─────────────────────────────────────────────
  let empleadoSearch = '';
  let empleadoDropdownOpen = false;
  let filtroEmpleadoId: number | undefined = undefined;
  let filtroEmpleadoNombre = '';

  $: empleadosDisponibles = data.map(e => ({ id: e.empleadoId, nombre: e.nombre }));
  $: filteredEmpleados = empleadoSearch.trim()
    ? empleadosDisponibles.filter(e => e.nombre.toLowerCase().includes(empleadoSearch.toLowerCase()))
    : empleadosDisponibles;
  $: dataFiltrada = filtroEmpleadoId !== undefined
    ? data.filter(e => e.empleadoId === filtroEmpleadoId)
    : data;

  function selectEmpleado(e: { id: number; nombre: string }) {
    filtroEmpleadoId = e.id;
    filtroEmpleadoNombre = e.nombre;
    empleadoSearch = e.nombre;
    empleadoDropdownOpen = false;
  }
  function clearEmpleado() {
    filtroEmpleadoId = undefined;
    filtroEmpleadoNombre = '';
    empleadoSearch = '';
  }

  $: totalComision = dataFiltrada.reduce((s, e) => s + e.totalComision, 0);
  $: empleadosConComision = dataFiltrada.filter(e => e.totalComision > 0).length;

  async function load() {
    loading = true;
    const res = await reporteApi.comisiones(desde, hasta);
    if (res.ok && res.data) data = res.data;
    else toast(res.error ?? 'No se pudo cargar las comisiones', 'error');
    loading = false;
  }

  onMount(load);

  function toggleExpand(id: number) {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    expanded = next;
  }

  function initials(nombre: string) {
    return nombre.trim().split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
  }

  function fmt(v: number) { return `S/ ${v.toFixed(2)}`; }

  const fmtDate = _fmtDatetime;

  function setRango(tipo: 'mes' | 'mesAnterior' | '7dias' | '30dias') {
    const hoy = limaTodayStr();
    const [hy, hm] = hoy.split('-').map(Number);
    if (tipo === 'mes') {
      desde = `${hy}-${String(hm).padStart(2, '0')}-01`;
      hasta = hoy;
    } else if (tipo === 'mesAnterior') {
      const pm = hm === 1 ? 12 : hm - 1;
      const py = hm === 1 ? hy - 1 : hy;
      const lastDay = new Date(hy, hm - 1, 0).getDate();
      desde = `${py}-${String(pm).padStart(2, '0')}-01`;
      hasta = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else if (tipo === '7dias') {
      desde = limaDaysAgoStr(6);
      hasta = hoy;
    } else {
      desde = limaDaysAgoStr(29);
      hasta = hoy;
    }
    load();
  }
</script>

<div class="p-3 p-md-4">
  <!-- Header -->
  <div class="page-panel mb-3">
    <div class="page-panel__top">
      <div class="d-flex align-items-center gap-3">
        <div class="page-panel__icon"><i class="bi bi-person-check"></i></div>
        <div>
          <h5 class="fw-bold mb-0">Comisiones por empleado</h5>
          <p class="text-muted small mb-0">Resumen de ventas y comisiones devengadas por personal</p>
        </div>
      </div>
    </div>
    <!-- Filters -->
    <div class="page-panel__filters flex-wrap gap-2">
      <div class="d-flex gap-1 flex-wrap">
        <button class="rango__btn" on:click={() => setRango('7dias')}>7 días</button>
        <button class="rango__btn" on:click={() => setRango('mes')}>Este mes</button>
        <button class="rango__btn" on:click={() => setRango('mesAnterior')}>Mes anterior</button>
        <button class="rango__btn" on:click={() => setRango('30dias')}>30 días</button>
      </div>
      <i class="bi bi-calendar3 page-panel__filter-cal-icon"></i>
      <div>
        <label for="com-desde" class="page-panel__filter-label">Desde</label>
        <input id="com-desde" type="date" class="form-control form-control-sm page-panel__filter-date" bind:value={desde} />
      </div>
      <span class="page-panel__filter-sep">→</span>
      <div>
        <label for="com-hasta" class="page-panel__filter-label">Hasta</label>
        <input id="com-hasta" type="date" class="form-control form-control-sm page-panel__filter-date" bind:value={hasta} />
      </div>
      <button class="btn btn-sm btn-outline-primary" on:click={load}>Filtrar</button>
      <!-- Filtro empleado -->
      <div style="position:relative">
        <div class="d-flex align-items-center gap-1 com-cliente-filter__input-wrap">
          <i class="bi bi-person-badge" style="font-size:13px;color:#8a97b0"></i>
          <!-- svelte-ignore a11y-autocomplete-valid -->
          <input
            type="text"
            class="form-control form-control-sm"
            style="min-width:150px;border:none;box-shadow:none;padding:0;font-size:13px;background:transparent"
            placeholder="Filtrar por empleado"
            bind:value={empleadoSearch}
            on:focus={() => (empleadoDropdownOpen = true)}
            on:blur={() => setTimeout(() => (empleadoDropdownOpen = false), 150)}
          />
          {#if filtroEmpleadoId !== undefined}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span style="cursor:pointer;color:#8a97b0;font-size:12px;line-height:1" on:mousedown={clearEmpleado}>
              <i class="bi bi-x-lg"></i>
            </span>
          {/if}
        </div>
        {#if empleadoDropdownOpen && filteredEmpleados.length > 0}
          <div class="combobox__dropdown" style="position:fixed;min-width:200px;z-index:9999">
            {#each filteredEmpleados as e}
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div class="combobox__item" on:mousedown={() => selectEmpleado(e)}>
                <span class="combobox__item-name">{e.nombre}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if loading}
    <Spinner />
  {:else}
    <!-- KPIs -->
    <div class="kpi-grid mb-4">
      <div class="kpi-card kpi-card--green">
        <div>
          <div class="kpi-card__label">Empleados con comisiones</div>
          <div class="kpi-card__value">{empleadosConComision}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div>
          <div class="kpi-card__label">Total comisiones devengadas</div>
          <div class="kpi-card__value">{fmt(totalComision)}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div>
          <div class="kpi-card__label">Total ventas con empleado</div>
          <div class="kpi-card__value">{fmt(data.reduce((s, e) => s + e.totalVentas, 0))}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div>
          <div class="kpi-card__label">Total transacciones</div>
          <div class="kpi-card__value">{data.reduce((s, e) => s + e.cantidadTransacciones, 0)}</div>
        </div>
      </div>
    </div>

    {#if data.length === 0}
      <div class="card border-0 shadow-sm">
        <div class="text-center py-5 text-muted">
          <i class="bi bi-person-x" style="font-size:2.5rem;opacity:.2;display:block;margin-bottom:12px"></i>
          Sin ingresos con empleado asignado en el período seleccionado
        </div>
      </div>
    {:else}
      <!-- Total bar -->
      {#if totalComision > 0}
        <div class="comision-total-bar">
          <div>
            <div class="comision-total-bar__label">Total a pagar en comisiones</div>
            <div class="comision-total-bar__value">{fmt(totalComision)}</div>
          </div>
          <div class="text-end">
            <div class="comision-total-bar__label">Período</div>
            <div style="font-size:13px;font-weight:600;opacity:.9">{desde} → {hasta}</div>
          </div>
        </div>
      {/if}

      <!-- Employee cards -->
      {#each dataFiltrada as emp (emp.empleadoId)}
        <div class="emp-card">
          <!-- Header (clickable) -->
          <!-- svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events -->
          <div class="emp-card__header" on:click={() => toggleExpand(emp.empleadoId)}>
            <div class="emp-card__avatar">{initials(emp.nombre)}</div>
            <div class="emp-card__info">
              <div class="emp-card__name">{emp.nombre}</div>
              <div class="emp-card__cargo">{emp.cargo}</div>
            </div>
            <!-- Stats — hidden on small screens, shown as chips -->
            <div class="emp-card__stats d-none d-sm-flex">
              <div class="emp-card__stat">
                <div class="emp-card__stat-label">Ventas</div>
                <div class="emp-card__stat-value">{fmt(emp.totalVentas)}</div>
              </div>
              <div class="emp-card__stat">
                <div class="emp-card__stat-label">Transacciones</div>
                <div class="emp-card__stat-value emp-card__stat-value--muted">{emp.cantidadTransacciones}</div>
              </div>
              <div class="emp-card__stat">
                <div class="emp-card__stat-label">Comisión</div>
                <div class="emp-card__stat-value emp-card__stat-value--green">{fmt(emp.totalComision)}</div>
              </div>
            </div>
            <!-- Mobile: just show comision badge -->
            <span class="comision-badge {emp.totalComision > 0 ? 'comision-badge--pending' : 'comision-badge--zero'} d-sm-none">
              {fmt(emp.totalComision)}
            </span>
            <i class="bi bi-chevron-down emp-card__chevron {expanded.has(emp.empleadoId) ? 'emp-card__chevron--open' : ''}"></i>
          </div>

          <!-- Mobile stats row -->
          {#if !expanded.has(emp.empleadoId)}
            <div class="d-sm-none d-flex gap-3 px-4 pb-3">
              <div>
                <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em">Ventas</div>
                <div style="font-size:13px;font-weight:600;color:var(--navy)">{fmt(emp.totalVentas)}</div>
              </div>
              <div>
                <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em">Comisión</div>
                <div style="font-size:13px;font-weight:700;color:var(--green)">{fmt(emp.totalComision)}</div>
              </div>
            </div>
          {/if}

          <!-- Transaction detail -->
          {#if expanded.has(emp.empleadoId)}
            <div class="emp-card__body">
              <div class="table-responsive">
                <table class="table table-sm table-hover table-origen mb-0">
                  <thead class="table-origen table-origen--navy">
                    <tr>
                      <th class="ps-3">Fecha</th>
                      <th>Concepto</th>
                      <th class="d-none d-md-table-cell">Método</th>
                      <th class="text-end">Venta neta</th>
                      <th class="text-end pe-3">Comisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each emp.transacciones as t}
                      <tr>
                        <td class="ps-3 small text-muted" style="white-space:nowrap">{fmtDate(t.fecha)}</td>
                        <td class="small fw-semibold">{t.concepto}</td>
                        <td class="d-none d-md-table-cell">
                          <span class="metodo-badge metodo-badge--{t.metodoPago}">{t.metodoPago}</span>
                        </td>
                        <td class="text-end small fw-semibold">{fmt(t.monto)}</td>
                        <td class="text-end pe-3">
                          {#if t.comision > 0}
                            <span class="badge badge-origen badge-origen--green">+{fmt(t.comision)}</span>
                          {:else}
                            <span class="text-muted small">—</span>
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                  <tfoot>
                    <tr style="background:var(--bg-soft)">
                      <td class="ps-3 small fw-bold text-muted" colspan="3">Total {emp.nombre}</td>
                      <td class="text-end small fw-bold">{fmt(emp.totalVentas)}</td>
                      <td class="text-end pe-3">
                        <span class="comision-badge {emp.totalComision > 0 ? 'comision-badge--pending' : 'comision-badge--zero'}">
                          {fmt(emp.totalComision)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  {/if}
</div>
