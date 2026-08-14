using System.Collections.Generic;
using System.Threading.Tasks;

namespace LocalPageBackend.Services.AgentWork
{
    // QA Tester agent's deliverable: a standalone qa/ xUnit project that black-box tests the
    // Backend agent's live HTTP endpoint — full CRUD coverage plus the edge cases (invalid
    // create, get/update/delete of a nonexistent id) — with NO project reference to the
    // backend/ project, exactly like a real QA engineer testing a running service rather than
    // reading its source. Deterministic-only (test integrity shouldn't depend on an LLM call
    // succeeding); the interface supports adding an overlay later if ever useful.
    public class QaAgentWorkProvider : IAgentWorkProvider
    {
        public string AgentId => "QA";
        public string DisplayName => "QA Tester";

        private const string CsprojTemplate = """
            <!-- __GENERATED_BY__ — task: "__TASK__" -->
            <Project Sdk="Microsoft.NET.Sdk">

              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <Nullable>enable</Nullable>
                <ImplicitUsings>enable</ImplicitUsings>
                <IsPackable>false</IsPackable>
              </PropertyGroup>

              <ItemGroup>
                <PackageReference Include="Microsoft.NET.Test.Sdk" Version="18.8.1" />
                <PackageReference Include="xunit" Version="2.9.3" />
                <PackageReference Include="xunit.runner.visualstudio" Version="3.1.5">
                  <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
                  <PrivateAssets>all</PrivateAssets>
                </PackageReference>
              </ItemGroup>

            </Project>
            """;

        private const string TestsTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            using System;
            using System.Net;
            using System.Net.Http;
            using System.Net.Http.Json;
            using System.Text.Json;
            using System.Threading.Tasks;
            using Xunit;

            namespace __COMPONENT__Api.Qa
            {
                // Black-box integration tests against the Backend agent's live HTTP endpoint —
                // this project intentionally has NO project reference to backend/ (QA and
                // Backend are separate agents/deliverables); it only assumes the backend is
                // already running at __BACKEND_BASE_URL__.
                //
                // Run: 1) cd backend && dotnet run   2) in another terminal, cd qa && dotnet test
                public class __COMPONENT__ApiTests
                {
                    private static readonly HttpClient Client = new() { BaseAddress = new Uri("__BACKEND_BASE_URL__") };
                    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
                    private const string Route = "api/__ROUTE__";

                    private sealed record __COMPONENT__Dto(int Id, string Name, DateTime CreatedAt);

                    private static async Task<__COMPONENT__Dto> CreateSampleAsync(string name)
                    {
                        var response = await Client.PostAsJsonAsync(Route, new { name });
                        response.EnsureSuccessStatusCode();
                        var dto = await response.Content.ReadFromJsonAsync<__COMPONENT__Dto>(JsonOptions);
                        Assert.NotNull(dto);
                        return dto!;
                    }

                    [Fact]
                    public async Task GetAll_ReturnsSuccess_AndAnArray()
                    {
                        var response = await Client.GetAsync(Route);
                        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

                        var items = await response.Content.ReadFromJsonAsync<__COMPONENT__Dto[]>(JsonOptions);
                        Assert.NotNull(items);
                    }

                    [Fact]
                    public async Task Create_WithValidName_ReturnsCreatedItem_WithIdAndTimestamp()
                    {
                        var created = await CreateSampleAsync($"QA sample {Guid.NewGuid():N}");

                        Assert.True(created.Id > 0);
                        Assert.False(string.IsNullOrWhiteSpace(created.Name));
                        Assert.True(created.CreatedAt <= DateTime.UtcNow.AddMinutes(1));
                    }

                    [Fact]
                    public async Task Create_WithEmptyName_ReturnsBadRequest()
                    {
                        var response = await Client.PostAsJsonAsync(Route, new { name = "" });

                        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
                    }

                    [Fact]
                    public async Task GetById_ForExistingItem_ReturnsThatItem()
                    {
                        var created = await CreateSampleAsync($"QA getbyid {Guid.NewGuid():N}");

                        var response = await Client.GetAsync($"{Route}/{created.Id}");
                        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

                        var fetched = await response.Content.ReadFromJsonAsync<__COMPONENT__Dto>(JsonOptions);
                        Assert.NotNull(fetched);
                        Assert.Equal(created.Id, fetched!.Id);
                    }

                    [Fact]
                    public async Task GetById_ForNonExistentItem_ReturnsNotFound()
                    {
                        var response = await Client.GetAsync($"{Route}/999999999");

                        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
                    }

                    [Fact]
                    public async Task Update_ForExistingItem_ChangesName()
                    {
                        var created = await CreateSampleAsync($"QA before-update {Guid.NewGuid():N}");
                        var newName = $"QA after-update {Guid.NewGuid():N}";

                        var response = await Client.PutAsJsonAsync($"{Route}/{created.Id}", new { name = newName });
                        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

                        var updated = await response.Content.ReadFromJsonAsync<__COMPONENT__Dto>(JsonOptions);
                        Assert.NotNull(updated);
                        Assert.Equal(newName, updated!.Name);
                    }

                    [Fact]
                    public async Task Update_WithEmptyName_ReturnsBadRequest()
                    {
                        var created = await CreateSampleAsync($"QA update-invalid {Guid.NewGuid():N}");

                        var response = await Client.PutAsJsonAsync($"{Route}/{created.Id}", new { name = "" });

                        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
                    }

                    [Fact]
                    public async Task Update_ForNonExistentItem_ReturnsNotFound()
                    {
                        var response = await Client.PutAsJsonAsync($"{Route}/999999999", new { name = "does not matter" });

                        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
                    }

                    [Fact]
                    public async Task Delete_ForExistingItem_RemovesIt_ThenGetByIdReturnsNotFound()
                    {
                        var created = await CreateSampleAsync($"QA delete-me {Guid.NewGuid():N}");

                        var deleteResponse = await Client.DeleteAsync($"{Route}/{created.Id}");
                        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

                        var getResponse = await Client.GetAsync($"{Route}/{created.Id}");
                        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
                    }

                    [Fact]
                    public async Task Delete_ForNonExistentItem_ReturnsNotFound()
                    {
                        var response = await Client.DeleteAsync($"{Route}/999999999");

                        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
                    }
                }
            }
            """;

        private const string ReadmeTemplate = """
            # QA — __DISPLAY_TITLE__

            Black-box integration tests for `api/__ROUTE__`, targeting the Backend agent's
            deliverable over real HTTP — no project reference to `backend/`, no shared code,
            exactly like testing a deployed service.

            ## Run it
            1. Start the backend: `cd backend && dotnet run`
            2. In another terminal: `cd qa && dotnet test`

            ## Coverage
            - `GET` all items returns 200 and an array.
            - `POST` with a valid name returns the created item with an id and timestamp.
            - `POST` with an empty name returns 400 (validation).
            - `GET /:id` for an item that exists / doesn't exist returns 200 / 404.
            - `PUT /:id` with a valid / empty name returns 200 / 400; against an unknown id
              returns 404.
            - `DELETE /:id` removes the item (204), a repeat `GET` then 404s; deleting an
              unknown id also 404s.
            """;

        private string Fill(string template, string componentName, string route, string task, string language) =>
            AgentWorkShared.FillTemplate(template, componentName, route, task, language, DisplayName);

        public Dictionary<string, string> BuildDeterministicFiles(string componentName, string route, string task, string language) => new()
        {
            [$"qa/{componentName}Qa.csproj"] = Fill(CsprojTemplate, componentName, route, task, language),
            [$"qa/{componentName}ApiTests.cs"] = Fill(TestsTemplate, componentName, route, task, language),
            ["qa/README.md"] = Fill(ReadmeTemplate, componentName, route, task, language),
        };

        public Task<(string Path, string Content)?> TryGenerateLlmOverlayAsync(
            GeminiService gemini, string componentName, string route, string task) =>
            Task.FromResult<(string Path, string Content)?>(null);

        public string BuildReadme(string componentName, string route, string task, string language, string mode)
        {
            var header = AgentWorkShared.BuildReadmeHeader(AgentId, DisplayName, task, language, mode);
            return header + $"""
                qa/
                  {componentName}Qa.csproj
                  {componentName}ApiTests.cs   (xUnit — full CRUD + edge cases, black-box over HTTP)
                  README.md

                Run it:  1) cd backend && dotnet run   2) cd qa && dotnet test
                Targets: {AgentWorkShared.GeneratedBackendBaseUrl}/api/{route}

                This project has no reference to the backend/ source — it tests the Backend
                agent's deliverable the way a real client would, entirely over HTTP.
                """;
        }
    }
}
