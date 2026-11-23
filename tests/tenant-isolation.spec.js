const { test, expect } = require('@playwright/test');
const { ACCOUNTS, PROJECTS, resetData, loginAs, finding } = require('./helpers');

test.describe('Tenant isolation', () => {
  test.beforeEach(async ({ request }) => {
    await resetData(request);
  });

  test('a member lists only the projects of their own tenant', async ({ request }) => {
    const headers = await loginAs(request, ACCOUNTS.acmeMember);

    const response = await request.get('/tenants/acme/projects', { headers });

    expect(response.status()).toBe(200);
    const projects = await response.json();
    expect(projects.length).toBeGreaterThan(0);
    for (const project of projects) expect(project.tenant).toBe('acme');
  });

  test('a user cannot list the projects of another tenant', async ({ request }) => {
    const headers = await loginAs(request, ACCOUNTS.acmeAdmin);

    const response = await request.get('/tenants/globex/projects', { headers });

    expect(response.status()).toBe(403);
  });

  test('a user cannot create a project in another tenant', async ({ request }) => {
    const headers = await loginAs(request, ACCOUNTS.acmeAdmin);

    const response = await request.post('/tenants/globex/projects', {
      headers,
      data: { name: 'Planted by Acme' },
    });
    expect(response.status()).toBe(403);

    // Confirm with the other tenant's own account that nothing was created.
    const globexHeaders = await loginAs(request, ACCOUNTS.globexAdmin);
    const list = await (await request.get('/tenants/globex/projects', { headers: globexHeaders })).json();
    expect(list.map((p) => p.name)).not.toContain('Planted by Acme');
  });

  test('a user can read a project of their own tenant by ID', async ({ request }) => {
    const headers = await loginAs(request, ACCOUNTS.acmeMember);

    const response = await request.get(`/projects/${PROJECTS.acmePayroll.id}`, { headers });

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ id: 'p1', tenant: 'acme' });
  });

  test('FINDING-001: a user cannot read another tenant\'s project by ID', async ({ request }) => {
    finding('FINDING-001');
    const headers = await loginAs(request, ACCOUNTS.acmeMember);

    const response = await request.get(`/projects/${PROJECTS.globexRoadmap.id}`, { headers });

    // 404 rather than 403, so the API does not confirm that the ID exists.
    expect(response.status()).toBe(404);
  });

  test('a user cannot delete another tenant\'s project', async ({ request }) => {
    const headers = await loginAs(request, ACCOUNTS.acmeAdmin);

    const response = await request.delete(`/projects/${PROJECTS.globexRoadmap.id}`, { headers });
    expect(response.status()).toBe(404);

    const globexHeaders = await loginAs(request, ACCOUNTS.globexAdmin);
    const check = await request.get(`/projects/${PROJECTS.globexRoadmap.id}`, { headers: globexHeaders });
    expect(check.status()).toBe(200);
  });
});
