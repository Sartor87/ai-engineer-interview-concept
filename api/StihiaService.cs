using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AIInterviewGuide.Functions;

public record GuardrailResult(bool IsAllowed, string Reason);

public class StihiaService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<StihiaService> _logger;
    private readonly string _apiKey;
    private readonly bool _disabled;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public StihiaService(IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<StihiaService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _apiKey = config["STIHIA_API_KEY"] ?? string.Empty;
        _disabled = string.Equals(config["DISABLE_GUARDRAILS"], "true", StringComparison.OrdinalIgnoreCase);

        if (!_disabled && string.IsNullOrWhiteSpace(_apiKey))
            _logger.LogWarning("STIHIA_API_KEY is not set and DISABLE_GUARDRAILS is false. Guardrails will pass through.");
    }

    public async Task<GuardrailResult> CheckInputAsync(string userMessage, string sessionId)
    {
        if (_disabled)
        {
            _logger.LogDebug("Guardrails disabled — skipping Stihia check.");
            return new GuardrailResult(true, string.Empty);
        }

        if (string.IsNullOrWhiteSpace(_apiKey))
            return new GuardrailResult(true, string.Empty);

        var payload = new SenseRequest
        {
            ProjectKey = "ai-interview-guide",
            UserKey = sessionId,
            ProcessKey = "chat",
            ThreadKey = sessionId,
            RunKey = Guid.NewGuid().ToString("N"),
            Sensor = "default-input",
            Messages = [new SenseMessage { Role = "user", Content = userMessage }],
        };

        var json = JsonSerializer.Serialize(payload, _jsonOptions);

        var client = _httpClientFactory.CreateClient("stihia");
        using var request = new HttpRequestMessage(HttpMethod.Post, "/v1/sense");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        request.Content.Headers.ContentType!.CharSet = null;

        HttpResponseMessage response;
        try
        {
            response = await client.SendAsync(request);
        }
        catch (Exception ex)
        {
            _logger.LogError("Stihia request failed: {Message}", ex.Message);
            // Fail open — don't block users on guardrail outage
            return new GuardrailResult(true, string.Empty);
        }

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Stihia returned {Status} — failing open.", response.StatusCode);
            return new GuardrailResult(true, string.Empty);
        }

        var body = await response.Content.ReadAsStringAsync();
        _logger.LogDebug("Stihia raw response ({Status}): {Body}", response.StatusCode, body[..Math.Min(500, body.Length)]);

        try
        {
            using var doc = JsonDocument.Parse(body);
            var severity = doc.RootElement
                .GetProperty("payload")
                .GetProperty("sense_result")
                .GetProperty("aggregated_signal")
                .GetProperty("payload")
                .GetProperty("severity")
                .GetString();

            // Block on high/critical severity; allow everything else
            bool blocked = severity is "high" or "critical";
            _logger.LogInformation("Stihia check: severity={Severity} blocked={Blocked}", severity, blocked);

            return blocked
                ? new GuardrailResult(false, $"Message blocked by content guardrails (severity: {severity}).")
                : new GuardrailResult(true, string.Empty);
        }
        catch (Exception ex)
        {
            _logger.LogError("Failed to parse Stihia response: {Message} | Body: {Body}", ex.Message, body[..Math.Min(500, body.Length)]);
            return new GuardrailResult(true, string.Empty);
        }
    }
}

// ── Stihia DTOs ───────────────────────────────────────────────────────────────

file record SenseRequest
{
    public string ProjectKey { get; init; } = string.Empty;
    public string UserKey { get; init; } = string.Empty;
    public string ProcessKey { get; init; } = string.Empty;
    public string ThreadKey { get; init; } = string.Empty;
    public string RunKey { get; init; } = string.Empty;
    public string Sensor { get; init; } = string.Empty;
    public List<SenseMessage> Messages { get; init; } = [];
}

file record SenseMessage
{
    public string Role { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
}
