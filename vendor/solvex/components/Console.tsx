import React, { useMemo, useState } from 'react';
import { MarketplaceView } from './MarketplaceView';
import { PayPalHub } from './PayPalHub';
import { UserContext } from '../auth/AuthService';
import {
  ENGINE_LIFECYCLE,
  integrationFacts,
  proposeProblem,
  publicOperatingPicture,
  type ProposalResult,
} from '../public/publicBoundary';
import { corpusShape, runCorpus120, type CorpusPublicSummary } from '../proofs/Corpus120';
import { publicModelRegistry } from '../inference/modelRegistry';

const viewer: UserContext = {
  user_id: 'unverified-preview',
  tenant_id: 'public-unauthenticated',
  email: 'no-oidc-session',
  role: 'CUSTOMER',
  issued_at: 0,
};

export default function Console() {
  const [picture, setPicture] = useState(() => publicOperatingPicture());
  const facts = useMemo(() => integrationFacts(), [picture]);
  const [draft, setDraft] = useState('');
  const [receipt, setReceipt] = useState<ProposalResult | null>(null);
  const [corpus, setCorpus] = useState<CorpusPublicSummary | null>(null);
  const [corpusRunning, setCorpusRunning] = useState(false);
  const models = useMemo(() => publicModelRegistry(null), []);
  const shape = useMemo(() => corpusShape(), []);

  const fileProposal = () => {
    const result = proposeProblem(draft);
    setReceipt(result);
    if (result.ok) {
      setDraft('');
      setPicture(publicOperatingPicture());
    }
  };

  return (
    <div className="sx">
      <header className="sx-top">
        <p className="sx-kicker">Solvex + Daisy Haminja</p>
        <h1>
          <span>Sovereign</span>
          <span>Enterprise OS</span>
        </h1>
        <div className="sx-meta">
          <span>No session</span>
          <span>Payments off</span>
          <span>Corpus private</span>
          <span>{picture.domain}</span>
        </div>
      </header>

      <section className="sx-stage" aria-label="Operating split">
        <div className="sx-split">
          <article className="sx-read">
            <p className="sx-kicker">01 — Daisy</p>
            <h2>Private intelligence</h2>
            <p>
              Daisy coordinates. This screen does not open her brain, instructions, or tools.
              Activation is {picture.daisy_activation.toLowerCase()}.
            </p>
            <p className="sx-quiet">{picture.daisy_reason}</p>
          </article>
          <article className="sx-read">
            <p className="sx-kicker">02 — Corpus</p>
            <h2>120 cases</h2>
            <p>
              {shape.ok
                ? '88 DFRL operators and 32 DH contracts. A stored stamp is not a pass.'
                : shape.reason}
            </p>
            <button
              type="button"
              className="sx-run"
              disabled={corpusRunning || !shape.ok}
              onClick={() => {
                setCorpusRunning(true);
                runCorpus120()
                  .then(setCorpus)
                  .finally(() => setCorpusRunning(false));
              }}
            >
              {corpusRunning ? 'Running' : 'Run corpus'}
            </button>
            {corpus && (
              <p className="sx-quiet" role="status">
                {corpus.status}. Executed {corpus.executed}. Blocked {corpus.blocked}. Failed {corpus.failed}. {corpus.detail}
              </p>
            )}
          </article>
        </div>
      </section>

      <section className="sx-block" aria-label="Solution engine">
        <p className="sx-index">03 — Infinite Space</p>
        <div className="sx-stage-head">
          <h2>File a problem</h2>
        </div>
        <p>It is recorded as proposed. That does not authorize a build, a test run, or a listing.</p>
        <ol className="sx-life">
          {ENGINE_LIFECYCLE.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <label className="sx-field">
          <span className="sx-kicker">Problem</span>
          <textarea
            value={draft}
            maxLength={2000}
            rows={4}
            placeholder="What has to be solved, and what must not happen?"
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <button type="button" className="sx-run" onClick={fileProposal}>
          File as proposed
        </button>
        {receipt && !receipt.ok && <p className="sx-error">{receipt.error}</p>}
        {receipt && receipt.ok && (
          <p className="sx-quiet" role="status">
            {receipt.id} is {receipt.state}. Not verified. Not publishable. {picture.publish_block}
          </p>
        )}
      </section>

      <section className="sx-block" aria-label="Marketplace">
        <p className="sx-index">04 — Solvex</p>
        <MarketplaceView
          currentUser={viewer}
          onNavigateToPayPal={() => {}}
          onNavigateToEvidence={() => {}}
        />
      </section>

      <section className="sx-block" aria-label="Payments">
        <p className="sx-index">05 — Payments locked</p>
        <PayPalHub onCredentialsUpdated={() => {}} />
      </section>

      <section className="sx-block" aria-label="Integration status">
        <p className="sx-index">06 — What is actually wired</p>
        <h2>Integration</h2>
        <ul className="sx-facts">
          {facts.map((fact) => (
            <li key={fact.name}>
              <span className="sx-fact-state" data-state={fact.state}>{fact.state}</span>
              <strong>{fact.name}</strong>
              <span>{fact.detail}</span>
            </li>
          ))}
        </ul>
        <p className="sx-quiet">
          {picture.open_proposals} open proposal{picture.open_proposals === 1 ? '' : 's'}.
          Audit records {picture.audit_records}, chain {picture.chain_valid ? 'holds' : 'does not hold'}.
          Verified public offers {picture.verified_public_offers}.
        </p>
      </section>

      <section className="sx-block" aria-label="Model registry">
        <p className="sx-index">07 — Models</p>
        <h2>Registry</h2>
        <p>Weight files are not shipped. The hash is shown only when a real file is measured.</p>
        <ul className="sx-facts">
          {models.map((model) => (
            <li key={model.id}>
              <span className="sx-fact-state" data-state={model.weightStatus === 'PRESENT' ? 'implemented' : 'missing'}>
                {model.weightStatus === 'NOT_APPLICABLE' ? 'no weights' : model.weightStatus.toLowerCase()}
              </span>
              <strong>{model.id}</strong>
              <span>
                {model.role}. {model.format}. Inference {model.inference.toLowerCase().replace('_', ' ')}.
                {model.weightSha256 ? ` sha256 ${model.weightSha256}.` : ''} {model.note}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
