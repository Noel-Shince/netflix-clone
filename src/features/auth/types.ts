/**
 * Types shared across the auth feature.
 *
 * `LoginFormValues` is the contract between the form and LoginPage's Firebase
 * calls: the form produces exactly this shape and knows nothing about auth.
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
