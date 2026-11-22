/**
 * Shared helpers for the E2E suite (docs/slices/20-e2e-tests.md).
 *
 * Every spec signs in as the same pre-existing Firebase test account
 * (TEST_USER_EMAIL / TEST_USER_PASSWORD — see README "E2E tests"). That
 * account always has at least one profile (ProfileProvider creates one on
 * first load), so signing in lands either straight on the home page or on
 * "Who's watching?", never on an empty profile picker.
 */
import { expect, type Page } from '@playwright/test';

export const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? '';
export const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? '';

export function requireTestCredentials() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error(
      'TEST_USER_EMAIL / TEST_USER_PASSWORD are not set. See README "E2E tests" for how to ' +
        'create the test account and set these for local runs / CI secrets.',
    );
  }
}

/** Fills and submits the sign-in form (the login page always starts in sign-in mode). */
export async function fillSignInForm(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
}

/** After a successful sign-in, picks a profile if "Who's watching?" is shown. */
async function resolveProfilePicker(page: Page) {
  await page.waitForURL((url) => url.pathname === '/' || url.pathname === '/profiles', {
    timeout: 15_000,
  });
  if (new URL(page.url()).pathname === '/profiles') {
    await page.locator('.profiles__tile').first().click();
    await page.waitForURL('/');
  }
}

/** Signs in with the shared test account and lands on the home page. */
export async function signIn(page: Page) {
  requireTestCredentials();
  await fillSignInForm(page, TEST_EMAIL, TEST_PASSWORD);
  await resolveProfilePicker(page);
  await expect(page.locator('.navbar')).toBeVisible();
}

/** Signs out via the account menu in the navbar and waits for the login page. */
export async function signOut(page: Page) {
  await page.locator('.navbar__profile-button').click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL('/login');
}
