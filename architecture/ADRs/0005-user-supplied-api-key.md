# 5. API Key Model — User-Supplied Keys over Platform-Managed Keys

## Status

Accepted

Links to [0006](0006-guardrails-stihia.md)

**Date:** 2026-05-11  
**Deciders:** Engineering team

## Context

The application needs to call NVIDIA NIM on behalf of the user. Two models exist: the platform holds one API key shared across all users, or each user supplies their own key. This decision has significant implications for cost, security, privacy, and operational complexity.

## Options Considered

### Option A: Platform-managed key (single shared key)
| Dimension | Assessment |
|---|---|
| User experience | Seamless — no setup required |
| Cost | Platform operator pays all inference costs |
| Abuse risk | High — a single key can be exhausted by a small number of abusive users |
| Key rotation | Requires redeployment or secret update affecting all users |
| Rate limiting | Shared 40 req/min cap across all concurrent users |
| Liability | Operator responsible for all API usage, including misuse |
| Key exposure | Secret must be stored securely in backend config — one breach affects everyone |

### Option B: User-supplied key ✅
| Dimension | Assessment |
|---|---|
| User experience | One-time key entry per session |
| Cost | Zero to operator — each user pays for their own usage |
| Abuse risk | None to operator — each user is rate-limited by their own key |
| Rate limiting | Per-user quota — no contention between users |
| Liability | User is responsible for their own key usage |
| Key exposure | Key stored in backend memory cache only for session duration (30 min); never logged, never persisted to disk or database |
| Privacy | User controls their own inference usage and data sent to NVIDIA |

## Decision

**User-supplied API keys.**

Beyond cost, the security rationale is decisive:

- **Blast radius isolation:** A compromised platform key would expose the entire user base's inference quota. User-supplied keys limit any breach to a single user's quota.
- **No secret management burden:** The platform never stores long-lived secrets. The NVIDIA key exists in the backend only for the duration of a 30-minute session cache entry.
- **No billing risk:** The operator cannot be held liable for unexpected inference costs driven by user behaviour or abuse.
- **User autonomy:** Users choose their own NVIDIA account, tier, and usage limits. The platform does not act as an intermediary for their data sent to NVIDIA.
- **Regulatory simplicity:** The operator never handles credentials that could be classified as payment or access tokens under data protection frameworks.

The UX trade-off (one-time key entry per session) is acceptable given the tool's target audience — engineers who already hold NVIDIA NIM accounts as part of their AI development workflow.

## Consequences

- Users must create a free NVIDIA account and generate an API key before using the practice feature.
- The key is transmitted once over HTTPS to `POST /api/session`, stored in `IMemoryCache` with a 30-minute sliding expiration, and resolved server-side for all subsequent requests by `sessionId` only.
- The raw key string is never included in chat request bodies, logs, or responses.
- If the session expires, the user is prompted to re-enter their key.

