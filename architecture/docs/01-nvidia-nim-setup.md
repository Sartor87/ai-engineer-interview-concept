# NVIDIA NIM API Setup

The AI Interview Guide uses **NVIDIA Nemotron-Mini-4B-Instruct** via the NVIDIA NIM inference API. Users supply their own API key — the platform never holds a shared key.

## Get a Free API Key

1. Go to [build.nvidia.com](https://build.nvidia.com)
2. Sign in or create a free NVIDIA account
3. Navigate to **API Keys** in your account settings
4. Click **Generate API Key**
5. Copy the key — it starts with `nvapi-`

Free tier limits:

| Limit | Value |
|---|---|
| Inference credits | 1,000 |
| Rate limit | 40 requests / minute |

Credits reset on a monthly basis. For sustained use, upgrade to a paid NVIDIA NGC plan.

## Using the Key in the App

1. Open any topic in the AI Interview Guide
2. Click the **🤖 PRACTICE** tab
3. Paste your key into the API key field and click **START PRACTICE**

The key is sent once over HTTPS to `POST /api/session`. The backend stores it in an in-process memory cache for 30 minutes (sliding expiry) and returns a `sessionId`. All subsequent chat requests use only the `sessionId` — the raw key is never transmitted again.

The key is never logged, persisted to disk, or sent to any party other than NVIDIA NIM.

## Local Development

Add the key to the Azure Function's local settings:

```bash
cd api
func settings add STIHIA_API_KEY "nvapi-your-key-here"
```

> Note: the env var name above is for the Stihia key. The NVIDIA key is entered by the user at runtime — it is not an environment variable.

## Model Details

| Property | Value |
|---|---|
| Model ID | `nvidia/nemotron-mini-4b-instruct` |
| Endpoint | `https://integrate.api.nvidia.com/v1/chat/completions` |
| API format | OpenAI-compatible (`/v1/chat/completions`) |
| Context window | 4,096 tokens |
| Response format | Server-Sent Events (SSE) stream |
| Optimised for | RAG, instruction following, conversational Q&A |

## Switching Providers

Because the backend uses the OpenAI-compatible API format, switching to another provider requires only two changes in `api/ChatFunction.cs`:

- `BaseAddress` of the `nvidia` named `HttpClient` in `Program.cs`
- `Model` field in the `NimRequest` payload

No other code changes are needed.
