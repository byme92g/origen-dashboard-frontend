<script lang="ts">
  import { login } from '../lib/api/auth';
  import { authStore } from '../lib/stores/auth';
  import { push } from 'svelte-spa-router';
  import { onMount } from 'svelte';

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

<div class="login-page">
  <div class="login-card">
    <div class="login-logo">
      <div class="login-logo-text">Origen</div>
      <div class="login-logo-sub">Capilares Estética</div>
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

      <button type="submit" class="btn-submit" disabled={loading}>
        {#if loading}
          <span class="spinner-border spinner-border-sm me-2"></span>
        {/if}
        Ingresar
      </button>
    </form>
  </div>
</div>

<style>
  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 60%, var(--navy-light) 100%);
  }
  .login-card {
    background: white;
    border-radius: 12px;
    padding: 40px;
    width: 100%;
    max-width: 380px;
    box-shadow: 0 16px 48px rgba(0,0,0,.22);
  }
  .login-logo {
    text-align: center;
    margin-bottom: 32px;
  }
  .login-logo-text {
    font-family: var(--font-heading);
    font-size: 2.4rem;
    font-weight: 700;
    color: var(--navy);
    line-height: 1;
  }
  .login-logo-sub {
    font-size: 11px;
    color: #8a97b0;
    text-transform: uppercase;
    letter-spacing: .1em;
    margin-top: 4px;
  }
  .btn-submit {
    width: 100%;
    padding: 10px;
    background: var(--navy);
    color: white;
    border: none;
    border-radius: 6px;
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .btn-submit:hover { background: var(--navy-light); }
  .btn-submit:disabled { opacity: .55; cursor: not-allowed; }
</style>
