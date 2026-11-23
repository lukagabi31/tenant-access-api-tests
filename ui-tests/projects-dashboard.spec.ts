import { test, expect, ACCOUNTS } from './fixtures';

// End-to-end: the real UI against the real (fixed) API.
test.describe('Projects dashboard: end to end', () => {
  test('a member signs in and sees only their own tenant\'s projects', async ({ projectsPage, page }) => {
    await projectsPage.signIn(ACCOUNTS.acmeMember);

    await expect(page.getByText('Signed in as bob (member, acme)')).toBeVisible();
    await expect(projectsPage.names()).toHaveText(['Acme Payroll', 'Acme Website']);
    await expect(page.getByText('Globex Product Roadmap')).toHaveCount(0);
  });

  test('a wrong password shows an error and no projects', async ({ projectsPage }) => {
    await projectsPage.signIn({ ...ACCOUNTS.acmeMember, password: 'wrong-password' });

    await expect(projectsPage.alert()).toHaveText('Wrong username or password.');
    await expect(projectsPage.list()).toBeHidden();
  });

  test('a member does not see delete buttons', async ({ projectsPage, page }) => {
    await projectsPage.signIn(ACCOUNTS.acmeMember);

    await expect(projectsPage.items()).toHaveCount(2);
    await expect(page.getByRole('button', { name: /^Delete/ })).toHaveCount(0);
  });

  test('an admin deletes a project and it disappears from the list', async ({ projectsPage }) => {
    await projectsPage.signIn(ACCOUNTS.acmeAdmin);
    await expect(projectsPage.items()).toHaveCount(2);

    await projectsPage.deleteButton('Acme Website').click();

    await expect(projectsPage.names()).toHaveText(['Acme Payroll']);
  });
});

// Network mocking: the UI with the projects API replaced by page.route(),
// to test states that are hard to produce with real data.
test.describe('Projects dashboard: mocked API states', () => {
  const PROJECTS_API = '**/tenants/*/projects';

  test('shows an error message when the projects API fails', async ({ projectsPage, page }) => {
    await page.route(PROJECTS_API, (route) => route.fulfill({ status: 500, json: { error: 'internal' } }));

    await projectsPage.signIn(ACCOUNTS.acmeMember);

    await expect(projectsPage.alert()).toHaveText('Could not load projects. Please try again.');
    await expect(projectsPage.items()).toHaveCount(0);
  });

  test('shows an empty state when the tenant has no projects', async ({ projectsPage, page }) => {
    await page.route(PROJECTS_API, (route) => route.fulfill({ status: 200, json: [] }));

    await projectsPage.signIn(ACCOUNTS.acmeMember);

    await expect(projectsPage.empty()).toBeVisible();
    await expect(projectsPage.alert()).toBeHidden();
  });

  test('shows a loading state until a slow response arrives', async ({ projectsPage, page }) => {
    let release!: () => void;
    const responseHeld = new Promise<void>((resolve) => (release = resolve));
    await page.route(PROJECTS_API, async (route) => {
      await responseHeld;
      await route.continue();
    });

    await projectsPage.signIn(ACCOUNTS.acmeMember);
    await expect(projectsPage.loading()).toBeVisible();

    release();

    await expect(projectsPage.loading()).toBeHidden();
    await expect(projectsPage.items()).toHaveCount(2);
  });

  test('shows a project name as text, not as HTML', async ({ projectsPage, page }) => {
    const payload = '<img src=x onerror="window.__injected = true">';
    await page.route(PROJECTS_API, (route) =>
      route.fulfill({ status: 200, json: [{ id: 'p9', tenant: 'acme', name: payload }] })
    );

    await projectsPage.signIn(ACCOUNTS.acmeMember);

    await expect(projectsPage.names()).toHaveText([payload]);
    await expect(projectsPage.list().locator('img')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__injected)).toBeUndefined();
  });

  test('sends the bearer token with the projects request', async ({ projectsPage, page }) => {
    const request = page.waitForRequest(PROJECTS_API);

    await projectsPage.signIn(ACCOUNTS.acmeMember);

    const sent = await request;
    expect(sent.method()).toBe('GET');
    expect(sent.headers()['authorization']).toMatch(/^Bearer [0-9a-f]{32}$/);
  });
});
