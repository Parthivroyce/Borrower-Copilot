import type { BorrowerInputs } from "./decision-engine";

export type QuestionId =
  | "monthlyTakeHome"
  | "monthlyEssentials"
  | "existingEmis"
  | "requestedAmount"
  | "sanctionedAmount"
  | "tenureMonths"
  | "rateRange"
  | "processingFeePercent"
  | "purpose"
  | "incomeStability"
  | "hasCollateral"
  | "businessIncome";

export type Question = {
  id: QuestionId;
  label: string;
  helper: string;
  type: "number" | "choice" | "range";
  options?: Array<{ value: string; label: string }>;
  isRelevant: (inputs: BorrowerInputs) => boolean;
  changes: string;
};

export const QUESTIONS: Question[] = [
  {
    id: "monthlyTakeHome",
    label: "What reaches your account each month?",
    helper: "Use your own after-tax take-home income. We do not count a spouse's income unless they are a co-borrower.",
    type: "number",
    isRelevant: () => true,
    changes: "changes the surplus, safe payment, and safe amount",
  },
  {
    id: "monthlyEssentials",
    label: "What do your essentials cost each month?",
    helper: "Include rent, food, utilities, transport, medicine, and other costs you cannot easily pause.",
    type: "number",
    isRelevant: () => true,
    changes: "changes the surplus and the stress-tested payment limit",
  },
  {
    id: "existingEmis",
    label: "How much do existing EMIs take each month?",
    helper: "Do not include the new loan. Unknown is safer than entering zero.",
    type: "number",
    isRelevant: () => true,
    changes: "changes how much repayment room remains",
  },
  {
    id: "purpose",
    label: "What is the loan for?",
    helper: "This determines which route and questions are relevant.",
    type: "choice",
    options: [
      { value: "personal", label: "Personal need" },
      { value: "business", label: "Business or working capital" },
      { value: "education", label: "Education" },
      { value: "medical", label: "Medical need" },
    ],
    isRelevant: () => true,
    changes: "can route you away from an unsecured personal loan",
  },
  {
    id: "businessIncome",
    label: "What does the business contribute in a typical month?",
    helper: "Keep this separate from your own take-home pay. It is context, not a second copy of your income.",
    type: "number",
    isRelevant: (inputs) => inputs.purpose === "business",
    changes: "adds a separate business-income caveat to the recommendation",
  },
  {
    id: "hasCollateral",
    label: "Could you offer collateral for a purpose-matched loan?",
    helper: "Collateral can change the lender route or rate. It never increases what your monthly cash flow can safely repay.",
    type: "choice",
    options: [
      { value: "yes", label: "Yes, I could discuss it" },
      { value: "no", label: "No" },
      { value: "unknown", label: "I am not sure" },
    ],
    isRelevant: (inputs) => inputs.purpose === "business" || inputs.purpose === "education",
    changes: "can change the suggested route, not the safe affordability number",
  },
  {
    id: "requestedAmount",
    label: "How much do you want to borrow?",
    helper: "Use the amount you would actually take, not the biggest number on an offer page.",
    type: "number",
    isRelevant: () => true,
    changes: "changes the EMI, APR, stress test, and comparison with the safe range",
  },
  {
    id: "sanctionedAmount",
    label: "What amount did the lender sanction or offer?",
    helper: "This is a lender-side number. Keeping it separate lets us show when approval is higher than what is safe for you.",
    type: "number",
    isRelevant: () => true,
    changes: "changes the lender-versus-borrower comparison",
  },
  {
    id: "tenureMonths",
    label: "What tenure are you considering?",
    helper: "A longer tenure can lower the EMI while increasing total interest.",
    type: "number",
    isRelevant: () => true,
    changes: "changes the EMI, safe amount, APR, and total-cost trade-off",
  },
  {
    id: "rateRange",
    label: "What annual interest-rate range did the lender quote?",
    helper: "If you do not know yet, leave it unknown. We widen the rate range rather than pretending the quote is precise.",
    type: "range",
    isRelevant: () => true,
    changes: "changes the EMI, APR, stress test, and uncertainty band",
  },
  {
    id: "processingFeePercent",
    label: "What processing fee is written in the offer?",
    helper: "This fee is deducted from disbursal and is included in the APR estimate.",
    type: "number",
    isRelevant: () => true,
    changes: "changes the APR because the fee reduces the cash you receive",
  },
  {
    id: "incomeStability",
    label: "How steady is your income month to month?",
    helper: "The answer changes the buffer we keep between your surplus and a safe payment.",
    type: "choice",
    options: [
      { value: "stable", label: "Stable" },
      { value: "variable", label: "Somewhat variable" },
      { value: "uncertain", label: "Uncertain or seasonal" },
    ],
    isRelevant: () => true,
    changes: "changes the safety buffer and the caution level",
  },
];

export function relevantQuestions(inputs: BorrowerInputs): Question[] {
  return QUESTIONS.filter((question) => question.isRelevant(inputs));
}