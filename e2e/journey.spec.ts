import { expect, test } from '@playwright/test';
import { signIn } from './helpers.ts';

test('browse the home page and open a title in the player', async ({ page }) => {
  await signIn(page);

  // At least one row of titles loads (TMDB data), not just skeletons/errors.
  const firstRow = page.locator('.title-row').first();
  await expect(firstRow).toBeVisible();
  await expect(firstRow.locator('.title-row__card').first()).toBeVisible({ timeout: 15_000 });

  const firstTitle = page.locator('.title-card').first();
  const titleName = await firstTitle.locator('.title-card__name').innerText();
  await firstTitle.click();

  await expect(page).toHaveURL(/\/player\//);

  // The player either embeds the title via vidsrc.sh, or (TMDB lookup
  // failure) shows the player's own error notice with a way back home —
  // either is a legitimate outcome of "open a title", unlike a crash.
  const stage = page.locator('.player__frame');
  const notice = page.locator('.player__notice');
  await expect(stage.or(notice)).toBeVisible({ timeout: 15_000 });
  if (await stage.isVisible()) {
    await expect(stage).toHaveAttribute('src', /vidsrc\.sh/);
    await expect(page.getByRole('heading', { name: titleName })).toBeVisible();
  }
});
