# VerifAI page-by-page content plan

## Product principles

- Ask one question at a time; keep questions short, staged, and easy to skip with “Not sure yet.”
- Separate founder-provided evidence from assumptions and AI interpretation. Never invent market statistics, interviews, named competitors, regulatory conclusions, or traction.
- Keep the free score balanced and honest. The paid report adds detail and tools; it must not manufacture a negative verdict to pressure payment.
- Use India and INR as defaults, but be explicit when a claim needs local research or qualified legal review.
- Preserve the warm paper, dark ink, coral, and editorial typography system inspired by the supplied Airtribe reference without copying its layout or assets.

## Routes and page content

### `/` — public landing page
- Explain the value in one sentence: pressure-test the problem, customer, and next step before building.
- Primary action: create a founder workspace; secondary action: see the three-step flow.
- Describe the process: submit an idea, answer staged questions, review a scoped snapshot.
- Set expectations: scores are directional, missing information lowers confidence (not potential), and this is not investment or legal advice.
- Keep an India-first / INR cue and a clear sign-in link.

### `/sign-in/*?` and `/sign-up/*?` — secure account access
- Show a short product-specific introduction beside Clerk’s branded sign-in or sign-up component.
- Support configured Clerk login methods, including Google when enabled in the workspace Auth pane.
- Do not collect or store credentials in custom app forms.

### `/dashboard` — founder workspace
- Show idea and report counts, average readiness when available, and recent idea cards.
- Provide a clear “New idea” action and a useful empty state for first-time founders.
- Each idea card shows its current stage, last-updated date, and score only after an assessment exists.

### `/new` — idea intake
- Collect a working name, plain-language description, problem, target customer, and starting market.
- Use India as the initial market, while allowing the founder to change it.
- Explain that rough notes are enough and that the founder can refine details later.
- This build accepts text only; voice transcription is deliberately not presented as available because no voice provider is connected.

### `/ideas/:ideaId/questions` — staged refinement
- Show the three deterministic tiers: Must know, Better to know, Great to know.
- Ask one question per screen with a short rationale, progress, back/next controls, and an explicit “Not sure yet” response.
- Keep the four essentials required for the first assessment; later tiers add confidence but do not block the free snapshot.
- Save answers before starting analysis so a failed assessment does not erase founder input.

### `/ideas/:ideaId/report` — report and unlock
- Free snapshot: overall score, verdict, summary, and six area scores with short summaries.
- Full report: strengths, improvements, evidence notes, status-quo comparisons, and prioritized next steps.
- Provide print-to-PDF export, a visible one-time ₹20 unlock, and a link to the post-report chat.
- Show Pine Labs availability and payment verification state plainly. Never imply payment succeeded based only on a redirect.
- Label the report as an early directional assessment, not a forecast or professional advice.

### `/ideas/:ideaId/chat` — paid refinement assistant
- Before unlock, explain that payment is required and link back to the report; do not show a simulated assistant.
- After payment verification, show persisted founder/assistant messages, suggested prompts, and a message composer.
- Ground replies in the idea and report, label uncertainty, and avoid fabricated external facts.

### `/account` — founder account
- Display the authenticated account identity, India/INR defaults, privacy note, and secure sign-out action.
- Manage profile details through Clerk rather than custom password or credential forms.

## Research basis

- GOV.UK question-page guidance recommends one clear question at a time and asking only what is needed: https://design-system.service.gov.uk/patterns/question-pages
- GOV.UK form guidance emphasizes clear labels, useful structure, and avoiding unnecessary fields: https://www.gov.uk/service-manual/design/form-structure
- YC’s user-interview guidance and Harvard Innovation Labs’ demand-validation material support testing observed behavior and real customer evidence rather than treating compliments as proof:
  - https://www.ycombinator.com/library/JQ-how-to-start-a-startup-talking-to-users
  - https://innovationlabs.harvard.edu/how-to/validate-demand
