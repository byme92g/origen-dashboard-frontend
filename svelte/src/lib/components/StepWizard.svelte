<script lang="ts">
  export let steps: string[];
  export let current: number = 1;
</script>

<div class="mb-4">
  <div class="d-flex align-items-center gap-0">
    {#each steps as label, i}
      {@const n = i + 1}
      <div class="d-flex align-items-center {i < steps.length - 1 ? 'flex-grow-1' : ''}">
        <div class="d-flex flex-column align-items-center">
          <div
            class="rounded-circle d-flex align-items-center justify-content-center fw-bold"
            style="width:32px;height:32px;font-size:.85rem;
              background:{n < current ? '#198754' : n === current ? '#0d6efd' : '#dee2e6'};
              color:{n <= current ? '#fff' : '#6c757d'}"
          >
            {#if n < current}✓{:else}{n}{/if}
          </div>
          <small class="mt-1 text-center d-none d-md-block" style="font-size:.7rem;color:{n === current ? '#0d6efd' : '#6c757d'};white-space:nowrap">
            {label}
          </small>
        </div>
        {#if i < steps.length - 1}
          <div class="flex-grow-1 mx-1" style="height:2px;background:{n < current ? '#198754' : '#dee2e6'}"></div>
        {/if}
      </div>
    {/each}
  </div>
</div>
