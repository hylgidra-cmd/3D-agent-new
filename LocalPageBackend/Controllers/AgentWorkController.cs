using System.IO.Compression;
using Microsoft.AspNetCore.Mvc;
using LocalPageBackend.Services;
using LocalPageBackend.Services.AgentWork;

namespace LocalPageBackend.Controllers
{
    public class AgentWorkRequest
    {
        public string AgentId { get; set; } = string.Empty;
        public string Task { get; set; } = string.Empty;
    }

    // Deliberately its own controller (not a second action on AgentsController) — that
    // controller's constructor requires OrchestratorService, which isn't registered in
    // Program.cs DI, so any request to it throws before this action could ever run.
    // This one only depends on AgentSimulationService + GeminiService + the agent-work
    // provider registry (all registered), so POST /api/agents/work works standalone.
    [ApiController]
    [Route("api/agents")]
    public class AgentWorkController : ControllerBase
    {
        private readonly AgentSimulationService _simulation;
        private readonly GeminiService _gemini;
        private readonly AgentWorkProviderRegistry _providers;
        private readonly ILogger<AgentWorkController> _logger;
        private readonly IHostEnvironment _environment;

        public AgentWorkController(
            AgentSimulationService simulation,
            GeminiService gemini,
            AgentWorkProviderRegistry providers,
            ILogger<AgentWorkController> logger,
            IHostEnvironment environment)
        {
            _simulation = simulation;
            _gemini = gemini;
            _providers = providers;
            _logger = logger;
            _environment = environment;
        }

        // POST /api/agents/work
        // Body: { "agentId": "<any registered agent id>", "task": "short task description (UZ/RU/EN)" }
        //
        // Which agent ids are valid is NOT hardcoded here — it's whatever's registered in
        // AgentWorkProviderRegistry (Program.cs), currently Frontend / Backend / Database / QA
        // / DevOps / UI_UX. Adding a new specialist to the office is purely "implement
        // IAgentWorkProvider and register it" — this action never needs to change.
        //
        // Strictly single-agent: assigning a task to one agent pins ONLY that agent to
        // "Working" and generates ONLY that agent's own deliverable. The others never bleed in
        // — no more "assign to Frontend but Backend also lights up and a backend/ folder
        // appears in the zip anyway".
        //
        // The whole roster still stays connected in spirit: componentName/route are derived
        // deterministically from the task text (ToPascalCase/ToKebabCase), so assigning the
        // SAME task wording to several agents in separate requests produces a matching route
        // across all of them automatically — you don't have to coordinate that by hand.
        //
        // Generation itself is hybrid per agent: each provider's deterministic scaffold always
        // produces a complete, guaranteed-correct deliverable. If a Gemini API key is
        // configured (GeminiService.IsConfigured) and that provider implements an LLM overlay,
        // a real LLM call additionally overlays just that one "creative" leaf file on top of
        // the scaffold — so a bad or missing LLM response can only ever fall back to the
        // deterministic version of that one file, never break the rest of the project.
        //
        // No artificial delay and no request timeout of our own here — quality and
        // completeness matter more than latency for this endpoint. Task.Delay(...) that used
        // to fake a few seconds of "thinking" has been removed; the actual duration is now
        // whatever the deterministic scaffold + (optional) LLM call really take. Program.cs's
        // Kestrel limits and GeminiService's HttpClient timeout are both set generously (30
        // minutes) so a deep, multi-file generation is never cut off mid-flight.
        [HttpPost("work")]
        public async Task<IActionResult> AssignWork([FromBody] AgentWorkRequest? request)
        {
            // Unconditional entry log — proves the action actually started executing (as
            // opposed to the request failing during routing/CORS/model-binding before ever
            // reaching this method body, which the Program.cs raw-body-logging middleware
            // covers separately) and shows exactly what model binding produced from the body.
            _logger.LogInformation("[AgentWork] AssignWork entered. request={Request}",
                request is null ? "null" : $"{{ AgentId=\"{request.AgentId}\", Task=\"{request.Task}\" }}");

            var requestedAgentId = request?.AgentId?.Trim() ?? string.Empty;
            var task = request?.Task?.Trim() ?? string.Empty;

            if (string.IsNullOrEmpty(requestedAgentId) || string.IsNullOrEmpty(task))
            {
                return BadRequest(new { success = false, error = "Both agentId and task are required.", details = (string?)null });
            }

            var provider = _providers.Resolve(requestedAgentId);
            if (provider is null)
            {
                var known = string.Join(", ", _providers.KnownAgentIds);
                return NotFound(new
                {
                    success = false,
                    error = $"Unknown agent id '{requestedAgentId}'. Known agents: {known}.",
                    details = (string?)null,
                });
            }

            // Canonical casing — matches AgentSimulationService's roster keys exactly (the
            // request body's casing isn't trusted for that dictionary lookup) and is what
            // gets used everywhere below (file paths, README, zip name).
            var canonicalAgentId = provider.AgentId;

            // Pre-flight check: log whether an LLM key is present before any external call is
            // attempted. Missing key is NOT a hard failure — each provider's overlay already
            // degrades gracefully to its deterministic scaffold — but it should always be
            // visible in the log rather than discovered only as "why didn't the LLM overlay run".
            _logger.LogInformation(
                "[AgentWork] Pre-flight: agent={AgentId} ({DisplayName}), Gemini API key configured = {IsConfigured}. If false, set Gemini:ApiKey in appsettings.json or the GEMINI__APIKEY environment variable; the deterministic scaffold will be used regardless.",
                canonicalAgentId, provider.DisplayName, _gemini.IsConfigured);

            // Only the assigned agent pins to Working — the other roster agents are left alone
            // entirely, so their own 3D state and their own next task assignment are unaffected
            // by this one.
            _simulation.TryStartManualWork(canonicalAgentId);

            DirectoryInfo? tempDir = null;
            string? zipPath = null;
            try
            {
                var componentName = AgentWorkShared.ToPascalCase(task);
                var route = AgentWorkShared.ToKebabCase(task);
                var language = AgentWorkShared.DetectLanguage(task);

                var (files, generationMode) = await GenerateAgentFilesAsync(provider, componentName, route, task);
                files["README.txt"] = provider.BuildReadme(componentName, route, task, language, generationMode);

                // Scratch files live under %LOCALAPPDATA% — not the OS Temp directory (an
                // IIS/service app-pool identity frequently can't write there) and not a
                // folder under the project root either, since this project sits inside
                // OneDrive's synced Desktop, and OneDrive's cloud-file provider transiently
                // locks freshly created files while it picks them up, which also surfaces
                // as "Access to the path ... is denied". LocalAppData is always writable by
                // the account running the app and isn't synced by OneDrive.
                var baseFolder = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                if (string.IsNullOrWhiteSpace(baseFolder))
                {
                    baseFolder = Path.GetTempPath();
                }
                var workspaceRoot = Path.Combine(baseFolder, "LocalPageBackend", "AgentWork");
                Directory.CreateDirectory(workspaceRoot);
                tempDir = Directory.CreateDirectory(Path.Combine(workspaceRoot, $"agentwork_{Guid.NewGuid():N}"));
                foreach (var (relativePath, content) in files)
                {
                    // Belt-and-braces: re-sanitize/truncate the path right at the write site
                    // too, so even a path built outside a provider's own sanitization (e.g. by
                    // a deterministic scaffold from an oversized componentName) can never reach
                    // the filesystem un-truncated, and create whatever nested folder
                    // (Application/Interfaces/, src/components/, .github/workflows/, ...) it needs.
                    var safeRelativePath = AgentWorkShared.SanitizeRelativeFilePath(relativePath);
                    if (safeRelativePath.Length == 0) continue;

                    var fullPath = Path.GetFullPath(
                        Path.Combine(tempDir.FullName, safeRelativePath.Replace('/', Path.DirectorySeparatorChar)));
                    // Containment guard: confirms the sanitized path still resolves inside
                    // tempDir before anything touches disk — a second, independent check on
                    // top of SanitizeRelativeFilePath's own traversal stripping.
                    if (!fullPath.StartsWith(tempDir.FullName, StringComparison.OrdinalIgnoreCase)) continue;

                    // A sanitized path that collides with a directory another file already
                    // needed (e.g. two entries only differing in a part SanitizeRelativeFilePath
                    // strips) would otherwise throw UnauthorizedAccessException from
                    // File.WriteAllTextAsync — .NET reports "write to a path that is a
                    // directory" as Access Denied rather than a clearer error. Skip it instead
                    // of failing the whole request over one malformed entry.
                    if (Directory.Exists(fullPath))
                    {
                        _logger.LogWarning("[AgentWork] Skipping '{RelativePath}' — resolved path is already a directory.", relativePath);
                        continue;
                    }

                    var directory = Path.GetDirectoryName(fullPath);
                    if (!string.IsNullOrEmpty(directory))
                    {
                        Directory.CreateDirectory(directory);
                    }
                    await AgentWorkShared.WriteFileWithRetryAsync(fullPath, content);
                }

                zipPath = Path.Combine(workspaceRoot, $"{tempDir.Name}.zip");
                ZipFile.CreateFromDirectory(tempDir.FullName, zipPath, CompressionLevel.Optimal, includeBaseDirectory: false);

                var zipBytes = await System.IO.File.ReadAllBytesAsync(zipPath);
                return File(zipBytes, "application/zip", $"{route}-{canonicalAgentId.ToLowerInvariant()}.zip");
            }
            catch (Exception ex)
            {
                // Last-resort net for this action specifically: each provider's LLM overlay
                // already swallows its own pipeline failures internally, but this catches
                // anything else in the request (missing key surfaced as an actual throw, temp-
                // dir/zip I/O, file-system permission issues, etc.) so the client always gets a
                // clean, logged 500 instead of an unhandled crash bubbling out as a raw
                // framework error page. Passing ex to LogError captures the full exception chain
                // (all InnerExceptions) in the server log; Message/StackTrace are also logged
                // explicitly below so both are unambiguously present in the terminal.
                _logger.LogError(ex,
                    "[AgentWork] AssignWork FAILED. agentId={AgentId}, task=\"{Task}\". Message: {Message}\nStackTrace: {StackTrace}",
                    requestedAgentId, task, ex.Message, ex.StackTrace);

                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message,
                    // Stack traces are internal implementation detail — only surfaced to the
                    // client outside Production so a deployed instance never leaks them to
                    // callers; the full trace is always in the server log above regardless.
                    details = _environment.IsDevelopment() ? ex.StackTrace : null,
                });
            }
            finally
            {
                _simulation.EndManualWork(canonicalAgentId);
                AgentWorkShared.TryDeleteFile(zipPath);
                AgentWorkShared.TryDeleteDirectory(tempDir?.FullName);
            }
        }

        // Builds the given provider's deterministic scaffold, then — only if Gemini is
        // configured and the provider implements an overlay — layers its one LLM-authored leaf
        // file on top. Any failure anywhere in that LLM step falls back to the deterministic
        // scaffold untouched rather than failing the whole request.
        private async Task<(Dictionary<string, string> Files, string Mode)> GenerateAgentFilesAsync(
            IAgentWorkProvider provider, string componentName, string route, string task)
        {
            var language = AgentWorkShared.DetectLanguage(task);
            var files = provider.BuildDeterministicFiles(componentName, route, task, language);
            var mode = "deterministic-fallback";

            if (_gemini.IsConfigured)
            {
                try
                {
                    var overlay = await provider.TryGenerateLlmOverlayAsync(_gemini, componentName, route, task);
                    if (overlay is { } value)
                    {
                        files[value.Path] = value.Content;
                        mode = "llm+scaffold";
                    }
                }
                catch (Exception ex)
                {
                    // ex.ToString() (via LogError) includes the full stack trace and recurses
                    // into InnerException, not just the top-level message.
                    _logger.LogError(ex, "[AgentWork] LLM overlay threw for agent {AgentId}, using deterministic scaffold only. Message: {Message}", provider.AgentId, ex.Message);
                }
            }

            return (files, mode);
        }
    }
}
