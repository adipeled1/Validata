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
    await expect(page.getByRole('heading', { name: 'Participant Management' })).toBeVisible({ timeout: 10_000 });

    // Add a participant
    const addParticipantButton = page.getByRole('button', { name: /add participant/i });
    const registerForm = page.locator('form', { has: addParticipantButton });
    await registerForm.getByLabel('Age').fill('40');
    await registerForm.getByLabel('Gender').selectOption('Male');
    await registerForm.getByLabel('Health Status').selectOption('Healthy');
    await page.getByRole('checkbox').check();
    await addParticipantButton.click();

    const toast = page.getByText(/registered successfully/i);
    await expect(toast).toBeVisible();
    const participantId = (await toast.textContent()).match(/P-\d+/)[0];

    // Log a measurement for it
    await page.getByRole('button', { name: 'Data Collection' }).click();
    const logMeasurementButton = page.getByRole('button', { name: /log measurement/i });
    const logForm = page.locator('form', { has: logMeasurementButton });
    await logForm.getByLabel(/participant/i).selectOption(participantId);
    await logForm.getByLabel('Goniometer').fill('30');
    await logForm.getByLabel('AI/ML Model').fill('29.5');
    await logMeasurementButton.click();
    await expect(page.getByText(/measurement logged/i)).toBeVisible();

    // Mark that measurement invalid in Results
    await page.getByRole('button', { name: 'Results' }).click();
    await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
    const row = page.locator('tr', { has: page.locator('td', { hasText: participantId }) }).first();
    page.on('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: /valid/i }).click();
    await expect(page.getByText(/measurement marked invalid/i)).toBeVisible();
    await expect(row.getByText(/invalid/i)).toBeVisible();

    // Drop the participant
    await page.getByRole('button', { name: 'Participant Management' }).click();
    const participantRow = page.locator('tr', { has: page.locator('td', { hasText: participantId }) }).first();
    await participantRow.getByRole('button', { name: 'Drop' }).click();
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
    await expect(page.getByRole('heading', { name: 'Participant Management' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Studies Management' }).click();
    await expect(page.getByRole('heading', { name: 'Studies Management' })).toBeVisible();

    const studyName = `E2E Study ${Date.now()}`;
    const createButton = page.getByRole('button', { name: /create study/i });
    const createForm = page.locator('form', { has: createButton });
    await createForm.getByLabel('Study Name').fill(studyName);
    await createButton.click();

    // The new study's name also appears in the sidebar's study-switcher
    // <option> and the success toast, so scope to its list-item row
    // specifically (identified by its "justify-between" row container class,
    // which the other ancestor wrapper divs don't share).
    const studyNameInList = page.getByRole('paragraph').filter({ hasText: studyName });
    await expect(studyNameInList).toBeVisible();
    const studyRow = page.locator('div.justify-between', { hasText: studyName });

    page.on('dialog', (dialog) => dialog.accept());
    await studyRow.getByRole('button').click();
    await expect(studyNameInList).toHaveCount(0);
  });
});
