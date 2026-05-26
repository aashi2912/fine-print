# 📜 Fine Print

### AI contract decoder for everyday people

**Live:** [fine-print-aashi.vercel.app](https://fine-print-aashi.vercel.app) &nbsp;·&nbsp; **Code:** [github.com/aashi2912/fine-print](https://github.com/aashi2912/fine-print)

---

Paste, upload, or photograph any contract — lease, NDA, employment offer, freelance agreement, or terms of service. Fine Print breaks it down clause by clause, scores each one, explains it in plain language, and surfaces the standard protections that should be present but aren't.

---

## The problem

Contracts are written by lawyers, for lawyers. A standard residential lease runs 15 to 30 pages of language like *indemnification*, *joint and several liability*, and *quiet enjoyment*. Signing it takes five minutes; understanding it takes a law degree.

- **91%** of people accept legal terms without reading them *(Deloitte, n=2,000)*
- **40%** of leases in one nonprofit review contained questionable or potentially unenforceable clauses *(Shelterforce, 2026)*
- **$349/hour** — average attorney billing rate *(Clio Legal Trends Report, 2025)*
- The most damaging risk in a contract is frequently **what is absent**, not what is written

Enterprise contract-analysis tools are built for legal teams at $500–$5,000/month. Nothing comparable exists for the person signing their first lease on Friday.

---

## What it does

A contract goes in through one of three paths; structured analysis comes back in roughly 15–25 seconds.

- 🟢🟡🔴 **Clause-by-clause risk scoring** — standard, unusual, or risky
- 📄 **Plain-language explanations** — written for someone with no legal background
- 🔍 **Missing-clause detection** — what a fair contract of this type should contain but doesn't
- 💯 **Health score (0–100)** — overall contract quality at a glance, computed deterministically

### The gaps view is the differentiator

Most contract tools tell you what's *in* the document. Fine Print also tells you what's *missing*. A lease with no early-termination clause, no maintenance-response timeline, or no deposit-return deadline is missing protections that directly affect the signer — even though no individual clause says anything wrong.

---

## Three ways to submit a contract

| Method | How it works |
|---|---|
| **Paste text** | Fastest path; source text is retained for quote verification |
| **Upload a PDF** | Read natively by the model, no client-side parsing |
| **Photograph pages** | Capture each page, review thumbnails, analyze all at once. Images compressed client-side before upload. |

---

## Supported contract types

| Type | Issues commonly detected |
|---|---|
| Residential Lease | Unrestricted entry, no deposit-return timeline, no rent cap, property seizure |
| NDA / Confidentiality | No exclusions for public info, perpetual duration, overbroad definitions |
| Employment Contract | Worldwide non-competes, IP covering personal projects, no severance |
| Freelance Agreement | Net-90 with no late penalty, IP grabbing pre-existing work, no kill fee |
| Terms of Service | Unlimited data sharing, auto-renewal without notice, no right to delete |

---

## Architecture

Single-page React application with Vercel serverless API routes. No backend database. Contract text is never stored. All three input paths converge on one analysis orchestrator, so behavior is identical whether the source is pasted text, a PDF, or a stack of photos.

```
Input (paste / PDF / photos)
  → /api/analyze · /api/analyze-file · /api/analyze-images
  → runAnalysis() orchestrator (single pass, or two-pass deep check)
  → JSON: { contractType, clauses[], missingClauses[], reliability flags }
  → client: verify quotes · sort risk-first · score · verdict
  → five screens: Input · Processing · Overview · Clauses · Gaps
```

### AI components

| Component | Technique |
|---|---|
| Document classifier | Identifies contract type from structure and vocabulary |
| Clause extractor | Segments and categorizes each clause |
| Risk scorer | Compares each clause against norms for that contract type |
| Gap detector | Compares extracted categories against a reference template, flags absences |
| Plain-language translator | Produces readable explanations and standard-language references |

### Why a single foundation-model call, not a trained pipeline

Enterprise tools use custom-trained NER models and multi-stage pipelines that require thousands of labeled contracts. A well-prompted foundation model reaches usable accuracy on this task with no training data. For a consumer tool providing legal information — not legal advice — that is the correct tradeoff.

For file uploads, extraction and analysis happen in **one call**: the model reads the document and returns structured analysis directly, halving response time versus a separate extract-then-analyze step.

---

## Reliability engineering

Because an analysis people might rely on must surface uncertainty rather than hide it, the system includes seven reliability mechanisms.

| Mechanism | What it does |
|---|---|
| **Verbatim quote verification** | Every quote checked against source text; unmatched quotes flagged, not displayed as fact |
| **Self-consistency (deep check)** | Optional second pass at higher temperature; disagreements flagged uncertain, more cautious rating shown |
| **Coverage detection** | Truncated analyses detected; complete clauses recovered; user warned coverage may be partial |
| **Input validation** | Non-contract input detected and refused rather than fabricated into an analysis |
| **Deterministic scoring** | Health score computed client-side by fixed formula, never by the model |
| **Retry + timeout** | Transient errors retry with backoff; infrastructure errors translated to plain guidance |
| **Confidence signaling** | Per-clause and overall confidence surfaced as labeled badges |

### Health score formula

```
start at 100
  each red clause:        − 8   (capped at − 48)
  each yellow clause:     − 3   (capped at − 18)
  each critical gap:      − 7   (capped at − 28)
  each recommended gap:   − 2   (capped at − 10)
final = clamp(score, 0, 100)
```

Score is always consistent with what's on screen because it's computed from the clause list, not generated by the model.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| AI analysis | Anthropic Claude Sonnet |
| API | Vercel serverless functions |
| Hosting | Vercel |
| Persistence | None — no backend, no database, no account |

**Cost:** ~$0.02–$0.05 per single-pass analysis. Deep check doubles this.

---

## Setup

```bash
git clone https://github.com/aashi2912/fine-print.git
cd fine-print
npm install
cp .env.example .env      # add your LLM_API_KEY
npm run dev
```

---

## Known limitations

- **Not legal advice.** Fine Print provides legal information and is not a substitute for an attorney.
- **No jurisdiction awareness.** A clause legal in one jurisdiction may be void in another.
- **Accuracy is unmeasured.** Confidence reflects the model's self-assessment, not a validated benchmark.
- **Uploads are not quote-verified.** Verification runs only on pasted text, where the source is available.
- **Five contract types.** Others will produce lower-quality results.
- **English only.**

---

> Fine Print provides legal information, not legal advice. It is not a law firm and is not a substitute for a licensed attorney. For any high-stakes agreement, treat it as a complement to professional review — never a replacement.
