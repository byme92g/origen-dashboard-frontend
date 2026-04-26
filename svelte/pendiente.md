# Pendientes

## Categorías de egresos — vía API

**Problema:** Las etiquetas de categoría están hardcodeadas en el frontend (`CATEGORIA_LABELS` en `Egresos.svelte`) de forma independiente al backend. Cualquier cambio de etiqueta requiere tocar dos lugares.

**Solución:**
1. **Backend** — agregar `GET /api/egresos/categorias` que retorne `[{ key: string, label: string }]` con las etiquetas canónicas.
2. **Frontend** — en `Egresos.svelte`, al montar la página llamar ese endpoint, construir el mapa de etiquetas dinámicamente y eliminar `CATEGORIA_LABELS` hardcodeado.

**Archivos a tocar:**
- `OrigenDashboard/Endpoints/EgresosEndpoints.cs` — agregar el nuevo endpoint (las claves ya están en el array `categoriasValidas`)
- `svelte/src/lib/api/egresos.ts` — agregar función `getCategorias()`
- `svelte/src/pages/Egresos.svelte` — reemplazar `CATEGORIA_LABELS` por fetch al API

---

## Otras tareas pendientes

- [ ] Wizard de Ingresos/Egresos: convertir de modal a página inline
- [ ] Egresos constancia: replicar tarjeta de comprobante del legacy
- [ ] Páginas por implementar: Stock, Estadísticas, Configuración
