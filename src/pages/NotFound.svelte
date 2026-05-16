<script lang="ts">
  import '../styles/pages/_notfound.css';
  import { push } from 'svelte-spa-router';
</script>

<div class="notfound-wrap">
  <div class="notfound-card">
    <div class="notfound-icon">
      <i class="bi bi-compass"></i>
    </div>
    <span class="notfound-code">404</span>
    <h5 class="notfound-title">Página no encontrada</h5>
    <p class="notfound-desc">
      La dirección que ingresaste no existe en el sistema.
    </p>
    <button class="btn btn-primary btn-sm mt-1" on:click={() => push('/')}>
      <i class="bi bi-house me-1"></i>Volver al inicio
    </button>
  </div>
</div>
