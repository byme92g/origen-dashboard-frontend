<script lang="ts">
  import { login } from '../lib/api/auth';
  import { authStore } from '../lib/stores/auth';
  import { push } from 'svelte-spa-router';
  import { onMount } from 'svelte';
  import '../styles/pages/_login.css';

  let usuario = '';
  let password = '';
  let error = '';
  let loading = false;

  onMount(() => {
    if ($authStore.authenticated) push('/');
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;
    const result = await login(usuario, password);
    loading = false;
    if (result.ok) {
      authStore.refresh();
      push('/');
    } else {
      error = result.error ?? 'Credenciales inválidas';
    }
  }
</script>

<div class="login">
  <div class="login__card">
    <div class="login__logo">
      <div class="login__logo-text">Origen</div>
      <div class="login__logo-sub">Capilares Estética</div>
    </div>

    <form on:submit={handleSubmit}>
      <div class="mb-3">
        <label class="form-label" for="usuario">Usuario</label>
        <input
          id="usuario"
          type="text"
          class="form-control"
          bind:value={usuario}
          placeholder="nombre de usuario"
          required
          autocomplete="username"
        />
      </div>
      <div class="mb-4">
        <label class="form-label" for="password">Contraseña</label>
        <input
          id="password"
          type="password"
          class="form-control"
          bind:value={password}
          placeholder="••••••••"
          required
          autocomplete="current-password"
        />
      </div>

      {#if error}
        <div class="alert alert-danger py-2 small mb-3">{error}</div>
      {/if}

      <button type="submit" class="login__submit" disabled={loading}>
        {#if loading}
          <span class="spinner-border spinner-border-sm me-2"></span>
        {/if}
        Ingresar
      </button>
    </form>
  </div>
</div>
