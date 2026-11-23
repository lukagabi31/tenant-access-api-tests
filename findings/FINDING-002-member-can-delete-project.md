# FINDING-002: A member can delete projects

| Field | Value |
| --- | --- |
| Severity | High |
| Category | Broken access control: missing role check (function-level authorization) |
| Endpoint | `DELETE /projects/:id` |
| Found on | vulnerable build |
| Status | Fixed, confirmed at retest |
| Test | `tests/role-boundaries.spec.js` › FINDING-002 |

## Summary

`DELETE /projects/:id` checks that the project belongs to the caller's tenant but does not check the caller's role. Deleting a project is an admin action, yet any `member` can do it.

## Steps to reproduce

1. Log in as `bob` (tenant `acme`, role `member`) and copy the token:

   ```bash
   curl -s -X POST http://localhost:3000/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"bob","password":"bob-pass"}'
   ```

2. Delete project `p2` (tenant `acme`):

   ```bash
   curl -s -i -X DELETE http://localhost:3000/projects/p2 -H "Authorization: Bearer <token>"
   ```

3. Log in as `alice` (tenant `acme`, role `admin`) and request `GET /projects/p2`.

## Expected result

Step 2 returns `403 Forbidden` with `{"error":"forbidden"}`, and in step 3 the project still exists (`200 OK`).

## Actual result (vulnerable build)

Step 2 returns `204 No Content` and the project is gone; step 3 returns `404 Not Found`.

## Impact

Any member can permanently delete their organisation's projects. The data loss cannot be undone through the API.

## Recommended fix

Require the `admin` role for `DELETE /projects/:id` and return `403` for other roles.

## Retest

| Build | Response | Result |
| --- | --- | --- |
| vulnerable | `204 No Content`, project deleted | Finding reproduced |
| fixed | `403 Forbidden`, project still exists | Fixed |
