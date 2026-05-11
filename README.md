# AI Engineer Interview Guide — 2026

Interactive study + AI-powered interview practice tool for the 8 core AI Engineer interview topics.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| AI Chat Backend | Azure Functions (.NET 8 isolated) |
| Hosting | Azure Static Web Apps (Free tier) |
| AI Model | NVIDIA Nemotron-Mini-4B-Instruct via NIM |
| Guardrails | Stihia real-time threat detection |
| IaC | Terraform (`azurerm`) |
| Code Quality | SonarQube (architecture analysis + C# + JS) |

---

## Project Structure

```
/
├── src/
│   ├── main.jsx                  # React entry point
│   └── App.jsx                   # Full app (topics + chat panel)
├── api/
│   ├── ChatFunction.cs           # Azure Function — guardrail check + NIM proxy + SSE streaming
│   ├── SessionFunction.cs        # Azure Function — API key session management
│   ├── StihiaService.cs          # Stihia guardrail integration
│   ├── TopicData.cs              # Server-side topic registry + system prompt builder
│   ├── Program.cs                # .NET 8 isolated worker host
│   ├── host.json
│   ├── local.settings.json       # Local secrets — gitignored
│   └── ai-interview-guide.csproj
├── architecture/
│   ├── workspace.dsl             # Structurizr C4 model (System Context, Containers, Components)
│   ├── docs/
│   │   ├── 01-nvidia-nim-setup.md
│   │   └── 02-stihia-guardrails-setup.md
│   └── ADRs/
│       ├── 0000-use-adrs.md
│       ├── 0001-cloud-provider-azure.md
│       ├── 0002-backend-runtime-dotnet8.md
│       ├── 0003-iac-terraform.md
│       ├── 0004-inference-provider.md
│       ├── 0005-user-supplied-api-key.md
│       ├── 0006-guardrails-stihia.md
│       ├── 0007-agent-orchestration-platform.md  # Azure AI Foundry vs custom vs local
│       │
│       │   # ADR H1 format MUST be `# N. Title` (adr-tools standard) — not `# ADR-NNNN: Title`
│       │   # The Structurizr `!decisions` importer parses the leading integer.
│       └── 0008-agent-count-and-boundaries.md    # Three-agent design (Interviewer/Examiner/Aftersales)
├── infra/
│   ├── main.tf                   # Terraform — resource group + Static Web App
│   └── terraform.tfvars.example  # Copy to terraform.tfvars and fill in secrets
├── .claude/
│   ├── settings.json             # Claude Code hooks config (PreToolUse + UserPromptSubmit)
│   ├── agents/
│   │   ├── code-reviewer.md      # Proactive code review against project standards (JSX + C#)
│   │   └── github-workflow.md    # Conventional Commits, branch naming, PR template
│   ├── commands/
│   │   ├── code-quality.md       # Run ESLint + dotnet build + manual checklist
│   │   ├── docs-sync.md          # Check if docs match recent code changes
│   │   ├── onboard.md            # Onboard to a task with codebase exploration
│   │   ├── pr-review.md          # Review a PR using code-reviewer.md standards
│   │   ├── pr-summary.md         # Generate PR body from branch diff
│   │   └── ticket.md             # Full ticket workflow: read → explore → branch → PR
│   └── hooks/
│       ├── pre-commit.sh         # Pre-commit: secrets + ESLint + dotnet build + architecture sync
│       ├── skill-eval.js         # UserPromptSubmit: rule-based skill activation suggestions
│       ├── skill-rules.json      # Skill detection rules tailored to this stack
│       └── skill-rules.schema.json  # JSON Schema for skill-rules.json
├── .github/
│   ├── workflows/
│   │   ├── azure-static-web-apps.yml # Build, architecture drift check, deploy to SWA + SonarQube analysis
│   │   └── structurizr-pages.yml     # Mermaid export + static site + deploy to GitHub Pages
│   ├── scripts/
│   │   └── build-architecture-site.sh # Builds site/ from .mmd exports + ADRs + template
│   └── templates/
│       └── architecture-index.html   # HTML shell with Mermaid.js CDN for the Pages site
├── architecture.json             # SonarQube architecture analysis config (generated — do not edit)
├── Convert-DslToArchitecture.ps1 # Generates architecture.json from workspace.dsl
├── CLAUDE.md                     # Claude Code project context
├── .eslintrc.json                # ESLint config (react + react-hooks)
├── index.html
├── vite.config.js
├── package.json
├── staticwebapp.config.json      # SWA routing config
└── swa-cli.config.json           # Local dev config
```

---

## Local Development

### Prerequisites

- Node.js 20+
- .NET 8 SDK
- Azure Functions Core Tools v4: `npm install -g azure-functions-core-tools@4`
- SWA CLI: `npm install -g @azure/static-web-apps-cli`
- Gitleaks (optional, upgrades pre-commit secret scanning): `winget install Gitleaks.Gitleaks --source winget`

### Environment variables

The Azure Function reads secrets from `api/local.settings.json` (gitignored). Add values with:

```bash
cd api
func settings add STIHIA_API_KEY "sk_your_key_here"
func settings add DISABLE_GUARDRAILS "false"
```

| Variable | Required | Description |
|---|---|---|
| `STIHIA_API_KEY` | Yes (if guardrails enabled) | API key from [app.stihia.ai](https://app.stihia.ai) → Organization → API Keys |
| `DISABLE_GUARDRAILS` | No | Set `"true"` to bypass Stihia checks (dev/testing only) |

> **Note:** Never commit `api/local.settings.json` — it is gitignored and the pre-commit hook will block it.

### Run locally

**Terminal 1 — Start the Azure Function:**
```bash
cd api
dotnet build
func start
# Runs on http://localhost:7071
```

**Terminal 2 — Start the full SWA dev server (proxies /api → Function):**
```bash
swa start
# Runs on http://localhost:4280
```

Or use plain Vite dev (proxies /api → port 7071 via vite.config.js):
```bash
npm install
npm run dev
# Runs on http://localhost:5173
```

### Lint

```bash
npm run lint
```

---

## Architecture Diagrams

The C4 model lives in [`architecture/workspace.dsl`](architecture/workspace.dsl) and covers three views:

| View | Description |
|---|---|
| System Context | Candidate, AI Interview Guide, Stihia, NVIDIA NIM |
| Containers | Frontend SPA + API Backend + external dependencies |
| Components | Internal structure of the Azure Functions backend |

### View locally with Structurizr Lite (Podman)

```bash
cd architecture
podman run -it --rm -p 9999:8080 -v "${PWD}:/usr/local/structurizr" docker.io/structurizr/lite
```

Open `http://localhost:9999`.

### View locally with Structurizr Lite (Docker)

```bash
cd architecture
docker run -it --rm -p 9999:8080 -v "${PWD}:/usr/local/structurizr" structurizr/lite
```

### GitHub Pages (automated)

Pushing any change under `architecture/` to `main` triggers the [`structurizr-pages.yml`](.github/workflows/structurizr-pages.yml) workflow:

1. **Export views** — `structurizr/structurizr` Docker image runs `export -format mermaid` and writes one `.mmd` file per C4 view into `architecture/`.
2. **Build static site** — [`.github/scripts/build-architecture-site.sh`](.github/scripts/build-architecture-site.sh) wraps each `.mmd` in a `<div class="mermaid">` block, lists ADRs with their `## Status`, and injects everything into [`.github/templates/architecture-index.html`](.github/templates/architecture-index.html). Mermaid renders client-side via CDN.
3. **Render ADRs** — `pandoc` converts each ADR markdown to standalone HTML under `site/adrs/`.
4. **Deploy** — `actions/upload-pages-artifact` + `actions/deploy-pages` ship the `site/` directory.

> **Important:** ADR files MUST use the adr-tools H1 format — `# N. Title` — not `# ADR-NNNN: Title`. The Structurizr `!decisions` importer parses the leading integer from the H1; any other prefix throws `NumberFormatException: For input string: "ADR-"` and the export step fails.

One-time setup: **GitHub repo → Settings → Pages → Source: `GitHub Actions`**

> Note: `structurizr/cli` was deprecated in 2025 in favour of the consolidated `structurizr/structurizr` image — the workflow uses the new image.

### SonarQube Architecture Analysis

`architecture.json` maps the C4 model to SonarQube component groups and deny constraints. It is **generated — do not edit manually**.

After changing `workspace.dsl`, regenerate:

```powershell
.\Convert-DslToArchitecture.ps1
```

The CI pipeline (`azure-static-web-apps.yml`) validates that `architecture.json` matches `workspace.dsl` on every push and blocks the build if they drift.

---

## CI/CD Pipeline

The main workflow (`.github/workflows/azure-static-web-apps.yml`) runs three jobs in parallel:

| Job | What it does |
|---|---|
| `build_and_deploy` | Validates `architecture.json` sync, builds React app, deploys to Azure SWA |
| `sonarqube` | Builds .NET project, runs SonarQube analysis (C# + JS + architecture) |
| `close_pull_request` | Closes SWA staging environments when a PR is merged/closed |

### Required GitHub Secrets and Variables

| Type | Name | Description |
|---|---|---|
| Secret | `AZURE_STATIC_WEB_APPS_API_TOKEN` | SWA deployment token (from Terraform output or Azure Portal) |
| Secret | `SONAR_TOKEN` | SonarQube → My Account → Security → Generate Token |
| Variable | `SONAR_PROJECT_KEY` | SonarQube project key |
| Variable | `SONAR_ORGANIZATION` | SonarQube organization key |

---

## Azure Deployment

Infrastructure is managed with Terraform (`infra/main.tf`). The Terraform config creates the resource group and Static Web App with all required app settings in one step.

### Option A — Terraform (recommended)

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars — set stihia_api_key and other values
terraform init
terraform apply
```

Then grab the deployment token and add it to GitHub Actions:

```bash
terraform output -raw deployment_token
```

### Option B — Azure CLI (manual)

**1. Create the Static Web App**

```bash
az staticwebapp create \
  --name ai-interview-guide \
  --resource-group rg-ai-interview \
  --location "West Europe" \
  --sku Free \
  --source https://github.com/<YOUR_ORG>/<YOUR_REPO> \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --output-location "dist" \
  --login-with-github
```

**2. Copy the deployment token**

```bash
az staticwebapp secrets list \
  --name ai-interview-guide \
  --resource-group rg-ai-interview \
  --query "properties.apiKey" -o tsv
```

**3. Add app settings**

In Azure Portal → Static Web App → Configuration → Application settings:

| Name | Value |
|---|---|
| `STIHIA_API_KEY` | `sk_your_key_here` |
| `DISABLE_GUARDRAILS` | `false` |

### Add GitHub Secret

In your GitHub repo → Settings → Secrets → Actions:
- Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
- Value: deployment token from step above

See the [CI/CD Pipeline](#cicd-pipeline) section for all required secrets and variables.

### Push to main

The GitHub Actions workflow builds the React app, compiles the .NET 8 Function, and deploys both automatically.

---

## Chat Feature — How It Works

1. User opens any topic section and clicks **🤖 PRACTICE**
2. User enters their NVIDIA NIM API key → `POST /api/session` stores it server-side (30-min sliding cache), returns a `sessionId`
   - Get a free key at https://build.nvidia.com → Sign in → Generate API Key
   - Free tier: 1,000 inference credits, 40 req/min
3. Each message calls `POST /api/chat` with `{ sessionId, topicId, triggerEval, messages[] }`
4. The Function: resolves the API key from cache → runs Stihia guardrail check → builds system prompt server-side → forwards to NIM
5. NIM response streams back as SSE → displayed token by token

### Evaluation modes

| Trigger | Behaviour |
|---|---|
| User says "evaluate me" / "score me" / "grade my answers" | Immediate per-answer scoring |
| Silent (no evaluation request) | Auto-evaluation fires after question 10 |

### Score badges

Each scored answer shows a coloured `X/10` badge inline in the chat bubble, using the topic's accent colour with opacity proportional to the score.

### Export

Once evaluation has run, a **↓ PDF** button appears in the chat header. Clicking it downloads the full session transcript as a `.txt` file (named `interview-<tag>-<timestamp>.txt`).

---

## Guardrails — How It Works

Every user message is checked by [Stihia](https://stihia.ai) before reaching NVIDIA NIM.

| Severity | Action |
|---|---|
| `low` / `medium` | Allowed — message forwarded to NIM |
| `high` / `critical` | Blocked — `403` returned, NIM never called |
| Stihia unreachable | Fail-open — message forwarded to NIM |

Set `DISABLE_GUARDRAILS=true` to bypass all checks (useful for local dev without a Stihia key).

---

## NVIDIA NIM — Model Details

- **Model:** `nvidia/nemotron-mini-4b-instruct`
- **Endpoint:** `https://integrate.api.nvidia.com/v1/chat/completions`
- **Prompt format:** Custom `<extra_id_N>` Nemotron template (applied server-side in the Azure Function)
- **Context window:** 4,096 tokens
- **Optimised for:** RAG, instruction following, conversational Q&A

---

## Planned: Agent Workflow

Three specialised agents orchestrated via **Azure AI Foundry Agent Service** (see [ADR-0007](architecture/ADRs/0007-agent-orchestration-platform.md) and [ADR-0008](architecture/ADRs/0008-agent-count-and-boundaries.md)):

| Agent | Role |
|---|---|
| **Interviewer** | Conducts the mock interview; adversarial tone; no scoring |
| **Examiner** | Scores the transcript against a rubric; human-in-the-loop gate before next step |
| **Aftersales** | Recommends learning resources based on concept gaps; fires only when score < threshold |

EU AI Act (Article 14) human oversight gate sits between Examiner and Aftersales. All candidate names are obfuscated before the transcript reaches the Examiner (data minimisation).

---

## Architecture Notes

- The NVIDIA API key is sent from browser → Function once on session creation (`POST /api/session`), stored in `IMemoryCache` with a 30-min sliding expiration, and never logged. Subsequent requests send only a `sessionId`.
- The system prompt is built server-side from a static topic registry (`TopicData.cs`). The client sends only a numeric `topicId` — arbitrary prompt injection from the client is not possible.
- Stihia guardrail check runs on every user message before the NIM call. On Stihia outage the service fails open to avoid blocking users.
- All conversation history is held in React `useState`; no session state is persisted server-side beyond the API key cache.

---

## Claude Code Integration

This repo ships a `.claude/` directory with project-specific agents, slash commands, and hooks.

### Agents

| Agent | Purpose |
|---|---|
| `code-reviewer` | Proactive code review against JSX + C# project standards (security, async patterns, SSE cleanup, state-order rules) |
| `github-workflow` | Branch naming, Conventional Commits, PR template enforcement |

Invoke via Claude Code's Agent tool — `code-reviewer` is configured to run proactively after writing or modifying code.

### Slash Commands

| Command | What it does |
|---|---|
| `/code-quality [path]` | Runs ESLint + `dotnet build` + manual checklist scan |
| `/docs-sync` | Compares git log (30 days) against README/ADRs/CLAUDE.md for drift |
| `/onboard <task>` | Explores the codebase and writes `.claude/tasks/<task>/onboarding.md` |
| `/pr-review <pr#>` | Fetches PR via `gh pr view`, applies code-reviewer standards, posts feedback |
| `/pr-summary` | Generates a PR body (Summary / Changes / Test Plan) from `git log main..HEAD` |
| `/ticket <id>` | Full workflow: read ticket → explore → branch → implement → PR |

### Hooks

| Hook | Trigger | What it does |
|---|---|---|
| `pre-commit.sh` | PreToolUse on Bash | Intercepts `git commit` and runs: secret scan (gitleaks or pattern grep), `npm run lint`, `dotnet build`, and architecture drift check (regenerates `architecture.json` and compares to staged version). Exit 2 blocks the commit. |
| `skill-eval.js` | UserPromptSubmit | Scores the prompt + mentioned file paths against `skill-rules.json` and suggests relevant skills (e.g., `dotnet-backend`, `architecture`, `react-ui-patterns`) before implementation begins. |

Customise skills by editing [`.claude/hooks/skill-rules.json`](.claude/hooks/skill-rules.json). The schema is in [`skill-rules.schema.json`](.claude/hooks/skill-rules.schema.json).

### Project Context

[`CLAUDE.md`](CLAUDE.md) provides Claude Code with stack details, key commands, critical security rules, and the session flow. It is auto-loaded into every Claude Code conversation in this repository.
