# Fine Print — Reliability & Limitations

This document explains how Fine Print is engineered for trustworthiness, what it can and cannot do, and the specific design decisions behind each reliability mechanism. It is written for two audiences: users deciding how much to rely on the output, and engineers/reviewers evaluating the system.

---

## What Fine Print is — and isn't

**Fine Print is a first-pass triage tool.** It helps a non-lawyer quickly understand what a contract says, which clauses deviate from the norm, and what standard protections might be missing — so they know what to ask about before signing or before paying for a lawyer's time.

**Fine Print is not a lawyer and not a substitute for legal review.** It provides legal *information*, not legal *advice*. This distinction is not a disclaimer bolted on at the end — it is a constraint that shaped the entire product, for two reasons:

1. **No ground truth.** An LLM's legal judgment cannot be verified against a validated dataset of lawyer-reviewed contracts, because we don't have one. We therefore cannot state a false-negative rate (how often a genuinely predatory clause gets marked "standard"). A tool that cannot quantify its own error rate must not present itself as authoritative.

2. **Regulatory precedent.** The FTC's 2025 action against DoNotPay established that AI tools marketed as substitutes for professional legal services — without validation — create consumer harm. Fine Print is deliberately positioned on the correct side of that line: an informational aid, explicitly not a legal-advice product.

The most dangerous failure mode for a tool like this is **false confidence** — a user trusting a clean-looking analysis that silently missed something. Every reliability mechanism below exists to surface uncertainty rather than hide it.

---

## Reliability mechanisms

### 1. Verbatim quote verification
**Problem it solves:** LLMs hallucinate. An analysis might attribute a "quote" to your contract that does not actually appear in it. A user reading that fabricated quote would believe their contract contains language it doesn't.

**How it works:** Every `originalText` quote the model returns is checked character-by-character against the actual source text. Matching is normalized for case, whitespace, and smart-quote variance (so genuine quotes aren't falsely rejected over a curly apostrophe), but a quote that doesn't substantively appear in the source is flagged `verified: false`. The UI marks these clauses "UNVERIFIED" and warns the user to check against their original.

**Limitation:** Verification only runs for pasted text, where we have the source. For PDF/image uploads, the model reads the document directly and we have no separate text to compare against — so those analyses cannot be quote-verified. This is disclosed, not hidden.

### 2. Self-consistency (Deep Check)
**Problem it solves:** A single LLM run can be unstable — the same contract might be scored differently on a different run. A single run hides this instability behind one confident-looking answer.

**How it works:** When the user enables Deep Check, the contract is analyzed **twice** — once at temperature 0 (the primary, deterministic answer) and once at temperature 0.4 (enough variance to expose genuine instability). The two analyses are reconciled clause-by-clause:
- **Both runs agree** on a clause's risk → confidence boosted, marked `agree`.
- **Runs disagree** → the *more cautious* rating is shown, confidence dropped, clause flagged `disagree` ("UNCERTAIN" in the UI) with the alternate rating disclosed.
- **Clause seen in only one run** → flagged `partial`, confidence lowered.

**Design decision — why temperature 0.4 on the second pass:** At temperature 0, both runs are nearly identical, making the consistency check theater. A moderate temperature on the second pass lets it genuinely diverge, so agreement becomes a real signal and disagreement surfaces honest uncertainty.

**Design decision — why opt-in, not default:** Deep Check doubles cost and latency. Imposing that on every analysis — including a one-page balanced lease that doesn't need it — is the wrong default. Making it a user choice respects that reliability has a cost and lets the user spend it where stakes justify it.

**Design decision — why "more cautious wins" on disagreement:** For a consumer-protection tool, a false alarm (flagging a fine clause) costs the user a few minutes of attention. A miss (clearing a predatory clause) could cost them materially. The asymmetry justifies erring toward caution.

### 3. Coverage / truncation detection
**Problem it solves:** A long contract can exceed the model's maximum output length, causing the analysis to cut off mid-result — silently dropping clauses the user never learns about.

**How it works:** The system detects when the model's response was truncated (via the API's `stop_reason`) or when the returned JSON is incomplete. A character-level JSON-recovery parser salvages every *complete* clause object from a truncated response and discards partial ones, then flags `wasTruncated`. The UI shows an explicit banner: "This contract was long — the analysis may not cover every clause."

### 4. Input validation & non-contract detection
**Problem it solves:** Garbage in, confident garbage out. Pasting a recipe shouldn't produce a fabricated "contract analysis."

**How it works:** Text length is bounded (too short to be a contract; too long for one pass). The model is instructed to set `isContract: false` with a reason when the input isn't a contract, and the UI shows a helpful message instead of inventing an analysis.

### 5. Deterministic, transparent scoring
**Problem it solves:** If the health score came from the LLM, it could vary run-to-run and contradict the clauses shown on screen.

**How it works:** The 0–100 health score is computed **client-side** by a fixed formula from the clause/gap counts — never by the model. Same clauses always produce the same score, and the score always matches what's displayed. The formula caps each deduction type so the scale stays meaningful (a contract with many red clauses lands around 15–25, not a meaningless 0).

### 6. Retry, timeout & graceful failure
**Problem it solves:** Transient API failures (rate limits, overload, network blips) shouldn't dead-end the user.

**How it works:** API calls retry with exponential backoff on retryable errors (HTTP 429/529), time out cleanly at 55 seconds, and translate infrastructure errors (e.g. Vercel's payload-size and timeout codes) into plain-English guidance.

### 7. Confidence signaling
Every clause carries a confidence score; the overall analysis confidence is surfaced as a labeled badge (High / Moderate / Low). Low-confidence clauses — ambiguous or jurisdiction-dependent — are individually flagged.

---

## Known limitations (read these)

- **No jurisdiction awareness.** A clause that is legal in one jurisdiction may be void in another. Fine Print does not know where you are and does not apply local law.
- **Accuracy is unmeasured.** Confidence scores reflect the model's self-assessment, not a validated accuracy rate. There is no benchmark dataset behind them.
- **Reference templates are general.** Gap detection compares against general standards for each contract type, not jurisdiction- or industry-specific norms.
- **Uploads aren't quote-verified.** See mechanism #1.
- **Five contract types.** Lease, NDA, employment, freelance, terms of service. Other types will produce lower-quality results.
- **English only.** Not validated on non-English contracts.

---

## The honest bottom line

Fine Print is engineered to be reliable *at what it is*: a fast, transparent, uncertainty-aware triage aid. It will help you read a contract more carefully and know what to question. It will not catch everything, and for any high-stakes agreement it is a complement to — never a replacement for — a qualified attorney.

Where it is uncertain, it tells you. That honesty is the feature.
