import { test, expect } from '@playwright/test';

// This app runs in Demo Mode whenever Supabase isn't configured (the current
// working copy has no real Supabase project yet - see SUPABASE_CONNECTION_PLAN.md),
// so these run entirely against in-memory demo data, no backend required.

test.describe('Golden paths (demo mode)', () => {
  test('login -> add participant -> log measurement -> view in results', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email Address').fill('mentor@demo.com');
    await page.getByLabel('Password').fill('demo123');
    // Two "Sign In" buttons exist (the tab toggle and the form submit) - scope to the submit one.
    await page.locator('button[type="submit"]', { hasText: 'Sign In' }).click();

    // VS2026 shell: landing page is Participant Registry (renamed from Participant Management).
    await expect(page.getByRole('heading', { name: 'Participant Registry' })).toBeVisible({ timeout: 10_000 });

    // Add a participant via the inline panel (the form is no longer inline in the page).
    await page.getByRole('button', { name: /\+ add participant/i }).click();
    await page.getByLabel('Age').fill('29');
    await page.getByLabel('Gender').selectOption('Female');
    await page.getByLabel('Health Status').selectOption('Healthy');
    // Submit the panel form using the "Add Participant" submit button inside the panel.
    await page.getByRole('button', { name: 'Add Participant' }).click();

    // Read the ID out of the success toast.
    const toast = page.getByText(/registered successfully/i);
    await expect(toast).toBeVisible();
    const participantId = (await toast.textContent()).match(/P-\d+/)[0];

    // Log a measurement for that participant. Sidebar button label is "Data Collection".
    await page.getByRole('button', { name: 'Data Collection' }).click();
    await expect(page.getByRole('heading', { name: 'Data Collection & Management' })).toBeVisible();

    const logMeasurementButton = page.getByRole('button', { name: /log measurement/i });
    const logForm = page.locator('form', { has: logMeasurementButton });
    await logForm.getByLabel(/participant/i).selectOption(participantId);
    await logForm.getByLabel('Goniometer').fill('45');
    await logForm.getByLabel('AI/ML Model').fill('44.9');
    await logMeasurementButton.click();

    // View it in Results. Sidebar button is now "Results Table".
    await page.getByRole('button', { name: 'Results Table' }).click();
    await expect(page.getByRole('heading', { name: 'Results Table' })).toBeVisible();
    await expect(page.locator('td', { hasText: participantId }).first()).toBeVisible();
  });
});
