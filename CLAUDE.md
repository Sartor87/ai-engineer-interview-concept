# AI Engineer Interview Guide

Interactive study tool and AI-powered interview practice for 8 core AI engineering topics.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, `src/App.jsx` (single file, no router) |
| Backend | .NET 8 Isolated Azure Functions, `api/` |
| Hosting | Azure Static Web Apps (Free tier) |
| LLM | NVIDIA NIM `nvidia/nemotron-mini-4b-instruct` via OpenAI-compatible API |
| Guardrails | Stihia `POST https://api.stihia.ai/v1/sense` |
| IaC | Terraform `azurerm`, `infra/` |

## Key Commands

```bash
# Frontend dev (port 5173 + proxy to :7071)
npm run dev

# Backend (from api/ directory)
func start

# Full stack via SWA CLI
npx swa start

# Lint
npm run lint

# Regenerate SonarQube architecture config from Structurizr DSL
./Convert-DslToArchitecture.ps1
```

## Architecture

- **C4 model**: `architecture/workspace.dsl` — run Structurizr locally:
  `podman run -it --rm -p 9999:8080 -v "${PWD}:/usr/local/structurizr" docker.io/structurizr/structurizr local`
- **ADRs**: `architecture/ADRs/` — 0000–0008; links parsed from `## Status` section
- **SonarQube**: `architecture.json` — generated from DSL; CI validates sync

## Session Flow

1. `POST /api/session` — browser sends NVIDIA NIM API key; backend caches it (30 min sliding), returns `sessionId`
2. `POST /api/chat` — browser sends `{ sessionId, topicId, messages }`; backend resolves key, checks Stihia guardrails, builds system prompt server-side, streams NVIDIA NIM response via SSE

## Critical Rules

- **Never log or persist the NVIDIA API key** — lives only in `IMemoryCache` for session duration
- **Never commit `api/local.settings.json`** — contains secrets; already gitignored
- **Always run `./Convert-DslToArchitecture.ps1` after editing `workspace.dsl`** — CI drift check will fail otherwise
- **System prompt is server-side only** (`TopicData.cs`) — client sends only `topicId`
- **Stihia fails open** — a Stihia outage allows messages through; set `DISABLE_GUARDRAILS=true` only in local dev

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `STIHIA_API_KEY` | `api/local.settings.json` | Stihia guardrails key |
| `DISABLE_GUARDRAILS` | `api/local.settings.json` | `true` to skip Stihia locally |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | GitHub Secret | SWA deploy token |
| `SONAR_TOKEN` | GitHub Secret | SonarQube analysis |
| `SONAR_PROJECT_KEY` | GitHub Var | SonarQube project key |
| `SONAR_ORGANIZATION` | GitHub Var | SonarQube org key |

## Planned: Agent Workflow (ADR-0007, ADR-0008)

Three agents via Azure AI Foundry Agent Service: **Interviewer → Examiner → Aftersales**.
EU AI Act human-in-the-loop gate at Examiner → Aftersales boundary.
PII obfuscation required before Examiner receives transcript.
