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
├── .github/workflows/
│   └── azure-static-web-apps.yml # CI/CD pipeline
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

---

## Azure Deployment

### 1. Create Azure Static Web App

```bash
# Via Azure CLI
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

### 2. Copy the deployment token

```bash
az staticwebapp secrets list \
  --name ai-interview-guide \
  --resource-group rg-ai-interview \
  --query "properties.apiKey" -o tsv
```

### 3. Add GitHub Secret

In your GitHub repo → Settings → Secrets → Actions:
- Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
- Value: (paste token from step 2)

### 4. Add Azure App Settings

In Azure Portal → Static Web App → Configuration → Application settings, add:

| Name | Value |
|---|---|
| `STIHIA_API_KEY` | `sk_your_key_here` |
| `DISABLE_GUARDRAILS` | `false` |

### 5. Push to main

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

## Architecture Notes

- The NVIDIA API key is sent from browser → Function once on session creation (`POST /api/session`), stored in `IMemoryCache` with a 30-min sliding expiration, and never logged. Subsequent requests send only a `sessionId`.
- The system prompt is built server-side from a static topic registry (`TopicData.cs`). The client sends only a numeric `topicId` — arbitrary prompt injection from the client is not possible.
- Stihia guardrail check runs on every user message before the NIM call. On Stihia outage the service fails open to avoid blocking users.
- All conversation history is held in React `useState`; no session state is persisted server-side beyond the API key cache.
