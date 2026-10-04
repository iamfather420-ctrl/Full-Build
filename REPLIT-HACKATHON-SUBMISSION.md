# UAREFAKE / Solvex

## Project title

**UAREFAKE — Proof Before Power**

## One-line description

An evidence-gated control plane that lets AI propose solutions, prove what is safe, obtain authorization, execute bounded actions, and leave a reversible receipt.

## Short project description

Most AI agents are optimized to answer quickly. They are not designed to make the boundary between **capability** and **authority** visible.

UAREFAKE is a verification-first AI control plane built around one principle:

> **An AI should not receive power merely because it can produce an answer.**

Daisy proposes and decomposes a requested action. Solvex checks evidence and formal constraints. A human authorization establishes the allowed scope. MMTAI executes only the bounded operation. The system records what happened, supports rollback, and exports a machine-readable proof receipt.

The result is not just a chatbot response. It is an inspectable action lifecycle:

```text
propose → prove → authorize → execute → observe → reverse
```

## The problem

AI systems are getting better at using tools, changing records, calling APIs, and taking actions. But many demonstrations treat a plausible answer as the end of the problem. They rarely show:

- Whether the request was authorized
- Whether the target was correctly scoped
- Whether the action was reversible
- Whether external provider evidence was present
- What happened after execution
- What a reviewer can inspect later

That gap is where unsafe automation begins.

## The solution

UAREFAKE turns those missing questions into visible system boundaries.

In the judge demo, an AI agent is asked to update enterprise account records. The system first refuses the unsafe shortcut because it lacks operation-scoped authorization, target proof, and a recovery plan. It then constructs a safe alternative limited to a demo tenant and a reversible operation.

After human authorization, the operation runs in a sandbox, a checkpoint is sealed, the state is rolled back, and a receipt is exported.

The refusal is not a failure of the product. It is the product demonstrating that it understands the difference between **what it can do** and **what it is allowed to do**.

## Why it is different

| Typical AI agent demo | UAREFAKE |
| --- | --- |
| Produces a plausible answer | Separates proposals from evidence |
| Tool access implies action | Capability does not imply authority |
| Success ends the flow | Recovery and observability are part of success |
| Trust is communicated by the interface | Trust is represented by scoped receipts |
| Production claims are often implied | Unsupported paths fail closed |

## The judge experience

The `/demo` route is designed as a repeatable three-minute story:

1. **Problem** — an agent is asked to change production records.
2. **Refuse** — Daisy blocks the unsafe path.
3. **Verify** — Solvex constructs a bounded, reversible alternative.
4. **Execute** — a human-authorized sandbox operation runs.
5. **Rollback** — the original state is restored.
6. **Receipt** — the judge downloads machine-readable evidence.
7. **Review** — the judge confirms whether the story was understandable and can ask Daisy a scoped question.

## Technical implementation

- React + TanStack Router/Start
- TypeScript and Vite
- Neon/PostgreSQL persistence path with row-level security policies
- Z3-backed formal verification paths and deterministic replay evidence
- Server-side PayPal provider boundary with fail-closed handling
- GitHub Actions verification workflow
- Evidence receipts with proof roots, operation scope, tenant scope, decision state, and recovery outcome
- A public UAREFAKE experience spanning the landing page, judge demo, registry, storefront, and `.space` surfaces

## Truth boundary

UAREFAKE is intentionally honest about the difference between a working local proof path and a production guarantee.

- **VERIFIED** means executable evidence exists in the stated scope.
- **PARTIAL** means the implementation or local evidence exists, but an external provider or production dependency remains.
- **BLOCKED** means the system refuses promotion or execution until required evidence exists.
- Formal-verification counts apply to the formalized operator and case sets; they are not a universal proof that every real-world outcome is correct.
- The featured demo uses sandbox state and does not claim to mutate production or complete a live payment.

## What we built with Replit

We used Replit as the environment for bringing the verification-first product experience together: the interactive proof cockpit, judge demo, evidence presentation, and the end-to-end story that makes the system’s safety boundaries understandable in a few minutes.

## What is next

- Connect receipt contracts to independent deployment telemetry
- Expand the formal case library while preserving honest coverage reporting
- Add customer-owned evidence bundles and revocation workflows
- Extend verified learning so only evaluated, provenance-linked outcomes become reusable memory
- Keep payment, public outreach, production mutation, and regulated actions explicitly authorization-gated

## Demo call to action

**Open the site, choose “Judge demo,” and watch what happens when the AI is asked to act without enough proof.**

The key question is not whether an AI can act.

**The key question is whether it can prove when it should not.**

---

# 60-second elevator pitch

**[0:00–0:08] Hook**

Most AI agents are built around one assumption: if the model can produce an answer, it should be able to take the action.

**[0:08–0:18] Problem**

But capability is not authority. An AI may understand a request and still lack permission, target proof, or a way to recover if something goes wrong.

**[0:18–0:34] Product**

That is why we built UAREFAKE—Solvex, a proof-before-power control plane. Daisy proposes. Solvex verifies. A human authorizes. MMTAI executes only a bounded, reversible operation.

**[0:34–0:48] Demo**

In our demo, an agent is asked to update production records. The unsafe path is refused. The safe path is narrowed to a demo tenant, executed in a sandbox, checkpointed, rolled back, and sealed into a machine-readable receipt.

**[0:48–0:60] Close**

This is not a chatbot demo. It is a visible boundary between thinking and acting. UAREFAKE does not ask you to trust an AI because it sounds confident. It asks the AI to show its evidence before it receives power.

**UAREFAKE: proof before power.**

---

## Optional 30-second version

AI agents can generate answers. The hard part is knowing when they should be allowed to act.

UAREFAKE is a proof-before-power control plane. Daisy proposes, Solvex verifies, a human authorizes, and MMTAI executes only bounded, reversible actions.

In our demo, an unsafe production request is refused. A safe alternative is scoped to a sandbox, executed, rolled back, and exported as a proof receipt.

This is not a chatbot that sounds trustworthy. It is an AI system that makes trust inspectable.

**UAREFAKE: evidence before claims, authorization before execution.**
