# Plan de Migración: Blazor WASM → Svelte + Vite + TypeScript + Bootstrap

## Stack objetivo
- **Framework:** Svelte 5 + SvelteKit (routing file-based)
- **Bundler:** Vite
- **Lenguaje:** TypeScript
- **UI / estilos:** Bootstrap 5 (latest CDN o npm)
- **HTTP:** fetch nativo (sin librerías extra)
- **Auth:** JWT en localStorage (mismo patrón actual)
- **Responsive:** desktop, tablet, mobile — Bootstrap grid + breakpoints

---

## Estructura de directorios propuesta

```
origen-dashboard-frontend-svelte/
├── src/
│   ├── lib/
│   │   ├── api/          # Capa de servicios HTTP (equivalente a *Service.cs)
│   │   │   ├── base.ts
│   │   │   ├── auth.ts
│   │   │   ├── clientes.ts
│   │   │   ├── empleados.ts
│   │   │   ├── usuarios.ts
│   │   │   ├── servicios.ts
│   │   │   ├── productos.ts
│   │   │   ├── paquetes.ts
│   │   │   ├── ingresos.ts
│   │   │   ├── egresos.ts
│   │   │   └── reportes.ts
│   │   ├── stores/       # Estado global reactivo
│   │   │   └── auth.ts   # authStore (token, user, isAdmin)
│   │   ├── components/   # Componentes reutilizables
│   │   │   ├── Navbar.svelte
│   │   │   ├── Sidebar.svelte
│   │   │   ├── DataTable.svelte
│   │   │   ├── Pagination.svelte
│   │   │   ├── Modal.svelte
│   │   │   ├── Toast.svelte
│   │   │   ├── Spinner.svelte
│   │   │   ├── StepWizard.svelte
│   │   │   └── ConfirmDialog.svelte
│   │   └── types/        # Interfaces TypeScript
│   │       └── index.ts
│   └── routes/           # Páginas (SvelteKit file-based routing)
│       ├── +layout.svelte          # Layout global con Navbar/Sidebar
│       ├── +layout.ts              # Guard de autenticación global
│       ├── login/
│       │   └── +page.svelte
│       ├── (app)/                  # Grupo protegido (requiere auth)
│       │   ├── +layout.svelte
│       │   ├── +page.svelte        # Dashboard / Home
│       │   ├── clientes/
│       │   │   └── +page.svelte
│       │   ├── empleados/
│       │   │   └── +page.svelte
│       │   ├── servicios/
│       │   │   └── +page.svelte
│       │   ├── ingresos/
│       │   │   └── +page.svelte
│       │   ├── egresos/
│       │   │   └── +page.svelte
│       │   ├── caja/
│       │   │   └── +page.svelte
│       │   └── reportes/
│       │       └── +page.svelte
├── static/
├── vite.config.ts
├── svelte.config.js
├── tsconfig.json
├── package.json
└── Dockerfile
```

---

## API endpoints mapeados

| Recurso | Endpoints |
|---------|-----------|
| Auth | POST /api/auth/login |
| Clientes | GET/POST /api/clientes, GET/PUT/DELETE /api/clientes/{id} |
| Empleados | GET/POST /api/empleados, GET/PUT/DELETE /api/empleados/{id} |
| Usuarios | GET/POST /api/usuarios, PUT/DELETE /api/usuarios/{id} |
| Servicios | GET/POST /api/servicios, GET/PUT/DELETE /api/servicios/{id} |
| Productos | GET/POST /api/productos, GET/PUT/DELETE /api/productos/{id} |
| Paquetes | GET/POST /api/paquetes, GET/PUT/DELETE /api/paquetes/{id} |
| Ingresos | GET(+fecha+paginación)/POST/DELETE /api/ingresos |
| Egresos | GET(+fecha+paginación)/POST/DELETE /api/egresos |
| Reportes | GET /api/reportes/dashboard, GET /api/reportes/resumen |

Todos los endpoints (excepto login) requieren `Authorization: Bearer <token>`.

### Envelope de respuesta
```ts
interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
```

---

## Auth pattern

- Token JWT almacenado en `localStorage` con claves: `origen_token`, `origen_user`, `origen_expiry`
- Expiración: 30 minutos desde login
- `authStore` en Svelte: `{ token, user: { id, nombreUsuario, nombreCompleto, rol }, isAdmin }`
- Guard en `+layout.ts` del grupo `(app)/`: redirige a `/login` si no hay token válido
- Interceptor en `base.ts`: inyecta el header `Authorization` automáticamente; si recibe 401 → logout + redirect

---

## Páginas y componentes clave

### 1. Login (`/login`)
- Form usuario + contraseña
- Llama `POST /api/auth/login`
- Guarda token en authStore + localStorage
- Redirige a `/`

### 2. Dashboard (`/`)
- KPI cards: ingresos hoy, egresos mes, utilidad mes, clientes totales, servicios hoy
- Tabla de últimas transacciones
- Breakdown por método de pago
- Quick-actions (botones de navegación rápida)
- Fuente: `GET /api/reportes/dashboard`

### 3. Clientes (`/clientes`)
- Tabla paginada (nombre, teléfono, email, observaciones, fecha registro)
- Modal CRUD (crear/editar)
- Confirmación de eliminación
- Fuente: `GET /api/clientes?page=X&pageSize=15`

### 4. Empleados (`/empleados`)
- Tabs: Empleados / Usuarios del sistema
- Tabla paginada por tab
- Modal CRUD por tab (crear/editar empleado, crear/editar usuario)
- Empleados: nombre, cargo, comisión%, cuenta acceso, estado
- Usuarios: usuario, nombre completo, rol, estado

### 5. Servicios (`/servicios`)
- Tabs: Servicios / Productos / Paquetes
- **Servicios:** nombre, categoría, precio, duración, comisión%, estado; toggle activo
- **Productos:** nombre, categoría, precio venta, stock (badge color bajo stock), estado
- **Paquetes:** nombre, descripción, precio, descuento, items incluidos, estado
- Modal CRUD para cada tab
- Paquetes: selector múltiple de servicios y productos incluidos

### 6. Ingresos (`/ingresos`)
- Historial paginado con filtro por rango de fecha
- Wizard 3 pasos para registrar:
  1. Tipo (servicio / producto / paquete / personalizado) + selección del item
  2. Cliente (opcional, con opción de crear nuevo inline) + empleado responsable
  3. Método de pago, monto recibido, descuento, cálculo de vuelto
- Modal resumen post-registro
- Admin puede eliminar registros

### 7. Egresos (`/egresos`)
- Historial paginado con filtro por rango de fecha
- Wizard 3 pasos:
  1. Categoría (suministros, servicios, salarios, renta, marketing, mantenimiento, impuestos, otros)
  2. Descripción, monto, proveedor, comprobante
  3. Revisión + observaciones + confirmar
- Confirmación post-registro tipo recibo

### 8. Caja (`/caja`)
- Estado 1 — Cerrada: form de apertura (monto inicial, responsable/s)
- Estado 2 — Abierta: dashboard con KPIs (saldo inicial, ingresos, egresos, saldo actual) + tabla movimientos del día + botón cerrar
- Estado 3 — Cerrando: resumen + confirmación escribiendo "cerrar"
- Historial de cierres (admin) persistido en localStorage
- Botón imprimir cierre
- Fuentes: `GET /api/ingresos` y `GET /api/egresos` filtrando por fecha de hoy

### 9. Reportes (`/reportes`)
- Selector de período: Hoy, Esta semana, Este mes, Mes anterior, Este año, Rango custom
- KPI cards: total ingresos, egresos, utilidad neta, comisiones
- Tabla top servicios
- Breakdown por empleado (servicios, ventas, comisión)
- Barras horizontales por método de pago
- Fuente: `GET /api/reportes/resumen?desde=...&hasta=...`

---

## Componentes compartidos

| Componente | Uso |
|------------|-----|
| `DataTable.svelte` | Tabla genérica con slot para columnas, loading skeleton |
| `Pagination.svelte` | Controles prev/next/page con total items |
| `Modal.svelte` | Wrapper Bootstrap modal con slot para body y footer |
| `StepWizard.svelte` | Pasos numerados, next/back, validación por paso |
| `Toast.svelte` | Notificaciones tipo snackbar (success/error/info) |
| `ConfirmDialog.svelte` | Modal de confirmación con texto de riesgo |
| `Spinner.svelte` | Loading overlay o inline |
| `Navbar.svelte` | Top bar con usuario, rol, logout |
| `Sidebar.svelte` | Navegación lateral colapsable en mobile |

---

## Responsividad (Bootstrap)

- Layout principal: sidebar fijo en desktop (`d-none d-md-block`), offcanvas en mobile
- Tablas: `table-responsive` wrapper para scroll horizontal en mobile
- Modales: `modal-dialog-scrollable` + `modal-fullscreen-sm-down` en pantallas pequeñas
- Wizard pasos: stack vertical en mobile, horizontal en desktop
- KPI cards: `col-12 col-sm-6 col-xl-3` grid

---

## Docker (producción)

```dockerfile
# Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

# Serve
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

El `nginx.conf` debe manejar SPA routing (`try_files $uri $uri/ /index.html`).

---

## Orden de implementación sugerido

1. Scaffolding del proyecto (Vite + Svelte + TS + Bootstrap)
2. `base.ts` + `auth.ts` (API layer + authStore)
3. Login page + guard de rutas
4. Layout (Navbar + Sidebar responsive)
5. Componentes base (DataTable, Pagination, Modal, Toast)
6. Dashboard (Home)
7. Clientes
8. Empleados + Usuarios (tabs)
9. Servicios + Productos + Paquetes (tabs)
10. Ingresos (wizard)
11. Egresos (wizard)
12. Caja
13. Reportes
14. Dockerfile + nginx.conf
15. Integrar en docker-compose.yml del backend
