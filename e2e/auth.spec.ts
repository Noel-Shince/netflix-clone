import { expect, test } from '@playwright/test';
import { fillSignInForm, signIn, signOut, TEST_EMAIL, TEST_PASSWORD } from './helpers.ts';

test.describe('sign-in', () => {
  test('wrong password shows an error and stays on the login page', async ({ page }) => {
    await fillSignInForm(page, TEST_EMAIL, `wrong-${TEST_PASSWORD}`);
    await expect(page.getByRole('alert')).toHaveText('Incorrect email or password.');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('correct credentials sign the user in, and sign-out returns to login', async ({ page }) => {
    await signIn(page);
    await expect(page).toHaveURL('/');
    await signOut(page);
  });
});
