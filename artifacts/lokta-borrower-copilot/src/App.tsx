import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Clipboard, FileText, Info, LockKeyhole, RotateCcw, ShieldCheck } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PERSONA_DEFAULTS, calculateDecision, formatRange, formatRupees, type BorrowerInputs, type DecisionResult, type PersonaId } from '@/lib/decision-engine';
import { relevantQuestions } from '@/lib/questions';

const queryClient = new QueryClient();

type Stage = 'choose' | 'answer' | 'review' | 'card';

const personas: Array<{ id: PersonaId; name: string; initial: string; description: string; type: string }> = [
  { id: 'anita', name: 'Anita', initial: 'A', description: 'Salaried, planning a personal expense', type: 'Stable monthly income' },
  { id: 'ravi', name: 'Ravi', initial: 'R', description: 'Business owner, funding a next step', type: 'Uneven business cash flow' },
  { id: 'meera', name: 'Meera', initial: 'M', description: 'Freelancer, weighing a larger purchase', type: 'Some details still unknown' },
];

function initialFor(id: PersonaId): BorrowerInputs {
  const name = id === 'anita' ? 'Anita' : id === 'ravi' ? 'Ravi' : 'Meera';
  return { ...PERSONA_DEFAULTS[name] };
}

function App() {
  const [stage, setStage] = useState<Stage>('choose');
  const [persona, setPersona] = useState<PersonaId>('anita');
  const [inputs, setInputs] = useState<BorrowerInputs>(() => initialFor('anita'));
  const [copied, setCopied] = useState(false);
  const decision = useMemo(() => calculateDecision(inputs), [inputs]);
  const selected = personas.find((item) => item.id === persona)!;

  const choosePersona = (id: PersonaId) => {
    setPersona(id);
    setInputs(initialFor(id));
    setStage('choose');
    setCopied(false);
  };

  const startAnswers = () => setStage('answer');
  const updateNumber = (key: keyof BorrowerInputs, value: string) => {
    setInputs((current) => ({ ...current, [key]: value === '' ? null : Number(value) }));
  };
  const updateText = (key: keyof BorrowerInputs, value: string) => {
    if (key === 'hasCollateral') {
      setInputs((current) => ({ ...current, [key]: value === '' ? null : value === 'true' }));
      return;
    }
    setInputs((current) => ({ ...current, [key]: value }));
  };

  const copyCard = async () => {
    const text = `${selected.name}'s Lokta negotiation card\n\n${decision.negotiationPoints.join('\n')}\n\n${decision.disclaimer}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="app">
      <header className="topbar shell">
        <div className="brand" data-testid="brand-lokta">
          <span className="brand-mark">L</span>
          <span>lokta <small>borrower copilot</small></span>
        </div>
        <div className="top-note"><i /> your numbers stay on this page</div>
      </header>

      <main className="shell">
        <section className="hero">
          <div className="hero-copy fade-in">
            <div className="eyebrow">before you sign</div>
            <h1>A loan should fit your life. Not the other way around.</h1>
            <p>Lokta helps Indian borrowers compare a lender’s offer with <strong>what your monthly cash flow can safely carry</strong> — then gives you plain words to take back to the lender.</p>
            <div className="hero-actions">
              <button className="button button-primary" data-testid="button-begin" onClick={() => document.getElementById('decision-workspace')?.scrollIntoView({ behavior: 'smooth' })}>Check a loan <ArrowRight size={16} /></button>
              <span className="hero-sidenote"><LockKeyhole size={13} /> No lender affiliation. No eligibility score.</span>
            </div>
          </div>
          <div className="compass fade-in" aria-label="Lokta's approach">
            <div className="compass-label">the lokta rule</div>
            <h2>The biggest sanctioned amount is not the safest amount.</h2>
            <p>We protect the money left after real life — groceries, rent, family, and the occasional bad month.</p>
            <div className="compass-line"><span /> start with breathing room</div>
          </div>
        </section>

        <section className="workspace" id="decision-workspace">
          <div className="stepper" aria-label="Decision steps">
            <Step number="1" label="Choose" active={stage === 'choose'} done={stage !== 'choose'} />
            <span className="step-rail" />
            <Step number="2" label="Answer" active={stage === 'answer'} done={stage === 'review' || stage === 'card'} />
            <span className="step-rail" />
            <Step number="3" label="Review" active={stage === 'review'} done={stage === 'card'} />
            <span className="step-rail" />
            <Step number="4" label="Negotiate" active={stage === 'card'} done={false} />
          </div>

          {stage === 'choose' && (
            <section className="panel fade-in" data-testid="panel-choose">
              <div className="panel-header">
                <div>
                  <div className="label-mono">one person at a time</div>
                  <h2 className="panel-title">Who are we sitting beside today?</h2>
                  <p className="panel-subtitle">Choose a story to see the questions that matter for that kind of income. You can change every number before we review it.</p>
                </div>
                <ShieldCheck color="#16665e" size={27} strokeWidth={1.6} />
              </div>
              <div className="persona-grid">
                {personas.map((item) => (
                  <button key={item.id} className={`persona-card ${persona === item.id ? 'selected' : ''}`} data-testid={`button-persona-${item.id}`} onClick={() => choosePersona(item.id)}>
                    {persona === item.id && <span className="selected-mark"><Check size={17} /></span>}
                    <span className="persona-initial">{item.initial}</span>
                    <span className="persona-name">{item.name}</span>
                    <span className="persona-type">{item.description}<br />{item.type}</span>
                  </button>
                ))}
              </div>
              <div className="panel-footer">
                <span className="field-help">This is a private planning conversation, not a lender application.</span>
                <button className="button button-primary" data-testid="button-start-answers" onClick={startAnswers}>Start {selected.name}&apos;s check <ArrowRight size={16} /></button>
              </div>
            </section>
          )}

          {stage === 'answer' && (
            <QuestionPanel
              persona={persona}
              inputs={inputs}
              selected={selected}
              updateNumber={updateNumber}
              updateText={updateText}
              onBack={() => setStage('choose')}
              onReview={() => setStage('review')}
            />
          )}

          {(stage === 'review' || stage === 'card') && (
            <ReviewPanel
              persona={persona}
              selected={selected}
              inputs={inputs}
              decision={decision}
              cardOpen={stage === 'card'}
              copied={copied}
              onBack={() => setStage('answer')}
              onCard={() => setStage('card')}
              onCopy={copyCard}
              onNew={() => { setStage('choose'); setCopied(false); }}
            />
          )}
        </section>

        <LearnSection />
        <div className="disclaimer"><strong>A note on limits:</strong> Lokta is a budgeting aid, not a lender decision, financial advice, or a guarantee of approval. Verify the sanction letter, APR, fees, insurance, foreclosure terms, and all repayment conditions before signing. Nothing here replaces a qualified financial adviser.</div>
      </main>
      <Toaster />
    </div>
  );
}

function Step({ number, label, active, done }: { number: string; label: string; active: boolean; done: boolean }) {
  return <div className={`step ${active ? 'active' : ''} ${done ? 'done' : ''}`}><b>{done ? <Check size={13} /> : number}</b>{label}</div>;
}

function QuestionPanel({ persona, inputs, selected, updateNumber, updateText, onBack, onReview }: {
  persona: PersonaId; inputs: BorrowerInputs; selected: typeof personas[number];
  updateNumber: (key: keyof BorrowerInputs, value: string) => void;
  updateText: (key: keyof BorrowerInputs, value: string) => void; onBack: () => void; onReview: () => void;
}) {
  const questionIds = new Set(relevantQuestions(inputs).map((question) => question.id));
  const field = (key: keyof BorrowerInputs, label: string, help: string, prefix = '₹') => (
    <div className="field" key={key}>
      <label htmlFor={`input-${String(key)}`}>{label}</label>
      <div className="input-wrap">
        {prefix && <span className="input-prefix">{prefix}</span>}
        <input id={`input-${String(key)}`} className={prefix ? 'prefix' : ''} data-testid={`input-${String(key)}`} type="number" min="0" value={inputs[key] === null ? '' : String(inputs[key] ?? '')} onChange={(event) => updateNumber(key, event.target.value)} />
      </div>
      <span className="field-help">{help}</span>
    </div>
  );

  return (
    <section className="panel fade-in" data-testid="panel-questions">
      <div className="panel-header">
        <div>
          <div className="label-mono">step 2 / only what matters</div>
          <h2 className="panel-title">{selected.name}&apos;s monthly picture</h2>
          <p className="panel-subtitle">{persona === 'anita' ? 'Start with what reaches your bank account, then protect the essentials that cannot be negotiated away.' : persona === 'ravi' ? 'Separate business cash from household cash. A good business loan should not quietly become a personal burden.' : 'Use a lower month, not your best month. Where a number is missing, Lokta will keep the result cautious.'} <strong>{relevantQuestions(inputs).length} questions apply to this situation.</strong></p>
        </div>
        <div className="label-mono">editable</div>
      </div>
      <div className="form-grid">
        {field('monthlyTakeHome', persona === 'ravi' ? 'Personal take-home each month' : 'Take-home income each month', 'After tax, deductions, and business withdrawals')}
        <div className="field">
          <label htmlFor="input-purpose">What is the loan for?</label>
          <select id="input-purpose" data-testid="input-purpose" value={inputs.purpose ?? ''} onChange={(event) => updateText('purpose', event.target.value)}>
            <option value="">Choose a purpose</option><option value="personal">Personal need</option><option value="business">Business or working capital</option><option value="education">Education</option><option value="medical">Medical need</option>
          </select>
          <span className="field-help">This determines which route and follow-up questions are relevant.</span>
        </div>
        {questionIds.has('businessIncome') && field('businessIncome', 'Business income before costs', 'Keep this separate from what you pay yourself')}
        {field('monthlyEssentials', persona === 'ravi' ? 'Household essentials' : 'Essential monthly spending', 'Rent, food, school, bills, and basics')}
        {field('existingEmis', 'Existing EMIs each month', 'Include credit cards and informal repayment promises')}
        {field('requestedAmount', 'Amount you want to borrow', 'The amount you would actually take home')}
        {field('sanctionedAmount', 'Amount the lender has sanctioned', 'Leave blank if you have no offer yet')}
        {field('tenureMonths', 'Repayment period in months', 'Longer can lower EMI but raise total interest', '')}
        <div className="field">
          <label htmlFor="input-incomeStability">How predictable is this income?</label>
          <select id="input-incomeStability" data-testid="input-income-stability" value={inputs.incomeStability ?? ''} onChange={(event) => updateText('incomeStability', event.target.value)}>
            <option value="">I am not sure</option><option value="stable">Mostly the same</option><option value="variable">Changes month to month</option><option value="uncertain">Hard to predict</option>
          </select>
          <span className="field-help">This changes the buffer we keep aside.</span>
        </div>
        {questionIds.has('hasCollateral') && <div className="field">
          <label htmlFor="input-hasCollateral">Is there an asset for security?</label>
          <select id="input-hasCollateral" data-testid="input-collateral" value={inputs.hasCollateral === null ? '' : String(inputs.hasCollateral)} onChange={(event) => setInputsFromText(updateText, 'hasCollateral', event.target.value)}>
            <option value="">Not decided</option><option value="true">Yes, worth exploring</option><option value="false">No</option>
          </select>
          <span className="field-help">Security may change the route, not your repayment capacity.</span>
        </div>}
        <div className="field">
          <label htmlFor="input-rateLow">Quoted interest rate range</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input id="input-rateLow" data-testid="input-rate-low" type="number" min="0" placeholder="from %" value={inputs.rateLow ?? ''} onChange={(event) => updateNumber('rateLow', event.target.value)} />
            <input id="input-rateHigh" data-testid="input-rate-high" type="number" min="0" placeholder="to %" value={inputs.rateHigh ?? ''} onChange={(event) => updateNumber('rateHigh', event.target.value)} />
          </div>
          <span className="field-help">Use annual reducing-balance rates. It is okay not to know yet.</span>
        </div>
        <div className="field">
          <label htmlFor="input-processingFeePercent">Processing fee</label>
          <div className="input-wrap"><input id="input-processingFeePercent" data-testid="input-processing-fee" type="number" min="0" step="0.1" placeholder="for example, 2" value={inputs.processingFeePercent ?? ''} onChange={(event) => updateNumber('processingFeePercent', event.target.value)} /><span className="input-prefix" style={{ left: 'auto', right: 14 }}>%</span></div>
          <span className="field-help">The fee can be deducted before the loan reaches you.</span>
        </div>
      </div>
      <div className="panel-footer">
        <button className="button button-quiet" data-testid="button-back-to-personas" onClick={onBack}><ArrowLeft size={16} /> Change person</button>
        <button className="button button-primary" data-testid="button-review-decision" onClick={onReview}>Review the decision <ArrowRight size={16} /></button>
      </div>
    </section>
  );
}

function setInputsFromText(updateText: (key: keyof BorrowerInputs, value: string) => void, key: keyof BorrowerInputs, value: string) {
  updateText(key, value === '' ? '' : value);
}

function ReviewPanel({ selected, inputs, decision, cardOpen, copied, onBack, onCard, onCopy, onNew }: {
  persona: PersonaId; selected: typeof personas[number]; inputs: BorrowerInputs; decision: DecisionResult; cardOpen: boolean; copied: boolean;
  onBack: () => void; onCard: () => void; onCopy: () => void; onNew: () => void;
}) {
  const isStop = decision.decision === "DON'T BORROW";
  const isBusiness = decision.route === 'secured-business';
  return (
    <section className="panel fade-in" data-testid="panel-review">
      <div className="panel-header">
        <div>
          <div className="label-mono">step 3 / a slower look</div>
          <h2 className="panel-title">Here is what the numbers say, {selected.name}.</h2>
          <p className="panel-subtitle">This is not a score. It is a conversation between the offer and the money you need to keep for ordinary life.</p>
        </div>
        <Info color="#16665e" size={27} strokeWidth={1.6} />
      </div>
      <div className="review-grid">
        <div className="summary-box">
          <h3>Your inputs</h3>
          <ul className="summary-list">
            <li><span>Monthly take-home</span><strong>{formatRupees(inputs.monthlyTakeHome)}</strong></li>
            <li><span>Essential spending</span><strong>{formatRupees(inputs.monthlyEssentials)}</strong></li>
            <li><span>Existing EMIs</span><strong>{formatRupees(inputs.existingEmis)}</strong></li>
            <li><span>Amount requested</span><strong>{formatRupees(inputs.requestedAmount)}</strong></li>
            <li><span>Lender’s sanction</span><strong data-testid="text-lender-sanction">{formatRupees(decision.lenderSanction)}</strong></li>
            <li><span>Income certainty</span><strong>{inputs.incomeStability || 'Not known'}</strong></li>
          </ul>
          <p className="summary-note">These figures use only your own cash flow. A blank is shown as unknown, never as ₹0.</p>
          <button className="button button-quiet" style={{ marginTop: 16, paddingLeft: 0 }} data-testid="button-edit-answers" onClick={onBack}><ArrowLeft size={14} /> Edit answers</button>
        </div>
        <div className={`decision-box ${isStop ? 'stop' : decision.decision === 'BORROW WITH CAUTION' ? 'caution' : ''}`} data-testid="status-decision">
          <div className="decision-kicker">Lokta’s read · {decision.uncertainty} certainty</div>
          <h3>{isBusiness ? 'USE A BUSINESS ROUTE' : decision.decision}</h3>
          <p className="decision-reason">{isBusiness ? 'Your business may be able to carry this need, but a personal loan puts the household in the first line of fire. Compare a secured or business facility before signing a personal offer.' : decision.decision === 'BORROW WITH CAUTION' ? 'There may be a workable loan here, but the unknowns deserve a written answer before you commit.' : decision.decision === "DON'T BORROW" ? 'The proposed repayment is asking for money your month does not reliably have. Protect the next month first.' : 'The request appears to fit inside the cash flow you described, with room left for ordinary life.'}</p>
          <div className="decision-metrics">
            <div className="metric"><small>safe amount</small><b data-testid="text-safe-range">{formatRange(decision.safeAmount)}</b></div>
            <div className="metric"><small>stressed EMI</small><b data-testid="text-stress-emi">{formatRange(decision.stressEmi)}</b></div>
            <div className="metric"><small>APR incl. fee</small><b data-testid="text-apr">{decision.apr ? `${decision.apr.low.toFixed(1)}% – ${decision.apr.high.toFixed(1)}%` : 'Not enough information'}</b></div>
          </div>
          <div className="range-track" aria-label="safe range visual"><div className="range-fill" /></div>
          <div className="range-labels"><span>protect essentials</span><span>room for the EMI</span></div>
        </div>
      </div>

      <div className="learn-grid" style={{ marginTop: 20 }}>
        {decision.explanations.map((item, index) => (
          <div className="learn-card" key={item.label} data-testid={`card-explanation-${index}`}>
            <div className="learn-num">0{index + 1}</div>
            <h3>{item.label}</h3>
            <p><strong data-testid={`text-explanation-value-${index}`}>{item.value}</strong><br />{item.explanation}</p>
          </div>
        ))}
      </div>
      {decision.missing.length > 0 && <div className="missing-callout" data-testid="callout-missing-data"><AlertTriangle size={16} /><div><strong>Some of this is still an estimate.</strong>{decision.missing.join(' · ')}. Ask the lender for written values before treating this as a green light.</div></div>}
      <div className="panel-footer">
        <button className="button button-quiet" data-testid="button-start-over" onClick={onNew}><RotateCcw size={15} /> New check</button>
        <button className="button button-coral" data-testid="button-open-negotiation" onClick={onCard}><FileText size={16} /> Read your Negotiation Card <ArrowRight size={16} /></button>
      </div>

      {cardOpen && <section className="negotiation fade-in" data-testid="panel-negotiation-card">
        <div className="negotiation-header">
          <div><div className="label-mono">step 4 / take this with you</div><h3>Negotiation Card for {selected.name}</h3><p>Specific questions create better decisions than pressure or guesswork.</p></div>
          <button className="button button-quiet" data-testid="button-copy-card" onClick={onCopy}>{copied ? <Check size={15} /> : <Clipboard size={15} />} {copied ? 'Copied' : 'Copy card'}</button>
        </div>
        <div className="script" data-testid="text-negotiation-script">{decision.decision === "DON'T BORROW" ? '“I am going to pause this loan. The repayment does not leave enough room for my monthly essentials. Please do not treat the sanctioned amount as proof that it is affordable for me.”' : isBusiness ? '“Before I consider a personal loan, please show me the equivalent business or secured option. I need the total repayment, all fees, and what happens to the collateral if one season is weak.”' : '“My income is not the same every month. Please structure this around my lower month and show the full APR, including every processing and foreclosure fee, before I decide.”'}</div>
        <div className="ask-grid">
          {decision.negotiationPoints.slice(0, 3).map((point, index) => <div className="ask" key={point} data-testid={`ask-point-${index}`}><small>ask {index + 1}</small><strong>{point}</strong></div>)}
        </div>
      </section>}
    </section>
  );
}

function LearnSection() {
  return <section className="learn" data-testid="section-explainer">
    <div className="learn-intro"><div className="eyebrow">a little clarity</div><h2>What Lokta checks before it says yes.</h2><p>A lender measures how much it can lend. Lokta asks a more protective question: how much can leave your account every month without taking your future with it?</p></div>
    <div className="learn-grid">
      <div className="learn-card"><div className="learn-num">01 / offer</div><h3>Sanction is not safety</h3><p>A lender-sanctioned amount reflects eligibility. A borrower-safe amount starts after essentials, existing EMIs, and a buffer.</p></div>
      <div className="learn-card"><div className="learn-num">02 / range</div><h3>Unknown values stay unknown</h3><p>We show ranges and missing data instead of quietly turning a blank rate or expense into a confident zero.</p></div>
      <div className="learn-card"><div className="learn-num">03 / stress</div><h3>Test the uncomfortable month</h3><p>We check a higher rate and a lower income month so a workable plan has some weatherproofing.</p></div>
      <div className="learn-card"><div className="learn-num">04 / true cost</div><h3>APR includes the fee</h3><p>Processing fees reduce what reaches you. The real cost should not hide behind a neat headline interest rate.</p></div>
    </div>
  </section>;
}

export default function RootApp() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><ErrorBoundary><App /></ErrorBoundary></TooltipProvider></QueryClientProvider>;
}