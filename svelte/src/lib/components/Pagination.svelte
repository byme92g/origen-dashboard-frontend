<script lang="ts">
  export let page: number;
  export let total: number;
  export let pageSize: number;
  export let onChange: (p: number) => void;

  $: totalPages = Math.ceil(total / pageSize);
</script>

{#if totalPages > 1}
  <nav class="d-flex align-items-center gap-2 justify-content-between flex-wrap">
    <small class="text-muted">
      {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
    </small>
    <ul class="pagination pagination-sm mb-0">
      <li class="page-item" class:disabled={page === 1}>
        <button class="page-link" on:click={() => onChange(page - 1)} disabled={page === 1}>‹</button>
      </li>
      {#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
        {#if Math.abs(p - page) <= 2 || p === 1 || p === totalPages}
          <li class="page-item" class:active={p === page}>
            <button class="page-link" on:click={() => onChange(p)}>{p}</button>
          </li>
        {:else if Math.abs(p - page) === 3}
          <li class="page-item disabled"><span class="page-link">…</span></li>
        {/if}
      {/each}
      <li class="page-item" class:disabled={page === totalPages}>
        <button class="page-link" on:click={() => onChange(page + 1)} disabled={page === totalPages}>›</button>
      </li>
    </ul>
  </nav>
{/if}
