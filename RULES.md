# Lokta Borrower Copilot rules

This file is the source-of-truth explanation for the calculation engine in `artifacts/lokta-borrower-copilot/src/lib/decision-engine.ts`.

## Borrower-safe amount

The safe payment starts with the borrower's own monthly take-home income:

1. `surplus = own take-home - essential expenses - existing EMIs`
2. A payment is capped at the lower of:
   - 75% of the surplus, and
   - 35% of own take-home income minus existing EMIs.
3. Stable income keeps the full cap. Variable income keeps 90%; uncertain income keeps 80%.
4. The lower edge of the safe range also keeps an extra 10% cushion.
5. The safe amount converts that payment back to principal using a rate stress of three percentage points above the stated rate.

If own income is unknown, the safe amount is not calculated. If essentials or existing EMIs are unknown but income is known, Lokta uses explicit conservative ranges (essentials 45%–65% of take-home; existing EMIs 0%–15% of take-home) and shows the result as a wider, high-uncertainty range. Unknown values are never silently treated as zero.

## Ranges and missing values

- A known rate uses the lender's low/high range.
- An unknown rate uses a wider 14%–24% working range and adds the three-point stress.
- Missing critical cash-flow values produce a high-uncertainty result instead of a confident number.
- A missing fee uses an explicit 0%–4% working range for the displayed APR estimate, while the UI says that the fee still needs confirmation.
- The app always labels assumptions and missing fields.

## Lender sanction versus borrower-safe amount

The lender-sanctioned amount is shown as a separate lender-side number. It does not raise the safe amount and does not turn into a recommendation. When the sanction exceeds the safe range, the Negotiation Card tells the borrower to negotiate down.

## Collateral and routing

Collateral can change the suggested product route, not monthly affordability. It never increases the safe amount. A business purpose with collateral routes toward a secured/business conversation; an over-sized business loan without collateral pauses rather than pretending a personal loan is suitable.

## Income

The engine uses the borrower's own take-home income. Spouse income is not counted unless the product is explicitly extended to model a co-borrower. Business income is displayed separately and is not silently added a second time.

## APR and stress testing

- EMI is calculated from principal, annual rate, and tenure.
- APR is estimated by solving for the annualized rate that equates the instalment stream to the amount actually disbursed after the processing fee.
- The stress EMI uses the quoted rate plus three percentage points.
- The stress surplus subtracts the high stress EMI from the pre-new-loan surplus.

This is an estimate for comparison, not a substitute for the lender's regulated APR disclosure.

## Decision labels

- `BORROW`: the requested amount fits the safe range, the stress surplus is not negative, and the inputs are sufficiently known.
- `BORROW WITH CAUTION`: the result may fit, but material inputs are missing or income is variable.
- `DON'T BORROW`: there is no repayment room, the stress case is negative, or the requested amount is materially above the safe range.

The label is a budgeting aid, not an approval, rejection, or financial-advice opinion.