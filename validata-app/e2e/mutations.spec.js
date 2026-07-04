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
    await page.getByRole('button', { name: 'Add Participant', exact: true }).click();

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
    // DataGrid renders "Dropped" in both the status and actions cells; .first() picks either.
    await expect(participantRow.getByText('Dropped').first()).toBeVisible();
  });

  test('create and delete a study', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('mentor@demo.com');
    await page.getByLabel('Password').fill('demo123');
    await page.locator('button[type="submit"]', { hasText: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: 'Participant Registry' })).toBeVisible({ timeout: 10_000 });

    // Study Management is in the Administration ActivityBar section.
    // Click the Administration icon (title="Administration") to open that section,
    // then click the nav item.
    await page.getByTitle('Administration').click();
    await page.getByRole('button', { name: 'Study Management' }).click();
    await expect(page.getByRole('heading', { name: 'Studies Management' })).toBeVisible();

    const studyName = `E2E Study ${Date.now()}`;
    const createButton = page.getByRole('button', { name: /create study/i });
    const createForm = page.locator('form', { has: createButton });
    await createForm.getByLabel('Study Name').fill(studyName);
    await createButton.click();

    // The study list renders each name as <span title="...">. Use the title
    // attribute to scope precisely to the list item (name also appears in the
    // sidebar switcher and status bar, so generic text selectors are ambiguous).
    await expect(page.locator(`span[title="${studyName}"]`)).toBeVisible();

    // The new study is the last item in the list. Its trash button (data-testid="delete-study-*")
    // is the last enabled delete button in the studies section.
    // Scope to the "All Studies" container to avoid matching other parts of the shell.
    const studiesList = page.getByText('All Studies', { exact: true }).locator('xpath=ancestor::div[2]');
    page.on('dialog', (dialog) => dialog.accept());
    await studiesList.locator('[data-testid^="delete-study"]:not([disabled])').last().click();

    // After deletion, the named span should no longer be in the list.
    await expect(page.locator(`span[title="${studyName}"]`)).toHaveCount(0);
  });
});
