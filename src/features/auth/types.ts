/**
 * Types shared across the auth feature.
 *
 * `LoginFormValues` is the contract slice 05 passes to Firebase: the form
 * produces exactly this shape, so wiring auth never touches the UI.
 */
export type AuthMode = 'signIn' | 'signUp';

export interface LoginFormValues {
  mode: AuthMode;
  /** Only collected (and only meaningful) in sign-up mode. */
  name: string;
  email: string;
  password: string;
  rememberMe: boolean;
}
