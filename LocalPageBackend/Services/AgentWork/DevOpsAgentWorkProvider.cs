using System.Collections.Generic;
using System.Threading.Tasks;

namespace LocalPageBackend.Services.AgentWork
{
    // DevOps agent's deliverable: a devops/ folder with Dockerfiles for the Backend and
    // Frontend agents' generated projects, a docker-compose.yml wiring them together, and a
    // GitHub Actions CI workflow that builds/tests both plus the QA agent's suite.
    // Deterministic-only for now (infra-as-code correctness shouldn't depend on an LLM call
    // succeeding); the interface supports adding an overlay later if ever useful.
    public class DevOpsAgentWorkProvider : IAgentWorkProvider
    {
        public string AgentId => "DevOps";
        public string DisplayName => "DevOps";

        private const string BackendDockerfileTemplate = """
            # __GENERATED_BY__ — task: "__TASK__"
            # Multi-stage build for the Backend agent's ASP.NET Core 9 project.
            # Build from the repo root: docker build -f devops/Dockerfile.backend -t __ROUTE__-backend .
            FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
            WORKDIR /src
            COPY backend/__COMPONENT__Api.csproj ./backend/
            RUN dotnet restore ./backend/__COMPONENT__Api.csproj
            COPY backend/. ./backend/
            RUN dotnet publish ./backend/__COMPONENT__Api.csproj -c Release -o /app/publish --no-restore

            FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
            WORKDIR /app
            COPY --from=build /app/publish .
            EXPOSE 5080
            ENV ASPNETCORE_URLS=http://+:5080
            ENTRYPOINT ["dotnet", "__COMPONENT__Api.dll"]
            """;

        private const string FrontendDockerfileTemplate = """
            # __GENERATED_BY__ — task: "__TASK__"
            # Multi-stage build for the Frontend agent's Vite project.
            # Build from the repo root: docker build -f devops/Dockerfile.frontend -t __ROUTE__-frontend .
            FROM node:22-alpine AS build
            WORKDIR /src
            COPY frontend/package*.json ./
            RUN npm install
            COPY frontend/. .
            RUN npm run build

            FROM nginx:1.27-alpine AS runtime
            COPY --from=build /src/dist /usr/share/nginx/html
            EXPOSE 80
            """;

        private const string ComposeTemplate = """
            # __GENERATED_BY__ — task: "__TASK__"
            # Brings up the Backend and Frontend agents' generated projects together.
            # Run from the devops/ folder: docker compose up --build
            services:
              backend:
                build:
                  context: ..
                  dockerfile: devops/Dockerfile.backend
                ports:
                  - "5080:5080"
                healthcheck:
                  test: ["CMD", "wget", "-qO-", "http://localhost:5080/api/__ROUTE__"]
                  interval: 10s
                  timeout: 5s
                  retries: 5

              frontend:
                build:
                  context: ..
                  dockerfile: devops/Dockerfile.frontend
                ports:
                  - "8080:80"
                depends_on:
                  backend:
                    condition: service_healthy
            """;

        private const string CiWorkflowTemplate = """
            # __GENERATED_BY__ — task: "__TASK__"
            name: CI

            on:
              push:
                branches: [main]
              pull_request:

            jobs:
              backend:
                runs-on: ubuntu-latest
                steps:
                  - uses: actions/checkout@v4
                  - uses: actions/setup-dotnet@v4
                    with:
                      dotnet-version: "10.0.x"
                  - run: dotnet restore backend/__COMPONENT__Api.csproj
                  - run: dotnet build backend/__COMPONENT__Api.csproj --no-restore -c Release
                  - name: Run Backend unit tests
                    run: dotnet test backend/Tests/__COMPONENT__Api.Tests.csproj

              qa:
                runs-on: ubuntu-latest
                needs: backend
                steps:
                  - uses: actions/checkout@v4
                  - uses: actions/setup-dotnet@v4
                    with:
                      dotnet-version: "10.0.x"
                  - name: Start backend in the background
                    run: |
                      cd backend
                      dotnet run &
                      sleep 15
                  - name: Run QA black-box tests
                    run: dotnet test qa/__COMPONENT__Qa.csproj

              frontend:
                runs-on: ubuntu-latest
                steps:
                  - uses: actions/checkout@v4
                  - uses: actions/setup-node@v4
                    with:
                      node-version: "22"
                  - run: npm install
                    working-directory: frontend
                  - run: npm run build
                    working-directory: frontend
            """;

        private const string ReadmeTemplate = """
            # DevOps — __DISPLAY_TITLE__

            Container + CI setup for the Backend and Frontend agents' generated projects.

            ## Files
            - `Dockerfile.backend` / `Dockerfile.frontend` — multi-stage builds, run from the
              repo root so the `COPY backend/...` / `COPY frontend/...` paths resolve.
            - `docker-compose.yml` — brings both services up together (`docker compose up --build`
              from this folder).
            - `.github/workflows/ci.yml` — builds + unit-tests the backend, runs the QA agent's
              black-box suite against a live instance, and builds the frontend, on every push/PR.

            ## Local dev without Docker
            Docker is for packaging/CI, not required for day-to-day development — `cd backend &&
            dotnet run` and `cd frontend && npm run dev` (see each agent's own README) is faster
            for iterating.
            """;

        private string Fill(string template, string componentName, string route, string task, string language) =>
            AgentWorkShared.FillTemplate(template, componentName, route, task, language, DisplayName);

        public Dictionary<string, string> BuildDeterministicFiles(string componentName, string route, string task, string language) => new()
        {
            ["devops/Dockerfile.backend"] = Fill(BackendDockerfileTemplate, componentName, route, task, language),
            ["devops/Dockerfile.frontend"] = Fill(FrontendDockerfileTemplate, componentName, route, task, language),
            ["devops/docker-compose.yml"] = Fill(ComposeTemplate, componentName, route, task, language),
            ["devops/.github/workflows/ci.yml"] = Fill(CiWorkflowTemplate, componentName, route, task, language),
            ["devops/README.md"] = Fill(ReadmeTemplate, componentName, route, task, language),
        };

        public Task<(string Path, string Content)?> TryGenerateLlmOverlayAsync(
            GeminiService gemini, string componentName, string route, string task) =>
            Task.FromResult<(string Path, string Content)?>(null);

        public string BuildReadme(string componentName, string route, string task, string language, string mode)
        {
            var header = AgentWorkShared.BuildReadmeHeader(AgentId, DisplayName, task, language, mode);
            return header + $"""
                devops/
                  Dockerfile.backend
                  Dockerfile.frontend
                  docker-compose.yml
                  .github/workflows/ci.yml
                  README.md

                Run it:  cd devops && docker compose up --build
                CI:      commit .github/workflows/ci.yml to your repo's default branch and it
                         runs automatically on GitHub Actions for every push/PR.
                """;
        }
    }
}
