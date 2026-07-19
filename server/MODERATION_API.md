# Moderation API

Current community-rules version: `2026-07-18`.

All endpoints require a bearer token unless noted. Suspended accounts may only
read their own report history and permanently delete their own account.

## Consent

- `GET /api/moderation/consent`
- `POST /api/moderation/consent`
  - Body: `{ "accepted": true, "termsVersion": "2026-07-18" }`
  - The registration aliases `ugcTermsAccepted` and `ugcTermsVersion` are also accepted.

Response:

```json
{
  "requiredVersion": "2026-07-18",
  "accepted": true,
  "acceptedVersion": "2026-07-18",
  "acceptedAt": "2026-07-18T18:00:00.000Z"
}
```

Registration requires `ugcTermsAccepted: true` and
`ugcTermsVersion: "2026-07-18"`. Protected publishing routes return HTTP 428
with `code: "UGC_TERMS_REQUIRED"` when current consent is missing.

## Reports

- `POST /api/moderation/reports`
- `GET /api/moderation/reports/mine` (`GET /reports` remains an alias)

Create body:

```json
{
  "targetUserId": "user-id",
  "technicianId": "optional-technician-id",
  "contentType": "PROFILE",
  "reason": "FRAUD",
  "details": "Optional context, maximum 500 characters"
}
```

`contentType`: `PROFILE`, `PHOTO`, `BEHAVIOR`.

`reason`: `SPAM`, `HARASSMENT`, `HATE_SPEECH`, `SEXUAL_CONTENT`, `VIOLENCE`,
`FRAUD`, `IMPERSONATION`, `PRIVACY`, `OTHER`. `OTHER` requires details.

Self-reports, target/profile mismatches and duplicate active reports are rejected.
Reporter history never exposes internal resolution notes or reviewer identity.

## Blocks

- `GET /api/moderation/blocks`
- `POST /api/moderation/blocks/:userId`
- `DELETE /api/moderation/blocks/:userId`

Each list item contains `blockedUserId`, `createdAt` and a safe `blockedUser`
display object. Blocks are unique and self-blocking is rejected. Either direction
of a block hides the technician and prevents a booking from being created,
confirmed, started or completed. Cancellation and booking history stay available.

## Admin queue and decisions

- `GET /api/moderation/admin/queue?limit=25`
- `PATCH /api/moderation/admin/reports/:id/claim`
- `PATCH /api/moderation/admin/reports/:id`
- `PATCH /api/moderation/admin/technicians/:id`
- `PATCH /api/moderation/admin/profile-photos/:id`
- `PATCH /api/moderation/admin/users/:id`

`PUT` is accepted as an alias for every admin decision route. The queue returns
`{ reports, pendingProfiles, pendingPhotos, counts }`; every queue item includes
`ageHours` and `overdue` against a 24-hour target. Pending photo bytes are exposed
to admins as `photoUrl` only while the photo is pending.

Claiming atomically moves an `OPEN` report to `UNDER_REVIEW` and assigns it to
the current administrator. A second administrator receives HTTP 409. Final
resolution is also conditional on that assignment, preventing contradictory
decisions or duplicated sanctions.

Report resolution body:

```json
{
  "status": "RESOLVED",
  "action": "USER_SUSPENDED",
  "resolutionNote": "Required internal note, maximum 1000 characters"
}
```

Final statuses: `RESOLVED`, `DISMISSED`. Actions: `NONE`, `CONTENT_REMOVED`,
`TECHNICIAN_SUSPENDED`, `USER_SUSPENDED`, `WARNING_RECORDED`. A dismissed report
can only use `NONE`. `WARNING_RECORDED` is an internal record and does not claim
that an email or push warning was delivered.

Technician decision body:

```json
{ "decision": "APPROVE", "reason": "Optional for approval" }
```

Decisions: `APPROVE`, `REJECT`, `SUSPEND`. Rejecting and suspending require a reason.

Photo decision body:

```json
{ "decision": "REJECT", "reason": "Required for rejection" }
```

Decisions: `APPROVE`, `REJECT`. Approval moves the image to the public user
profile. Either final decision scrubs the private review copy.

Account decision body:

```json
{ "decision": "RESTORE", "reason": "Appeal accepted" }
```

Decisions: `SUSPEND`, `RESTORE`. Admin self-actions and actions against other
admin accounts are rejected. All admin decisions create audit records.

## Client-facing state names

- User account: `accountModerationStatus`, `accountModerationReason`
- Technician profile: `technicianModerationStatus`, `technicianModerationReason`
- Profile photo: `photoModerationStatus`, `photoModerationReason`,
  `photoModerationSubmissionId`, `photoModerationReviewedAt`

Login and `GET /api/auth/verification-status` return the latest owner-safe
profile-photo decision, including `REJECTED` and its review reason. These
responses never include the staged image bytes or reviewer identity.

Suspended users can still log in and receive a limited token. Login returns
`limitedAccess: true` and `suspensionCode: "ACCOUNT_SUSPENDED"`; ordinary APIs
return HTTP 403, while self-deletion and own-report history remain available.
An `ACCOUNT_SUSPENDED` 403 also includes `accountModerationReason`,
`limitedAccess: true` and the support URL so an already-running client can
immediately persist and render the restricted appeal/deletion experience.

## Account deletion integrity

`DELETE /api/users/:id` removes operational profile, booking, review, photo,
block and gamification data, then replaces the user row with a non-login
pseudonymous tombstone. Reports, decisions and their minimum evidence remain.
Before anonymization, the service writes immutable reporter/target snapshots
containing an internal account reference, display name, role and an HMAC identity
digest—never the raw email.

When an account or technician profile is suspended at deletion time, the
tombstone stays suspended and the keyed digest prevents registration with the
same email. A later `RESTORE` decision on that tombstone lifts the active
registration restriction. Direct deletion of a suspended technician profile is
rejected with HTTP 409. Administrative accounts are protected targets; only an
admin can close their own admin account, and the last live admin cannot be
deleted.

Production should configure a stable `ACCOUNT_IDENTITY_SECRET` of at least 32
characters. Do not rotate it without migrating existing marker digests; the
server temporarily falls back to `AUTH_SECRET` to support existing deployments.
