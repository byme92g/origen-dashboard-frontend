function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) throw new Error(`${key} no configurado. Define la variable de entorno antes de compilar.`);
  return value;
}

export const config = {
  apiUrl:  requireEnv('VITE_API_URL'),
  appName: requireEnv('VITE_APP_NAME'),
} as const;
