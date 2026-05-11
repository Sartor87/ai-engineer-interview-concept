# 4. LLM Inference Provider — OpenAI-Compatible API with NVIDIA NIM

## Status

Accepted

Links to [0005](0005-user-supplied-api-key.md)

**Date:** 2026-05-11  
**Deciders:** Engineering team

## Context

The chat practice feature requires a language model capable of conducting technical interviews, scoring answers, and streaming responses. Multiple providers were evaluated across cost, capability, latency, and alignment with the project's educational mission (teaching AI engineering concepts).

## Options Considered

### Option A: OpenAI (GPT-4o / GPT-4o-mini)
| Dimension | Assessment |
|---|---|
| Capability | Very high |
| Cost | Pay-per-token — no free tier for API access |
| Vendor lock-in | High — proprietary API format |
| Relevance to AI engineering curriculum | Moderate — not a topic in the interview guide |

### Option B: Azure AI Foundry (Azure OpenAI Service)
| Dimension | Assessment |
|---|---|
| Capability | High — same models as OpenAI |
| Cost | Pay-per-token — provisioned throughput adds cost |
| Setup | Requires Azure subscription + model deployment |
| Relevance | Low |

### Option C: Google Gemini
| Dimension | Assessment |
|---|---|
| Capability | High |
| Cost | Free tier available but limited |
| API format | Proprietary (though OpenAI-compatible mode exists) |
| Relevance | Low |

### Option D: Local models (Ollama, llama.cpp)
| Dimension | Assessment |
|---|---|
| Cost | Zero inference cost |
| Deployment | Requires user to run local inference — not viable for a hosted web app |
| Capability | Variable — depends on user hardware |

### Option E: NVIDIA NIM (Nemotron-Mini-4B-Instruct) ✅
| Dimension | Assessment |
|---|---|
| Capability | Good for conversational Q&A and RAG — well-suited to interview simulation |
| Cost | Free tier: 1,000 inference credits, 40 req/min |
| API format | OpenAI-compatible (`/v1/chat/completions`) |
| Relevance | High — NVIDIA NIM is a topic in the AI engineering interview guide itself |
| SSE streaming | Full support |

## Decision

**NVIDIA NIM** (`nvidia/nemotron-mini-4b-instruct`) as the default inference provider, called via an **OpenAI-compatible API**.

Two principles drove this decision:

1. **Provider agnosticism:** The backend calls a standard `/v1/chat/completions` endpoint with OpenAI message format. Switching to a different provider (OpenAI, Mistral, Groq, etc.) requires changing only the base URL and model name — no code changes.

2. **Curriculum alignment:** NVIDIA NIM is one of the eight core topics in the interview guide. Using it as the inference backend is intentional — candidates practise with the technology they are being tested on.

## Consequences

- Users must supply their own NVIDIA NIM API key (see ADR-0005).
- The Nemotron-Mini-4B-Instruct context window is 4,096 tokens — long conversation histories must be managed on the client side.
- Switching providers in future is low-cost: update `BaseAddress` and `Model` in the backend config.
- The OpenAI-compatible constraint means providers with non-standard APIs (e.g. Anthropic native) require a translation layer.

