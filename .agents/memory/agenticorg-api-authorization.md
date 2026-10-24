---
name: AgenticOrg API authorization
description: Distinguishes AgenticOrg metadata-read authorization from direct agent-run authorization.
---

An AgenticOrg metadata GET can be rejected even when a credential is allowed to call the direct agent-run endpoint. A run request can also be accepted by the API but fail inside the configured model provider.

**Why:** In VerifAI, a metadata lookup returned an authorization error, while a direct UUID run reached the agent runtime and returned a provider execution error. Treating the GET alone as proof of an invalid run key would send debugging in the wrong direction.

**How to apply:** For this integration, assess auth with the exact run route and agent UUID only after user approval. Inspect both the HTTP result and `AgentRunResult.status`; avoid repeating billable runs without approval.
