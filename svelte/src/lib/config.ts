function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (value === undefined) throw new Error(`${key} no configurado. Define la variable de entorno antes de compilar.`);
  return value;
}

export const config = {
  apiUrl:    requireEnv('VITE_API_URL'),
  apiPrefix: requireEnv('VITE_API_PREFIX'),
  appName:   requireEnv('VITE_APP_NAME'),
} as const;
