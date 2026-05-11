using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace AIInterviewGuide.Functions;

public class ChatFunction
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly StihiaService _stihia;
    private readonly ILogger<ChatFunction> _logger;

    public ChatFunction(IHttpClientFactory httpClientFactory, IMemoryCache cache, StihiaService stihia, ILogger<ChatFunction> logger)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _stihia = stihia;
        _logger = logger;
    }

    [Function("chat")]
    public async Task Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "chat")] HttpRequest req)
    {
        var res = req.HttpContext.Response;

        // ── 1. Parse request body ──────────────────────────────────────────────
        ChatRequest? chatRequest;
        try
        {
            chatRequest = await JsonSerializer.DeserializeAsync<ChatRequest>(
                req.Body,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Failed to parse request body: {Message}", ex.Message);
            await WriteBadRequest(res, "Invalid request body.");
            return;
        }

        if (chatRequest is null || string.IsNullOrWhiteSpace(chatRequest.SessionId))
        {
            await WriteBadRequest(res, "Missing sessionId.");
            return;
        }

        if (!_cache.TryGetValue(chatRequest.SessionId, out string? apiKey) || string.IsNullOrWhiteSpace(apiKey))
        {
            res.StatusCode = StatusCodes.Status401Unauthorized;
            res.ContentType = "application/json";
            await res.WriteAsync(JsonSerializer.Serialize(new { error = "Session expired. Re-enter your API key." }));
            return;
        }

        if (!TopicData.All.TryGetValue(chatRequest.TopicId, out var topic))
        {
            await WriteBadRequest(res, $"Unknown topicId: {chatRequest.TopicId}.");
            return;
        }

        if (chatRequest.Messages is null || chatRequest.Messages.Count == 0)
        {
            await WriteBadRequest(res, "Messages array is empty.");
            return;
        }

        // ── 2. Guardrail check ────────────────────────────────────────────────
        var lastUserMessage = chatRequest.Messages.LastOrDefault(m => m.Role == "user");
        if (lastUserMessage is not null)
        {
            var guard = await _stihia.CheckInputAsync(lastUserMessage.Content, chatRequest.SessionId);
            if (!guard.IsAllowed)
            {
                res.StatusCode = StatusCodes.Status403Forbidden;
                res.ContentType = "application/json";
                await res.WriteAsync(JsonSerializer.Serialize(new { error = guard.Reason }));
                return;
            }
        }

        // ── 3. Build system prompt server-side ────────────────────────────────
        var systemPrompt = TopicData.BuildSystemPrompt(topic, chatRequest.TriggerEval);
        var nimMessages = BuildNimMessages(systemPrompt, chatRequest.Messages);

        var nimPayload = new NimRequest
        {
            Model = "nvidia/nemotron-mini-4b-instruct",
            Messages = nimMessages,
            Temperature = 0.7,
            TopP = 0.9,
            MaxTokens = 1024,
            Stream = true
        };

        var payloadJson = JsonSerializer.Serialize(nimPayload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        });

        // ── 3. Call NVIDIA NIM with streaming ─────────────────────────────────
        var httpClient = _httpClientFactory.CreateClient("nvidia");
        using var nimReq = new HttpRequestMessage(HttpMethod.Post, "/v1/chat/completions");
        nimReq.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
        nimReq.Content = new StringContent(payloadJson, Encoding.UTF8, "application/json");
        nimReq.Content.Headers.ContentType!.CharSet = null;

        HttpResponseMessage nimResponse;
        try
        {
            nimResponse = await httpClient.SendAsync(nimReq, HttpCompletionOption.ResponseHeadersRead);
        }
        catch (Exception ex)
        {
            _logger.LogError("NIM request failed: {Message}", ex.Message);
            await WriteBadRequest(res, "Failed to reach NVIDIA NIM endpoint.");
            return;
        }

        if (!nimResponse.IsSuccessStatusCode)
        {
            var errorBody = await nimResponse.Content.ReadAsStringAsync();
            _logger.LogWarning("NIM returned {Status}: {Body}", nimResponse.StatusCode, errorBody);
            res.StatusCode = (int)nimResponse.StatusCode;
            res.ContentType = "application/json";
            await res.WriteAsync(errorBody);
            return;
        }

        // ── 4. Stream SSE back to browser ─────────────────────────────────────
        res.StatusCode = StatusCodes.Status200OK;
        res.ContentType = "text/event-stream; charset=utf-8";
        res.Headers["Cache-Control"] = "no-cache";
        res.Headers["X-Accel-Buffering"] = "no";

        await using var nimStream = await nimResponse.Content.ReadAsStreamAsync();
        using var reader = new StreamReader(nimStream, Encoding.UTF8);
        await using var writer = new StreamWriter(res.Body, Encoding.UTF8, leaveOpen: true);

        string? line;
        while ((line = await reader.ReadLineAsync()) != null)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;

            await writer.WriteLineAsync(line);
            await writer.WriteLineAsync();
            await writer.FlushAsync();

            if (line == "data: [DONE]") break;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static List<NimMessage> BuildNimMessages(string systemPrompt, List<ChatMessage> history)
    {
        var messages = new List<NimMessage>
        {
            new() { Role = "system", Content = systemPrompt }
        };

        foreach (var msg in history)
        {
            messages.Add(new NimMessage
            {
                Role = msg.Role == "user" ? "user" : "assistant",
                Content = msg.Content
            });
        }

        return messages;
    }

    private static async Task WriteBadRequest(HttpResponse res, string message)
    {
        res.StatusCode = StatusCodes.Status400BadRequest;
        res.ContentType = "application/json";
        await res.WriteAsync(JsonSerializer.Serialize(new { error = message }));
    }
}

// ── Request/Response DTOs ─────────────────────────────────────────────────────

public record ChatRequest
{
    public string SessionId { get; init; } = string.Empty;
    public int TopicId { get; init; }
    public bool TriggerEval { get; init; }
    public List<ChatMessage> Messages { get; init; } = [];
}

public record ChatMessage
{
    public string Role { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
}

public record NimRequest
{
    public string Model { get; init; } = string.Empty;
    public List<NimMessage> Messages { get; init; } = [];
    public double Temperature { get; init; } = 0.7;
    public double TopP { get; init; } = 0.9;
    public int MaxTokens { get; init; } = 1024;
    public bool Stream { get; init; } = true;
}

public record NimMessage
{
    public string Role { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
}
