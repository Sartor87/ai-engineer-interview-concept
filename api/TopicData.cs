namespace AIInterviewGuide.Functions;

public record Topic(int Id, string Tag, string Title, string[] Concepts, string[] InterviewQuestions);

public static class TopicData
{
    public static readonly IReadOnlyDictionary<int, Topic> All = new Dictionary<int, Topic>
    {
        [1] = new(1, "ARCHITECTURE", "Transformers & Attention",
            [
                "Self-Attention",
                "Multi-Head Attention",
                "Positional Encoding",
                "KV Cache",
                "Flash Attention",
            ],
            [
                "Explain why attention complexity is O(n²) and how sparse/linear attention variants address this.",
                "What is the difference between encoder-only, decoder-only, and encoder-decoder architectures? Give examples.",
                "How does Grouped Query Attention (GQA) reduce KV cache memory in models like Llama 3?",
            ]),

        [2] = new(2, "RETRIEVAL", "Embeddings & Vector Search",
            [
                "Embedding Models",
                "ANN Algorithms",
                "Vector DBs",
                "Similarity Metrics",
                "Hybrid Search",
            ],
            [
                "When would you use a bi-encoder vs a cross-encoder? What's the latency/quality trade-off?",
                "Describe the HNSW index structure. Why is it the default in most vector DBs?",
                "How do you handle embedding model versioning in production without full re-indexing?",
            ]),

        [3] = new(3, "SYSTEMS", "RAG Architecture",
            [
                "Naive RAG",
                "Advanced RAG",
                "Agentic RAG",
                "Chunking Strategy",
                "RAG Evaluation",
            ],
            [
                "Explain the difference between context precision and context recall in RAGAS. Which matters more and when?",
                "Your retrieval step returns irrelevant chunks 30% of the time. What 3 things would you try first?",
                "How does GraphRAG differ from standard vector RAG? When is the knowledge graph overhead justified?",
            ]),

        [4] = new(4, "TRAINING", "Fine-Tuning / LoRA / PEFT",
            [
                "LoRA",
                "QLoRA",
                "PEFT Methods",
                "SFT vs RLHF",
                "Rank & Alpha",
            ],
            [
                "When does fine-tuning outperform prompt engineering? What's the minimum data size heuristic?",
                "Explain why QLoRA can train a 70B model on 48 GB VRAM. Walk through the quantization steps.",
                "Compare DPO vs PPO for alignment. What are the practical failure modes of each?",
            ]),

        [5] = new(5, "PROMPTING", "Prompt Engineering & Structured Outputs",
            [
                "Chain-of-Thought",
                "Tool Use / Function Calling",
                "Structured Output",
                "System Prompt Architecture",
                "Prompt Injection Defense",
            ],
            [
                "What is the 'lost-in-the-middle' problem and how do you mitigate it in long-context prompts?",
                "How does constrained decoding differ from asking the model to 'respond in JSON'? Why does it matter?",
                "Design a system prompt for a customer service agent that minimizes hallucination and off-topic responses.",
            ]),

        [6] = new(6, "QUALITY", "LLM Evaluation & Benchmarking",
            [
                "Reference-Based Metrics",
                "LLM-as-Judge",
                "Task-Specific Evals",
                "Evals Infrastructure",
                "A/B & Shadow Testing",
            ],
            [
                "Why is perplexity a poor proxy for downstream task quality? What should you measure instead?",
                "Design an eval suite for a RAG-based legal document assistant. What are your top 5 metrics?",
                "How do you detect eval set contamination in a model you didn't train yourself?",
            ]),

        [7] = new(7, "SAFETY", "Hallucination & Guardrails",
            [
                "Hallucination Taxonomy",
                "Retrieval Grounding",
                "Input Guardrails",
                "Output Validation",
                "Constitutional AI",
            ],
            [
                "A financial RAG app is hallucinating numbers from its context. Describe your 5-step mitigation plan.",
                "What's the difference between jailbreaking and prompt injection? How do you defend against each in production?",
                "How would you implement a real-time hallucination detector for a high-stakes medical chatbot?",
            ]),

        [8] = new(8, "PERFORMANCE", "Inference & Latency Optimization",
            [
                "Quantization",
                "Speculative Decoding",
                "Continuous Batching",
                "Distillation",
                "Prefill / Decode Split",
            ],
            [
                "Explain how PagedAttention in vLLM eliminates KV cache fragmentation. Why does this matter at scale?",
                "Your LLM API has p50=200ms but p99=4s. What are the most likely causes and fixes?",
                "Compare AWQ vs GPTQ quantization. When would you pick one over the other in production?",
            ]),
    };

    public static string BuildSystemPrompt(Topic topic, bool triggerEval)
    {
        var concepts = string.Join(", ", topic.Concepts);
        var questions = string.Join("\n", topic.InterviewQuestions.Select((q, i) => $"{i + 1}. {q}"));

        var prompt = $"""
            You are a senior AI engineering interviewer conducting a technical interview on "{topic.Title}".

            Core concepts to probe: {concepts}.

            Sample questions to draw from:
            {questions}

            Rules:
            - Ask ONE question at a time. After the candidate answers, give 1-2 sentences of feedback, then ask the next.
            - Stay focused on {topic.Title}.
            - Be rigorous but encouraging.
            """;

        if (triggerEval)
            prompt += """


                EVALUATION MODE: Score each of the candidate's answers. For every answer write "Score: X/10" followed by a one-sentence justification. End with an overall summary.
                """;

        return prompt;
    }
}
