using System.Collections.Generic;
using System.Threading.Tasks;

namespace LocalPageBackend.Services.AgentWork
{
    // One implementation per office role (Frontend, Backend, Database, QA, DevOps, UI/UX, ...).
    // AgentWorkController depends only on this interface plus AgentWorkProviderRegistry —
    // adding a new specialist to the office is "write one more class that implements this
    // interface and register it in Program.cs"; nothing in the controller, the request/response
    // contract, or any other provider needs to change.
    public interface IAgentWorkProvider
    {
        // Canonical id — MUST match the id AgentSimulationService.Roster uses for this same
        // role, since AgentWorkController pins/releases the 3D "Working" state by this exact
        // string. Case-sensitive by convention (PascalCase, e.g. "Backend", "QA", "DevOps").
        string AgentId { get; }

        // Human-readable label for logs, generated file comments, and READMEs (e.g. "Backend",
        // "Database Engineer").
        string DisplayName { get; }

        // Deterministic, network-free scaffold — no dependency on an LLM being configured or
        // reachable, always succeeds, and is a complete, ready-to-use deliverable for exactly
        // this role on its own (never bleeds into another agent's files).
        Dictionary<string, string> BuildDeterministicFiles(string componentName, string route, string task, string language);

        // Optional enhancement layered on top of the deterministic scaffold above, using a real
        // LLM call. Return null to skip entirely (Gemini not configured, the call failed, or —
        // as with the providers for Database/QA/DevOps/UI-UX below — this role simply doesn't
        // have an LLM overlay implemented yet). A non-null result's Path always replaces/adds
        // exactly one file in the scaffold; nothing else about the deterministic output is ever
        // touched, so a bad LLM response can only ever affect that one file.
        Task<(string Path, string Content)?> TryGenerateLlmOverlayAsync(
            GeminiService gemini, string componentName, string route, string task);

        // Builds the top-level README.txt bundled at the root of this agent's zip.
        string BuildReadme(string componentName, string route, string task, string language, string mode);
    }
}
