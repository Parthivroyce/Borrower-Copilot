# Lokta Borrower Copilot

Lokta Borrower Copilot is a frontend-only decision aid for people comparing a lender's offer with what their own monthly cash flow can safely carry. It is deliberately not a lender eligibility calculator.

## Run locally

The app runs with the workspace-managed web workflow. To check it from the command line:

```bash
pnpm --filter @workspace/lokta-borrower-copilot run typecheck
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/lokta-borrower-copilot run build
```
pnpm install
pnpm --filter @workspace/lokta-borrower-copilot run typecheck
pnpm --filter @workspace/lokta-borrower-copilot run build



## What is included

- A short adaptive borrower interview for Anita, Ravi, or Priya.
- A borrower-safe range based on the user's own income, essentials, existing EMIs, stability buffer, and a stressed interest rate.
- A separate lender-sanctioned amount so approval is never presented as affordability.
- APR estimation that includes the processing fee deducted before disbursal.
- Plain-English explanations and a copyable Negotiation Card.
- Explicit missing-value handling: unknown is not zero, and missing inputs widen uncertainty instead of being silently imputed.

The rules are documented in [`RULES.md`](./RULES.md). Persona run-throughs and expected behavior are in [`RUNTHROUGHS.md`](./RUNTHROUGHS.md).
