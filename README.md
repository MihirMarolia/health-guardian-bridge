# Health Guardian

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Vite](https://img.shields.io/badge/Vite-7-646CFF)
![Supabase](https://img.shields.io/badge/Supabase-Enabled-3ECF8E)
![License](https://img.shields.io/badge/License-MIT-green)

Health Guardian is a clinician-first platform that turns fragmented referral intake into a secure, understandable, and actionable workflow.

## Why this matters
Healthcare teams still lose time to manual referral triage, messy fax intake, and disconnected handoffs. Health Guardian reduces that burden by combining AI-assisted extraction, human verification, privacy safeguards, and audit visibility in one workflow.

## Submission-ready elevator pitch
Health Guardian helps clinicians process incoming referrals faster while keeping patient privacy protected and human judgment at the center of every decision.

## Key features
- Clinician dashboard for reviewing referrals and patient context
- AI-assisted extraction of key clinical details from unstructured documents
- Visual redaction of sensitive information before AI processing
- Human-in-the-loop confirmation to keep clinicians in control
- Audit logging to support accountability and trust
- Secure, clinician-focused workflow design that avoids unnecessary patient-facing exposure

## How the workflow works
1. A referral or clinical document is reviewed in the clinician view.
2. Key medical details are extracted and surfaced for validation.
3. Sensitive fields are redacted to reduce privacy risk.
4. The clinician confirms the output before any final action is taken.
5. Every step is logged for traceability and compliance visibility.

## Demo highlights
- Faster review of high-volume referral intake
- Clear visibility into what the AI extracted
- Transparent privacy controls that users can trust
- A practical workflow designed for real clinical operations

## Tech stack
- Frontend: React, TypeScript, Vite
- UI: Tailwind-inspired component system with reusable design primitives
- Backend/data: Supabase and server-side workflow logic
- Compliance focus: audit logging, redaction, and human verification flow

## Run locally
```bash
pnpm install
pnpm dev
```

Environment variables needed:
```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## FAQ
### What problem does this solve?
It reduces time spent manually sorting referrals and improves trust in AI-assisted clinical workflows.

### Why is this clinician-first?
The workflow is designed to support clinicians directly, not expose patient data unnecessarily.

### How is privacy protected?
Sensitive data is redacted before AI processing, and the platform emphasizes review and accountability.

### Is AI replacing the clinician?
No. AI supports the clinician, but the human remains responsible for the final decision.

## Roadmap
- Improve triage intelligence and matching accuracy
- Add stronger reporting and operational dashboards
- Expand integrations with healthcare systems and workflows
- Improve onboarding, accessibility, and demo readiness

## Repository extras
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [docs/demo-script.md](docs/demo-script.md)

## Submission summary
Health Guardian is a privacy-conscious, clinician-centered referral workflow platform that helps teams process medical information faster while keeping humans in control. It combines explainable AI, redaction, audit trails, and a clear review flow to address a real healthcare operational challenge.

