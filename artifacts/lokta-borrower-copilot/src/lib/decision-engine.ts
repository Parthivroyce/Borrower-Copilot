export type NullableNumber = number | null;
export type PersonaId = "anita" | "ravi" | "meera";
export type LoanPurpose = "personal" | "business" | "education" | "medical";
export type IncomeStability = "stable" | "variable" | "uncertain";
export type Route =
  | "unsecured-personal"
  | "secured-business"
  | "secured-purpose"
  | "pause";
export type Decision = "BORROW" | "BORROW WITH CAUTION" | "DON'T BORROW";

export type BorrowerInputs = {
  name: string;
  monthlyTakeHome: NullableNumber;
  monthlyEssentials: NullableNumber;
  existingEmis: NullableNumber;
  requestedAmount: NullableNumber;
  sanctionedAmount: NullableNumber;
  tenureMonths: NullableNumber;
  rateLow: NullableNumber;
  rateHigh: NullableNumber;
  processingFeePercent: NullableNumber;
  purpose: LoanPurpose | null;
  incomeStability: IncomeStability | null;
  hasCollateral: boolean | null;
  businessIncome: NullableNumber;
};

export type Range = { low: number; high: number };

export type DecisionResult = {
  decision: Decision;
  route: Route;
  safeAmount: Range | null;
  safePayment: Range | null;
  lenderSanction: number | null;
  requestedAmount: number | null;
  baseEmi: Range | null;
  stressEmi: Range | null;
  apr: Range | null;
  surplus: number | null;
  stressSurplus: number | null;
  uncertainty: "low" | "medium" | "high";
  missing: string[];
  explanations: Array<{ label: string; value: string; explanation: string }>;
  negotiationPoints: string[];
  disclaimer: string;
};

const DEFAULT_RATE: Range = { low: 14, high: 24 };
const DEFAULT_FEE = 2;
const DEFAULT_TENURE = 36;
const STRESS_BUFFER = 3;

export function formatRupees(value: number | null, maximumFractionDigits = 0): string {
  if (value === null || !Number.isFinite(value)) return "Not enough information";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits,
  }).format(value);
}

export function formatRange(range: Range | null): string {
  if (!range) return "Not enough information";
  return `${formatRupees(range.low)} – ${formatRupees(range.high)}`;
}

export function monthlyPayment(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return principal * monthlyRate * factor / (factor - 1);
}

function effectiveApr(principal: number, annualRate: number, months: number, feePercent: number): number {
  const netDisbursed = principal * (1 - feePercent / 100);
  const payment = monthlyPayment(principal, annualRate, months);
  let low = 0;
  let high = 1;

  for (let iteration = 0; iteration < 48; iteration += 1) {
    const monthly = (low + high) / 2;
    let presentValue = 0;
    for (let month = 1; month <= months; month += 1) {
      presentValue += payment / Math.pow(1 + monthly, month);
    }
    if (presentValue > netDisbursed) low = monthly;
    else high = monthly;
  }
  return Math.pow(1 + (low + high) / 2, 12) - 1;
}

function conservativeSafePayment(inputs: BorrowerInputs): Range | null {
  if (inputs.monthlyTakeHome === null) {
    return null;
  }
  const essentials = inputs.monthlyEssentials === null
    ? { low: inputs.monthlyTakeHome * 0.45, high: inputs.monthlyTakeHome * 0.65 }
    : { low: inputs.monthlyEssentials, high: inputs.monthlyEssentials };
  const existingEmis = inputs.existingEmis === null
    ? { low: 0, high: inputs.monthlyTakeHome * 0.15 }
    : { low: inputs.existingEmis, high: inputs.existingEmis };
  const surplus = {
    low: Math.max(0, inputs.monthlyTakeHome - essentials.high - existingEmis.high),
    high: Math.max(0, inputs.monthlyTakeHome - essentials.low - existingEmis.low),
  };
  const stabilityFactor = inputs.incomeStability === "uncertain" ? 0.8 : inputs.incomeStability === "variable" ? 0.9 : 1;
  const forSurplus = (value: number, emi: number) => {
    if (value <= 0) return 0;
    const debtServiceCap = inputs.monthlyTakeHome! * 0.35 - emi;
    return Math.max(0, Math.min(value * 0.75, debtServiceCap)) * stabilityFactor;
  };
  return {
    low: forSurplus(surplus.low, existingEmis.high) * 0.9,
    high: forSurplus(surplus.high, existingEmis.low),
  };
}

function safeAmountFromPayment(payment: number, annualRate: number, months: number): number {
  if (payment <= 0 || months <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return payment * months;
  const factor = Math.pow(1 + monthlyRate, months);
  return payment * (factor - 1) / (monthlyRate * factor);
}

function getMissing(inputs: BorrowerInputs): string[] {
  const missing: string[] = [];
  if (inputs.monthlyTakeHome === null) missing.push("your own monthly take-home income");
  if (inputs.monthlyEssentials === null) missing.push("monthly essential expenses");
  if (inputs.existingEmis === null) missing.push("existing EMI commitments");
  if (inputs.requestedAmount === null) missing.push("the amount you want to borrow");
  if (inputs.tenureMonths === null) missing.push("the loan tenure");
  if (inputs.rateLow === null || inputs.rateHigh === null) missing.push("the lender's interest-rate range");
  if (inputs.processingFeePercent === null) missing.push("the processing fee");
  if (inputs.incomeStability === null) missing.push("how steady your income is");
  return missing;
}

export function calculateDecision(inputs: BorrowerInputs): DecisionResult {
  const missing = getMissing(inputs);
  const rate = {
    low: inputs.rateLow ?? DEFAULT_RATE.low,
    high: inputs.rateHigh ?? DEFAULT_RATE.high,
  };
  const tenure = inputs.tenureMonths ?? DEFAULT_TENURE;
  const fee = inputs.processingFeePercent ?? DEFAULT_FEE;
  const feeRange = inputs.processingFeePercent === null
    ? { low: 0, high: 4 }
    : { low: inputs.processingFeePercent, high: inputs.processingFeePercent };
  const safePayment = conservativeSafePayment(inputs);
  const lenderSanction = inputs.sanctionedAmount;
  const requested = inputs.requestedAmount;
  const paymentRange = safePayment
    ? { low: safePayment.low, high: safePayment.high }
    : null;
  const safeAmount = paymentRange
    ? {
        low: safeAmountFromPayment(paymentRange.low, rate.high + STRESS_BUFFER, tenure),
        high: safeAmountFromPayment(paymentRange.high, rate.low + STRESS_BUFFER, tenure),
      }
    : null;

  const baseEmi = requested
    ? { low: monthlyPayment(requested, rate.low, tenure), high: monthlyPayment(requested, rate.high, tenure) }
    : null;
  const stressEmi = requested
    ? {
        low: monthlyPayment(requested, rate.low + STRESS_BUFFER, tenure),
        high: monthlyPayment(requested, rate.high + STRESS_BUFFER, tenure),
      }
    : null;
  const apr = requested
    ? {
        low: effectiveApr(requested, rate.low, tenure, feeRange.low) * 100,
        high: effectiveApr(requested, rate.high, tenure, feeRange.high) * 100,
      }
    : null;

  const surplus =
    inputs.monthlyTakeHome !== null && inputs.monthlyEssentials !== null && inputs.existingEmis !== null
      ? inputs.monthlyTakeHome - inputs.monthlyEssentials - inputs.existingEmis
      : null;
  const stressSurplus =
    surplus !== null && stressEmi ? surplus - stressEmi.high : null;
  const requestedAboveSafe = requested !== null && safeAmount !== null && requested > safeAmount.high * 1.05;
  const noRoom = safePayment !== null && safePayment.high <= 1000;
  const missingCritical = inputs.monthlyTakeHome === null;
  const uncertainCashflow = inputs.monthlyEssentials === null || inputs.existingEmis === null;
  const variableIncome = inputs.incomeStability === "variable" || inputs.incomeStability === "uncertain";
  const businessRoute = inputs.purpose === "business" && inputs.hasCollateral === true;
  const pauseRoute = inputs.purpose === "business" && inputs.hasCollateral === false && requestedAboveSafe;

  let decision: Decision = "BORROW WITH CAUTION";
  if (noRoom || requestedAboveSafe || stressSurplus !== null && stressSurplus < 0) {
    decision = "DON'T BORROW";
  } else if (missingCritical || uncertainCashflow || variableIncome || missing.length >= 3) {
    decision = "BORROW WITH CAUTION";
  } else if (requested !== null && safeAmount !== null && requested <= safeAmount.high) {
    decision = "BORROW";
  }

  let route: Route = "unsecured-personal";
  if (decision === "DON'T BORROW") route = "pause";
  else if (businessRoute || pauseRoute) route = "secured-business";
  else if (inputs.hasCollateral === true && inputs.purpose !== "personal") route = "secured-purpose";

  const uncertainty: DecisionResult["uncertainty"] =
    missing.length >= 4 || missingCritical ? "high" : missing.length > 0 || variableIncome ? "medium" : "low";
  const explanations: DecisionResult["explanations"] = [
    {
      label: "Lender-sanctioned amount",
      value: formatRupees(lenderSanction),
      explanation: lenderSanction === null
        ? "We do not have the lender's offer yet, so this cannot be compared."
        : "This is what the lender may approve. It is not a promise that the repayment fits your life.",
    },
    {
      label: "Borrower-safe range",
      value: formatRange(safeAmount),
      explanation: safeAmount
        ? "This uses your own surplus, a repayment buffer, and a 3-point rate stress. If an expense or EMI is unknown, the range uses explicit conservative bounds instead of zero."
        : "A safe amount needs your own income, essentials, and existing EMIs. Missing values are not treated as zero.",
    },
    {
      label: "Stressed monthly payment",
      value: formatRange(stressEmi),
      explanation: stressEmi
        ? `We test the quote at ${STRESS_BUFFER} percentage points above the stated rate, because a tight budget should survive a less-friendly outcome.`
        : "We need a requested amount, rate, and tenure before we can stress-test the payment.",
    },
    {
      label: "APR including processing fee",
      value: apr ? `${apr.low.toFixed(1)}% – ${apr.high.toFixed(1)}%` : "Not enough information",
      explanation: apr
        ? `This includes a ${inputs.processingFeePercent === null ? `0%–${feeRange.high.toFixed(1)}% working fee range` : `${fee.toFixed(1)}% processing fee`} deducted before disbursal, not just the advertised interest rate.`
        : "APR needs the principal, rate, tenure, and processing fee. The fee is never silently ignored.",
    },
  ];

  const negotiationPoints: string[] = [];
  if (lenderSanction !== null && safeAmount !== null && lenderSanction > safeAmount.high) {
    negotiationPoints.push(`Ask for an amount closer to ${formatRupees(safeAmount.high)} instead of accepting the full sanction.`);
  }
  if (apr !== null && fee > 0) {
    negotiationPoints.push(`Ask the lender to show the APR after the ${fee.toFixed(1)}% processing fee, not only the headline rate.`);
  }
  if (inputs.rateLow === null || inputs.rateHigh === null) {
    negotiationPoints.push("Request the written annual interest-rate range before signing; an unknown rate widens the safe range.");
  }
  if (inputs.tenureMonths !== null && inputs.tenureMonths > 48) {
    negotiationPoints.push("Ask how much total interest changes if you shorten the tenure; a lower EMI can cost more overall.");
  }
  if (inputs.hasCollateral === true) {
    negotiationPoints.push("Collateral may change the route or rate, but it does not increase what your monthly cash flow can safely repay.");
  }
  if (inputs.incomeStability !== "stable") {
    negotiationPoints.push("Keep a larger cash buffer and negotiate a repayment schedule that matches your weaker months.");
  }
  if (inputs.monthlyEssentials === null || inputs.existingEmis === null) {
    negotiationPoints.push("Fill in essentials and existing EMIs before treating the safe range as a green light; both are currently bounded estimates.");
  }
  if (inputs.monthlyTakeHome !== null && inputs.businessIncome !== null) {
    negotiationPoints.push("We used your own take-home income. Business income is shown separately and is not counted twice.");
  }

  return {
    decision,
    route,
    safeAmount,
    safePayment,
    lenderSanction,
    requestedAmount: requested,
    baseEmi,
    stressEmi,
    apr,
    surplus,
    stressSurplus,
    uncertainty,
    missing,
    explanations,
    negotiationPoints,
    disclaimer:
      "This is a budgeting aid, not a lender decision, financial advice, or a guarantee of approval. Verify the sanction letter, APR, fees, insurance, foreclosure terms, and all repayment conditions before signing.",
  };
}

export const PERSONA_DEFAULTS: Record<string, BorrowerInputs> = {
  Anita: {
    name: "Anita",
    monthlyTakeHome: 32000,
    monthlyEssentials: 29000,
    existingEmis: 1000,
    requestedAmount: 200000,
    sanctionedAmount: 200000,
    tenureMonths: 48,
    rateLow: 16,
    rateHigh: 22,
    processingFeePercent: 2,
    purpose: "personal",
    incomeStability: "stable",
    hasCollateral: false,
    businessIncome: null,
  },
  Ravi: {
    name: "Ravi",
    monthlyTakeHome: 95000,
    monthlyEssentials: 50000,
    existingEmis: 10000,
    requestedAmount: 650000,
    sanctionedAmount: 800000,
    tenureMonths: 60,
    rateLow: 13,
    rateHigh: 17,
    processingFeePercent: 2,
    purpose: "business",
    incomeStability: "variable",
    hasCollateral: true,
    businessIncome: 140000,
  },
  Meera: {
    name: "Meera",
    monthlyTakeHome: 68000,
    monthlyEssentials: null,
    existingEmis: null,
    requestedAmount: 350000,
    sanctionedAmount: 350000,
    tenureMonths: 36,
    rateLow: null,
    rateHigh: null,
    processingFeePercent: null,
    purpose: "education",
    incomeStability: "stable",
    hasCollateral: false,
    businessIncome: null,
  },
};

export function calculatePersona(name: keyof typeof PERSONA_DEFAULTS): DecisionResult {
  return calculateDecision(PERSONA_DEFAULTS[name]);
}