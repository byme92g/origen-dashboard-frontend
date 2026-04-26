# Origen Dashboard — Estado de Migración Svelte

> Última actualización: 2026-04-26

## Stack
- **Frontend:** Svelte 5 + Vite + TypeScript + Bootstrap 5 (`svelte/`)
- **Backend:** .NET 10 Minimal APIs + EF Core + MySQL (`../origen-dashboard-backend/`)
- **Dev:** `npm run dev` en `svelte/` → `http://localhost:5173` | Backend en Docker → `http://localhost:5000`

---

## Páginas

| Página          | Ruta            | Estado       | Notas                                      |
|-----------------|-----------------|--------------|---------------------------------------------|
| Login           | `/login`        | ✅ Completo  | Auth JWT, redirect si ya autenticado        |
| Dashboard       | `/`             | ✅ Completo  | KPIs del día, resumen ingresos/egresos      |
| Ingresos        | `/ingresos`     | ✅ Completo  | CRUD, filtro fecha, paginación              |
| Egresos         | `/egresos`      | ✅ Completo  | CRUD, filtro fecha, paginación              |
| Control de Caja | `/caja`         | ✅ Completo  | Estado en DB (multi-usuario), historial     |
| Clientes        | `/clientes`     | ✅ Completo  | CRUD, búsqueda                              |
| Servicios       | `/servicios`    | ✅ Completo  | Servicios + Productos + Paquetes            |
| Stock           | `/stock`        | ✅ Completo  | Inventario, búsqueda, alertas stock bajo    |
| Personal        | `/empleados`    | ✅ Completo  | Solo admin, CRUD empleados                  |
| Estadísticas    | `/estadisticas` | ✅ Completo  | Gráficos CSS sobre resumen financiero       |
| Reportes        | `/reportes`     | ✅ Completo  | Exportable, rango de fechas                 |
| Configuración   | `/configuracion`| ✅ Completo  | Cuenta admin + datos negocio locales        |

---

## Infraestructura

| Item                        | Estado       | Notas                                              |
|-----------------------------|--------------|-----------------------------------------------------|
| Auth JWT (login/logout)     | ✅ Completo  | Token en localStorage, 30 min, refresh en store    |
| Sidebar con secciones       | ✅ Completo  | Íconos SVG del legacy, secciones por categoría     |
| Navbar + hamburger mobile   | ✅ Completo  |                                                     |
| Toast notifications         | ✅ Completo  | Store independiente `stores/toast.ts`              |
| CORS dev configurado        | ✅ Completo  | `localhost:5173` habilitado via env vars           |
| Caja persistida en DB       | ✅ Completo  | Entidad `CajaApertura`, migración `AddCaja`        |
| Estilos brand (navy/gold)   | ✅ Completo  | CSS vars, Cormorant Garamond + DM Sans              |
| Responsive (mobile/tablet)  | ✅ Completo  | Sidebar offcanvas en mobile                        |
| Docker build funcional      | ✅ Completo  | Backend + MySQL via `docker compose up --build`    |

---

## Pendientes

### Mejoras futuras
- Actualizar servicio Docker frontend para servir el build de Svelte (actualmente sirve Blazor WASM)
- Eliminar proyecto Blazor WASM una vez que todas las páginas estén migradas
- GitHub Actions `deploy-backend.yml`: el paso `cat > .env` hardcodea CORS — actualizar a `CORS_ORIGIN_0=https://app.origencapilarestetica.pe`
- Agregar página NotFound en el router de Svelte
- Persistir datos del negocio en backend en lugar de `localStorage`

---

## Archivos clave

```
svelte/
├── src/
│   ├── App.svelte                    # Router principal, layout shell
│   ├── app.css                       # Variables brand + overrides Bootstrap
│   ├── lib/
│   │   ├── api/
│   │   │   ├── base.ts               # fetch wrapper con JWT, 401 handler
│   │   │   ├── auth.ts               # login / logout
│   │   │   ├── caja.ts               # apertura/cierre/historial (DB)
│   │   │   ├── clientes.ts
│   │   │   ├── empleados.ts
│   │   │   ├── egresos.ts
│   │   │   ├── ingresos.ts
│   │   │   ├── reportes.ts
│   │   │   └── servicios.ts
│   │   ├── components/
│   │   │   ├── Navbar.svelte
│   │   │   ├── Sidebar.svelte        # SVG icons, secciones, admin filter
│   │   │   ├── Spinner.svelte
│   │   │   └── Toast.svelte
│   │   ├── stores/
│   │   │   ├── auth.ts               # authStore, isAdmin derived
│   │   │   └── toast.ts
│   │   └── types/index.ts
│   └── pages/
│       ├── Login.svelte, Dashboard.svelte, Ingresos.svelte
│       ├── Egresos.svelte, Caja.svelte, Clientes.svelte
│       ├── Servicios.svelte, Empleados.svelte, Reportes.svelte
│       ├── Stock.svelte              # inventario y alertas
│       ├── Estadisticas.svelte       # gráficos operativos
│       └── Configuracion.svelte     # cuenta admin + negocio
├── index.html                        # Google Fonts preconnect
└── .env                              # VITE_API_URL=http://localhost:5000
```
