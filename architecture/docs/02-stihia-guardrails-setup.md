# Stihia Guardrails Setup

The AI Interview Guide uses **Stihia** for real-time input threat detection. Every user message is checked by Stihia before it reaches NVIDIA NIM. The service detects prompt injection, toxic content, sensitive data exposure, and other threats.

## Get a Free API Key

1. Go to [app.stihia.ai](https://app.stihia.ai)
2. Create a free account
3. Create or select an **Organisation**
4. Navigate to **Organisation → API Keys**
5. Click **Generate API Key**
6. Copy the key — it starts with `sk_`

## Configure the Key

### Local Development

```bash
cd api
func settings add STIHIA_API_KEY "sk_your-key-here"
func settings add DISABLE_GUARDRAILS "false"
```

### Azure (Production)

In Azure Portal → Static Web App → **Configuration → Application settings**:

| Name | Value |
|---|---|
| `STIHIA_API_KEY` | `sk_your-key-here` |
| `DISABLE_GUARDRAILS` | `false` |

Or via Terraform — set `stihia_api_key` in `infra/terraform.tfvars`.

## How It Works

On every `POST /api/chat` request:

1. The backend extracts the last user message
2. Calls `POST https://api.stihia.ai/v1/sense` with `sensor: "default-input"`
3. Evaluates the `severity` field in the response

| Severity | Action |
|---|---|
| `low` | Allowed — forwarded to NVIDIA NIM |
| `medium` | Allowed — forwarded to NVIDIA NIM |
| `high` | Blocked — `403` returned, NIM never called |
| `critical` | Blocked — `403` returned, NIM never called |

If Stihia is unreachable or returns a non-2xx response, the service **fails open** — the message is forwarded to NIM. This ensures a Stihia outage does not block users.

## Disable for Local Development

If you do not have a Stihia key, set:

```bash
func settings add DISABLE_GUARDRAILS "true"
```

When `DISABLE_GUARDRAILS=true`, no HTTP call is made to Stihia and all messages are allowed through. **Do not use this in production.**

## Request Shape

The backend sends the following payload to Stihia:

```json
{
  "project_key": "ai-interview-guide",
  "user_key": "<sessionId>",
  "process_key": "chat",
  "thread_key": "<sessionId>",
  "run_key": "<guid>",
  "sensor": "default-input",
  "messages": [
    { "role": "user", "content": "<last user message>" }
  ]
}
```

The `sessionId` is used as both `user_key` and `thread_key`, grouping all messages in a session under a single thread in the Stihia console.

## Adjusting the Block Threshold

The severity threshold is set in `api/StihiaService.cs`:

```csharp
bool blocked = severity is "high" or "critical";
```

To block at `medium` severity, change to:

```csharp
bool blocked = severity is "medium" or "high" or "critical";
```

## Custom Sensors

Stihia supports custom sensor configurations for domain-specific threats. Contact [support@stihia.ai](mailto:support@stihia.ai) for specialised sensor setup (e.g. academic dishonesty detection, system prompt extraction attempts).
