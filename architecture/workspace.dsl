workspace "AI Engineer Interview Guide" "C4 architecture model for the AI-powered interview practice tool." {

    !docs docs
    !decisions ADRs

    model {

        # ── Actors ────────────────────────────────────────────────────────────
        candidate = person "Candidate" "An engineer preparing for AI engineering job interviews."

        # ── Software System ───────────────────────────────────────────────────
        aiInterviewGuide = softwareSystem "AI Interview Guide" "Interactive study and AI-powered interview practice tool covering 8 core AI engineering topics." {

            frontendSpa = container "Frontend SPA" {
                description "Single-page application serving topic study material and the AI chat practice interface. Manages session state and streams AI responses token by token."
                technology "React 18 + Vite / Azure Static Web Apps"
                tags "Browser"
            }

            apiBackend = container "API Backend" {
                description "Handles session management, guardrail enforcement, server-side prompt construction, and LLM proxying with SSE streaming."
                technology ".NET 8 Isolated Worker / Azure Functions"
                tags "AzureFunction"

                sessionFunction = component "SessionFunction" {
                    description "Accepts the NVIDIA NIM API key from the browser, stores it in the memory cache keyed by a generated sessionId (30-min sliding expiry), and returns the sessionId."
                    technology "Azure Function — POST /api/session"
                }

                chatFunction = component "ChatFunction" {
                    description "Resolves the caller's NVIDIA API key from cache, invokes the guardrail check, builds the system prompt server-side, calls NVIDIA NIM, and forwards the SSE stream to the browser."
                    technology "Azure Function — POST /api/chat"
                }

                stihiaService = component "StihiaService" {
                    description "Calls Stihia /v1/sense with the latest user message. Returns allowed/blocked with severity. Fails open on outage. Skipped when DISABLE_GUARDRAILS=true."
                    technology "C# Singleton — HttpClient"
                }

                topicData = component "TopicData" {
                    description "Static registry of all 8 interview topics and their concepts, sample questions, and server-side system prompt builder. Clients send only a numeric topicId."
                    technology "C# Static Class"
                }

                sessionCache = component "Session Cache" {
                    description "In-process memory cache mapping sessionId → NVIDIA NIM API key with a 30-minute sliding expiration. API key never leaves the backend after the initial session call."
                    technology "IMemoryCache (.NET)"
                    tags "DataStore"
                }
            }
        }

        # ── External Systems ──────────────────────────────────────────────────
        stihia = softwareSystem "Stihia Guardrails" {
            description "Real-time AI threat detection. Analyses user messages for prompt injection, toxic content, sensitive data exposure, and other threats before they reach the LLM."
            tags "External"
            url "https://api.stihia.ai"
        }

        nvidiaNim = softwareSystem "NVIDIA NIM" {
            description "Hosted LLM inference API serving nvidia/nemotron-mini-4b-instruct. Responses are returned as a Server-Sent Events stream."
            tags "External"
            url "https://integrate.api.nvidia.com"
        }

        # ── Relationships — System Context ────────────────────────────────────
        candidate -> aiInterviewGuide "Studies AI engineering topics and practises interview questions"
        aiInterviewGuide -> stihia "Checks every user message for threats [HTTPS]"
        aiInterviewGuide -> nvidiaNim "Streams LLM inference responses [HTTPS + SSE]"

        # ── Relationships — Containers ────────────────────────────────────────
        candidate -> frontendSpa "Opens in browser, enters NIM API key, chats with AI interviewer"
        frontendSpa -> apiBackend "POST /api/session · POST /api/chat [HTTPS / SSE]"
        apiBackend -> stihia "POST /v1/sense — per-message guardrail check [HTTPS]"
        apiBackend -> nvidiaNim "POST /v1/chat/completions — LLM inference [HTTPS + SSE]"

        # ── Relationships — Components ────────────────────────────────────────
        frontendSpa -> sessionFunction "POST /api/session — submits NVIDIA API key once [HTTPS]"
        frontendSpa -> chatFunction "POST /api/chat — sends sessionId + topicId + messages [HTTPS + SSE]"

        sessionFunction -> sessionCache "Stores apiKey → sessionId mapping"
        chatFunction -> sessionCache "Resolves NVIDIA API key by sessionId"
        chatFunction -> stihiaService "Checks last user message before calling NIM"
        chatFunction -> topicData "Builds system prompt for topicId"
        chatFunction -> nvidiaNim "POST /v1/chat/completions [HTTPS + SSE]"
        stihiaService -> stihia "POST /v1/sense [HTTPS]"
    }

    views {

        systemContext aiInterviewGuide "SystemContext" {
            include *
            autoLayout lr
            title "System Context — AI Engineer Interview Guide"
            description "Who uses the system and which external services it depends on."
        }

        container aiInterviewGuide "Containers" {
            include *
            autoLayout lr
            title "Containers — AI Engineer Interview Guide"
            description "The two deployable units and their external dependencies."
        }

        component apiBackend "Components_ApiBackend" {
            include *
            autoLayout lr
            title "Components — API Backend"
            description "Internal structure of the Azure Functions backend."
        }

        styles {
            element "Person" {
                shape Person
                background "#08427B"
                color "#ffffff"
            }
            element "Software System" {
                background "#1168BD"
                color "#ffffff"
            }
            element "External" {
                background "#6B6B6B"
                color "#ffffff"
            }
            element "Container" {
                background "#438DD5"
                color "#ffffff"
            }
            element "Component" {
                background "#85BBF0"
                color "#000000"
            }
            element "DataStore" {
                shape Cylinder
            }
            element "Browser" {
                shape WebBrowser
            }
            element "AzureFunction" {
                shape Hexagon
            }
        }

        theme default
    }

}
