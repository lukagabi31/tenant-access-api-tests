const { test, expect } = require('@playwright/test');
const { ACCOUNTS, PROJECTS, resetData, loginAs, finding } = require('./helpers');

test.describe('Role boundaries inside a tenant', () => {
  test.beforeEach(async ({ request }) => {
    await resetData(request);
  });

  test('an admin can delete a project of their tenant', async ({ request }) => {
    const headers = await loginAs(request, ACCOUNTS.acmeAdmin);

    const response = await request.delete(`/projects/${PROJECTS.acmeWebsite.id}`, { headers });
    expect(response.status()).toBe(204);

    const check = await request.get(`/projects/${PROJECTS.acmeWebsite.id}`, { headers });
    expect(check.status()).toBe(404);
  });

  test('FINDING-002: a member cannot delete a project', async ({ request }) => {
    finding('FINDING-002');
    const memberHeaders = await loginAs(request, ACCOUNTS.acmeMember);

    const response = await request.delete(`/projects/${PROJECTS.acmeWebsite.id}`, { headers: memberHeaders });
    expect(response.status()).toBe(403);

    // The project must still exist.
    const adminHeaders = await loginAs(request, ACCOUNTS.acmeAdmin);
    const check = await request.get(`/projects/${PROJECTS.acmeWebsite.id}`, { headers: adminHeaders });
    expect(check.status()).toBe(200);
  });

  test('FINDING-003: a member cannot promote themselves to admin', async ({ request }) => {
    finding('FINDING-003');
    const headers = await loginAs(request, ACCOUNTS.acmeMember);

    const response = await request.patch(`/users/${ACCOUNTS.acmeMember.id}/role`, {
      headers,
      data: { role: 'admin' },
    });
    expect(response.status()).toBe(403);

    const me = await (await request.get('/me', { headers })).json();
    expect(me.role).toBe('member');
  });

  test('an admin can change the role of a member in their tenant', async ({ request }) => {
    const headers = await loginAs(request, ACCOUNTS.acmeAdmin);

    const response = await request.patch(`/users/${ACCOUNTS.acmeMember.id}/role`, {
      headers,
      data: { role: 'admin' },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ id: 'u2', role: 'admin' });
  });

  test('an admin cannot change the role of a user in another tenant', async ({ request }) => {
    const headers = await loginAs(request, ACCOUNTS.acmeAdmin);

    const response = await request.patch(`/users/${ACCOUNTS.globexAdmin.id}/role`, {
      headers,
      data: { role: 'member' },
    });

    expect(response.status()).toBe(404);
  });

  test('an unknown role value is rejected', async ({ request }) => {
    const headers = await loginAs(request, ACCOUNTS.acmeAdmin);

    const response = await request.patch(`/users/${ACCOUNTS.acmeMember.id}/role`, {
      headers,
      data: { role: 'superuser' },
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_role' });
  });
});
