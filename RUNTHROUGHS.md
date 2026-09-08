# Persona run-throughs

These are the seeded persona defaults in the app. They are intentionally deterministic so a reviewer can verify the three core paths without entering every field.

## Anita — DON'T BORROW

- Own take-home: ₹32,000/month
- Essentials: ₹29,000/month
- Existing EMIs: ₹1,000/month
- Requested and sanctioned: ₹2,00,000
- Tenure: 48 months
- Quoted rate: 16%–22%
- Processing fee: 2%
- Purpose: personal
- Income stability: stable

Expected behavior:

- The pre-loan surplus is only ₹2,000/month.
- A stressed repayment for ₹2,00,000 is above the available cash flow.
- The result is `DON'T BORROW`.
- The route is `pause`.
- The Negotiation Card says to pause rather than accept the sanction.

## Ravi — secured/business route

- Own take-home: ₹95,000/month
- Essentials: ₹50,000/month
- Existing EMIs: ₹10,000/month
- Requested: ₹6,50,000; sanctioned: ₹8,00,000
- Tenure: 60 months
- Quoted rate: 13%–17%
- Processing fee: 2%
- Purpose: business
- Business contribution shown separately: ₹1,40,000/month
- Income stability: variable
- Collateral: yes

Expected behavior:

- The recommendation does not count business income twice.
- Collateral does not inflate safe affordability.
- The route is `secured-business`, so Ravi is guided toward a purpose-matched secured/business conversation rather than an unsafe unsecured personal loan.

## Meera — cautious missing-data range

- Own take-home: ₹68,000/month
- Essentials: unknown
- Existing EMIs: unknown
- Requested and sanctioned: ₹3,50,000
- Tenure: 36 months
- Rate: unknown
- Processing fee: unknown
- Purpose: education
- Income stability: stable

Expected behavior:

- The app does not enter ₹0 for missing expenses or EMIs.
- The result is `BORROW WITH CAUTION`.
- The safe amount is shown as a wider, cautious range built from explicit expense and EMI bounds; it is not a zero-filled estimate.
- The rate range widens visibly to 14%–24% for the comparison and is labeled as an assumption.