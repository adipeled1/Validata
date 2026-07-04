import { test, expect } from '@playwright/test';

// Covers the Server Action mutations not exercised by golden-paths.spec.js:
// drop participant, mark measurement invalid, and study create/delete.
// Demo mode only - see golden-paths.spec.js for why.

test.describe('Additional mutations (demo mode)', () => {
  test('drop participant and mark a measurement invalid', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('mentor@demo.com');
    await page.getByLabel('Password').fill('demo123');
    await page.locator('button[type="submit"]', { hasText: 'Sign In' }).click();
    // VS2026 shell: heading updated to "Participant Registry".
    await expect(page.getByRole('heading', { name: 'Participant Registry' })).toBeVisible({ timeout: 10_000 });

    // Add a participant via the inline panel.
    await page.getByRole('button', { name: /\+ add participant/i }).click();
    await page.getByLabel('Age').fill('40');
    await page.getByLabel('Gender').selectOption('Male');
    await page.getByLabel('Health Status').selectOption('Healthy');
    await page.getByRole('button', { name: 'Add Participant' }).click();

    const toast = page.getByText(/registered successfully/i);
    await expect(toast).toBeVisible();
    const participantId = (await toast.textContent()).match(/P-\d+/)[0];

    // Log a measurement for it.
    await page.getByRole('button', { name: 'Data Collection' }).click();
    const logMeasurementButton = page.getByRole('button', { name: /log measurement/i });
    const logForm = page.locator('form', { has: logMeasurementButton });
    await logForm.getByLabel(/participant/i).selectOption(participantId);
    await logForm.getByLabel('Goniometer').fill('30');
    await logForm.getByLabel('AI/ML Model').fill('29.5');
    await logMeasurementButton.click();
    await expect(page.getByText(/measurement logged/i)).toBeVisible();

    // Mark that measurement invalid in Results.
    await page.getByRole('button', { name: 'Results Table' }).click();
    await expect(page.getByRole('heading', { name: 'Results Table' })).toBeVisible();
    const row = page.locator('tr', { has: page.locator('td', { hasText: participantId }) }).first();
    await row.getByRole('button', { name: /valid/i }).click();

    // ICH E6(R3) COR-01: ConfirmWithReasonModal replaces window.confirm.
    // Reason is required before the mutation can be confirmed.
    await page.getByPlaceholder('Required').fill('E2E test: marking measurement invalid');
    await page.getByRole('button', { name: 'Mark Invalid' }).click();
    await expect(page.getByText(/measurement marked invalid/i)).toBeVisible();
    await expect(row.getByText(/invalid/i)).toBeVisible();

    // Drop the participant. Sidebar button label is "Participant Registry".
    await page.getByRole('button', { name: 'Participant Registry' }).click();
    const participantRow = page.locator('tr', { has: page.locator('td', { hasText: participantId }) }).first();
    await participantRow.getByRole('button', { name: 'Drop' }).click();

    // ICH E6(R3) COR-01: ConfirmWithReasonModal — fill reason and confirm.
    await page.getByPlaceholder('Required').fill('E2E test: dropping participant');
    await page.getByRole('button', { name: 'Drop Participant' }).click();
    // Demo mode shows a generic status-updated toast (only the real-Supabase
    // path says "dropped successfully" - see StudyContext.js's dropParticipant).
    await expect(page.getByText(/participant status updated/i)).toBeVisible();
    await expect(participantRow.getByText('Dropped')).toBeVisible();
  });

  test('create and delete a study', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('mentor@demo.com');
    await page.getByLabel('Password').fill('demo123');
    await page.locator('button[type="submit"]', { hasText: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: 'Participant Registry' })).toBeVisible({ timeout: 10_000 });

    // Sidebar label is "Study Management"; page heading is "Studies Management".
    await page.getByRole('button', { name: 'Study Management' }).click();
    await expect(page.getByRole('heading', { name: 'Studies Management' })).toBeVisible();

    const studyName = `E2E Study ${Date.now()}`;
    const createButton = page.getByRole('button', { name: /create study/i });
    const createForm = page.locator('form', { has: createButton });
    await createForm.getByLabel('Study Name').fill(studyName);
    await createButton.click();

    // Study name now appears in a <span> inside the studies list.
    const studyNameEl = page.locator('span', { hasText: studyName });
    await expect(studyNameEl).toBeVisible();

    // The study row is a flex div containing the name span and a trash icon button.
    // StudyManagement still uses window.confirm for the delete dialog.
    const studyRow = page.locator('div').filter({
      has: page.locator('span', { hasText: studyName }),
    }).filter({ has: page.getByRole('button') }).last();

    page.on('dialog', (dialog) => dialog.accept());
    await studyRow.getByRole('button').click();

    // After deletion, the study name should no longer be in the list.
    await expect(page.locator('span', { hasText: studyName })).toHaveCount(0);
  });
});
