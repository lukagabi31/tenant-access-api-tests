# FINDING-001: Any user can read another tenant's project by ID

| Field | Value |
| --- | --- |
| Severity | High |
| Category | Broken access control: insecure direct object reference (IDOR), tenant isolation |
| Endpoint | `GET /projects/:id` |
| Found on | vulnerable build |
| Status | Fixed, confirmed at retest |
| Test | `tests/tenant-isolation.spec.js` › FINDING-001 |

## Summary

`GET /projects/:id` looks the project up by its ID and returns it without checking that the project belongs to the caller's tenant. A user of tenant `acme` can read any `globex` project if they know or guess its ID. Project IDs are short and sequential (`p1`, `p2`, `p3`), so guessing is easy.

## Steps to reproduce

1. Log in as `bob` (tenant `acme`, role `member`):

   ```bash
   curl -s -X POST http://localhost:3000/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"bob","password":"bob-pass"}'
   ```

2. Copy the `token` from the response.
3. Request project `p3`, which belongs to tenant `globex`:

   ```bash
   curl -s -i http://localhost:3000/projects/p3 -H "Authorization: Bearer <token>"
   ```

## Expected result

`404 Not Found` with `{"error":"not_found"}`. The API should not confirm that the ID exists in another tenant.

## Actual result (vulnerable build)

```
HTTP/1.1 200 OK
{"id":"p3","tenant":"globex","name":"Globex Product Roadmap"}
```

## Impact

Any authenticated user can read the projects of every other customer. Tenant isolation, the core promise of a multi-tenant product, does not hold for this endpoint.

## Recommended fix

Scope the lookup to the caller's tenant (`id` and `tenant` together) and return `404` when the project belongs to another tenant.

## Retest

| Build | Response | Result |
| --- | --- | --- |
| vulnerable | `200 OK`, full project returned | Finding reproduced |
| fixed | `404 Not Found`, `{"error":"not_found"}` | Fixed |

The same request now returns `404`. The test runs against both builds on every CI run, so a regression would show up straight away.
