---
name: VerifAI prototype access
description: Payment and report-unlock behavior while VerifAI is a proof of concept.
---

While VerifAI is a prototype, report access should be testable through an explicitly labeled no-charge demo unlock. Real payment checkout must remain disabled until the payment gateway is intentionally enabled.

**Why:** the user said this is a proof of concept and asked to add a payment gateway later.

**How to apply:** keep demo access separate from provider checkout, make it development-only, and do not send real payment requests during the prototype.
