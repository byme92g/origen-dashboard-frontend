<script lang="ts">
  import { toasts } from '../stores/toast';

  function remove(id: number) {
    toasts.update((t) => t.filter((x) => x.id !== id));
  }
</script>

<div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index:9999">
  {#each $toasts as t (t.id)}
    <div
      class="toast show align-items-center border-0 mb-2 text-bg-{t.type === 'error' ? 'danger' : t.type === 'success' ? 'success' : 'secondary'}"
      role="alert"
    >
      <div class="d-flex">
        <div class="toast-body">{t.message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Cerrar" on:click={() => remove(t.id)}></button>
      </div>
    </div>
  {/each}
</div>
