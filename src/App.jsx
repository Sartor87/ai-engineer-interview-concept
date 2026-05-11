import { useState, useEffect, useRef } from "react";

const topics = [
  {
    id: 1, code: "01", tag: "ARCHITECTURE",
    title: "Transformers & Attention",
    color: "#00FFD1", icon: "⚡",
    tldr: "The neural architecture that powers all modern LLMs",
    concepts: [
      { name: "Self-Attention", desc: "Each token attends to every other token via Q·Kᵀ/√d_k softmax weights, learning contextual relationships without recurrence." },
      { name: "Multi-Head Attention", desc: "Multiple attention heads run in parallel, each learning different relationship patterns (syntax, coreference, positional)." },
      { name: "Positional Encoding", desc: "Sinusoidal or learned position signals injected into embeddings since attention is permutation-invariant by itself." },
      { name: "KV Cache", desc: "Cached Key/Value pairs from previous tokens avoid recomputation during autoregressive decoding — critical for inference speed." },
      { name: "Flash Attention", desc: "IO-aware algorithm that tiles attention computation in SRAM, reducing HBM reads/writes and achieving 2–4× speedup." },
    ],
    interview: [
      "Explain why attention complexity is O(n²) and how sparse/linear attention variants address this.",
      "What is the difference between encoder-only, decoder-only, and encoder-decoder architectures? Give examples.",
      "How does Grouped Query Attention (GQA) reduce KV cache memory in models like Llama 3?",
    ],
    depth: 95,
  },
  {
    id: 2, code: "02", tag: "RETRIEVAL",
    title: "Embeddings & Vector Search",
    color: "#FF6B6B", icon: "🔍",
    tldr: "Semantic representation of data for similarity-based retrieval",
    concepts: [
      { name: "Embedding Models", desc: "text-embedding-3-large, BGE, E5, Nomic — dense vectors encoding semantic meaning. Dimensionality 768–3072." },
      { name: "ANN Algorithms", desc: "HNSW (Hierarchical Navigable Small World) and IVF-PQ are the workhorses. HNSW trades memory for recall accuracy." },
      { name: "Vector DBs", desc: "Pinecone, Weaviate, Qdrant, pgvector — differ on filtering, consistency, sharding, hybrid search support." },
      { name: "Similarity Metrics", desc: "Cosine similarity for normalized vectors; dot product for raw; L2 for spatial distance. Choice affects ranking quality." },
      { name: "Hybrid Search", desc: "Combine dense vector search with BM25 sparse retrieval via RRF (Reciprocal Rank Fusion) for best of both worlds." },
    ],
    interview: [
      "When would you use a bi-encoder vs a cross-encoder? What's the latency/quality trade-off?",
      "Describe the HNSW index structure. Why is it the default in most vector DBs?",
      "How do you handle embedding model versioning in production without full re-indexing?",
    ],
    depth: 90,
  },
  {
    id: 3, code: "03", tag: "SYSTEMS",
    title: "RAG Architecture",
    color: "#A78BFA", icon: "🏗️",
    tldr: "Ground LLM outputs in retrieved, verifiable external knowledge",
    concepts: [
      { name: "Naive RAG", desc: "Chunk → embed → retrieve top-k → stuff into context. Fast to build but suffers from chunking quality and retrieval precision." },
      { name: "Advanced RAG", desc: "Query rewriting, HyDE (Hypothetical Document Embeddings), re-ranking with cross-encoders, multi-query expansion." },
      { name: "Agentic RAG", desc: "LLM decides when and what to retrieve. Multi-step retrieval, tool use, self-reflection loops via frameworks like LangGraph." },
      { name: "Chunking Strategy", desc: "Fixed, recursive, semantic, and document-structure-aware chunking. Chunk size vs overlap is a critical tuning dimension." },
      { name: "RAG Evaluation", desc: "RAGAS framework: faithfulness, answer relevancy, context precision, context recall — each measures a different failure mode." },
    ],
    interview: [
      "Explain the difference between context precision and context recall in RAGAS. Which matters more and when?",
      "Your retrieval step returns irrelevant chunks 30% of the time. What 3 things would you try first?",
      "How does GraphRAG differ from standard vector RAG? When is the knowledge graph overhead justified?",
    ],
    depth: 98,
  },
  {
    id: 4, code: "04", tag: "TRAINING",
    title: "Fine-Tuning / LoRA / PEFT",
    color: "#FCD34D", icon: "🎯",
    tldr: "Adapt pre-trained models efficiently without full retraining",
    concepts: [
      { name: "LoRA", desc: "Low-Rank Adaptation: freeze base weights, inject trainable rank-r matrices ΔW=BA. Only 0.1–1% of params trained." },
      { name: "QLoRA", desc: "Quantize base model to 4-bit NF4, train LoRA adapters in bf16. Enables 70B fine-tuning on a single A100." },
      { name: "PEFT Methods", desc: "LoRA, Prefix Tuning, P-Tuning, IA³, Adapters — each inserts different trainable components into frozen architectures." },
      { name: "SFT vs RLHF", desc: "Supervised Fine-Tuning aligns format/style. RLHF (PPO) or DPO/ORPO aligns values and preferences at scale." },
      { name: "Rank & Alpha", desc: "r controls capacity (4–64 typical), alpha/r is effective LR scale. Higher r = more expressiveness, more overfit risk." },
    ],
    interview: [
      "When does fine-tuning outperform prompt engineering? What's the minimum data size heuristic?",
      "Explain why QLoRA can train a 70B model on 48 GB VRAM. Walk through the quantization steps.",
      "Compare DPO vs PPO for alignment. What are the practical failure modes of each?",
    ],
    depth: 85,
  },
  {
    id: 5, code: "05", tag: "PROMPTING",
    title: "Prompt Engineering & Structured Outputs",
    color: "#34D399", icon: "✍️",
    tldr: "Systematic techniques to elicit reliable, structured LLM behavior",
    concepts: [
      { name: "Chain-of-Thought", desc: "\"Think step by step\" or few-shot CoT examples dramatically improve multi-step reasoning by externalizing the scratchpad." },
      { name: "Tool Use / Function Calling", desc: "JSON schema-constrained tool definitions force models to emit structured calls. Core of all agentic systems." },
      { name: "Structured Output", desc: "Instructor library, Outlines, or native JSON mode with constrained decoding via grammar-based sampling." },
      { name: "System Prompt Architecture", desc: "Role + context + constraints + examples + output format. Order and specificity of instructions matters significantly." },
      { name: "Prompt Injection Defense", desc: "Input sanitization, instruction hierarchy enforcement, canary tokens, and output validation for adversarial inputs." },
    ],
    interview: [
      "What is the 'lost-in-the-middle' problem and how do you mitigate it in long-context prompts?",
      "How does constrained decoding differ from asking the model to 'respond in JSON'? Why does it matter?",
      "Design a system prompt for a customer service agent that minimizes hallucination and off-topic responses.",
    ],
    depth: 88,
  },
  {
    id: 6, code: "06", tag: "QUALITY",
    title: "LLM Evaluation & Benchmarking",
    color: "#FB923C", icon: "📊",
    tldr: "Systematic measurement of model quality across dimensions",
    concepts: [
      { name: "Reference-Based Metrics", desc: "BLEU, ROUGE, BERTScore — require gold answers. High variance for open-ended tasks; misleading for creative outputs." },
      { name: "LLM-as-Judge", desc: "GPT-4 / Claude scoring rubrics for quality. G-Eval, MT-Bench. Biased toward length and own-style; needs calibration." },
      { name: "Task-Specific Evals", desc: "Exact match for extraction, F1 for QA, pass@k for code. Domain-specific benchmarks beat general ones for production." },
      { name: "Evals Infrastructure", desc: "LangSmith, Weave (W&B), PromptFoo, HELM — enable versioned, reproducible evaluation pipelines at scale." },
      { name: "A/B & Shadow Testing", desc: "Compare model versions on real traffic. Preference rates, latency p99, safety metrics — production beats offline evals." },
    ],
    interview: [
      "Why is perplexity a poor proxy for downstream task quality? What should you measure instead?",
      "Design an eval suite for a RAG-based legal document assistant. What are your top 5 metrics?",
      "How do you detect eval set contamination in a model you didn't train yourself?",
    ],
    depth: 82,
  },
  {
    id: 7, code: "07", tag: "SAFETY",
    title: "Hallucination & Guardrails",
    color: "#F472B6", icon: "🛡️",
    tldr: "Detecting, preventing, and mitigating unreliable LLM outputs",
    concepts: [
      { name: "Hallucination Taxonomy", desc: "Intrinsic (contradicts source), extrinsic (unsupported by source), factual (world-knowledge error). Each needs different mitigations." },
      { name: "Retrieval Grounding", desc: "Cite-then-answer + faithfulness checks. NLI models verify each claim against retrieved passages at inference time." },
      { name: "Input Guardrails", desc: "LlamaGuard, Nemo Guardrails, Lakera Guard — classify malicious/off-topic inputs before reaching the LLM." },
      { name: "Output Validation", desc: "Regex/schema validation, semantic similarity to source, NLI entailment scoring, factual consistency models." },
      { name: "Constitutional AI", desc: "Self-critique loops where the model evaluates its own outputs against a rule set before final response generation." },
    ],
    interview: [
      "A financial RAG app is hallucinating numbers from its context. Describe your 5-step mitigation plan.",
      "What's the difference between jailbreaking and prompt injection? How do you defend against each in production?",
      "How would you implement a real-time hallucination detector for a high-stakes medical chatbot?",
    ],
    depth: 93,
  },
  {
    id: 8, code: "08", tag: "PERFORMANCE",
    title: "Inference & Latency Optimization",
    color: "#60A5FA", icon: "🚀",
    tldr: "Serving LLMs fast and cost-efficiently at production scale",
    concepts: [
      { name: "Quantization", desc: "INT8, INT4, GPTQ, AWQ, GGUF — reduce model precision to shrink memory and increase throughput. Quality vs compression trade-off." },
      { name: "Speculative Decoding", desc: "Small draft model generates token candidates, large model verifies in parallel. 2–3× throughput with same output quality." },
      { name: "Continuous Batching", desc: "vLLM's PagedAttention and continuous batching maximize GPU utilization across variable-length concurrent requests." },
      { name: "Distillation", desc: "Train small student model to mimic large teacher's output distribution. DeepSeek-R1-Distill achieves GPT-4-class with 7B params." },
      { name: "Prefill / Decode Split", desc: "Disaggregate prefill (compute-bound) and decode (memory-bound) stages across different hardware for better GPU utilization." },
    ],
    interview: [
      "Explain how PagedAttention in vLLM eliminates KV cache fragmentation. Why does this matter at scale?",
      "Your LLM API has p50=200ms but p99=4s. What are the most likely causes and fixes?",
      "Compare AWQ vs GPTQ quantization. When would you pick one over the other in production?",
    ],
    depth: 87,
  },
];

function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

export default function App() {
  const [active, setActive] = useState(null);
  const [tab, setTab] = useState("concepts");
  const width = useWindowWidth();
  const isMobile = width < 768;

  const [sessionId, setSessionId] = useState(null);
  const [chatHistories, setChatHistories] = useState({});

  const getChatHistory = (id) =>
    chatHistories[id] ?? { messages: [], hasEvaluated: false };
  const updateChatHistory = (id, fn) =>
    setChatHistories((prev) => ({
      ...prev,
      [id]: fn(prev[id] ?? { messages: [], hasEvaluated: false }),
    }));
  const handleSessionExpired = () => setSessionId(null);

  const selected = topics.find((t) => t.id === active);

  const handleSelect = (id) => {
    setActive(id);
    setTab("concepts");
    if (isMobile) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClose = () => {
    setActive(null);
    if (isMobile) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080C14",
      fontFamily: "'Courier New', monospace",
      color: "#E2E8F0",
    }}>
      {/* Header — hidden on mobile when detail panel is open */}
      {(!isMobile || !active) && (
        <div style={{
          borderBottom: "1px solid #1E293B",
          padding: isMobile ? "22px 18px 16px" : "32px 48px 24px",
          background: "linear-gradient(180deg, #0D1421 0%, #080C14 100%)",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "8px", flexWrap: "wrap" }}>
            <span style={{
              fontSize: isMobile ? "9px" : "11px",
              letterSpacing: "4px",
              color: "#00FFD1",
              fontWeight: 700,
              textTransform: "uppercase",
            }}>AI ENGINEER INTERVIEW</span>
            <span style={{ color: "#334155", fontSize: isMobile ? "9px" : "11px" }}>// 2026 EDITION</span>
          </div>
          <h1 style={{
            fontSize: isMobile ? "24px" : "clamp(28px, 4vw, 48px)",
            fontWeight: 900,
            letterSpacing: "-1px",
            margin: 0,
            background: "linear-gradient(135deg, #FFFFFF 0%, #94A3B8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.15,
          }}>
            8 Concepts That Will{isMobile ? " " : <br />}
            <span style={{
              background: "linear-gradient(135deg, #00FFD1 0%, #60A5FA 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>Get You Hired</span>
          </h1>
          <p style={{ color: "#475569", fontSize: isMobile ? "11px" : "13px", marginTop: "10px", letterSpacing: "1px" }}>
            {isMobile ? "TAP A TOPIC TO EXPLORE →" : "SELECT A TOPIC TO DEEP DIVE →"}
          </p>
        </div>
      )}

      {/* ── MOBILE LAYOUT: full-screen stack ── */}
      {isMobile && (
        <>
          {active && selected ? (
            <DetailPanel
              topic={selected}
              tab={tab}
              setTab={setTab}
              onClose={handleClose}
              isMobile={true}
              sessionId={sessionId}
              setSessionId={setSessionId}
              chatHistory={getChatHistory(selected.id)}
              onUpdateChat={(fn) => updateChatHistory(selected.id, fn)}
              onSessionExpired={handleSessionExpired}
            />
          ) : (
            <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {topics.map((t) => (
                <MobileCard key={t.id} topic={t} onSelect={handleSelect} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── DESKTOP LAYOUT: sidebar + detail pane ── */}
      {!isMobile && (
        <div style={{ display: "flex", minHeight: "calc(100vh - 160px)" }}>
          <div style={{
            width: active ? "300px" : "100%",
            flexShrink: 0,
            borderRight: active ? "1px solid #1E293B" : "none",
            transition: "width 0.3s ease",
            overflowY: "auto",
            padding: active ? "14px 10px" : "24px 48px",
          }}>
            {!active ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "12px",
                paddingBottom: "32px",
              }}>
                {topics.map((t) => (
                  <DesktopCard key={t.id} topic={t} onSelect={handleSelect} />
                ))}
              </div>
            ) : (
              topics.map((t) => (
                <SidebarRow key={t.id} topic={t} isActive={active === t.id} onSelect={handleSelect} />
              ))
            )}
          </div>

          {selected && (
            <DetailPanel
              topic={selected}
              tab={tab}
              setTab={setTab}
              onClose={handleClose}
              isMobile={false}
              sessionId={sessionId}
              setSessionId={setSessionId}
              chatHistory={getChatHistory(selected.id)}
              onUpdateChat={(fn) => updateChatHistory(selected.id, fn)}
              onSessionExpired={handleSessionExpired}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Mobile card: icon + title row ─── */
function MobileCard({ topic, onSelect }) {
  return (
    <div
      onClick={() => onSelect(topic.id)}
      style={{
        background: "#0D1421",
        border: "1px solid #1E293B",
        borderRadius: "10px",
        padding: "14px 16px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: "50px", height: "50px",
        background: `linear-gradient(225deg, ${topic.color}25 0%, transparent 65%)`,
        borderRadius: "0 10px 0 0",
        pointerEvents: "none",
      }} />
      <div style={{
        width: "44px", height: "44px", borderRadius: "10px",
        background: `${topic.color}15`,
        border: `1px solid ${topic.color}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "20px", flexShrink: 0,
      }}>
        {topic.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "9px", letterSpacing: "2px", color: topic.color, marginBottom: "3px" }}>
          {topic.code} · {topic.tag}
        </div>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF", marginBottom: "4px", lineHeight: 1.2 }}>
          {topic.title}
        </div>
        <div style={{ fontSize: "11px", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {topic.tldr}
        </div>
      </div>
      {/* Depth pill */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "4px", flexShrink: 0,
      }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: topic.color }}>{topic.depth}%</span>
        <span style={{ fontSize: "8px", color: "#334155", letterSpacing: "1px" }}>WEIGHT</span>
      </div>
      <div style={{ color: "#475569", fontSize: "16px", flexShrink: 0 }}>›</div>
    </div>
  );
}

/* ─── Desktop full card ─── */
function DesktopCard({ topic, onSelect }) {
  return (
    <div
      onClick={() => onSelect(topic.id)}
      style={{
        background: "#0D1421",
        border: "1px solid #1E293B",
        borderRadius: "10px",
        padding: "24px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = topic.color + "60";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 8px 32px ${topic.color}20`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "#1E293B";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: "60px", height: "60px",
        background: `linear-gradient(225deg, ${topic.color}20 0%, transparent 60%)`,
        borderRadius: "0 10px 0 0",
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "10px", letterSpacing: "3px", color: topic.color, marginBottom: "6px" }}>
            {topic.code} · {topic.tag}
          </div>
          <div style={{ fontSize: "20px", fontWeight: 900, color: "#FFFFFF", lineHeight: 1.2 }}>
            {topic.title}
          </div>
        </div>
        <span style={{ fontSize: "24px", opacity: 0.8 }}>{topic.icon}</span>
      </div>
      <p style={{ fontSize: "12px", color: "#64748B", margin: "0 0 16px", lineHeight: 1.6 }}>{topic.tldr}</p>
      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "10px", color: "#475569", letterSpacing: "1px" }}>INTERVIEW WEIGHT</span>
          <span style={{ fontSize: "10px", color: topic.color, fontWeight: 700 }}>{topic.depth}%</span>
        </div>
        <div style={{ height: "3px", background: "#1E293B", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${topic.depth}%`,
            background: `linear-gradient(90deg, ${topic.color}80, ${topic.color})`,
            borderRadius: "2px",
          }} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#334155", fontSize: "11px", letterSpacing: "1px" }}>
        <span>{topic.concepts.length} CONCEPTS</span>
        <span>·</span>
        <span>{topic.interview.length} SAMPLE Qs</span>
        <span style={{ marginLeft: "auto", color: topic.color }}>EXPLORE →</span>
      </div>
    </div>
  );
}

/* ─── Desktop sidebar row ─── */
function SidebarRow({ topic, isActive, onSelect }) {
  return (
    <div
      onClick={() => onSelect(topic.id)}
      style={{
        padding: "10px 12px",
        marginBottom: "3px",
        borderRadius: "6px",
        cursor: "pointer",
        background: isActive ? `${topic.color}15` : "transparent",
        borderLeft: isActive ? `3px solid ${topic.color}` : "3px solid transparent",
        transition: "all 0.15s ease",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <span style={{ fontSize: "15px", flexShrink: 0 }}>{topic.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "9px", color: topic.color, letterSpacing: "2px", marginBottom: "2px" }}>
          {topic.code} · {topic.tag}
        </div>
        <div style={{
          fontSize: "12px", fontWeight: 700,
          color: isActive ? "#FFFFFF" : "#94A3B8",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {topic.title}
        </div>
      </div>
    </div>
  );
}

/* ─── Detail panel (shared, adapts internally) ─── */
function DetailPanel({ topic, tab, setTab, onClose, isMobile, sessionId, setSessionId, chatHistory, onUpdateChat, onSessionExpired }) {
  return (
    <div style={{
      flex: 1,
      overflowY: "auto",
      padding: isMobile ? "0 0 40px" : "32px 40px",
      background: "#080C14",
      minHeight: isMobile ? "100vh" : "auto",
    }}>
      {/* Mobile top bar */}
      {isMobile && (
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "#080C14",
          borderBottom: "1px solid #1E293B",
          padding: "12px 16px",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <button
            onClick={onClose}
            style={{
              background: "#0D1421",
              border: "1px solid #1E293B",
              color: "#94A3B8",
              cursor: "pointer",
              padding: "7px 14px",
              borderRadius: "6px",
              fontSize: "11px",
              fontFamily: "'Courier New', monospace",
              letterSpacing: "1px",
              flexShrink: 0,
            }}
          >
            ← BACK
          </button>
          <div style={{ fontSize: "9px", letterSpacing: "2px", color: topic.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {topic.code} · {topic.tag} · {topic.title}
          </div>
        </div>
      )}

      {/* Content padding wrapper */}
      <div style={{ padding: isMobile ? "20px 16px 0" : "0" }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: isMobile ? "18px" : "32px",
          gap: "12px",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {!isMobile && (
              <div style={{ fontSize: "10px", letterSpacing: "3px", color: topic.color, marginBottom: "8px" }}>
                {topic.code} · {topic.tag}
              </div>
            )}
            <h2 style={{
              fontSize: isMobile ? "22px" : "30px",
              fontWeight: 900,
              margin: "0 0 8px",
              color: "#FFFFFF",
              lineHeight: 1.2,
            }}>
              {topic.icon} {topic.title}
            </h2>
            <p style={{ color: "#64748B", fontSize: "13px", margin: 0, lineHeight: 1.6 }}>
              {topic.tldr}
            </p>
          </div>
          {!isMobile && (
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "1px solid #1E293B",
                color: "#64748B",
                cursor: "pointer",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "11px",
                letterSpacing: "2px",
                flexShrink: 0,
                fontFamily: "'Courier New', monospace",
              }}
            >
              ✕ CLOSE
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: "4px",
          marginBottom: isMobile ? "18px" : "24px",
          borderBottom: "1px solid #1E293B",
        }}>
          {[
            { id: "concepts", label: "CORE CONCEPTS" },
            { id: "interview", label: "INTERVIEW Qs" },
            { id: "practice", label: "🤖 PRACTICE" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: "none",
                border: "none",
                color: tab === t.id ? topic.color : "#475569",
                cursor: "pointer",
                padding: isMobile ? "10px 12px" : "10px 20px",
                fontSize: isMobile ? "10px" : "11px",
                letterSpacing: "2px",
                borderBottom: tab === t.id ? `2px solid ${topic.color}` : "2px solid transparent",
                marginBottom: "-1px",
                transition: "all 0.15s",
                fontFamily: "'Courier New', monospace",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Concepts */}
        {tab === "concepts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {topic.concepts.map((c, i) => (
              <div
                key={i}
                style={{
                  background: "#0D1421",
                  border: "1px solid #1E293B",
                  borderRadius: "8px",
                  padding: isMobile ? "14px 16px" : "18px 22px",
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: isMobile ? "6px" : "16px",
                  alignItems: "flex-start",
                }}
              >
                <div style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: topic.color,
                  letterSpacing: "0.5px",
                  flexShrink: 0,
                  width: isMobile ? "auto" : "180px",
                  paddingTop: isMobile ? 0 : "2px",
                }}>
                  {c.name}
                </div>
                <div style={{ fontSize: "13px", color: "#94A3B8", lineHeight: 1.75 }}>
                  {c.desc}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Interview Qs */}
        {tab === "interview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {topic.interview.map((q, i) => (
              <div
                key={i}
                style={{
                  background: "#0D1421",
                  border: `1px solid ${topic.color}30`,
                  borderRadius: "8px",
                  padding: isMobile ? "14px 16px" : "20px 24px",
                }}
              >
                <div style={{
                  fontSize: "10px",
                  color: topic.color,
                  letterSpacing: "2px",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}>
                  Q{i + 1}
                </div>
                <div style={{ fontSize: isMobile ? "13px" : "14px", color: "#E2E8F0", lineHeight: 1.8 }}>
                  {q}
                </div>
              </div>
            ))}

            <div style={{
              background: `linear-gradient(135deg, ${topic.color}10, transparent)`,
              border: `1px dashed ${topic.color}40`,
              borderRadius: "8px",
              padding: isMobile ? "14px 16px" : "20px",
              marginTop: "4px",
            }}>
              <div style={{ fontSize: "10px", letterSpacing: "2px", color: topic.color, marginBottom: "8px" }}>
                💡 PRO TIP
              </div>
              <div style={{ fontSize: "12px", color: "#64748B", lineHeight: 1.7 }}>
                For this topic, interviewers care most about practical trade-offs, not just definitions.
                Always follow up with "and in production, the constraint is usually X" to signal real-world experience.
              </div>
            </div>
          </div>
        )}

        {/* Practice */}
        {tab === "practice" && (
          <ChatPanel
            topic={topic}
            sessionId={sessionId}
            setSessionId={setSessionId}
            chatHistory={chatHistory}
            onUpdateChat={onUpdateChat}
            onSessionExpired={onSessionExpired}
            isMobile={isMobile}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function extractScore(text) {
  const match = text.match(/\b(10|[0-9])\s*\/\s*10\b/);
  return match ? parseInt(match[1], 10) : null;
}

/* ─── Chat panel ─── */

function ChatPanel({ topic, sessionId, setSessionId, chatHistory, onUpdateChat, onSessionExpired, isMobile }) {
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);

  const { messages, hasEvaluated } = chatHistory;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleKeySubmit(e) {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setIsCreatingSession(true);
    setKeyError("");
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setKeyError(data.error || "Failed to create session.");
        return;
      }
      setSessionId(data.sessionId);
      setKeyInput("");
    } catch {
      setKeyError("Network error. Is the API running?");
    } finally {
      setIsCreatingSession(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = userInput.trim();
    if (!text || isStreaming) return;
    setUserInput("");

    const evalKeywords = /evaluate me|score me|grade my|assess me/i;
    const userMsgCount = messages.filter((m) => m.role === "user").length + 1;
    const triggerEval = evalKeywords.test(text) || userMsgCount >= 10;
    const updatedMessages = [...messages, { role: "user", content: text }];

    onUpdateChat((h) => ({
      ...h,
      messages: [...h.messages, { role: "user", content: text }, { role: "assistant", content: "", score: null }],
    }));
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, topicId: topic.id, triggerEval, messages: updatedMessages }),
      });

      if (res.status === 401) {
        onSessionExpired();
        return;
      }

      if (!res.ok) {
        onUpdateChat((h) => {
          const msgs = [...h.messages];
          msgs[msgs.length - 1] = { role: "assistant", content: "Error contacting API.", score: null };
          return { ...h, messages: msgs };
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) {
              fullContent += token;
              onUpdateChat((h) => {
                const msgs = [...h.messages];
                msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: fullContent };
                return { ...h, messages: msgs };
              });
            }
          } catch { /* skip malformed SSE chunks */ }
        }
      }

      const score = extractScore(fullContent);
      onUpdateChat((h) => {
        const msgs = [...h.messages];
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: fullContent, score };
        return { ...h, messages: msgs, hasEvaluated: h.hasEvaluated || triggerEval };
      });
    } catch {
      onUpdateChat((h) => {
        const msgs = [...h.messages];
        msgs[msgs.length - 1] = { role: "assistant", content: "Stream error.", score: null };
        return { ...h, messages: msgs };
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function handleExport() {
    const lines = [`AI Engineer Interview — ${topic.title}`, "=".repeat(50), ""];
    for (const m of messages) {
      lines.push(`[${m.role.toUpperCase()}]`);
      lines.push(m.content);
      if (m.score != null) lines.push(`Score: ${m.score}/10`);
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-${topic.tag}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!sessionId) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", gap: "16px" }}>
        <div style={{ fontSize: "32px" }}>🔑</div>
        <div style={{ fontSize: "13px", color: "#64748B", textAlign: "center", lineHeight: 1.6, maxWidth: "340px" }}>
          Enter your NVIDIA NIM API key to start practice. Stored in session only — never persisted.
        </div>
        <form onSubmit={handleKeySubmit} style={{ width: "100%", maxWidth: "340px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <input
            type="password"
            placeholder="nvapi-..."
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            style={{
              background: "#0D1421",
              border: `1px solid ${keyError ? "#F472B6" : "#1E293B"}`,
              color: "#E2E8F0",
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "13px",
              fontFamily: "'Courier New', monospace",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          {keyError && <div style={{ fontSize: "11px", color: "#F472B6" }}>{keyError}</div>}
          <button
            type="submit"
            disabled={isCreatingSession || !keyInput.trim()}
            style={{
              background: topic.color,
              border: "none",
              color: "#080C14",
              padding: "10px",
              borderRadius: "6px",
              cursor: isCreatingSession ? "wait" : "pointer",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "2px",
              fontFamily: "'Courier New', monospace",
              opacity: !keyInput.trim() || isCreatingSession ? 0.5 : 1,
            }}
          >
            {isCreatingSession ? "CONNECTING..." : "START PRACTICE"}
          </button>
        </form>
        <div style={{ fontSize: "10px", color: "#334155", textAlign: "center" }}>
          Free key at <span style={{ color: topic.color }}>build.nvidia.com</span> → Sign in → Generate API Key
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: isMobile ? "calc(100vh - 220px)" : "60vh", minHeight: "400px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "1px" }}>
          {messages.filter((m) => m.role === "user").length} / 10 ANSWERS
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {hasEvaluated && (
            <button
              onClick={handleExport}
              style={{
                background: "none",
                border: `1px solid ${topic.color}60`,
                color: topic.color,
                padding: "4px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "10px",
                letterSpacing: "1px",
                fontFamily: "'Courier New', monospace",
              }}
            >
              ↓ EXPORT
            </button>
          )}
          <button
            onClick={onSessionExpired}
            style={{
              background: "none",
              border: "1px solid #1E293B",
              color: "#475569",
              padding: "4px 10px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "10px",
              letterSpacing: "1px",
              fontFamily: "'Courier New', monospace",
            }}
          >
            CHANGE KEY
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px", paddingRight: "4px" }}>
        {messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#334155", fontSize: "12px", letterSpacing: "1px", textAlign: "center", gap: "8px" }}>
            <span>TYPE ANYTHING TO BEGIN →</span>
            <span style={{ fontSize: "10px" }}>e.g. "Start the interview" or ask a specific question</span>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
            <div style={{
              background: m.role === "user" ? `${topic.color}20` : "#0D1421",
              border: `1px solid ${m.role === "user" ? topic.color + "50" : "#1E293B"}`,
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "13px",
              color: "#E2E8F0",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}>
              {m.content}
              {isStreaming && i === messages.length - 1 && m.role === "assistant" && (
                <span style={{ opacity: 0.4 }}>▋</span>
              )}
            </div>
            {m.score != null && (
              <div style={{
                marginTop: "4px",
                display: "inline-block",
                background: topic.color,
                opacity: 0.4 + (m.score / 10) * 0.6,
                color: "#080C14",
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "4px",
                letterSpacing: "1px",
              }}>
                {m.score}/10
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          disabled={isStreaming}
          placeholder={isStreaming ? "Generating..." : "Type your answer..."}
          style={{
            flex: 1,
            background: "#0D1421",
            border: "1px solid #1E293B",
            color: "#E2E8F0",
            padding: "10px 14px",
            borderRadius: "6px",
            fontSize: "13px",
            fontFamily: "'Courier New', monospace",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={isStreaming || !userInput.trim()}
          style={{
            background: topic.color,
            border: "none",
            color: "#080C14",
            padding: "10px 16px",
            borderRadius: "6px",
            cursor: isStreaming ? "wait" : "pointer",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "1px",
            fontFamily: "'Courier New', monospace",
            opacity: isStreaming || !userInput.trim() ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          SEND
        </button>
      </form>
    </div>
  );
}
