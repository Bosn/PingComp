import { test, expect } from '@playwright/test';

test('Add Lead modal defaults Creator to current user email', async ({ page, request }) => {
  const meResp = await request.get('/api/auth/me');
  const meJson = meResp.ok() ? await meResp.json() : null;
  const expectedEmail = String(meJson?.user?.email || '').trim();

  await page.goto('/app/');

  const addLeadButton = page.getByRole('button', { name: /Add Lead|添加线索/i });
  await expect(addLeadButton).toBeVisible();
  await addLeadButton.click();

  const creatorInput = page.getByLabel(/Creator/i).first();
  await expect(creatorInput).toBeVisible();

  if (expectedEmail) {
    await expect(creatorInput).toHaveValue(expectedEmail);
  } else {
    // Unauthenticated or no profile email case.
    await expect(creatorInput).toHaveValue('');
  }
});
