using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System;
using Microsoft.Extensions.Configuration;

namespace LocalPageBackend.Services
{
    public class GeminiService
    {
        private readonly HttpClient _httpClient;
        private readonly string? _apiKey;
        private readonly ILogger<GeminiService> _logger;

        // True once a real Gemini key is configured. Callers (AgentWorkController) check
        // this and fall back to the deterministic template engine when it's false, so a
        // missing/invalid key degrades gracefully instead of crashing the request.
        public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey);

        // Read from configuration (appsettings "Gemini:ApiKey", or the GEMINI__APIKEY
        // env var on deploy hosts like Render). Deliberately does NOT throw when the key
        // is missing — this service is constructed once per request via DI, and throwing
        // here would 500 every endpoint that depends on it, including ones that have a
        // perfectly good non-LLM fallback.
        public GeminiService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiService> logger)
        {
            _httpClient = httpClient;
            _apiKey = configuration["Gemini:ApiKey"];
            _logger = logger;
        }

        // Returns null (never throws) on missing key, HTTP failure, malformed response, or
        // cancellation — callers treat null as "fall back to the deterministic engine."
        public async Task<string?> TryGenerateTextAsync(
            string prompt,
            string roleContext,
            CancellationToken cancellationToken = default)
        {
            // Pre-flight check: confirm the key exists before ever attempting the external
            // call, so a missing-key environment shows up as one clear log line instead of
            // an opaque downstream failure.
            if (!IsConfigured)
            {
                _logger.LogWarning("[GeminiService] No Gemini API key configured (Gemini:ApiKey / GEMINI__APIKEY) — skipping LLM call, caller will use the deterministic fallback.");
                return null;
            }

            try
            {
                var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + _apiKey;

                var requestBody = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new[] { new { text = $"{roleContext}\n\nUser task: {prompt}" } }
                        }
                    }
                };

                var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(url, content, cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError("[GeminiService] HTTP {StatusCode}: {ErrorBody}", (int)response.StatusCode, errorBody);
                    return null;
                }

                var jsonResponse = await response.Content.ReadAsStringAsync(cancellationToken);

                try
                {
                    using var doc = JsonDocument.Parse(jsonResponse);

                    return doc.RootElement
                        .GetProperty("candidates")[0]
                        .GetProperty("content")
                        .GetProperty("parts")[0]
                        .GetProperty("text").GetString();
                }
                catch (Exception parseEx)
                {
                    // Malformed JSON or an unexpected response shape (e.g. a candidate blocked
                    // by safety filters has no "content"/"parts"). Log the raw body — truncated,
                    // since it can be large — so the exact shape that broke parsing is visible,
                    // rather than just the exception type/message.
                    var snippet = jsonResponse.Length > 1000 ? jsonResponse[..1000] + "…" : jsonResponse;
                    _logger.LogError(parseEx, "[GeminiService] Failed to parse Gemini response. Raw response (truncated): {Snippet}", snippet);
                    return null;
                }
            }
            catch (Exception ex)
            {
                // Network error, timeout, cancellation, etc. — the caller falls back to the
                // deterministic engine either way. Message + StackTrace logged explicitly
                // (ex is also passed to LogError, which captures the full chain).
                _logger.LogError(ex, "[GeminiService] TryGenerateTextAsync threw. Message: {Message}\nStackTrace: {StackTrace}", ex.Message, ex.StackTrace);
                return null;
            }
        }
    }
}
