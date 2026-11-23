const { test } = require('@playwright/test');

// Test accounts. Each review keeps its accounts in one place.
const ACCOUNTS = {
  acmeAdmin: { username: 'alice', password: 'alice-pass', id: 'u1', tenant: 'acme' },
  acmeMember: { username: 'bob', password: 'bob-pass', id: 'u2', tenant: 'acme' },
  globexAdmin: { username: 'carol', password: 'carol-pass', id: 'u3', tenant: 'globex' },
};

// Seed data the tests rely on.
const PROJECTS = {
  acmePayroll: { id: 'p1', tenant: 'acme' },
  acmeWebsite: { id: 'p2', tenant: 'acme' },
  globexRoadmap: { id: 'p3', tenant: 'globex' },
};

async function resetData(request) {
  const response = await request.post('/__test/reset');
  if (response.status() !== 204) throw new Error(`Reset failed with status ${response.status()}`);
}

async function loginAs(request, account) {
  const response = await request.post('/login', {
    data: { username: account.username, password: account.password },
  });
  if (!response.ok()) throw new Error(`Login as ${account.username} failed: ${response.status()}`);
  const { token } = await response.json();
  return { Authorization: `Bearer ${token}` };
}

// A finding test checks the SECURE behaviour. On the vulnerable build it is
// expected to fail: that failure is the finding, reproduced. On the fixed build
// it must pass: that is the retest.
function finding(id) {
  test.info().annotations.push({ type: 'finding', description: id });
  test.fail(
    test.info().project.name === 'vulnerable-build',
    `${id} is open on the vulnerable build (expected failure = finding reproduced)`
  );
}

module.exports = { ACCOUNTS, PROJECTS, resetData, loginAs, finding };
