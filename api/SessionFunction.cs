using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace AIInterviewGuide.Functions;

public class SessionFunction
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<SessionFunction> _logger;

    public SessionFunction(IMemoryCache cache, ILogger<SessionFunction> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    [Function("session")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "session")] HttpRequest req)
    {
        SessionRequest? body;
        try
        {
            body = await JsonSerializer.DeserializeAsync<SessionRequest>(
                req.Body,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid request body." });
        }

        if (body is null || string.IsNullOrWhiteSpace(body.ApiKey))
            return new BadRequestObjectResult(new { error = "Missing apiKey." });

        var sessionId = Guid.NewGuid().ToString("N");
        _cache.Set(sessionId, body.ApiKey, new MemoryCacheEntryOptions
        {
            SlidingExpiration = TimeSpan.FromMinutes(30)
        });

        _logger.LogInformation("Session created: {SessionId}", sessionId);

        return new OkObjectResult(new { sessionId });
    }
}

public record SessionRequest
{
    public string ApiKey { get; init; } = string.Empty;
}
