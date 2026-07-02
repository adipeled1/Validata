import { test, expect } from '@playwright/test';

// This app runs in Demo Mode whenever Supabase isn't configured (the current
// working copy has no real Supabase project yet - see SUPABASE_CONNECTION_PLAN.md),
// so these run entirely against in-memory demo data, no backend required.

test.describe('Golden paths (demo mode)', () => {
  test('login -> add participant -> log measurement -> view in results', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('you@company.com').fill('mentor@demo.com');
    await page.getByPlaceholder('••••••••').fill('demo123');
    // Two "Sign In" buttons exist (the tab toggle and the form submit) - scope to the submit one.
    await page.locator('button[type="submit"]', { hasText: 'Sign In' }).click();

    // Login redirects with a short delay; land on the Participant Management view.
    await expect(page.getByRole('heading', { name: 'Participant Management' })).toBeVisible({ timeout: 10_000 });

    // Add a participant. The gender/health-status <select> elements aren't
    // associated with their <label> (no htmlFor/id - a pre-existing gap), so
    // select by position within the registration form rather than by name -
    // the sidebar's study switcher is also a <select> on this same page.
    const addParticipantButton = page.getByRole('button', { name: /add participant/i });
    const registerForm = page.locator('form', { has: addParticipantButton });
    await page.getByPlaceholder('e.g. 35').fill('29');
    const registerCombos = registerForm.getByRole('combobox');
    await registerCombos.nth(0).selectOption('Female');
    await registerCombos.nth(1).selectOption('Healthy');
    await page.getByRole('checkbox').check();
    await addParticipantButton.click();

    // Read the ID out of the success toast rather than the tracking table -
    // extract it precisely, since the toast's full sentence also matches "P-\d+".
    const toast = page.getByText(/registered successfully/i);
    await expect(toast).toBeVisible();
    const participantId = (await toast.textContent()).match(/P-\d+/)[0];

    // Log a measurement for that participant
    await page.getByRole('button', { name: 'Data Collection' }).click();
    await expect(page.getByRole('heading', { name: 'Data Collection & Management' })).toBeVisible();

    const logMeasurementButton = page.getByRole('button', { name: /log measurement/i });
    const logForm = page.locator('form', { has: logMeasurementButton });
    await logForm.getByRole('combobox').selectOption(participantId);
    await page.getByPlaceholder('e.g. 45°').fill('45');
    await page.getByPlaceholder('e.g. 44.8°').fill('44.9');
    await logMeasurementButton.click();

    // View it in Results. Scope to a table cell specifically - the same ID
    // also appears as a (hidden, closed) <option> in the participant filter
    // dropdown on this same view, which would otherwise match first.
    await page.getByRole('button', { name: 'Results' }).click();
    await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
    await expect(page.locator('td', { hasText: participantId }).first()).toBeVisible();
  });
});
