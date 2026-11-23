const { test, expect } = require('@playwright/test');
const { ACCOUNTS, resetData, loginAs } = require('./helpers');

test.describe('Authentication', () => {
  test.beforeEach(async ({ request }) => {
    await resetData(request);
  });

  test('rejects a request without a token', async ({ request }) => {
    const response = await request.get('/me');

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: 'unauthorized' });
  });

  test('rejects an unknown token', async ({ request }) => {
    const response = await request.get('/me', {
      headers: { Authorization: 'Bearer 00000000000000000000000000000000' },
    });

    expect(response.status()).toBe(401);
  });

  test('rejects a token sent without the Bearer scheme', async ({ request }) => {
    const headers = await loginAs(request, ACCOUNTS.acmeMember);
    const rawToken = headers.Authorization.replace('Bearer ', '');

    const response = await request.get('/me', { headers: { Authorization: rawToken } });

    expect(response.status()).toBe(401);
  });

  test('rejects a wrong password', async ({ request }) => {
    const response = await request.post('/login', {
      data: { username: ACCOUNTS.acmeMember.username, password: 'wrong-password' },
    });

    expect(response.status()).toBe(401);
    expect(await response.json()).not.toHaveProperty('token');
  });

  test('returns the caller profile without the password', async ({ request }) => {
    const headers = await loginAs(request, ACCOUNTS.acmeMember);

    const response = await request.get('/me', { headers });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    const body = await response.json();
    expect(body).toMatchObject({ username: 'bob', tenant: 'acme', role: 'member' });
    expect(body).not.toHaveProperty('password');
  });
});
