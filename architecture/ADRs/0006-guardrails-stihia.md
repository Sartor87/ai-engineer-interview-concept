# 6. Content Guardrails — Stihia over DIY or Alternatives

**Status:** Accepted  
**Date:** 2026-05-11  
**Deciders:** Engineering team

## Context

The chat feature accepts free-text input from anonymous users and forwards it to an LLM. Without input guardrails, the system is exposed to prompt injection, jailbreak attempts, toxic content, and sensitive data leakage. A guardrail strategy had to be chosen.

## Options Considered

### Option A: No guardrails
| Dimension | Assessment |
|---|---|
| Implementation cost | Zero |
| Risk | High — open to prompt injection, jailbreaks, and abuse |
| Acceptable | No |

### Option B: DIY keyword / regex filtering
| Dimension | Assessment |
|---|---|
| Implementation cost | Low initially, high to maintain |
| Coverage | Poor — easily bypassed with paraphrasing or encoding |
| Customisation | Full control |
| Maintenance | Ongoing — threat landscape evolves constantly |

### Option C: LLM-as-judge (self-moderation)
| Dimension | Assessment |
|---|---|
| Implementation cost | Low — add a moderation prompt |
| Latency | High — doubles the LLM call latency |
| Reliability | Moderate — same model can be manipulated |
| Cost | Doubles inference token usage |

### Option D: Dedicated managed guardrail service (Stihia) ✅
| Dimension | Assessment |
|---|---|
| Implementation cost | Low — single HTTP call, thin wrapper |
| Coverage | High — purpose-built threat detection with multiple sensor presets |
| Free tier | Yes — usable without upfront cost commitment |
| Customisation | Yes — custom sensors available for domain-specific threats |
| Latency | ~500–1,500 ms per check (acceptable, runs before LLM call) |
| Fail-open | Implemented — Stihia outage does not block users |
| Maintenance | None — threat models maintained by Stihia |

## Decision

**Stihia** (`api.stihia.ai`, `POST /v1/sense`) as the input guardrail service.

Key drivers:

1. **Dedicated service:** A purpose-built threat detection system provides significantly better coverage than DIY approaches, without the latency penalty of LLM-as-judge.
2. **Free tier:** The free tier allows the project to operate with guardrails enabled at zero additional cost, consistent with the zero-cost hosting strategy.
3. **Customisation path:** Stihia supports custom sensor configurations. As the application matures, domain-specific threats (e.g. attempts to extract the system prompt, academic dishonesty patterns) can be expressed as custom sensors without changing application code.
4. **Operational simplicity:** The integration is a single `POST /v1/sense` call. The `DISABLE_GUARDRAILS` environment variable provides a clean escape hatch for local development without a Stihia key.
5. **Fail-open design:** Stihia outages return an allowed result — users are never blocked by a third-party service degradation.

## Consequences

- Every user message adds one HTTP round-trip to Stihia (~500–1,500 ms) before the NIM call begins.
- `STIHIA_API_KEY` must be provisioned in all environments (see README — Environment variables).
- Messages blocked at severity `high` or `critical` return a `403` to the browser; the LLM is never called.
- Messages at `low` or `medium` severity are allowed through — this threshold can be adjusted in `StihiaService.cs` if stricter moderation is required.
- Output guardrails (checking LLM responses) are not currently implemented — this can be added using the `default-output` Stihia sensor if needed.
