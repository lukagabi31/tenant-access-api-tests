# Tenant Access API Tests

![API tests](https://github.com/lukagabi31/tenant-access-api-tests/actions/workflows/api-tests.yml/badge.svg)

Automated tests, written with **Playwright**, for a small multi-tenant web product: **API tests** that check role and tenant boundaries one request at a time, and **UI tests in TypeScript** that cover the user flows end to end and use **network mocking** for states that real data cannot easily produce.

The project follows the life of a defect:

1. **Find it**: test each endpoint as every type of caller (no token, member, admin, another tenant).
2. **Reproduce it**: write clear reproduction steps an engineer can follow with `curl`.
3. **Automate it**: turn each finding into a test the team can run.
4. **Retest it**: run the same test against the fixed build and record what changed.

## Results

```
43 passed (8.3s)
```

| Suite | Language | Runs against | Tests |
| --- | --- | --- | --- |
| API tests | JavaScript | vulnerable build and fixed build | 17 × 2 |
| UI tests | TypeScript | fixed build, in Chrome | 9 |

### Findings

| Finding | Severity | Vulnerable build | Fixed build |
| --- | --- | --- | --- |
| [FINDING-001](findings/FINDING-001-cross-tenant-project-read.md): any user can read another tenant's project by ID | High | Reproduced (`200`) | Fixed (`404`) |
| [FINDING-002](findings/FINDING-002-member-can-delete-project.md): a member can delete projects | High | Reproduced (`204`) | Fixed (`403`) |
| [FINDING-003](findings/FINDING-003-member-self-promotion.md): a member can promote themselves to admin | Critical | Reproduced (`200`) | Fixed (`403`) |

On the vulnerable build, the three finding tests are marked as **expected failures** with Playwright's `test.fail()`: the failure is the finding, reproduced. On the fixed build, every test must pass. So the suite stays green, and if a fix is ever reverted, the build turns red.

## What is tested

### API (`tests/`)

| Area | Tests | Examples |
| --- | --- | --- |
| Authentication | 5 | No token, unknown token, token without `Bearer`, wrong password, no password in the profile response |
| Tenant isolation | 6 | Listing, creating, reading and deleting across tenants |
| Role boundaries | 6 | Who can delete projects and change roles, self-promotion, invalid role values |

The full expected behaviour, endpoint by endpoint, is in the [access matrix](docs/access-matrix.md).

### UI (`ui-tests/`, TypeScript)

| Type | Tests | Examples |
| --- | --- | --- |
| End to end (real API) | 4 | Member sees only their tenant's projects, wrong password, no delete buttons for members, admin deletes a project |
| Mocked network (`page.route`) | 5 | API error state, empty state, loading state with a held response, project name rendered as text not HTML, bearer token sent with the request |

Mocking the network makes the UI tests fast and deterministic for states that are slow or impossible to create with real data, such as a server error or a response that has not arrived yet.

## Test design

- **Each finding has a positive test next to it.** A "fix" that simply blocks everyone would fail.
- **A denied write is checked by reading the data back.** A `403` alone does not prove nothing changed.
- **Status codes, headers and bodies are asserted**, not just "the request worked".
- **Every test starts from the same data.** Seed data is reset before each test.
- **Tests are easy to add.** API tests share helpers in [`tests/helpers.js`](tests/helpers.js). UI tests use a page object and a Playwright fixture in [`ui-tests/fixtures.ts`](ui-tests/fixtures.ts), so a new test only describes behaviour.
- **UI locators follow what the user sees**: roles, labels and accessible names (`getByRole`, `getByLabel`), not CSS paths.

## Project structure

```
app/
  server.js        Multi-tenant project API (the system under test), vulnerable and fixed modes
  public/index.html  Small web UI for the API (sign in, list and delete projects)
  start.js         Starts the API on a port, in the mode set by APP_MODE
tests/             API tests (JavaScript)
  helpers.js       Test accounts, seed data, login and reset helpers, finding marker
  authentication.spec.js
  tenant-isolation.spec.js
  role-boundaries.spec.js
ui-tests/          UI tests (TypeScript)
  fixtures.ts      Page object and fixture: fresh data and an open page for every test
  projects-dashboard.spec.ts
findings/          One report per finding: steps to reproduce, expected and actual result, retest
docs/
  access-matrix.md Expected response for every endpoint and caller
.github/workflows/
  api-tests.yml    Type-checks and runs every suite on each push, keeps the HTML report
```

## Run it

Requires Node.js 18 or later and Google Chrome (for the UI tests).

```bash
npm install
npm test                  # everything
npm run test:api          # API tests on both builds
npm run test:vulnerable   # reproduce the findings
npm run test:fixed        # retest
npm run test:ui           # UI tests in Chrome
npm run typecheck         # TypeScript check of the UI tests
npm run report            # open the HTML report
```

Playwright starts both builds of the app by itself (ports 3101 and 3102). To try it by hand, run `npm start` and open http://localhost:3000 (accounts: `alice` / `alice-pass`, admin; `bob` / `bob-pass`, member), or use the `curl` commands in the finding reports.

## Tech

Playwright Test (API `request` and browser), TypeScript, JavaScript, Node.js, Express, GitHub Actions.

## Author

**Luka Gabidzashvili**, QA Engineer · [LinkedIn](https://linkedin.com/in/luka-gabidzashvili)
