<script lang="ts">
  export let overlay = false;
</script>

{#if overlay}
  <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75" style="z-index:100">
    <div class="spinner-border text-primary"></div>
  </div>
{:else}
  <div class="d-flex justify-content-center py-4">
    <div class="spinner-border text-primary"></div>
  </div>
{/if}
