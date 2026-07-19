Health Guardian

Health Guardian is an enterprise-grade, clinician-first clinical triage platform designed to transform fragmented, unstructured referral and document intake into a secure, auditable, and highly efficient workflow.
The Operational Challenge

Primary care teams face significant administrative burdens from manual referral triage, unstructured faxed documentation, and disconnected care handoffs. These operational inefficiencies contribute to prolonged wait times and increased risk of critical details being missed.

Health Guardian addresses this challenge by centralizing document triage while explicitly maintaining human-in-the-loop oversight, field-level data privacy safeguards, and immutable audit logging.
Platform Architecture & Design Principles
1. Calibrated Trust & Transparency

The system follows the principles of explainable AI. When unstructured clinical documents are ingested, the system surfaces exact source-text highlights alongside derived extractions (e.g., condition, recommended specialist) and confidence scoring. AI augments human judgment; it does not bypass it.
2. Human-in-the-Loop (HITL) Enforcement

To ensure safety, accountability, and appropriate oversight, the application implements a mandatory gatekeeper verification step. Clinicians must explicitly review and confirm extractions before an action (such as generating a FHIR ServiceRequest) can be executed.
3. Privacy-by-Design

The architecture minimizes risk through targeted field redaction. Sensitive Protected Health Information (PHI) is isolated or visually managed before any automated processing occurs, upholding strict governance and operational safety.
4. Integration over Fragmentation

Built in direct response to clinician feedback warning against siloed applications, the tool fits directly into existing administrative and coordination workflows with low cognitive overhead.
Technical Stack

    Frontend: React, TypeScript, Vite

    Styling: Tailwind CSS, Shadcn/ui component primitives

    Database / State: Supabase (PostgreSQL)

    Security & Logging: Immutable event tracking, structured payloads, and field-level redaction pipelines

Getting Started
Prerequisites

Ensure you have pnpm installed globally.
Local Installation

    Clone the repository:

Bash

git clone https://github.com/your-org/health-guardian.git
cd health-guardian

    Install dependencies:

Bash

pnpm install --legacy-peer-deps

    Configure environment variables (.env.local):

Code snippet

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

    Run the local development server:

Bash

pnpm dev

Repository Documentation

    Demo Script & Scenarios: docs/demo-script.md

    Deployment & Hosting Guide: DEPLOYMENT.md

    Contribution Guidelines: CONTRIBUTING.md

License

This project is licensed under the MIT License - see the LICENSE file for details.
