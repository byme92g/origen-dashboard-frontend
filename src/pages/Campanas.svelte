<script lang="ts">
  import { onMount } from 'svelte';
  import { campanaApi, type CrearCampanaRequest, type ActualizarCampanaRequest } from '../lib/api/campanas';
  import { servicioApi } from '../lib/api/servicios';
  import { productoApi } from '../lib/api/productos';
  import { paqueteApi } from '../lib/api/paquetes';
  import { campanaPreseleccionada } from '../lib/stores/campana';
  import { isAdmin } from '../lib/stores/auth';
  import { toast } from '../lib/stores/toast';
  import { push } from 'svelte-spa-router';
  import Spinner from '../lib/components/Spinner.svelte';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';
  import type { Campana, Servicio, Producto, Paquete } from '../lib/types';
  import '../styles/pages/_campanas.css';
  import { limaTodayStr } from '../lib/utils/date';

  let items: Campana[] = [];
  let loading = true;
  let saving = false;

  let showModal = false;
  let isEdit = false;
  let editId: number | null = null;

  let showConfirm = false;
  let deleteTarget: number | null = null;
  let deleting = false;

  let servicios: Servicio[] = [];
  let productos: Producto[] = [];
  let paquetes: Paquete[] = [];

  // Frecuencias predefinidas (en días)
  const frecuencias = [
    { label: 'Semanal (7 días)', dias: 7 },
    { label: 'Quincenal (15 días)', dias: 15 },
    { label: 'Mensual (30 días)', dias: 30 },
    { label: 'Personalizado', dias: 0 },
  ];

  let form = {
    titulo: '',
    descripcion: '',
    tipo: 'servicio' as 'servicio' | 'producto' | 'paquete',
    servicioId: undefined as number | undefined,
    productoId: undefined as number | undefined,
    paqueteId: undefined as number | undefined,
    fechaInicio: limaTodayStr(),
    fechaFin: '',
    activo: true,
    frecuenciaDias: 30,
  };

  $: {
    if (form.frecuenciaDias > 0 && form.fechaInicio) {
      const d = new Date(form.fechaInicio);
      d.setDate(d.getDate() + form.frecuenciaDias);
      form.fechaFin = d.toISOString().split('T')[0];
    }
  }

  function resetForm() {
    form = {
      titulo: '', descripcion: '', tipo: 'servicio',
      servicioId: undefined, productoId: undefined, paqueteId: undefined,
      fechaInicio: limaTodayStr(),
      fechaFin: '',
      activo: true,
      frecuenciaDias: 30,
    };
  }

  async function load() {
    loading = true;
    if ($isAdmin) {
      const res = await campanaApi.listar();
      if (res.ok && res.data) items = res.data;
    } else {
      const res = await campanaApi.activas();
      if (res.ok && res.data) items = res.data;
    }
    loading = false;
  }

  async function loadCatalogs() {
    const [sr, pr, pkr] = await Promise.all([servicioApi.listar(), productoApi.listar(), paqueteApi.listar()]);
    if (sr.ok && sr.data) servicios = sr.data as unknown as Servicio[];
    if (pr.ok && pr.data) productos = pr.data as unknown as Producto[];
    if (pkr.ok && pkr.data) paquetes = pkr.data as unknown as Paquete[];
  }

  onMount(() => {
    load();
    if ($isAdmin) loadCatalogs();
  });

  function openCreate() {
    resetForm();
    isEdit = false;
    editId = null;
    showModal = true;
  }

  function openEdit(c: Campana) {
    form = {
      titulo: c.titulo,
      descripcion: c.descripcion ?? '',
      tipo: c.tipo,
      servicioId: c.servicioId,
      productoId: c.productoId,
      paqueteId: c.paqueteId,
      fechaInicio: c.fechaInicio.split('T')[0],
      fechaFin: c.fechaFin.split('T')[0],
      activo: c.activo,
      frecuenciaDias: 0,
    };
    isEdit = true;
    editId = c.id;
    showModal = true;
  }

  async function save() {
    if (!form.titulo.trim()) { toast('El título es obligatorio', 'error'); return; }
    if (!form.fechaFin) { toast('Selecciona la duración', 'error'); return; }

    const itemId = form.tipo === 'servicio' ? form.servicioId
      : form.tipo === 'producto' ? form.productoId
      : form.paqueteId;
    if (!itemId) { toast('Selecciona un ítem para esta campaña', 'error'); return; }

    saving = true;
    const payload = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || undefined,
      tipo: form.tipo,
      servicioId: form.tipo === 'servicio' ? form.servicioId : undefined,
      productoId: form.tipo === 'producto' ? form.productoId : undefined,
      paqueteId: form.tipo === 'paquete' ? form.paqueteId : undefined,
      fechaInicio: new Date(form.fechaInicio).toISOString(),
      fechaFin: new Date(form.fechaFin).toISOString(),
    };

    const res = isEdit && editId
      ? await campanaApi.actualizar(editId, { ...payload, activo: form.activo } as ActualizarCampanaRequest)
      : await campanaApi.crear(payload as CrearCampanaRequest);

    saving = false;
    if (res.ok) {
      toast(isEdit ? 'Campaña actualizada' : 'Campaña creada', 'success');
      showModal = false;
      load();
    } else {
      toast(res.error ?? 'Error al guardar', 'error');
    }
  }

  async function toggleActivo(c: Campana) {
    const res = await campanaApi.actualizar(c.id, {
      titulo: c.titulo,
      descripcion: c.descripcion,
      tipo: c.tipo,
      servicioId: c.servicioId,
      productoId: c.productoId,
      paqueteId: c.paqueteId,
      fechaInicio: c.fechaInicio,
      fechaFin: c.fechaFin,
      activo: !c.activo,
    } as ActualizarCampanaRequest);
    if (res.ok) { toast(c.activo ? 'Campaña desactivada' : 'Campaña activada', 'success'); load(); }
    else toast(res.error ?? 'Error', 'error');
  }

  function eliminar(id: number) { deleteTarget = id; showConfirm = true; }

  async function doDelete() {
    if (!deleteTarget) return;
    deleting = true;
    const res = await campanaApi.eliminar(deleteTarget);
    deleting = false;
    showConfirm = false;
    if (res.ok) { toast('Campaña eliminada', 'success'); load(); }
    else toast(res.error ?? 'Error', 'error');
  }

  function goToIngreso(c: Campana) {
    campanaPreseleccionada.set(c);
    push('/ingresos');
  }

  function isActiva(c: Campana): boolean {
    if (!c.activo) return false;
    const now = Date.now();
    return new Date(c.fechaInicio).getTime() <= now && new Date(c.fechaFin).getTime() >= now;
  }

  function diasRestantes(c: Campana): number {
    return Math.max(0, Math.ceil((new Date(c.fechaFin).getTime() - Date.now()) / 86400000));
  }

  function getItemNombre(c: Campana): string {
    return c.servicio?.nombre ?? c.producto?.nombre ?? c.paquete?.nombre ?? '—';
  }

  function getItemPrecio(c: Campana): number {
    return c.servicio?.precio ?? c.producto?.precioVenta ?? c.paquete?.precio ?? 0;
  }

  function fmtFecha(s: string) {
    return new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima' });
  }
</script>

<div class="p-3 p-md-4">
  <div class="page-panel mb-3">
    <div class="page-panel__top">
      <div class="d-flex align-items-center gap-3">
        <div class="page-panel__icon"><i class="bi bi-megaphone"></i></div>
        <div>
          <h5 class="fw-bold mb-0">Campañas</h5>
          <p class="text-muted small mb-0">
            {$isAdmin ? 'Gestiona las campañas de venta activas' : 'Campañas activas para promover ventas'}
          </p>
        </div>
      </div>
      {#if $isAdmin}
        <button class="btn btn-primary btn-sm" on:click={openCreate}>
          <i class="bi bi-plus-lg me-1"></i>Nueva campaña
        </button>
      {/if}
    </div>
  </div>

  {#if loading}
    <Spinner />
  {:else if items.length === 0}
    <div class="campana-empty">
      <i class="bi bi-megaphone campana-empty__icon"></i>
      <p class="campana-empty__text">
        {$isAdmin ? 'No hay campañas creadas aún.' : 'No hay campañas activas en este momento.'}
      </p>
    </div>
  {:else}
    <div class="row g-3">
      {#each items as c}
        {@const activa = isActiva(c)}
        {@const dias = diasRestantes(c)}
        <div class="col-12 col-md-6 col-xl-4">
          <div class="campana-card">
            <div class="campana-card__body">
              <div class="campana-card__header">
                <div class="campana-card__info">
                  <h6 class="campana-card__title">{c.titulo}</h6>
                  {#if c.descripcion}
                    <p class="campana-card__desc">{c.descripcion}</p>
                  {/if}
                </div>
                <span class="campana-card__status campana-card__status--{activa ? 'activa' : c.activo ? 'programada' : 'inactiva'}">
                  {activa ? 'Activa' : c.activo ? 'Programada' : 'Inactiva'}
                </span>
              </div>

              <div class="campana-card__product">
                <span class="campana-card__type-chip">{c.tipo}</span>
                <span class="campana-card__product-name">{getItemNombre(c)}</span>
                <span class="campana-card__product-price">S/ {getItemPrecio(c).toFixed(2)}</span>
              </div>

              <div class="campana-card__dates">
                <i class="bi bi-calendar3 me-1"></i>
                {fmtFecha(c.fechaInicio)} → {fmtFecha(c.fechaFin)}
                {#if activa}
                  <span class="campana-card__days">· {dias} día{dias !== 1 ? 's' : ''} restante{dias !== 1 ? 's' : ''}</span>
                {/if}
              </div>

              <div class="campana-card__actions">
                {#if !$isAdmin || activa}
                  <button class="btn btn-primary btn-sm flex-grow-1" on:click={() => goToIngreso(c)}>
                    <i class="bi bi-plus-lg me-1"></i>Registrar venta
                  </button>
                {/if}
                {#if $isAdmin}
                  <button class="btn btn-outline-secondary btn-sm" on:click={() => openEdit(c)} title="Editar">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-outline-secondary btn-sm" on:click={() => toggleActivo(c)} title="{c.activo ? 'Desactivar' : 'Activar'}">
                    <i class="bi bi-{c.activo ? 'pause' : 'play'}"></i>
                  </button>
                  <button class="btn btn-outline-danger btn-sm" on:click={() => eliminar(c.id)} title="Eliminar">
                    <i class="bi bi-trash"></i>
                  </button>
                {/if}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- ── Modal crear/editar campaña ─────────────────────────────────────────── -->
{#if showModal && $isAdmin}
  <div class="modal d-block" style="background:rgba(0,0,0,.5)">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content modal-origen">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title">{isEdit ? 'Editar campaña' : 'Nueva campaña'}</h5>
          <button class="btn-close" on:click={() => (showModal = false)}></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label for="campana-titulo" class="form-label small fw-semibold">Título *</label>
            <input id="campana-titulo" class="form-control" bind:value={form.titulo} placeholder="Ej: Promo Keratina de Mayo" />
          </div>

          <div class="mb-3">
            <label for="campana-descripcion" class="form-label small fw-semibold">Descripción</label>
            <textarea id="campana-descripcion" class="form-control" rows="2" bind:value={form.descripcion} placeholder="Mensaje para el equipo (opcional)"></textarea>
          </div>

          <div class="mb-3">
            <p class="form-label small fw-semibold mb-2">Tipo de ítem *</p>
            <div class="d-flex gap-2">
              {#each ['servicio', 'producto', 'paquete'] as t}
                <button type="button"
                  class="btn btn-sm {form.tipo === t ? 'btn-primary' : 'btn-outline-secondary'}"
                  on:click={() => { form.tipo = t as typeof form.tipo; form.servicioId = undefined; form.productoId = undefined; form.paqueteId = undefined; }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              {/each}
            </div>
          </div>

          <div class="mb-3">
            <label for="campana-item" class="form-label small fw-semibold">
              {form.tipo.charAt(0).toUpperCase() + form.tipo.slice(1)} a promover *
            </label>
            {#if form.tipo === 'servicio'}
              <select id="campana-item" class="form-select" bind:value={form.servicioId}>
                <option value={undefined}>— Selecciona —</option>
                {#each servicios.filter(s => s.activo) as s}<option value={s.id}>{s.nombre} · S/ {s.precio.toFixed(2)}</option>{/each}
              </select>
            {:else if form.tipo === 'producto'}
              <select id="campana-item" class="form-select" bind:value={form.productoId}>
                <option value={undefined}>— Selecciona —</option>
                {#each productos.filter(p => p.activo) as p}<option value={p.id}>{p.nombre} · S/ {p.precioVenta.toFixed(2)}</option>{/each}
              </select>
            {:else}
              <select id="campana-item" class="form-select" bind:value={form.paqueteId}>
                <option value={undefined}>— Selecciona —</option>
                {#each paquetes.filter(p => p.activo) as p}<option value={p.id}>{p.nombre} · S/ {p.precio.toFixed(2)}</option>{/each}
              </select>
            {/if}
          </div>

          <div class="row g-2 mb-3">
            <div class="col-6">
              <label for="campana-fecha-inicio" class="form-label small fw-semibold">Fecha de inicio</label>
              <input id="campana-fecha-inicio" class="form-control" type="date" bind:value={form.fechaInicio} />
            </div>
            <div class="col-6">
              <label for="campana-duracion" class="form-label small fw-semibold">Duración</label>
              <select id="campana-duracion" class="form-select" bind:value={form.frecuenciaDias}>
                {#each frecuencias as f}<option value={f.dias}>{f.label}</option>{/each}
              </select>
            </div>
          </div>

          {#if form.frecuenciaDias === 0}
            <div class="mb-3">
              <label for="campana-fecha-fin" class="form-label small fw-semibold">Fecha de fin *</label>
              <input id="campana-fecha-fin" class="form-control" type="date" bind:value={form.fechaFin} min={form.fechaInicio} />
            </div>
          {:else if form.fechaFin}
            <div class="mb-3">
              <div class="small text-muted">
                <i class="bi bi-calendar-check me-1"></i>
                Activa hasta: <strong>{fmtFecha(form.fechaFin)}</strong>
              </div>
            </div>
          {/if}

          {#if isEdit}
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="campana-activo" bind:checked={form.activo} />
              <label class="form-check-label small" for="campana-activo">Campaña activa</label>
            </div>
          {/if}
        </div>
        <div class="modal-footer border-0">
          <button class="btn btn-secondary btn-sm" on:click={() => (showModal = false)}>Cancelar</button>
          <button class="btn btn-primary btn-sm" on:click={save} disabled={saving}>
            {#if saving}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {isEdit ? 'Guardar cambios' : 'Crear campaña'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<ConfirmDialog
  show={showConfirm}
  message="¿Eliminar esta campaña? Esta acción no se puede deshacer."
  onConfirm={doDelete}
  onCancel={() => (showConfirm = false)}
  loading={deleting}
/>
