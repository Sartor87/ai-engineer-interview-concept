# 7. Agent Orchestration Platform — Azure AI Foundry vs Custom Orchestrator vs Local Foundry

## Status

Proposed

Links to [0008](0008-agent-count-and-boundaries.md)

**Date:** 2026-05-11  
**Deciders:** Engineering team

## Context

The planned agent workflow spans three specialised agents (Interviewer, Examiner, Aftersales). Each agent is an autonomous unit with its own prompt, tool set, and potential failure mode. Coordinating them is structurally identical to the distributed transaction problem described by Helland (2007) and the distributed systems literature:

> "A single logical operation that needs to span multiple independent services where all the steps need to either succeed together or be cleaned up when something goes wrong."

Concretely: the Interviewer completes its turn, the Examiner scores it, and the Aftersales agent triggers only when the score meets a threshold. If the Examiner call times out after the interview is stored, the system is in a partial state — the same failure mode as charging a card but failing to reserve inventory.

The video transcript ("Distributed Transactions", HelloInterview) makes the orchestration choice unambiguous for flows of this complexity:

> "For anything more complex than [three or four steps]… orchestration is the way to go. Complex flows with branching logic, flows where you need to see exactly where a transaction is stuck, flows where the compensation logic is tricky and you want it defined in one clear place."

Additionally, the EU AI Act (Annex III, Article 14) requires human oversight capability for AI systems used in assessment or employment contexts. NIS2 requires audit trails and incident response. These requirements mandate durable, inspectable orchestration — choreography (agents reacting to each other's events) cannot satisfy them because the state is scattered.

## Options Considered

### Option A: Azure AI Foundry — Azure AI Agent Service ✅
| Dimension | Assessment |
|---|---|
| Orchestration model | Managed orchestrator — durable thread state, tool calling, agent handoffs |
| Failure recovery | Restarts resume from last durable checkpoint — no dangling locks |
| Observability | Azure Monitor, Application Insights, full turn-by-turn trace |
| Human-in-the-loop | Native support — human approval steps at agent handoff boundaries |
| Audit trail | All agent messages persisted in thread storage (EU AI Act Article 13) |
| Infrastructure | Serverless — no coordinator process to manage |
| Model choice | Azure OpenAI + bring-your-own endpoint (OpenAI-compatible) |
| EU AI Act / NIS2 | Azure Trust Centre, DPA, regional data residency options |
| Cost | Per-token inference + storage; free tier for low-volume dev |
| Team familiarity | High — existing Azure stack (ADR-0001) |

The Agent Service is the managed equivalent of Temporal or AWS Step Functions for AI workflows: the orchestrator persists its state to storage and resumes after failures without leaving any agent in a blocked waiting state — the critical property the video identifies as the reason 2PC fails in production.

### Option B: Custom orchestrator (Semantic Kernel / Microsoft.Extensions.AI)
| Dimension | Assessment |
|---|---|
| Orchestration model | Application code drives agent calls; state in IMemoryCache or custom DB |
| Failure recovery | Must implement durable state manually (transactional outbox equivalent) |
| Observability | Custom logging; no built-in agent-level trace |
| Human-in-the-loop | Must be engineered from scratch |
| Audit trail | Developer responsibility — risk of gaps under NIS2 audit |
| Infrastructure | Lives inside existing Azure Functions — no new resource |
| EU AI Act / NIS2 | Full compliance burden falls on team |
| Cost | Lower running cost; higher build and maintenance cost |

This is equivalent to implementing a saga orchestrator by hand. The video is explicit about the outcome: compensating actions themselves can fail, idempotency must be engineered throughout, and the reliability work for failure paths matches the happy path. For a small team this is disproportionate overhead.

### Option C: Local Foundry with compiled HuggingFace models (Ollama / llama.cpp)
| Dimension | Assessment |
|---|---|
| Orchestration model | Local inference; orchestration still custom |
| Inference cost | Zero API cost; high compute and ops cost |
| Model capability | Smaller open-source models — lower reasoning quality for exam scoring |
| Deployment | Incompatible with Azure Static Web Apps serverless target (ADR-0001) |
| EU AI Act | Model provenance and documentation requirements (Article 52) add burden |
| Human-in-the-loop | Custom implementation required |
| Team familiarity | Low — no existing experience |

The video's lesson about co-located data applies here inversely: forcing local models into a serverless-hosted architecture creates the same mismatch as trying to wrap a distributed transaction with 2PC — the architectural constraints fight each other.

## Decision

**Azure AI Foundry — Azure AI Agent Service**, with the existing NVIDIA NIM endpoint registered as a custom model connection.

The core reason mirrors the saga orchestration argument: the orchestrator must be durable. When it restarts (or a model call times out), it must resume from the last committed checkpoint — not leave agents waiting for a coordinator that is not coming back. Azure AI Agent Service provides this durably without the team having to build it.

The EU AI Act human-in-the-loop requirement (Article 14) is satisfied at agent handoff boundaries: the Examiner → Aftersales transition can be gated by a human approval step configurable per deployment. The full message thread stored in Azure satisfies the audit trail requirement (Article 13).

The OpenAI-compatible constraint from ADR-0004 is preserved: the Agent Service supports any endpoint implementing `/v1/chat/completions`.

## Consequences

- Infrastructure extends to include an Azure AI Foundry project and Agent Service instance (Terraform additions in `infra/`).
- The existing `ChatFunction` (ADR-0004 direct NIM call) is superseded for multi-turn orchestrated sessions; single-turn practice mode may remain.
- All agent turns are logged in Azure thread storage — names must be obfuscated before storage to satisfy EU AI Act data minimisation and NIS2 breach-notification obligations.
- Human-in-the-loop gate at Examiner → Aftersales boundary must be configurable (on/off) to support development mode without blocking.
- Model cold-start latency is acceptable for interview cadence (multi-second turns); not acceptable for real-time streaming — SSE streaming from agent runs must be tested against 4,096-token context limit (ADR-0004).

## Links

- [0001](0001-cloud-provider-azure.md) Azure Foundry is only available in Azure — this decision presupposes ADR-0001.
- [0004](0004-inference-provider.md) Agent Service must be configured with the NVIDIA NIM endpoint from ADR-0004.
- [0008](0008-agent-count-and-boundaries.md) The number and boundary of agents is decided in ADR-0008.
