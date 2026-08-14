using LocalPageBackend.Services;
using LocalPageBackend.Services.AgentWork;
using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;

var builder = WebApplication.CreateBuilder(args);

// Render (and most PaaS hosts) inject PORT and expect the app to bind 0.0.0.0:$PORT.
// Local dev leaves PORT unset, so launchSettings.json's URLs keep working unchanged.
var renderPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(renderPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{renderPort}");
}

// Matches the 30-minute HttpClient timeout below — without raising these, Kestrel's own
// connection-level timeouts (or its default minimum-data-rate watchdogs) can drop a
// long-running /api/agents/work request out from under the controller before it ever gets a
// chance to respond, even though the controller's own logic is still happily running.
// Quality/completeness over speed: a deep, fully-fleshed-out generation (especially once an
// LLM overlay is involved) should never be cut off mid-flight just because it took a while.
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(30);
    options.Limits.RequestHeadersTimeout = TimeSpan.FromMinutes(30);
    // Default rate-floor watchdogs abort a connection that looks "stalled" (too few
    // bytes/sec) — irrelevant here since the client is just waiting on a slow AI
    // generation with no bytes to send either way, not actually stalled.
    options.Limits.MinRequestBodyDataRate = null;
    options.Limits.MinResponseDataRate = null;
});

// Swagger'ni qaytaramiz
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Wires up [ApiController] classes under Controllers/ (e.g. AgentWorkController) —
// without this, routes like POST /api/agents/work 404 even though the controller compiles.
builder.Services.AddControllers();

// Agent movement/state tick loop — one shared singleton, ticked by the hosted service below,
// read by both the polling snapshot endpoint and the SSE stream endpoint.
builder.Services.AddSingleton<AgentSimulationService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<AgentSimulationService>());

// Used by AgentWorkController's providers for real multi-language, collaborative code
// generation when a Gemini API key is configured (Gemini:ApiKey / GEMINI__APIKEY); otherwise
// GeminiService.IsConfigured is false and each provider falls back to its deterministic
// scaffold, so this stays safe to register even with no key present.
// Timeout is deliberately very generous (default HttpClient timeout is 100s) — quality and
// completeness matter more than speed here, and a deep/complex generation prompt can
// legitimately take a long time. Without this the request would abort mid-flight and
// silently degrade to the deterministic fallback rather than actually finishing.
builder.Services.AddHttpClient<GeminiService>(client =>
{
    client.Timeout = TimeSpan.FromMinutes(30);
});

// One IAgentWorkProvider per office role — see Services/AgentWork/*Provider.cs. Growing the
// roster beyond Frontend/Backend/Database/QA/DevOps/UI_UX is purely "implement the interface
// and add one more line here"; AgentWorkController and AgentWorkProviderRegistry never need
// to change.
builder.Services.AddSingleton<IAgentWorkProvider, FrontendAgentWorkProvider>();
builder.Services.AddSingleton<IAgentWorkProvider, BackendAgentWorkProvider>();
builder.Services.AddSingleton<IAgentWorkProvider, DatabaseAgentWorkProvider>();
builder.Services.AddSingleton<IAgentWorkProvider, QaAgentWorkProvider>();
builder.Services.AddSingleton<IAgentWorkProvider, DevOpsAgentWorkProvider>();
builder.Services.AddSingleton<IAgentWorkProvider, UiUxAgentWorkProvider>();
builder.Services.AddSingleton<AgentWorkProviderRegistry>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader()
            // Content-Disposition isn't in the browser's default CORS-exposed-header
            // safelist, so cross-origin fetch() calls can't read it (returns null) unless
            // it's explicitly exposed here. AgentWorkController's zip download depends on
            // the frontend being able to read the filename from this header.
            .WithExposedHeaders("Content-Disposition"));
});

var app = builder.Build();

// Logs EVERY request that reaches Kestrel — placed as the very first middleware,
// unconditionally, so it can never be skipped by anything downstream (a CORS rejection, a
// malformed body causing [ApiController]'s automatic model-binding 400 before the action
// method even runs, an unhandled exception, etc.). Previously this log line lived after
// app.MapControllers(), which meant it was possible for a request to be fully handled (or
// to fail) without ever reaching it — this position removes that ambiguity entirely.
app.Use(async (context, next) =>
{
    Console.WriteLine($"[Request] {DateTime.UtcNow:O} {context.Request.Method} {context.Request.Path}{context.Request.QueryString}");
    await next.Invoke();
});

// For /api/agents/work specifically: log the exact raw JSON body as received, before
// [ApiController] model binding touches it. Model-binding failures (e.g. malformed JSON
// from the frontend) short-circuit to an automatic 400 before AssignWork's method body ever
// runs, so nothing inside the controller could log or see that case — this makes it visible
// regardless of what happens next in the pipeline.
app.Use(async (context, next) =>
{
    if (context.Request.Method == HttpMethods.Post && context.Request.Path.StartsWithSegments("/api/agents/work"))
    {
        context.Request.EnableBuffering();
        using var reader = new StreamReader(context.Request.Body, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        context.Request.Body.Position = 0;
        Console.WriteLine($"[AgentWork] Raw request body: {body}");
    }
    await next.Invoke();
});

// Last-resort safety net: per-endpoint try/catch (e.g. AgentWorkController.AssignWork)
// already handles known failure modes, but this catches anything unforeseen anywhere in
// the pipeline and logs it server-side, so the frontend always gets a clean JSON 500
// instead of an unhandled exception / raw framework error page.
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("UnhandledException");

        // ex.Message + ex.StackTrace explicitly (not just ex.ToString()) so both pieces are
        // unambiguously present in the terminal even if something upstream truncates output.
        logger.LogError(error, "Unhandled exception on {Method} {Path}. Message: {Message}",
            context.Request.Method, context.Request.Path, error?.Message);

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new
        {
            success = false,
            error = error?.Message ?? "An unexpected server error occurred.",
            // Stack traces are internal implementation detail — only surfaced to the client
            // outside Production so a deployed instance (e.g. Render) never leaks them to
            // callers; the full trace is always in the server log above regardless.
            details = app.Environment.IsDevelopment() ? error?.StackTrace : null,
        });
    });
});

app.UseSwagger();
app.UseSwaggerUI(); // Endi localhost:5270/swagger yana ishlaydi!

app.UseCors("AllowAll");

app.MapControllers();

// Bizning manzillar
app.MapGet("/health", () => Results.Ok(new { status = "ok", message = "C# Backend is alive!" }));

// Frontend so'rayotgan asosiy manzil
app.MapPost("/api/runtime/custom", () =>
{
    Console.WriteLine("YURAAA! Frontenddan POST so'rov keldi!");
    return Results.Ok(new { success = true });
});

// 6 ta agent rosterini beradi — CustomRuntimeProvider shu yerdan "active" xaritasini o'qiydi
app.MapGet("/state", () =>
{
    // Same 6 roles as Services/Agents.cs (FrontendAgent, BackendAgent, GraphicAgent,
    // UiUxAgent, ThreeDAgent, MobileAgent) so the office roster lines up with the
    // orchestrator's agent identities.
    var active = new Dictionary<string, object?>
    {
        ["Frontend"] = "gemini-2.5-flash",
        ["Backend"] = "gemini-2.5-flash",
        ["Graphic"] = "gemini-2.5-flash",
        ["UI_UX"] = "gemini-2.5-flash",
        ["3D_Model"] = "gemini-2.5-flash",
        ["Android_iOS"] = "gemini-2.5-flash",
    };

    var departments = new Dictionary<string, object?>
    {
        ["Frontend"] = new Dictionary<string, object?> { ["department"] = "engineering", ["departmentName"] = "Engineering" },
        ["Backend"] = new Dictionary<string, object?> { ["department"] = "engineering", ["departmentName"] = "Engineering" },
        ["Graphic"] = new Dictionary<string, object?> { ["department"] = "design", ["departmentName"] = "Design" },
        ["UI_UX"] = new Dictionary<string, object?> { ["department"] = "design", ["departmentName"] = "Design" },
        ["3D_Model"] = new Dictionary<string, object?> { ["department"] = "design", ["departmentName"] = "Design" },
        ["Android_iOS"] = new Dictionary<string, object?> { ["department"] = "mobile", ["departmentName"] = "Mobile" },
    };

    return Results.Ok(new Dictionary<string, object?>
    {
        ["profileName"] = "LocalPage AI Office",
        ["active"] = active,
        ["departments"] = departments,
        ["runtime"] = new Dictionary<string, object?>
        {
            ["name"] = "LocalPage Backend",
            ["version"] = "0.1.0",
            ["vendor"] = "LocalPage",
            ["status"] = "ok",
            ["active_model"] = "gemini-2.5-flash",
        },
    });
});

app.MapGet("/registry", () => Results.Ok(new Dictionary<string, object?>
{
    ["models"] = new Dictionary<string, object?>
    {
        ["gemini-2.5-flash"] = new Dictionary<string, object?>(),
    },
}));

// Snapshot of each agent's live coordinates + activity state (Idle / Walking / Working).
// Polled by the frontend every couple of seconds via the /api/runtime/custom proxy.
app.MapGet("/api/agents/live", (AgentSimulationService sim) => Results.Ok(sim.GetSnapshot()));

// camelCase so /api/agents/stream matches the shape Results.Ok(...) already produces for
// /api/agents/live (ASP.NET Core's default minimal-API JSON options use camelCase).
var sseJsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

// Same payload as /api/agents/live, pushed continuously over Server-Sent Events so any
// client that wants a real push feed (rather than polling) can subscribe directly.
app.MapGet("/api/agents/stream", async (HttpContext context, AgentSimulationService sim, CancellationToken token) =>
{
    context.Response.Headers.ContentType = "text/event-stream";
    context.Response.Headers.CacheControl = "no-cache";
    context.Response.Headers.Connection = "keep-alive";

    while (!token.IsCancellationRequested)
    {
        var snapshot = sim.GetSnapshot();
        var json = JsonSerializer.Serialize(snapshot, sseJsonOptions);
        await context.Response.WriteAsync($"data: {json}\n\n", token);
        await context.Response.Body.FlushAsync(token);
        await Task.Delay(TimeSpan.FromSeconds(1), token);
    }
});

app.Run();