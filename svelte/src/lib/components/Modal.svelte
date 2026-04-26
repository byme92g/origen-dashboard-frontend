<script lang="ts">
  export let show = false;
  export let title = '';
  export let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  export let onClose: () => void = () => { show = false; };
</script>

{#if show}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="modal d-block" tabindex="-1" style="background:rgba(0,0,0,.5)" on:click|self={onClose}>
    <div class="modal-dialog modal-dialog-scrollable modal-fullscreen-sm-down modal-{size}">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{title}</h5>
          <button type="button" class="btn-close" on:click={onClose}></button>
        </div>
        <div class="modal-body">
          <slot name="body" />
        </div>
        <div class="modal-footer">
          <slot name="footer">
            <button class="btn btn-secondary" on:click={onClose}>Cerrar</button>
          </slot>
        </div>
      </div>
    </div>
  </div>
{/if}
