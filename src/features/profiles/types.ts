/**
 * Types shared inside the profiles feature.
 */

/** Router location state carried between the profile screens. */
export interface ProfileNavState {
  /** The protected page the user asked for before being sent to the picker. */
  from?: string;
  /** Where the editor goes on Save / Cancel / Delete. */
  returnTo?: string;
}
