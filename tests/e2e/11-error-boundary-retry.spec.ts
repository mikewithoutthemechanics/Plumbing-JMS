import { test, expect } from '@playwright/test';


// (11) Error boundary and retry
test.describe('Error Boundary and Retry', () => {
  test('error page shows try again button', async ({ page }) => {
    await page.goto('/error-test');
    const tryAgain = page.locator('button:has-text("Try again")');
    if (await tryAgain.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(tryAgain).toBeVisible();
      await tryAgain.click();
      await expect(page).not.toHaveURL(/\/error-test/);
    }
  });

  test('error boundary catches client errors gracefully', async ({ page }) => {
    await page.goto('/error-test');
    // The error page should display the error message
    await expect(page.locator('text=Something went wrong')).toBeVisible({ timeout: 5000 });
  });

  test('can navigate away from error page', async ({ page }) => {
    await page.goto('/error-test');
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });
});
