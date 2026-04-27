<script lang="ts">
  export let show = false;
  export let message = '¿Estás seguro de esta acción?';
  export let onConfirm: () => void;
  export let onCancel: () => void = () => { show = false; };
</script>

{#if show}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="modal d-block" tabindex="-1" style="background:rgba(0,0,0,.5)" on:click|self={onCancel}>
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content modal-origen">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title text-danger">Confirmar acción</h6>
        </div>
        <div class="modal-body pt-2">{message}</div>
        <div class="modal-footer border-0">
          <button class="btn btn-outline-secondary btn-sm" on:click={onCancel}>Cancelar</button>
          <button class="btn btn-danger btn-sm" on:click={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  </div>
{/if}
