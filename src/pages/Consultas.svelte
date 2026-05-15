<script lang="ts">
  import { consultaApi, type ConsultaResultado } from '../lib/api/consultas';
  import Spinner from '../lib/components/Spinner.svelte';
  import { toast } from '../lib/stores/toast';
  import { limaTodayStr, limaDaysAgoStr } from '../lib/utils/date';
  import '../styles/pages/_consultas.css';

  const today = limaTodayStr();
  const [ly, lm] = today.split('-').map(Number);
  const firstOfMonth = `${ly}-${String(lm).padStart(2, '0')}-01`;

  let desde = firstOfMonth;
  let hasta = today;

  type Consulta = {
    tipo: string;
    titulo: string;
    desc: string;
    icon: string;
    tag: string;
    usaDates?: boolean;
  };

  const CONSULTAS: Consulta[] = [
    // Empleados
    { tipo: 'empleados_menos_comision',    titulo: 'Empleados con menos comisiones',   desc: 'Ranking de menor a mayor comisión devengada en el período.',          icon: 'bi-graph-down',           tag: 'Empleados',  usaDates: true  },
    { tipo: 'empleados_mas_transacciones', titulo: 'Empleados con más transacciones',  desc: 'Quién atendió más clientes en el período seleccionado.',               icon: 'bi-person-check',         tag: 'Empleados',  usaDates: true  },
    { tipo: 'ticket_promedio_empleado',    titulo: 'Ticket promedio por empleado',     desc: 'Monto promedio cobrado por cada miembro del equipo.',                  icon: 'bi-receipt',              tag: 'Empleados',  usaDates: true  },
    { tipo: 'comisiones_por_mes',          titulo: 'Comisiones por mes',               desc: 'Evolución mensual de ventas y comisiones pagadas.',                    icon: 'bi-calendar3',            tag: 'Empleados',  usaDates: true  },
    // Finanzas
    { tipo: 'ingresos_por_mes',            titulo: 'Ingresos vs egresos por mes',      desc: 'Balance mensual: ingresos, egresos y utilidad neta.',                  icon: 'bi-bar-chart-line',       tag: 'Finanzas',   usaDates: true  },
    { tipo: 'ingresos_por_tipo',           titulo: 'Ingresos por tipo',                desc: 'Desglose por servicio, producto, paquete y personalizado.',            icon: 'bi-pie-chart',            tag: 'Finanzas',   usaDates: true  },
    { tipo: 'metodos_pago',                titulo: 'Métodos de pago',                  desc: 'Distribución de efectivo, transferencia, tarjeta, etc.',               icon: 'bi-credit-card',          tag: 'Finanzas',   usaDates: true  },
    { tipo: 'egreso_por_categoria',        titulo: 'Egresos por categoría',            desc: 'En qué categorías se concentra el gasto.',                             icon: 'bi-arrow-up-circle',      tag: 'Finanzas',   usaDates: true  },
    { tipo: 'descuentos_aplicados',        titulo: 'Transacciones con descuento',      desc: 'Las ventas con mayor descuento aplicado.',                             icon: 'bi-tag',                  tag: 'Finanzas',   usaDates: true  },
    // Tiempo
    { tipo: 'dias_mas_ingresos',           titulo: 'Días con más ingresos',            desc: 'Los días del calendario que más facturación generaron.',               icon: 'bi-calendar-event',       tag: 'Tiempo',     usaDates: true  },
    { tipo: 'ingresos_por_dia_semana',     titulo: 'Ingresos por día de la semana',    desc: 'Cuáles días de la semana son los más productivos.',                    icon: 'bi-calendar-week',        tag: 'Tiempo',     usaDates: true  },
    { tipo: 'horas_pico',                  titulo: 'Horas pico de atención',           desc: 'Franjas horarias con mayor número de transacciones.',                  icon: 'bi-clock',                tag: 'Tiempo',     usaDates: true  },
    // Clientes
    { tipo: 'clientes_frecuentes',         titulo: 'Clientes más frecuentes',          desc: 'Los clientes con más visitas en el período.',                          icon: 'bi-star',                 tag: 'Clientes',   usaDates: true  },
    { tipo: 'clientes_inactivos',          titulo: 'Clientes inactivos (+90 días)',     desc: 'Clientes sin visita en los últimos 90 días. Útil para reactivación.',  icon: 'bi-person-x',             tag: 'Clientes',   usaDates: false },
    { tipo: 'gasto_promedio_cliente',      titulo: 'Gasto promedio por cliente',       desc: 'Ticket promedio y total acumulado de los mejores clientes.',           icon: 'bi-wallet2',              tag: 'Clientes',   usaDates: true  },
    { tipo: 'clientes_nuevos_mes',         titulo: 'Nuevos clientes por mes',          desc: 'Evolución histórica del registro de nuevos clientes.',                 icon: 'bi-person-plus',          tag: 'Clientes',   usaDates: false },
    // Catálogo
    { tipo: 'items_mas_vendidos',          titulo: 'Ítems más vendidos',               desc: 'Servicios, productos y paquetes con mayor cantidad vendida.',           icon: 'bi-bag-check',            tag: 'Catálogo',   usaDates: true  },
    { tipo: 'items_mas_rentables',         titulo: 'Ítems más rentables',              desc: 'Los que más ingresos generaron en el período.',                        icon: 'bi-trophy',               tag: 'Catálogo',   usaDates: true  },
    { tipo: 'productos_bajo_stock',        titulo: 'Productos con stock bajo',         desc: 'Productos activos con menos de 10 unidades en inventario.',            icon: 'bi-exclamation-triangle',  tag: 'Catálogo',   usaDates: false },
    { tipo: 'transacciones_sin_cliente',   titulo: 'Transacciones sin cliente',        desc: 'Ventas no asociadas a un cliente registrado, por mes.',                icon: 'bi-question-circle',       tag: 'Análisis',   usaDates: true  },
  ];

  const TAGS = [...new Set(CONSULTAS.map(c => c.tag))];
  let filtroTag = 'Todos';
  $: visibles = filtroTag === 'Todos' ? CONSULTAS : CONSULTAS.filter(c => c.tag === filtroTag);

  let activaTipo: string | null = null;
  let resultado: ConsultaResultado | null = null;
  let cargando = false;
  let activaTitulo = '';

  async function ejecutar(c: Consulta) {
    activaTipo = c.tipo;
    activaTitulo = c.titulo;
    resultado = null;
    cargando = true;
    const res = await consultaApi.ejecutar(c.tipo, c.usaDates ? desde : undefined, c.usaDates ? hasta : undefined);
    if (res.ok && res.data) resultado = res.data;
    else toast(res.error ?? 'No se pudo ejecutar la consulta', 'error');
    cargando = false;
  }

  function exportar() {
    if (!resultado) return;
    consultaApi.exportarCsv(activaTipo!, resultado.columnas, resultado.filas);
  }

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
  }
</script>

<div class="p-3 p-md-4">
  <!-- Header -->
  <div class="page-panel mb-3">
    <div class="page-panel__top">
      <div class="d-flex align-items-center gap-3">
        <div class="page-panel__icon"><i class="bi bi-database-gear"></i></div>
        <div>
          <h5 class="fw-bold mb-0">Consultas dinámicas</h5>
          <p class="text-muted small mb-0">Análisis avanzados con un clic — exportables en CSV</p>
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
        <label for="cq-desde" class="page-panel__filter-label">Desde</label>
        <input id="cq-desde" type="date" class="form-control form-control-sm page-panel__filter-date" bind:value={desde} />
      </div>
      <span class="page-panel__filter-sep">→</span>
      <div>
        <label for="cq-hasta" class="page-panel__filter-label">Hasta</label>
        <input id="cq-hasta" type="date" class="form-control form-control-sm page-panel__filter-date" bind:value={hasta} />
      </div>
    </div>
  </div>

  <!-- Tag filter -->
  <div class="d-flex gap-2 flex-wrap mb-3">
    {#each ['Todos', ...TAGS] as tag}
      <button
        class="btn btn-sm {filtroTag === tag ? 'btn-primary' : 'btn-outline-secondary'}"
        style="border-radius:20px;font-size:12px;padding:3px 12px"
        on:click={() => (filtroTag = tag)}>
        {tag}
      </button>
    {/each}
  </div>

  <!-- Query cards -->
  <div class="consultas-grid mb-4">
    {#each visibles as c}
      <!-- svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events -->
      <div class="cq-card {activaTipo === c.tipo ? 'cq-card--active' : ''}" on:click={() => ejecutar(c)}>
        <div class="cq-card__icon"><i class="bi {c.icon}"></i></div>
        <div class="cq-card__title">{c.titulo}</div>
        <div class="cq-card__desc">{c.desc}</div>
        <span class="cq-card__tag">{c.tag}</span>
      </div>
    {/each}
  </div>

  <!-- Results -->
  {#if activaTipo}
    <div class="cq-results">
      <div class="cq-results__header">
        <div>
          <div class="cq-results__title">{activaTitulo}</div>
          {#if resultado}
            <div class="cq-results__meta">{resultado.filas.length} filas · período {desde} → {hasta}</div>
          {/if}
        </div>
        {#if resultado && resultado.filas.length > 0}
          <button class="btn btn-sm btn-outline-success d-flex align-items-center gap-1" on:click={exportar}>
            <i class="bi bi-filetype-csv"></i> Exportar CSV
          </button>
        {/if}
      </div>

      {#if cargando}
        <div class="cq-loading"><Spinner /></div>
      {:else if !resultado || resultado.filas.length === 0}
        <div class="cq-results__empty">
          <i class="bi bi-inbox" style="font-size:2rem;opacity:.2;display:block;margin-bottom:8px"></i>
          Sin datos para el período seleccionado
        </div>
      {:else}
        <div class="table-responsive">
          <table class="table table-sm table-hover table-origen mb-0">
            <thead class="table-origen table-origen--navy">
              <tr>
                {#each resultado.columnas as col}
                  <th class="ps-3">{col}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each resultado.filas as fila}
                <tr>
                  {#each fila as celda, i}
                    <td class="ps-3 small {i === 0 ? 'fw-semibold' : ''}">{celda}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}
</div>
