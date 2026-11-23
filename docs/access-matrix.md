# Access matrix

The expected behaviour for every endpoint, by who is calling. Each cell is covered by at least one test. Cells marked with a finding ID behaved differently on the vulnerable build.

## Test accounts

| Account | Tenant | Role | User ID |
| --- | --- | --- | --- |
| alice | acme | admin | u1 |
| bob | acme | member | u2 |
| carol | globex | admin | u3 |

## Expected responses

| Endpoint | No token | Member, own tenant | Admin, own tenant | Any role, other tenant |
| --- | --- | --- | --- | --- |
| `GET /me` | 401 | 200 | 200 | n/a |
| `GET /tenants/:tenant/projects` | 401 | 200 | 200 | 403 |
| `POST /tenants/:tenant/projects` | 401 | 201 | 201 | 403 |
| `GET /projects/:id` | 401 | 200 | 200 | **404** (FINDING-001) |
| `DELETE /projects/:id` | 401 | **403** (FINDING-002) | 204 | 404 |
| `PATCH /users/:id/role` | 401 | **403** (FINDING-003) | 200 | 404 |

## Design notes

- **404, not 403, for another tenant's object.** Returning 403 would confirm that the ID exists in another tenant.
- **Positive tests next to negative ones.** For every "cannot" there is a "can" test, so a fix that simply blocks everyone is caught too.
- **State is checked after a denied write.** A `403` is not enough on its own: the tests read the data back to confirm nothing changed.
