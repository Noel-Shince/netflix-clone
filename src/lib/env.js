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

/**
 * Returns the value of a required env variable, or throws a clear error.
 * @param {string} name - Variable name, e.g. "VITE_TMDB_READ_TOKEN".
 * @returns {string}
 */
export function requireEnv(name) {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}
