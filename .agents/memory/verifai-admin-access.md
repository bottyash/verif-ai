---
name: VerifAI admin access
description: Access-control model for the VerifAI operations dashboard and cross-user report data.
---

Admin access is granted only when a user's verified Clerk email matches the server-side `VERIFAI_ADMIN_EMAILS` allowlist. The API must enforce this check; frontend route visibility is not authorization. If the allowlist is empty or Clerk cannot verify the user, deny access.

**Why:** the admin dashboard exposes reports belonging to other founders, and this project had no pre-existing application-role system.

**How to apply:** configure only owner-approved verified emails in each environment. Keep all report and metric endpoints behind the same server middleware; never add an open first-admin bootstrap route or a client-only role check.
