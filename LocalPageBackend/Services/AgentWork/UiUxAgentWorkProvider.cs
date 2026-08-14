using System.Collections.Generic;
using System.Threading.Tasks;

namespace LocalPageBackend.Services.AgentWork
{
    // UI/UX Designer agent's deliverable: a design/ folder with framework-agnostic design
    // tokens (CSS custom properties) and a UX spec for the feature — flow, states,
    // accessibility, responsive behavior, and the exact copy the Frontend agent's scaffold
    // already uses, so the two agents' outputs describe the same feature from two angles.
    // Deterministic-only for now (no LLM overlay yet) — the interface supports adding one
    // later exactly like Frontend/Backend's, e.g. to have Gemini tailor the UX rationale to
    // the specific task.
    public class UiUxAgentWorkProvider : IAgentWorkProvider
    {
        public string AgentId => "UI_UX";
        public string DisplayName => "UI/UX Designer";

        private const string DesignTokensTemplate = """
            /* __GENERATED_BY__ — task: "__TASK__" */
            /* Framework-agnostic — plain CSS custom properties, usable regardless of what the
               Frontend agent's stack ends up being. */
            :root {
              /* Color */
              --color-bg: #05070a;
              --color-surface: #10151d;
              --color-surface-raised: #1a2029;
              --color-border: rgba(255, 255, 255, 0.08);
              --color-text: #e6e9ee;
              --color-text-muted: rgba(230, 233, 238, 0.55);
              --color-accent: #38bdf8;
              --color-danger: #f87171;
              --color-success: #34d399;

              /* Spacing scale (4px base) */
              --space-1: 4px;
              --space-2: 8px;
              --space-3: 12px;
              --space-4: 16px;
              --space-6: 24px;
              --space-8: 32px;

              /* Radius */
              --radius-sm: 6px;
              --radius-md: 12px;
              --radius-lg: 20px;

              /* Typography */
              --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
              --text-xs: 12px;
              --text-sm: 14px;
              --text-base: 16px;
              --text-lg: 20px;
            }
            """;

        private const string ComponentSpecTemplate = """
            # UX Spec — __DISPLAY_TITLE__

            Design handoff for the `__COMPONENT__` feature (route: `api/__ROUTE__`). Written to
            be implemented against the Frontend agent's generated component
            (`frontend/src/components/__COMPONENT__.jsx`).

            ## User flow
            1. On load, the list of __DISPLAY_TITLE__ items fetches from the Backend agent's API.
            2. The user types a name and submits to create a new item.
            3. The new item appears in the list without a full page reload.
            4. The user can delete an item they no longer want.

            ## States to design/implement for
            - **Loading** — list is empty because the fetch hasn't resolved yet; show a skeleton
              or spinner, not a bare "no items" message (avoids a flash of an incorrect empty
              state — the Frontend scaffold already tracks this explicitly).
            - **Empty** — fetch resolved with zero items; show "__LIST_EMPTY__" with a hint to
              use the form above it.
            - **Error** — the fetch, create, or delete request failed; show the error inline,
              never a silent failure.
            - **Success** — a newly created item animates into the list, and a deleted item
              animates out, so both actions feel acknowledged.

            ## Accessibility
            - The input needs a visible `<label>` or an `aria-label` (the Frontend scaffold
              already sets `aria-label` to match the placeholder — verify it stays in sync if
              the copy changes).
            - The submit and delete controls must be reachable and activatable by keyboard alone
              (native `<button>` elements, already the case).
            - Error text must be associated with the field it describes via `aria-describedby`
              once a per-field validation message is added (today it's a single request-level
              error banner).
            - Check `--color-text-muted` against `--color-surface` for WCAG AA contrast (4.5:1)
              before shipping — verify once final surface colors are picked.

            ## Responsive behavior
            - Single-column layout below 640px; the form and list share full width.
            - Above 640px, cap the container width (matches the scaffold's `max-w-2xl`) and
              center it.

            ## Copy (detected language: __LANGUAGE__)
            - Submit button: "__SUBMIT_LABEL__"
            - Empty state: "__LIST_EMPTY__"
            - Input placeholder: "__PLACEHOLDER__"
            """;

        private const string ReadmeTemplate = """
            # Design — __DISPLAY_TITLE__

            - `design-tokens.css` — plain CSS custom properties (framework-agnostic) for color,
              spacing, radius, and type scale.
            - `component-spec.md` — UX spec for the `__COMPONENT__` feature: flow, states,
              accessibility, responsive behavior, and the exact copy the Frontend agent's
              scaffold already uses.
            """;

        private string Fill(string template, string componentName, string route, string task, string language) =>
            AgentWorkShared.FillTemplate(template, componentName, route, task, language, DisplayName);

        public Dictionary<string, string> BuildDeterministicFiles(string componentName, string route, string task, string language) => new()
        {
            ["design/design-tokens.css"] = Fill(DesignTokensTemplate, componentName, route, task, language),
            ["design/component-spec.md"] = Fill(ComponentSpecTemplate, componentName, route, task, language),
            ["design/README.md"] = Fill(ReadmeTemplate, componentName, route, task, language),
        };

        public Task<(string Path, string Content)?> TryGenerateLlmOverlayAsync(
            GeminiService gemini, string componentName, string route, string task) =>
            Task.FromResult<(string Path, string Content)?>(null);

        public string BuildReadme(string componentName, string route, string task, string language, string mode)
        {
            var header = AgentWorkShared.BuildReadmeHeader(AgentId, DisplayName, task, language, mode);
            return header + $"""
                design/
                  design-tokens.css   — framework-agnostic CSS custom properties
                  component-spec.md   — UX spec: flow, states, accessibility, responsive, copy
                  README.md

                This deliverable is documentation + tokens, not application code — it's meant
                to be read alongside the Frontend agent's generated component.
                """;
        }
    }
}
