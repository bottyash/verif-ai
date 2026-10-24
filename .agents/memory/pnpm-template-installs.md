---
name: Workspace template installs
description: Installing dependencies after copying skill templates into this pnpm monorepo.
---

After copying a skill-supplied library into the workspace, run a full root `pnpm install --no-frozen-lockfile` before typechecking. A filter-scoped dependency add did not make the copied library's own dependencies available to TypeScript project references.

**Why:** The first typecheck reported missing Node, OpenAI, and batching package types even though the new server library was referenced by the workspace. A root install resolved the mismatch.

**How to apply:** Use this when adding a copied template package under `lib/`, then run the normal library and artifact typechecks.
