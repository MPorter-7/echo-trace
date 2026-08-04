# EchoTrace

EchoTrace is a privacy-first self-recovery workspace for reconstructing your own digital history from information you provide and traceable public sources.

> Recover, reconstruct, and reclaim your lost online history — free, ethical, and transparent.

The existing public landing page and Supabase waitlist remain at `/`. Authenticated users receive a private dashboard at `/dashboard`.

## MVP features

- Supabase email/password signup, email verification, login, logout, reset, persistent sessions, and protected routes
- Required self-recovery consent with a versioned audit record
- Private identifiers with clear separation between verified account email and unverified historical emails
- Timeline CRUD with exact, month/year, year-only, and unknown dates; search, filters, sorting, and two views
- User-reviewed possible matches with sources, retrieval dates, status controls, and deterministic confidence explanations
- Guided outbound public searches without uncontrolled scraping
- Private Supabase Storage archive with owner paths, validation, signed downloads, deletion, and event linking
- JSON and CSV data exports
- Individual deletion, delete-all application data, and a secure account-deletion Edge Function
- Plain-language privacy and terms drafts marked for legal review
- Idempotent database migration with owner-only Row Level Security
- Unit tests for guards, validation, scoring, status transitions, export formatting, ownership assumptions, and files

## Safety boundary

EchoTrace is not a people-search, surveillance, background-check, stalking, or private-investigation product. It does not add facial recognition, location tracking, phone investigation, private-database access, automated scraping, paywall/CAPTCHA bypass, or paid APIs.

## Local development

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Add only the public Supabase project URL and anonymous key to `.env.local`. Never use a service-role key in the frontend.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

See [SETUP.md](SETUP.md), [SECURITY.md](SECURITY.md), and [TESTING.md](TESTING.md) before deployment.

## Intentionally deferred

- Automatic discovery or scraping
- Data-broker or private-database integrations
- Social login
- Facial recognition, phone lookup, or location tracking
- Paid APIs and AI scoring
- Background processing and approved source APIs (the connector boundary is ready for later additions)
- Legal approval of the MVP privacy and terms drafts
