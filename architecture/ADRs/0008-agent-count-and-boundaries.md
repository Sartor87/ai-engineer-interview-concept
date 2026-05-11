# ADR-0008: Agent Count and Boundaries — Three Specialised Agents

## Status

Proposed

Links to [0007](0007-agent-orchestration-platform.md)

**Date:** 2026-05-11  
**Deciders:** Engineering team

## Context

Having chosen Azure AI Agent Service as the orchestration platform (ADR-0007), the next decision is how many agents to define and where their responsibilities begin and end.

This maps directly to the service boundary question in distributed systems. The distributed transactions video makes the trade-off explicit for both extremes:

**Too few (one agent / monolith):**
> "When you're first building an application, transactions are easy… wrap the whole thing in a transaction."
A single agent with a compound system prompt handles all roles. Simple to start, but coupling means the interviewer tone, scoring rubric, and sales pitch compete in one context window — and any change to one affects all.

**Too many (five or more agents):**
> "Once you get to five or six services all publishing and reacting to each other's events, figuring out the current state of any given transaction becomes really difficult. Where exactly did it fail? Which compensating actions have already run?"
Fine-grained agents (separate knowledge retrieval, scoring sub-agent, resource catalogue agent, personalisation agent…) maximise isolation but create an observability problem. Each handoff is a potential failure point requiring its own compensating action.

**Three agents:**
> "Choreography is usually where teams start and for simple flows it works great. If you have three or four steps, the services are truly independent… orchestration keeps things simple."
Three clearly-bounded agents with sequential handoffs and one orchestrator matches the pattern the video endorses as the industry default for flows of this complexity.

Additionally, EU AI Act Article 14 requires human oversight to be feasible. More agents = more handoff boundaries to gate; fewer agents = oversight points are clear and auditable.

## Options Considered

### Option A: Single agent (one compound system prompt)
| Dimension | Assessment |
|---|---|
| Context window | All conversation history + interview + exam + sales in one 4,096-token context (ADR-0004 constraint) — will overflow for longer sessions |
| Role isolation | None — interviewer tone bleeds into examiner scoring |
| Observability | Trivial — one thread, one log |
| EU AI Act oversight | Human can review single output but cannot intervene at phase boundary |
| Compensating action | Restart whole session on failure |
| NIS2 audit | Single log per session — simple but coarse |

### Option B: Three agents — Interviewer, Examiner, Aftersales ✅
| Dimension | Assessment |
|---|---|
| Interviewer | Conducts the practice session; adversarial tone; no scoring vocabulary |
| Examiner | Receives obfuscated transcript; scores against rubric; produces structured result |
| Aftersales | Triggered only on score below threshold; recommends learning resources; never sees raw conversation |
| Context window | Each agent receives only its own relevant context — avoids the 4,096-token ceiling per turn |
| Role isolation | Clean — each agent has one system prompt and one responsibility |
| Observability | Orchestrator knows exactly which agent is in flight (ADR-0007) |
| EU AI Act oversight | Human gate at Examiner → Aftersales boundary; Aftersales trigger threshold is auditable |
| Compensating action | Per-agent: retry interview turn; re-run examiner with stored transcript; skip aftersales on failure |
| NIS2 audit | Per-agent turn log; PII obfuscated before Examiner receives transcript |
| Aftersales isolation | Agent never receives the candidate's name or raw session ID — only topic gaps |

### Option C: Five or more agents (granular decomposition)
Hypothetical split: KnowledgeRetriever, QuestionSelector, Interviewer, Scorer, ResourceRecommender, PersonalisationEngine.

| Dimension | Assessment |
|---|---|
| Isolation | Maximum |
| Orchestration complexity | High — six failure points, six compensating actions |
| Observability | Requires distributed tracing across all agent threads |
| EU AI Act | Multiple models = multiple transparency obligations (Article 52 per model) |
| Build cost | Disproportionate for current team size |
| Video verdict | "Figuring out the current state becomes really difficult… digging through logs across a dozen different services" |

The video's conclusion applies directly: teams start with choreography (or fine-grained decomposition), then converge on orchestration with the right granularity. Over-decomposing from day one is the anti-pattern.

## Decision

**Three agents: Interviewer, Examiner, Aftersales**, orchestrated sequentially by Azure AI Agent Service.

### Agent responsibilities

**Interviewer**
- Conducts the mock interview for the selected topic (topicId from ADR-0004)
- Adversarial but fair tone; does not score or evaluate
- Terminates when the candidate submits or the session expires
- Output: raw conversation transcript (stored in Azure thread)

**Examiner**
- Receives the transcript with all candidate names replaced by `[CANDIDATE]` (EU AI Act data minimisation, NIS2 breach scope reduction)
- Scores against a structured rubric per topic; produces a JSON result with per-concept scores
- Output: structured score object (not the raw transcript — scope isolation)
- Human-in-the-loop gate: examiner output is reviewable before Aftersales fires (configurable, default on in production)

**Aftersales**
- Triggered only when overall score is below configurable threshold (default: < 7/10)
- Receives only topic identifier and concept gap list — no conversation content, no candidate name
- Recommends learning resources from a curated catalogue
- Regulatory note: recommendations must not be based on inferred personal characteristics (EU AI Act Article 5 prohibited practices); input is topic gaps only

### Compensating actions (saga pattern)

| Step | Failure | Compensating action |
|---|---|---|
| Interviewer | Timeout / model error | Retry current turn; full session restart preserves topic context |
| Examiner | Failure after transcript stored | Re-run examiner with stored transcript (idempotent — same input, same score) |
| Aftersales | Failure | Skip silently; user is not aware aftersales fired — no visible inconsistency |

The Aftersales agent is the natural point for a "soft" compensating action: unlike a card charge, a missed resource recommendation leaves no inconsistent state visible to the user.

### PII handling (EU AI Act + NIS2)

- Candidate names entered during a session are obfuscated in the transcript before it reaches the Examiner, using a deterministic regex pass on the orchestrator
- The raw transcript (with names) is stored only in the Interviewer thread; access is restricted
- Examiner and Aftersales threads never contain real names — compliant with data minimisation (GDPR Article 5(1)(c), EU AI Act Article 10)
- Full session history with names is retained for the legally required period under NIS2 incident response obligations, then deleted per retention policy

## Consequences

- Three agent definitions required in Azure AI Foundry: each with its own system prompt, tool set, and model assignment
- The existing `TopicData.cs` server-side prompt builder (ADR-0002) is repurposed as the Interviewer system prompt source; Examiner and Aftersales get separate prompt templates
- PII obfuscation must run in the orchestrator before the transcript is passed to the Examiner — this is a hard requirement, not optional
- The score threshold for Aftersales trigger must be stored in configuration, not hardcoded — regulators may request evidence that the threshold is appropriate and adjustable
- Aftersales resource catalogue must be human-curated and versioned; the agent must not hallucinate resources (EU AI Act Article 13 transparency)

## Links

- [0007](0007-agent-orchestration-platform.md) Depends on ADR-0007 for the orchestration platform choice.
- [0005](0005-user-supplied-api-key.md) Each agent call uses the user-supplied NVIDIA NIM key resolved from session cache.
- [0006](0006-guardrails-stihia.md) Stihia guardrail check applies to Interviewer turns only; Examiner and Aftersales receive internally-generated content.
