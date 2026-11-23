# FINDING-003: A member can promote themselves to admin

| Field | Value |
| --- | --- |
| Severity | Critical |
| Category | Broken access control: privilege escalation |
| Endpoint | `PATCH /users/:id/role` |
| Found on | vulnerable build |
| Status | Fixed, confirmed at retest |
| Test | `tests/role-boundaries.spec.js` › FINDING-003 |

## Summary

`PATCH /users/:id/role` checks that the target user is in the caller's tenant but not that the caller is an admin. A `member` can change any role in their tenant, including their own, and so become an admin.

## Steps to reproduce

1. Log in as `bob` (tenant `acme`, role `member`, user ID `u2`) and copy the token:

   ```bash
   curl -s -X POST http://localhost:3000/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"bob","password":"bob-pass"}'
   ```

2. Change bob's own role to `admin`:

   ```bash
   curl -s -i -X PATCH http://localhost:3000/users/u2/role \
     -H "Authorization: Bearer <token>" \
     -H 'Content-Type: application/json' \
     -d '{"role":"admin"}'
   ```

3. Request `GET /me` with the same token.

## Expected result

Step 2 returns `403 Forbidden` with `{"error":"forbidden"}`, and `GET /me` still shows `"role":"member"`.

## Actual result (vulnerable build)

```
HTTP/1.1 200 OK
{"id":"u2","username":"bob","tenant":"acme","role":"admin"}
```

`GET /me` now shows `"role":"admin"`.

## Impact

Any member can take full admin control of their organisation in one request. Combined with FINDING-002, they could then delete every project.

## Recommended fix

Allow role changes only for admins, and return `403` for everyone else.

## Retest

| Build | Response | Result |
| --- | --- | --- |
| vulnerable | `200 OK`, role changed to admin | Finding reproduced |
| fixed | `403 Forbidden`, role unchanged | Fixed |
