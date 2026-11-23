# Tenant Access API Tests

![API tests](https://github.com/lukagabi31/tenant-access-api-tests/actions/workflows/api-tests.yml/badge.svg)

Automated API tests, written with **Playwright**, that check **role and tenant boundaries** in a multi-tenant REST API, one request at a time.

The project follows the life of an access-control finding:

1. **Find it**: test each endpoint as every type of caller (no token, member, admin, another tenant).
2. **Reproduce it**: write clear reproduction steps an engineer can follow with `curl`.
3. **Automate it**: turn each finding into a test the client can run.
4. **Retest it**: run the same test against the fixed build and record what changed.

## Results

The same 17 tests run against two builds of the API: as first reviewed (`vulnerable-build`) and after the fixes (`fixed-build`).

| Finding | Severity | Vulnerable build | Fixed build |
| --- | --- | --- | --- |
| [FINDING-001](findings/FINDING-001-cross-tenant-project-read.md): any user can read another tenant's project by ID | High | Reproduced (`200`) | Fixed (`404`) |
| [FINDING-002](findings/FINDING-002-member-can-delete-project.md): a member can delete projects | High | Reproduced (`204`) | Fixed (`403`) |
| [FINDING-003](findings/FINDING-003-member-self-promotion.md): a member can promote themselves to admin | Critical | Reproduced (`200`) | Fixed (`403`) |

```
34 passed (3.2s)
```

On the vulnerable build, the three finding tests are marked as **expected failures** with Playwright's `test.fail()`: the failure is the finding, reproduced. On the fixed build, every test must pass. So the suite stays green, and if a fix is ever reverted, the build turns red.

## What is tested

| Area | Tests | Examples |
| --- | --- | --- |
| Authentication | 5 | No token, unknown token, token without `Bearer`, wrong password, no password in the profile response |
| Tenant isolation | 6 | Listing, creating, reading and deleting across tenants |
| Role boundaries | 6 | Who can delete projects and change roles, self-promotion, invalid role values |

The full expected behaviour, endpoint by endpoint, is in the [access matrix](docs/access-matrix.md).

Principles the tests follow:

- **Each finding has a positive test next to it.** A "fix" that simply blocks everyone would fail.
- **A denied write is checked by reading the data back.** A `403` alone does not prove nothing changed.
- **Status codes, headers and bodies are asserted**, not just "the request worked".
- **Every test starts from the same data.** The test accounts and seed data live in one file ([`tests/helpers.js`](tests/helpers.js)) and are reset before each test.

## Project structure

```
app/
  server.js        Multi-tenant project API (the system under test), vulnerable and fixed modes
  start.js         Starts the API on a port, in the mode set by APP_MODE
tests/
  helpers.js       Test accounts, seed data, login and reset helpers, finding marker
  authentication.spec.js
  tenant-isolation.spec.js
  role-boundaries.spec.js
findings/          One report per finding: steps to reproduce, expected and actual result, retest
docs/
  access-matrix.md Expected response for every endpoint and caller
.github/workflows/
  api-tests.yml    Runs the suite on every push and keeps the HTML report
```

## Run it

Requires Node.js 18 or later. API tests do not need a browser.

```bash
npm install
npm test                  # both builds
npm run test:vulnerable   # reproduce the findings
npm run test:fixed        # retest
npm run report            # open the HTML report
```

Playwright starts both builds of the API by itself (ports 3101 and 3102). To explore the API by hand, run `npm start` and use the `curl` commands in the finding reports.

## Tech

Playwright Test (`APIRequestContext`), JavaScript, Node.js, Express, GitHub Actions.

## Author

**Luka Gabidzashvili**, QA Test Engineer · [LinkedIn](https://linkedin.com/in/luka-gabidzashvili)
