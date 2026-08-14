using System.Collections.Generic;
using System.Threading.Tasks;

namespace LocalPageBackend.Services.AgentWork
{
    // Database Engineer agent's deliverable: a database/ folder with a real schema (matching
    // the Backend agent's Domain entity's guaranteed fields), seed data, and a README walking
    // through wiring it into the Backend agent's EF Core setup as a real database instead of
    // the InMemory provider. Deterministic-only for now (no LLM overlay yet) — the interface
    // already supports adding one later exactly like Frontend/Backend's, e.g. to have Gemini
    // propose extra columns/indexes tailored to the task.
    public class DatabaseAgentWorkProvider : IAgentWorkProvider
    {
        public string AgentId => "Database";
        public string DisplayName => "Database Engineer";

        private const string SchemaTemplate = """
            -- __GENERATED_BY__ — task: "__TASK__"
            -- PostgreSQL dialect (adjust column types for another engine). Matches the Backend
            -- agent's Domain entity (backend/Domain/Entities/__COMPONENT__.cs) — id/name/
            -- created_at are guaranteed to exist; the Backend agent's own LLM overlay may add a
            -- few more nullable/typed columns on top depending on the task, which aren't
            -- reflected here since this file is generated deterministically, independently of
            -- that overlay.
            CREATE TABLE IF NOT EXISTS __TABLE__ (
                id          SERIAL PRIMARY KEY,
                name        VARCHAR(200) NOT NULL,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            -- Most reads of this table will be "recent items first" (matches the API's GetAll,
            -- which has no explicit ORDER BY yet — add one when wiring up a real database, and
            -- this index makes it cheap).
            CREATE INDEX IF NOT EXISTS idx___TABLE___created_at ON __TABLE__ (created_at DESC);
            """;

        private const string SeedTemplate = """
            -- __GENERATED_BY__ — task: "__TASK__"
            -- A couple of sample rows for local development — safe to delete before a real
            -- deploy.
            INSERT INTO __TABLE__ (name, created_at) VALUES
                ('Sample __DISPLAY_TITLE__ 1', NOW()),
                ('Sample __DISPLAY_TITLE__ 2', NOW());
            """;

        private const string ReadmeTemplate = """
            # Database — __DISPLAY_TITLE__

            Schema for the `__COMPONENT__` entity that the Backend agent's Domain model
            (`backend/Domain/Entities/__COMPONENT__.cs`) maps onto.

            ## Files
            - `schema.sql` — table definition (PostgreSQL dialect; adjust types for another engine).
            - `seed.sql` — a couple of sample rows for local development.

            ## Wiring it into the Backend agent's project
            The backend scaffold uses EF Core's InMemory provider out of the box (zero setup,
            data resets every restart). To point it at this real schema instead:

            1. `cd backend && dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL`
            2. In `backend/Program.cs`, replace:
               `options.UseInMemoryDatabase("__COMPONENT__Db")`
               with:
               `options.UseNpgsql(builder.Configuration.GetConnectionString("Default"))`
            3. Add a `ConnectionStrings:Default` entry to `backend/appsettings.json` pointing at
               a database created from `schema.sql` (run it once against your Postgres
               instance, then optionally `seed.sql`).

            Alternative: once the Npgsql provider is wired in from step 1-2, you can skip
            `schema.sql` entirely and run `dotnet ef migrations add InitialCreate && dotnet ef
            database update` from `backend/` instead — EF Core will generate the same table
            shape directly from the entity, and will also pick up any extra columns the Backend
            agent's own LLM overlay added to the entity that this file doesn't know about.
            """;

        private string Fill(string template, string componentName, string route, string task, string language) =>
            AgentWorkShared.FillTemplate(template, componentName, route, task, language, DisplayName);

        public Dictionary<string, string> BuildDeterministicFiles(string componentName, string route, string task, string language) => new()
        {
            ["database/schema.sql"] = Fill(SchemaTemplate, componentName, route, task, language),
            ["database/seed.sql"] = Fill(SeedTemplate, componentName, route, task, language),
            ["database/README.md"] = Fill(ReadmeTemplate, componentName, route, task, language),
        };

        public Task<(string Path, string Content)?> TryGenerateLlmOverlayAsync(
            GeminiService gemini, string componentName, string route, string task) =>
            Task.FromResult<(string Path, string Content)?>(null);

        public string BuildReadme(string componentName, string route, string task, string language, string mode)
        {
            var header = AgentWorkShared.BuildReadmeHeader(AgentId, DisplayName, task, language, mode);
            return header + $"""
                database/
                  schema.sql   — CREATE TABLE for the __COMPONENT__ entity (PostgreSQL dialect)
                  seed.sql     — sample rows for local development
                  README.md    — how to wire this into the Backend agent's EF Core setup

                This deliverable is standalone SQL, not tied to any particular ORM — apply
                schema.sql against whatever Postgres instance you're using, or follow
                database/README.md to swap it in as the Backend agent's real database.
                """;
        }
    }
}
