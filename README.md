# Lokta Borrower Copilot

Lokta Borrower Copilot is a frontend-only decision aid that helps Indian borrowers evaluate whether a loan is affordable, how much they can safely borrow, what rate may be fair, and what EMI they should be comfortable agreeing to.

It deliberately separates **lender-style sanction/eligibility** from **borrower-safe affordability** and provides transparent explanations for each recommendation.

## Run locally

Install dependencies:

```bash
pnpm install
```

Run type checking:

```bash
pnpm --filter @workspace/lokta-borrower-copilot run typecheck
```

Build the application:

```bash
pnpm --filter @workspace/lokta-borrower-copilot run build
```

## What is included

* A short adaptive borrower interview for **Priya, Ravi, and Anita**.
* A borrower-safe borrowing range based on income, essential expenses, existing EMIs, stability considerations, and stressed repayment capacity.
* A separate lender-style sanctioned amount so approval is never presented as affordability.
* Fair interest-rate bands rather than false point estimates.
* APR estimation that includes processing fees deducted before disbursal.
* Monthly EMI/outflow ceiling with tenure trade-offs.
* Stress testing using adverse income/rate scenarios.
* Plain-English explanations showing why important numbers were produced.
* A copyable one-screen Negotiation Card for lender discussions.
* Explicit missing-value handling: unknown values are never silently treated as zero, and missing information widens uncertainty.

## Documentation

* [`RULES.md`](./RULES.md) — decision rules, thresholds, rate bands, assumptions, and rationale.
* [`RUNTHROUGHS.md`](./RUNTHROUGHS.md) — detailed run-throughs for Priya, Ravi, and Anita.

## Design principles

* **Borrower-first:** affordability is based on what the borrower can safely carry, not simply what a lender may approve.
* **Explainable:** every major number has a documented reason.
* **Conservative with uncertainty:** missing information increases uncertainty rather than creating false precision.
* **India-specific:** calculations and examples use Indian rupees and relevant borrowing concepts.
* **No unnecessary data collection:** the prototype requires no login, bureau pull, backend, or persistent personal-data storage.

## AI-assisted development

AI-assisted development tools were used during implementation for scaffolding, coding support, documentation, and review. Product decisions, rules, assumptions, and final implementation were reviewed against the challenge requirements.
