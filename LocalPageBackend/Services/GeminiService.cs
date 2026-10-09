using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LocalPageBackend.Services
{
    public class GeminiService
    {
        private readonly HttpClient _httpClient;
        private readonly string? _apiKey;
        private readonly ILogger<GeminiService> _logger;

        // True once a real Gemini or Groq key is configured. Callers (AgentWorkController) check
        // this and fall back to the deterministic template engine when it's false, so a
        // missing/invalid key degrades gracefully instead of crashing the request.
        public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey);

        public GeminiService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiService> logger)
        {
            _httpClient = httpClient;
            // Reads from Gemini:ApiKey or Groq:ApiKey or environment variables
            _apiKey = configuration["Groq:ApiKey"] ?? configuration["Gemini:ApiKey"] ?? Environment.GetEnvironmentVariable("GROQ_API_KEY") ?? Environment.GetEnvironmentVariable("GEMINI__APIKEY");
            _logger = logger;
        }

        // Returns null (never throws) on missing key, HTTP failure, malformed response, or
        // cancellation — callers treat null as "fall back to the deterministic engine."
        public async Task<string?> TryGenerateTextAsync(
            string prompt,
            string roleContext,
            CancellationToken cancellationToken = default)
        {
            if (!IsConfigured)
            {
                _logger.LogWarning("[GeminiService] No API key configured (Groq/Gemini) — skipping LLM call, caller will use deterministic fallback.");
                return null;
            }

            // If the key starts with "gsk_", it's a Groq API key!
            if (_apiKey!.StartsWith("gsk_", StringComparison.OrdinalIgnoreCase))
            {
                return await TryGenerateWithGroqAsync(prompt, roleContext, cancellationToken);
            }

            return await TryGenerateWithGeminiAsync(prompt, roleContext, cancellationToken);
        }

        private async Task<string?> TryGenerateWithGroqAsync(string prompt, string roleContext, CancellationToken cancellationToken)
        {
            try
            {
                var url = "https://api.groq.com/openai/v1/chat/completions";

                // We try openai/gpt-oss-120b first, falling back to qwen/qwen3.8-27b if needed
                var models = new[] { "openai/gpt-oss-120b", "qwen/qwen3.8-27b" };

                foreach (var model in models)
                {
                    var requestBody = new
                    {
                        model,
                        messages = new[]
                        {
                            new { role = "system", content = roleContext },
                            new { role = "user", content = prompt }
                        },
                        temperature = 0.2
                    };

                    using var request = new HttpRequestMessage(HttpMethod.Post, url);
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
                    request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

                    var response = await _httpClient.SendAsync(request, cancellationToken);
                    var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogWarning("[Groq] HTTP {StatusCode} with model {Model}: {Body}", (int)response.StatusCode, model, responseBody);
                        continue;
                    }

                    using var doc = JsonDocument.Parse(responseBody);
                    var content = doc.RootElement
                        .GetProperty("choices")[0]
                        .GetProperty("message")
                        .GetProperty("content")
                        .GetString();

                    if (!string.IsNullOrWhiteSpace(content))
                    {
                        _logger.LogInformation("[Groq] Successfully generated text using model {Model}", model);
                        return content;
                    }
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Groq] TryGenerateWithGroqAsync threw: {Message}", ex.Message);
                return null;
            }
        }

        private async Task<string?> TryGenerateWithGeminiAsync(string prompt, string roleContext, CancellationToken cancellationToken)
        {
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

                using var doc = JsonDocument.Parse(jsonResponse);
                return doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text").GetString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[GeminiService] TryGenerateWithGeminiAsync threw. Message: {Message}\nStackTrace: {StackTrace}", ex.Message, ex.StackTrace);
                return null;
            }
        }
    }
}
