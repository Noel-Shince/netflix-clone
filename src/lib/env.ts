/**
 * Central access point for environment variables.
 *
 * Vite only exposes variables prefixed with VITE_ to client code, via
 * import.meta.env. Reading them here (instead of across components) means
 * a missing key fails loudly in one place, and the rest of the app never
 * touches import.meta.env directly.
 *
 * NOTE: everything here ends up in the browser bundle. These are not
 * secrets — see docs/01-ARCHITECTURE.md ("Secrets and API keys").
 */

/** Names of the VITE_ variables this app reads, kept in one place so a typo fails to compile. */
export type EnvVarName = keyof ImportMetaEnv;

/**
 * Returns the value of a required env variable, or throws a clear error.
 */
export function requireEnv(name: EnvVarName): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/** True when an optional flag variable is set to exactly "true". */
export function envFlag(name: EnvVarName): boolean {
  return import.meta.env[name] === 'true';
}
