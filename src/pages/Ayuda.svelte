<script lang="ts">
  import '../styles/pages/_ayuda.css';
  import { isAdmin } from '../lib/stores/auth';
  import { permisosStore } from '../lib/stores/permisos';

  let openSection: string | null = null;

  function toggle(id: string) {
    openSection = openSection === id ? null : id;
  }

  function canSeeSection(s: { ruta: string; adminOnly?: boolean }): boolean {
    if (s.adminOnly) return $isAdmin;
    if (s.ruta === '/') return true;
    return $isAdmin || $permisosStore.includes(s.ruta);
  }

  const sections = [
    {
      id: 'dashboard',
      ruta: '/',
      icon: 'bi-grid-1x2',
      title: 'Dashboard',
      desc: 'Resumen general del negocio en tiempo real.',
      body: `El Dashboard es la pantalla de inicio y te muestra los datos más importantes del día de un vistazo:

• **Ingresos del día**: suma de todo lo cobrado hoy.
• **Egresos del día**: suma de todo lo gastado hoy.
• **Balance**: la diferencia entre ingresos y egresos.
• **Clientes atendidos**: cuántos clientes pasaron hoy.
• **Últimas transacciones**: los registros más recientes para revisión rápida.

Úsalo al comenzar la jornada para saber cómo va el negocio sin necesidad de buscar en otras secciones.`,
    },
    {
      id: 'ingresos',
      ruta: '/ingresos',
      icon: 'bi-arrow-down-circle',
      title: 'Ingresos',
      desc: 'Registro de ventas de servicios, productos y paquetes.',
      body: `En esta sección registras cada venta que realiza el salón. Cada ingreso está vinculado a un cliente y puede incluir uno o más servicios, productos o paquetes.

**Cómo registrar un ingreso:**
1. Haz clic en **Registrar ingreso** (la caja debe estar abierta).
2. **Paso 1 — Ítems**: selecciona los servicios, productos o paquetes que el cliente consumió. Puedes agregar varios.
3. **Paso 2 — Cliente**: busca al cliente existente o crea uno nuevo. El cliente es obligatorio.
4. **Paso 3 — Resumen**: revisa el monto total, aplica descuentos si corresponde y selecciona el método de pago (Efectivo, Tarjeta, Yape, Plin).
5. Confirma y el ingreso queda registrado.

**Filtros disponibles:** puedes filtrar por fechas, por rango y por método de pago. El botón **Hoy** filtra automáticamente los registros del día actual.`,
    },
    {
      id: 'egresos',
      ruta: '/egresos',
      icon: 'bi-arrow-up-circle',
      title: 'Egresos',
      desc: 'Control de gastos y salidas de dinero.',
      body: `Los egresos registran todo el dinero que sale del negocio: compra de insumos, pago de servicios, gastos varios, etc.

**Cómo registrar un egreso:**
1. Haz clic en **Registrar Egreso** (la caja debe estar abierta).
2. Selecciona la **categoría** del gasto (configurable por el administrador).
3. Ingresa el monto, descripción y método de pago.
4. El sistema asigna automáticamente el responsable según el usuario que está registrando.

**Filtros disponibles:** por fechas, método de pago y el botón **Hoy** para ver solo los egresos del día.`,
    },
    {
      id: 'caja',
      ruta: '/caja',
      icon: 'bi-cash-coin',
      title: 'Control de Caja',
      desc: 'Apertura y cierre de caja del día.',
      body: `El control de caja permite llevar un registro ordenado del efectivo disponible durante la jornada de trabajo.

**Abrir caja:** antes de registrar ingresos o egresos, debes abrir la caja indicando el monto inicial (el efectivo con el que empiezas el día). Puedes asignar responsables.

**Durante el día:** la caja acumula automáticamente los ingresos en efectivo y los egresos registrados.

**Cerrar caja:** al terminar el día, cierras la caja. El sistema calcula el saldo final esperado y puedes registrar el monto físico para detectar diferencias.

**Importante:** tanto los ingresos como los egresos requieren que haya una caja abierta. Si intentas registrar sin caja abierta, el sistema lo bloqueará.`,
    },
    {
      id: 'clientes',
      ruta: '/clientes',
      icon: 'bi-people',
      title: 'Clientes',
      desc: 'Directorio de clientes y su historial de visitas.',
      body: `Aquí encuentras el listado de todos los clientes registrados en el sistema.

**Agregar un cliente:** haz clic en **Nuevo cliente** e ingresa nombre, teléfono, email y observaciones (todos opcionales excepto el nombre).

**Historial:** haz clic en el ícono de reloj junto a un cliente para ver todas sus transacciones anteriores, con fechas, conceptos y montos.

**Editar / Eliminar:** usa los botones de lápiz (editar) y papelera (eliminar, solo administradores) en cada fila.

Los clientes son requeridos al registrar un ingreso, por lo que conviene tenerlos creados con anticipación.`,
    },
    {
      id: 'campanas',
      ruta: '/campanas',
      icon: 'bi-megaphone',
      title: 'Campañas',
      desc: 'Promociones activas para impulsar ventas.',
      body: `Las campañas son avisos internos para que el equipo recuerde qué servicios o productos se deben promover durante un período determinado.

**Para empleados:** al iniciar sesión, verás un popup con las campañas activas del momento. Puedes hacer clic en **Registrar venta** para ir directamente a la pantalla de ingresos con ese ítem ya seleccionado.

**Para administradores:** además de ver las campañas activas, puedes crear nuevas campañas indicando:
- El título y descripción de la campaña.
- El servicio, producto o paquete a promocionar.
- La duración: semanal (7 días), quincenal (15 días), mensual (30 días) o personalizada.

Las campañas expiradas se desactivan automáticamente y dejan de mostrarse en el popup.`,
    },
    {
      id: 'servicios',
      ruta: '/servicios',
      icon: 'bi-bag-check',
      title: 'Servicios & Productos',
      desc: 'Catálogo de lo que ofrece el salón.',
      body: `Aquí se administra el catálogo de servicios, productos y paquetes que el salón ofrece.

**Servicios:** tratamientos o servicios que se cobran por sesión (corte, tinte, tratamiento, etc.). Cada uno tiene precio, duración estimada y porcentaje de comisión.

**Productos:** artículos físicos que se venden (champú, mascarilla, etc.). Tienen precio de venta y se descuentan del stock cuando se registra una venta.

**Paquetes:** combinaciones de servicios y/o productos que se venden juntos con un precio especial. Pueden incluir un descuento sobre el precio individual.

Estos ítems aparecen disponibles al momento de registrar un ingreso.`,
    },
    {
      id: 'stock',
      ruta: '/stock',
      adminOnly: true,
      icon: 'bi-box-seam',
      title: 'Stock',
      desc: 'Inventario de productos disponibles. (Solo administradores)',
      body: `El stock muestra el inventario actual de todos los productos. Cuando se registra una venta de un producto, el stock se descuenta automáticamente.

**Ver stock:** en la tabla verás cada producto con su cantidad disponible. Los que están en cero o por debajo del mínimo se resaltan.

**Ajustar stock:** los administradores pueden hacer entradas (cuando llega mercadería) o ajustes manuales con una justificación.

Mantener el stock actualizado es importante para saber cuándo reabastecer y evitar vender algo que no está disponible.`,
    },
    {
      id: 'empleados',
      ruta: '/empleados',
      adminOnly: true,
      icon: 'bi-person-badge',
      title: 'Personal',
      desc: 'Gestión de empleados y sus cuentas. (Solo administradores)',
      body: `En esta sección el administrador gestiona al equipo de trabajo.

**Registrar empleado:** ingresa nombre, cargo, porcentaje de comisión y opcionalmente vincula una cuenta de usuario para que pueda acceder al sistema.

**Cuenta de usuario:** si el empleado necesita acceder al sistema, puedes crear su usuario desde aquí indicando nombre de usuario y contraseña. El rol determina a qué secciones tendrá acceso.

**Activo/Inactivo:** puedes desactivar empleados sin eliminarlos, lo que preserva su historial en los registros.`,
    },
    {
      id: 'estadisticas',
      ruta: '/estadisticas',
      adminOnly: true,
      icon: 'bi-bar-chart-line',
      title: 'Estadísticas',
      desc: 'Análisis visual del desempeño del negocio. (Solo administradores)',
      body: `Las estadísticas muestran gráficos y resúmenes que ayudan a entender cómo evoluciona el negocio.

Puedes ver:
- **Ingresos por período:** comparativa de ventas por semana, mes o año.
- **Servicios más vendidos:** qué servicios generan más ingresos.
- **Métodos de pago:** qué porcentaje de clientes paga con efectivo vs. tarjeta vs. transferencia.
- **Desempeño por empleado:** cuánto ha facturado cada miembro del equipo.

Usa estos datos para tomar decisiones: qué servicios promover, qué días son más concurridos, etc.`,
    },
    {
      id: 'comisiones',
      ruta: '/comisiones',
      adminOnly: true,
      icon: 'bi-person-check',
      title: 'Comisiones',
      desc: 'Cálculo de comisiones por empleado. (Solo administradores)',
      body: `Esta sección calcula automáticamente cuánto le corresponde a cada empleado por comisiones, según los servicios y productos que vendieron en un período.

Selecciona el rango de fechas y el sistema muestra el detalle por empleado: cuántas ventas realizó, el monto total y el importe de comisión que le corresponde según el porcentaje configurado.

Es útil para liquidar comisiones al final de la quincena o del mes.`,
    },
    {
      id: 'reportes',
      ruta: '/reportes',
      adminOnly: true,
      icon: 'bi-file-earmark-bar-graph',
      title: 'Reportes',
      desc: 'Exportación de datos en PDF o Excel. (Solo administradores)',
      body: `Los reportes permiten exportar la información del sistema para revisión externa, contabilidad o archivo.

**Tipos de reportes disponibles:**
- **Reporte de ingresos:** detalle de todas las ventas en un rango de fechas.
- **Reporte de egresos:** gastos del período.
- **Reporte de caja:** apertura y cierre de cada caja del período.

Selecciona el tipo de reporte, el rango de fechas y descarga el archivo en el formato que necesites.`,
    },
    {
      id: 'configuracion',
      ruta: '/configuracion',
      adminOnly: true,
      icon: 'bi-gear',
      title: 'Configuración',
      desc: 'Parámetros del sistema. (Solo administradores)',
      body: `Aquí el administrador ajusta los parámetros generales del sistema.

**Negocio:** nombre comercial, RUC, teléfono, dirección y email del salón. Estos datos aparecen en los reportes.

**Cuenta:** puedes actualizar tu nombre completo y cambiar tu contraseña de acceso.

**Cargos:** lista de puestos de trabajo del equipo (Estilista, Colorista, Recepcionista, etc.). Estos cargos se asignan a los empleados.

**Permisos:** configura qué secciones puede ver cada rol. Por defecto los empleados tienen acceso a ingresos, egresos, caja, clientes, campañas y servicios. Puedes habilitar o deshabilitar cualquier sección según las necesidades del negocio.`,
    },
  ];
</script>

<div class="p-3 p-md-4">
  <div class="page-panel mb-3">
    <div class="page-panel__top">
      <div class="d-flex align-items-center gap-3">
        <div class="page-panel__icon"><i class="bi bi-question-circle"></i></div>
        <div>
          <h5 class="fw-bold mb-0">Ayuda</h5>
          <p class="text-muted small mb-0">Guía de uso del sistema administrativo Origen</p>
        </div>
      </div>
    </div>
  </div>

  <div class="alert border-0 mb-4" style="background:#f0f4ff;border-radius:12px">
    <div class="d-flex align-items-start gap-3">
      <i class="bi bi-lightbulb-fill text-primary mt-1" style="font-size:1.2rem"></i>
      <div class="small">
        <strong>¿Primera vez usando el sistema?</strong><br>
        Empieza por <strong>abrir la caja</strong> del día, luego registra los <strong>ingresos</strong> a medida que atiendas clientes.
        Al terminar la jornada, <strong>cierra la caja</strong> para cerrar el día contablemente.
      </div>
    </div>
  </div>

  <div class="accordion-list">
    {#each sections.filter(canSeeSection) as s}
      <div class="ayuda-card mb-2" class:ayuda-card--open={openSection === s.id}>
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
        <div class="ayuda-card__header" on:click={() => toggle(s.id)}>
          <div class="d-flex align-items-center gap-3">
            <div class="ayuda-card__icon"><i class="bi {s.icon}"></i></div>
            <div>
              <div class="fw-semibold small">{s.title}</div>
              <div class="text-muted" style="font-size:12px">{s.desc}</div>
            </div>
          </div>
          <i class="bi bi-chevron-down ayuda-card__chevron" class:rotated={openSection === s.id}></i>
        </div>
        {#if openSection === s.id}
          <div class="ayuda-card__body">
            {#each s.body.split('\n') as line}
              {#if line.trim() === ''}
                <br>
              {:else if line.startsWith('**') && line.endsWith('**')}
                <p class="fw-semibold mb-1 mt-2">{line.slice(2, -2)}</p>
              {:else}
                <p class="mb-1 small text-dark">{@html line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
