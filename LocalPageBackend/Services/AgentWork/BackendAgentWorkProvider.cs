using System.Collections.Generic;
using System.Threading.Tasks;

namespace LocalPageBackend.Services.AgentWork
{
    // Backend agent's deliverable: a backend/ ASP.NET Core 9 (C#) project laid out as Clean
    // Architecture folders (Domain / Application / Infrastructure / Controllers / Tests) with
    // EF Core, FluentValidation, Swagger, full CRUD (GetAll/GetById/Create/Update/Delete —
    // including 404 handling for a missing id, not just the happy path), and an xUnit test
    // project. Never emits a frontend/ folder — that's the Frontend agent's job alone.
    //
    // This exact scaffold shape (componentName "TodoList") was hand-verified before being
    // encoded here: `dotnet build` succeeds, `dotnet run` then answers the full CRUD surface
    // on the real route with real JSON, an invalid POST/PUT correctly 400s via FluentValidation,
    // a GET/PUT/DELETE on an unknown id correctly 404s, and `dotnet test` passes against the
    // service layer including its not-found edge cases.
    public class BackendAgentWorkProvider : IAgentWorkProvider
    {
        public string AgentId => "Backend";
        public string DisplayName => "Backend";

        private const string CsprojTemplate = """
            <!-- __GENERATED_BY__ — task: "__TASK__" -->
            <Project Sdk="Microsoft.NET.Sdk.Web">

              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <Nullable>enable</Nullable>
                <ImplicitUsings>enable</ImplicitUsings>
              </PropertyGroup>

              <!-- Tests/ has its own .csproj (with its own xUnit references) — without this
                   exclude, the SDK's default recursive **/*.cs glob would also try to compile
                   the test files into THIS project, where xUnit isn't referenced, and fail. -->
              <ItemGroup>
                <Compile Remove="Tests/**/*.cs" />
              </ItemGroup>

              <ItemGroup>
                <PackageReference Include="FluentValidation" Version="12.1.1" />
                <PackageReference Include="FluentValidation.DependencyInjectionExtensions" Version="12.1.1" />
                <PackageReference Include="Microsoft.EntityFrameworkCore.InMemory" Version="10.0.10" />
                <PackageReference Include="Swashbuckle.AspNetCore" Version="10.2.3" />
              </ItemGroup>

            </Project>
            """;

        private const string AppSettingsTemplate = """
            {
              "Logging": {
                "LogLevel": {
                  "Default": "Information",
                  "Microsoft.AspNetCore": "Warning"
                }
              },
              "AllowedHosts": "*"
            }
            """;

        private const string GitignoreTemplate = """
            bin/
            obj/
            """;

        private const string ProgramTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            using FluentValidation;
            using Microsoft.AspNetCore.Diagnostics;
            using Microsoft.EntityFrameworkCore;
            using __COMPONENT__Api.Application.DTOs;
            using __COMPONENT__Api.Application.Interfaces;
            using __COMPONENT__Api.Application.Services;
            using __COMPONENT__Api.Application.Validators;
            using __COMPONENT__Api.Infrastructure.Persistence;

            var builder = WebApplication.CreateBuilder(args);

            // Pinned to a fixed, known address so frontend/src/services/__COMPONENT__Api.js's
            // API_BASE, the QA agent's test HttpClient, and the DevOps agent's docker-compose
            // port mapping all always point at the right place — regardless of launch method or
            // which ports happen to be free. If you change this, change it in all three places.
            builder.WebHost.UseUrls("__BACKEND_BASE_URL__");

            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            // EF Core with the InMemory provider — genuinely EF Core (DbContext, DbSet, LINQ
            // queries), zero external setup required. Swap to a real database by replacing this
            // one line with, e.g., options.UseNpgsql(builder.Configuration.GetConnectionString
            // ("Default")) after adding the Npgsql.EntityFrameworkCore.PostgreSQL package — see
            // the Database agent's schema.sql/README.md for the matching table definition.
            builder.Services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("__COMPONENT__Db"));

            builder.Services.AddScoped<I__COMPONENT__Repository, __COMPONENT__Repository>();
            builder.Services.AddScoped<I__COMPONENT__Service, __COMPONENT__Service>();
            builder.Services.AddValidatorsFromAssemblyContaining<Create__COMPONENT__DtoValidator>();

            builder.Services.AddCors(options =>
            {
                options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
            });

            var app = builder.Build();

            // Runs first in the pipeline so it can catch anything thrown by everything after
            // it — the frontend always gets a clean JSON 500 instead of an unhandled
            // exception or a raw framework error page it can't JSON.parse().
            app.UseExceptionHandler(errorApp =>
            {
                errorApp.Run(async context =>
                {
                    var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
                    Console.WriteLine($"[__COMPONENT__Controller] Unhandled exception: {error}");
                    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new { error = "An unexpected server error occurred." });
                });
            });

            // Unconditional (no IsDevelopment() gate): this project ships with no
            // Properties/launchSettings.json, so a plain `dotnet run` defaults to the
            // Production environment and IsDevelopment() would be false — gating Swagger
            // behind it would silently 404 the /swagger URL this scaffold's own README
            // promises. Matches this same codebase's outer Program.cs, which does the same.
            app.UseSwagger();
            app.UseSwaggerUI();

            app.UseCors();
            app.MapControllers();
            app.Run();

            // Exposes the implicit Program class to the Tests project (WebApplicationFactory
            // <Program> needs a public partial Program to bootstrap an in-memory test server).
            public partial class Program { }
            """;

        private const string EntityTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            using System;

            namespace __COMPONENT__Api.Domain.Entities
            {
                public class __COMPONENT__
                {
                    public int Id { get; set; }
                    public string Name { get; set; } = string.Empty;
                    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
                }
            }
            """;

        private const string DtoTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            using System;

            namespace __COMPONENT__Api.Application.DTOs
            {
                // What the API actually returns. Kept separate from the Domain entity so the
                // wire contract can evolve independently of storage — e.g. extra entity
                // columns don't automatically leak into the API until someone deliberately
                // exposes them here.
                public class __COMPONENT__Dto
                {
                    public int Id { get; set; }
                    public string Name { get; set; } = string.Empty;
                    public DateTime CreatedAt { get; set; }
                }
            }
            """;

        private const string CreateDtoTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            namespace __COMPONENT__Api.Application.DTOs
            {
                // Only what the client is actually allowed to set on creation — Id/CreatedAt
                // are server-assigned, never client-supplied, so they simply have no place here.
                public class Create__COMPONENT__Dto
                {
                    public string Name { get; set; } = string.Empty;
                }
            }
            """;

        private const string UpdateDtoTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            namespace __COMPONENT__Api.Application.DTOs
            {
                // Deliberately the same shape as Create__COMPONENT__Dto today — kept as its own
                // type (not a reused alias) because update semantics commonly diverge from
                // create semantics as a real project grows (e.g. some fields become
                // immutable-after-creation), and this way that divergence doesn't require
                // touching the Create contract.
                public class Update__COMPONENT__Dto
                {
                    public string Name { get; set; } = string.Empty;
                }
            }
            """;

        private const string CreateValidatorTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            using FluentValidation;
            using __COMPONENT__Api.Application.DTOs;

            namespace __COMPONENT__Api.Application.Validators
            {
                public class Create__COMPONENT__DtoValidator : AbstractValidator<Create__COMPONENT__Dto>
                {
                    public Create__COMPONENT__DtoValidator()
                    {
                        RuleFor(x => x.Name)
                            .NotEmpty()
                            .MaximumLength(200);
                    }
                }
            }
            """;

        private const string UpdateValidatorTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            using FluentValidation;
            using __COMPONENT__Api.Application.DTOs;

            namespace __COMPONENT__Api.Application.Validators
            {
                public class Update__COMPONENT__DtoValidator : AbstractValidator<Update__COMPONENT__Dto>
                {
                    public Update__COMPONENT__DtoValidator()
                    {
                        RuleFor(x => x.Name)
                            .NotEmpty()
                            .MaximumLength(200);
                    }
                }
            }
            """;

        private const string RepositoryInterfaceTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            using System.Collections.Generic;
            using System.Threading;
            using System.Threading.Tasks;
            using __COMPONENT__Api.Domain.Entities;

            namespace __COMPONENT__Api.Application.Interfaces
            {
                public interface I__COMPONENT__Repository
                {
                    Task<List<__COMPONENT__>> GetAllAsync(CancellationToken cancellationToken);
                    Task<__COMPONENT__?> GetByIdAsync(int id, CancellationToken cancellationToken);
                    Task<__COMPONENT__> AddAsync(__COMPONENT__ entity, CancellationToken cancellationToken);
                    // Returns false (no-op) when no row with this id exists — the caller
                    // decides whether that's a 404, never a silent success or an exception.
                    Task<bool> UpdateAsync(int id, string name, CancellationToken cancellationToken);
                    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken);
                }
            }
            """;

        private const string ServiceInterfaceTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            using System.Collections.Generic;
            using System.Threading;
            using System.Threading.Tasks;
            using __COMPONENT__Api.Application.DTOs;

            namespace __COMPONENT__Api.Application.Interfaces
            {
                public interface I__COMPONENT__Service
                {
                    Task<List<__COMPONENT__Dto>> GetAllAsync(CancellationToken cancellationToken);
                    // Null return means "no item with this id" — the controller maps that to 404.
                    Task<__COMPONENT__Dto?> GetByIdAsync(int id, CancellationToken cancellationToken);
                    Task<__COMPONENT__Dto> CreateAsync(Create__COMPONENT__Dto request, CancellationToken cancellationToken);
                    Task<__COMPONENT__Dto?> UpdateAsync(int id, Update__COMPONENT__Dto request, CancellationToken cancellationToken);
                    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken);
                }
            }
            """;

        private const string ServiceTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            using System;
            using System.Collections.Generic;
            using System.Linq;
            using System.Threading;
            using System.Threading.Tasks;
            using __COMPONENT__Api.Application.DTOs;
            using __COMPONENT__Api.Application.Interfaces;
            using __COMPONENT__Api.Domain.Entities;

            namespace __COMPONENT__Api.Application.Services
            {
                // Business logic + entity<->DTO mapping lives here, not in the controller or
                // the repository — the controller stays thin, and the repository stays a pure
                // data-access boundary with no knowledge of DTOs.
                public class __COMPONENT__Service : I__COMPONENT__Service
                {
                    private readonly I__COMPONENT__Repository _repository;

                    public __COMPONENT__Service(I__COMPONENT__Repository repository)
                    {
                        _repository = repository;
                    }

                    public async Task<List<__COMPONENT__Dto>> GetAllAsync(CancellationToken cancellationToken)
                    {
                        var entities = await _repository.GetAllAsync(cancellationToken);
                        return entities.Select(ToDto).ToList();
                    }

                    public async Task<__COMPONENT__Dto?> GetByIdAsync(int id, CancellationToken cancellationToken)
                    {
                        var entity = await _repository.GetByIdAsync(id, cancellationToken);
                        return entity is null ? null : ToDto(entity);
                    }

                    public async Task<__COMPONENT__Dto> CreateAsync(Create__COMPONENT__Dto request, CancellationToken cancellationToken)
                    {
                        var entity = new __COMPONENT__
                        {
                            Name = request.Name,
                            CreatedAt = DateTime.UtcNow,
                        };

                        var created = await _repository.AddAsync(entity, cancellationToken);
                        return ToDto(created);
                    }

                    public async Task<__COMPONENT__Dto?> UpdateAsync(int id, Update__COMPONENT__Dto request, CancellationToken cancellationToken)
                    {
                        var updated = await _repository.UpdateAsync(id, request.Name, cancellationToken);
                        if (!updated) return null;

                        // Re-fetch rather than trust the caller's input as the new state — keeps
                        // the returned DTO honest about what's actually persisted.
                        var entity = await _repository.GetByIdAsync(id, cancellationToken);
                        return entity is null ? null : ToDto(entity);
                    }

                    public Task<bool> DeleteAsync(int id, CancellationToken cancellationToken) =>
                        _repository.DeleteAsync(id, cancellationToken);

                    private static __COMPONENT__Dto ToDto(__COMPONENT__ entity) => new()
                    {
                        Id = entity.Id,
                        Name = entity.Name,
                        CreatedAt = entity.CreatedAt,
                    };
                }
            }
            """;

        private const string DbContextTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            using Microsoft.EntityFrameworkCore;
            using __COMPONENT__Api.Domain.Entities;

            namespace __COMPONENT__Api.Infrastructure.Persistence
            {
                public class AppDbContext : DbContext
                {
                    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
                    {
                    }

                    // Named "Items" rather than a pluralized entity name — naive pluralization
                    // ("Company" -> "Companys") is unreliable for an arbitrary generated entity name.
                    public DbSet<__COMPONENT__> Items => Set<__COMPONENT__>();
                }
            }
            """;

        private const string RepositoryTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            using System.Collections.Generic;
            using System.Threading;
            using System.Threading.Tasks;
            using Microsoft.EntityFrameworkCore;
            using __COMPONENT__Api.Application.Interfaces;
            using __COMPONENT__Api.Domain.Entities;

            namespace __COMPONENT__Api.Infrastructure.Persistence
            {
                public class __COMPONENT__Repository : I__COMPONENT__Repository
                {
                    private readonly AppDbContext _db;

                    public __COMPONENT__Repository(AppDbContext db)
                    {
                        _db = db;
                    }

                    public async Task<List<__COMPONENT__>> GetAllAsync(CancellationToken cancellationToken)
                    {
                        return await _db.Items.AsNoTracking().ToListAsync(cancellationToken);
                    }

                    public async Task<__COMPONENT__?> GetByIdAsync(int id, CancellationToken cancellationToken)
                    {
                        return await _db.Items.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
                    }

                    public async Task<__COMPONENT__> AddAsync(__COMPONENT__ entity, CancellationToken cancellationToken)
                    {
                        _db.Items.Add(entity);
                        await _db.SaveChangesAsync(cancellationToken);
                        return entity;
                    }

                    public async Task<bool> UpdateAsync(int id, string name, CancellationToken cancellationToken)
                    {
                        // Tracked fetch (no AsNoTracking) — EF Core needs to track this instance
                        // for the mutation below to be picked up by SaveChangesAsync.
                        var existing = await _db.Items.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
                        if (existing is null) return false;

                        existing.Name = name;
                        await _db.SaveChangesAsync(cancellationToken);
                        return true;
                    }

                    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken)
                    {
                        var existing = await _db.Items.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
                        if (existing is null) return false;

                        _db.Items.Remove(existing);
                        await _db.SaveChangesAsync(cancellationToken);
                        return true;
                    }
                }
            }
            """;

        private const string ControllerTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            using System.Threading;
            using System.Threading.Tasks;
            using FluentValidation;
            using Microsoft.AspNetCore.Mvc;
            using __COMPONENT__Api.Application.DTOs;
            using __COMPONENT__Api.Application.Interfaces;

            namespace __COMPONENT__Api.Controllers
            {
                [ApiController]
                [Route("api/__ROUTE__")]
                public class __COMPONENT__Controller : ControllerBase
                {
                    private readonly I__COMPONENT__Service _service;
                    private readonly IValidator<Create__COMPONENT__Dto> _createValidator;
                    private readonly IValidator<Update__COMPONENT__Dto> _updateValidator;

                    public __COMPONENT__Controller(
                        I__COMPONENT__Service service,
                        IValidator<Create__COMPONENT__Dto> createValidator,
                        IValidator<Update__COMPONENT__Dto> updateValidator)
                    {
                        _service = service;
                        _createValidator = createValidator;
                        _updateValidator = updateValidator;
                    }

                    [HttpGet]
                    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
                    {
                        var items = await _service.GetAllAsync(cancellationToken);
                        return Ok(items);
                    }

                    [HttpGet("{id:int}")]
                    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
                    {
                        var item = await _service.GetByIdAsync(id, cancellationToken);
                        return item is null ? NotFound(new { error = $"__COMPONENT__ with id {id} was not found." }) : Ok(item);
                    }

                    [HttpPost]
                    public async Task<IActionResult> Create([FromBody] Create__COMPONENT__Dto request, CancellationToken cancellationToken)
                    {
                        var validation = await _createValidator.ValidateAsync(request, cancellationToken);
                        if (!validation.IsValid)
                        {
                            return ValidationProblem(new ValidationProblemDetails(validation.ToDictionary()));
                        }

                        var created = await _service.CreateAsync(request, cancellationToken);
                        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
                    }

                    [HttpPut("{id:int}")]
                    public async Task<IActionResult> Update(int id, [FromBody] Update__COMPONENT__Dto request, CancellationToken cancellationToken)
                    {
                        var validation = await _updateValidator.ValidateAsync(request, cancellationToken);
                        if (!validation.IsValid)
                        {
                            return ValidationProblem(new ValidationProblemDetails(validation.ToDictionary()));
                        }

                        var updated = await _service.UpdateAsync(id, request, cancellationToken);
                        return updated is null ? NotFound(new { error = $"__COMPONENT__ with id {id} was not found." }) : Ok(updated);
                    }

                    [HttpDelete("{id:int}")]
                    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
                    {
                        var deleted = await _service.DeleteAsync(id, cancellationToken);
                        return deleted ? NoContent() : NotFound(new { error = $"__COMPONENT__ with id {id} was not found." });
                    }
                }
            }
            """;

        private const string TestsCsprojTemplate = """
            <!-- __GENERATED_BY__ — task: "__TASK__" -->
            <Project Sdk="Microsoft.NET.Sdk">

              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <Nullable>enable</Nullable>
                <ImplicitUsings>enable</ImplicitUsings>
                <IsPackable>false</IsPackable>
              </PropertyGroup>

              <ItemGroup>
                <ProjectReference Include="../__COMPONENT__Api.csproj" />
              </ItemGroup>

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

        private const string ServiceTestsTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            using System;
            using System.Threading;
            using Microsoft.EntityFrameworkCore;
            using __COMPONENT__Api.Application.DTOs;
            using __COMPONENT__Api.Application.Services;
            using __COMPONENT__Api.Infrastructure.Persistence;
            using Xunit;

            namespace __COMPONENT__Api.Tests
            {
                public class __COMPONENT__ServiceTests
                {
                    private static AppDbContext CreateInMemoryContext()
                    {
                        var options = new DbContextOptionsBuilder<AppDbContext>()
                            .UseInMemoryDatabase(Guid.NewGuid().ToString())
                            .Options;
                        return new AppDbContext(options);
                    }

                    private static __COMPONENT__Service CreateService(AppDbContext db) =>
                        new(new __COMPONENT__Repository(db));

                    [Fact]
                    public async System.Threading.Tasks.Task GetAllAsync_ReturnsEmptyList_WhenNoItemsExist()
                    {
                        using var db = CreateInMemoryContext();
                        var service = CreateService(db);

                        var result = await service.GetAllAsync(CancellationToken.None);

                        Assert.Empty(result);
                    }

                    [Fact]
                    public async System.Threading.Tasks.Task CreateAsync_AssignsIdAndCreatedAt_ThenGetAllAsync_ReturnsIt()
                    {
                        using var db = CreateInMemoryContext();
                        var service = CreateService(db);

                        var created = await service.CreateAsync(new Create__COMPONENT__Dto { Name = "Test item" }, CancellationToken.None);

                        Assert.Equal("Test item", created.Name);
                        Assert.True(created.Id > 0);
                        Assert.True(created.CreatedAt <= DateTime.UtcNow);

                        var all = await service.GetAllAsync(CancellationToken.None);
                        Assert.Single(all);
                        Assert.Equal(created.Id, all[0].Id);
                    }

                    [Fact]
                    public async System.Threading.Tasks.Task GetByIdAsync_ForExistingItem_ReturnsIt()
                    {
                        using var db = CreateInMemoryContext();
                        var service = CreateService(db);
                        var created = await service.CreateAsync(new Create__COMPONENT__Dto { Name = "Findable" }, CancellationToken.None);

                        var found = await service.GetByIdAsync(created.Id, CancellationToken.None);

                        Assert.NotNull(found);
                        Assert.Equal("Findable", found!.Name);
                    }

                    [Fact]
                    public async System.Threading.Tasks.Task GetByIdAsync_ForMissingItem_ReturnsNull()
                    {
                        using var db = CreateInMemoryContext();
                        var service = CreateService(db);

                        var found = await service.GetByIdAsync(999_999, CancellationToken.None);

                        Assert.Null(found);
                    }

                    [Fact]
                    public async System.Threading.Tasks.Task UpdateAsync_ForExistingItem_ChangesName()
                    {
                        using var db = CreateInMemoryContext();
                        var service = CreateService(db);
                        var created = await service.CreateAsync(new Create__COMPONENT__Dto { Name = "Before" }, CancellationToken.None);

                        var updated = await service.UpdateAsync(created.Id, new Update__COMPONENT__Dto { Name = "After" }, CancellationToken.None);

                        Assert.NotNull(updated);
                        Assert.Equal("After", updated!.Name);
                    }

                    [Fact]
                    public async System.Threading.Tasks.Task UpdateAsync_ForMissingItem_ReturnsNull()
                    {
                        using var db = CreateInMemoryContext();
                        var service = CreateService(db);

                        var updated = await service.UpdateAsync(999_999, new Update__COMPONENT__Dto { Name = "Doesn't matter" }, CancellationToken.None);

                        Assert.Null(updated);
                    }

                    [Fact]
                    public async System.Threading.Tasks.Task DeleteAsync_ForExistingItem_RemovesIt()
                    {
                        using var db = CreateInMemoryContext();
                        var service = CreateService(db);
                        var created = await service.CreateAsync(new Create__COMPONENT__Dto { Name = "Temporary" }, CancellationToken.None);

                        var deleted = await service.DeleteAsync(created.Id, CancellationToken.None);

                        Assert.True(deleted);
                        Assert.Null(await service.GetByIdAsync(created.Id, CancellationToken.None));
                    }

                    [Fact]
                    public async System.Threading.Tasks.Task DeleteAsync_ForMissingItem_ReturnsFalse()
                    {
                        using var db = CreateInMemoryContext();
                        var service = CreateService(db);

                        var deleted = await service.DeleteAsync(999_999, CancellationToken.None);

                        Assert.False(deleted);
                    }
                }
            }
            """;

        private string Fill(string template, string componentName, string route, string task, string language) =>
            AgentWorkShared.FillTemplate(template, componentName, route, task, language, DisplayName);

        public Dictionary<string, string> BuildDeterministicFiles(string componentName, string route, string task, string language)
        {
            string F(string template) => Fill(template, componentName, route, task, language);

            return new Dictionary<string, string>
            {
                [$"backend/{componentName}Api.csproj"] = F(CsprojTemplate),
                ["backend/appsettings.json"] = F(AppSettingsTemplate),
                ["backend/.gitignore"] = F(GitignoreTemplate),
                ["backend/Program.cs"] = F(ProgramTemplate),
                [$"backend/Domain/Entities/{componentName}.cs"] = F(EntityTemplate),
                [$"backend/Application/DTOs/{componentName}Dto.cs"] = F(DtoTemplate),
                [$"backend/Application/DTOs/Create{componentName}Dto.cs"] = F(CreateDtoTemplate),
                [$"backend/Application/DTOs/Update{componentName}Dto.cs"] = F(UpdateDtoTemplate),
                [$"backend/Application/Validators/Create{componentName}DtoValidator.cs"] = F(CreateValidatorTemplate),
                [$"backend/Application/Validators/Update{componentName}DtoValidator.cs"] = F(UpdateValidatorTemplate),
                [$"backend/Application/Interfaces/I{componentName}Repository.cs"] = F(RepositoryInterfaceTemplate),
                [$"backend/Application/Interfaces/I{componentName}Service.cs"] = F(ServiceInterfaceTemplate),
                [$"backend/Application/Services/{componentName}Service.cs"] = F(ServiceTemplate),
                ["backend/Infrastructure/Persistence/AppDbContext.cs"] = F(DbContextTemplate),
                [$"backend/Infrastructure/Persistence/{componentName}Repository.cs"] = F(RepositoryTemplate),
                [$"backend/Controllers/{componentName}Controller.cs"] = F(ControllerTemplate),
                [$"backend/Tests/{componentName}Api.Tests.csproj"] = F(TestsCsprojTemplate),
                [$"backend/Tests/{componentName}ServiceTests.cs"] = F(ServiceTestsTemplate),
            };
        }

        // Asks Gemini for just this agent's one "creative" leaf file — the Domain entity's
        // fields — and returns it only if it passes basic structural validation. Everything
        // that has to stay structurally correct (.csproj, Program.cs, DI wiring, the full CRUD
        // Controller/Service/Repository chain, DTOs) is never touched by the LLM, so it can
        // only ever affect this one file.
        //
        // The Domain entity is deliberately the ONLY thing the LLM can touch on the backend
        // side — the response DTOs (Application/DTOs/*.cs) are fixed, hand-written mappings
        // that only ever project Id/Name/CreatedAt. If the LLM adds extra fields to the
        // entity, those columns exist in the (in-memory) database but are simply not yet
        // exposed over the API — a safe, non-breaking outcome — rather than the DTO mapping
        // code silently going out of sync with fields it doesn't know about.
        public async Task<(string Path, string Content)?> TryGenerateLlmOverlayAsync(
            GeminiService gemini, string componentName, string route, string task)
        {
            var output = await gemini.TryGenerateTextAsync(task, BuildLlmContext(componentName, route));
            if (string.IsNullOrWhiteSpace(output)) return null;

            var files = AgentWorkShared.ParseMarkedFiles(output);
            if (!files.TryGetValue($"{componentName}.cs", out var entityContent)) return null;

            return IsWellFormedCSharpEntity(entityContent, componentName)
                ? ($"backend/Domain/Entities/{componentName}.cs", entityContent)
                : null;
        }

        private static bool IsWellFormedCSharpEntity(string content, string componentName)
        {
            if (string.IsNullOrWhiteSpace(content)) return false;
            if (!content.Contains($"class {componentName}")) return false;
            return AgentWorkShared.HasBalancedBraces(content);
        }

        private static string BuildLlmContext(string componentName, string route) => $"""
            You are the Backend agent on a collaborative full-stack team. A complete ASP.NET
            Core 9 (C#) project scaffold already exists around this file, laid out as Clean
            Architecture folders — a .csproj, Program.cs (EF Core InMemory DbContext, CORS, a
            global exception handler, Swagger), Application/DTOs, Application/Validators
            (FluentValidation, for both create and update), Application/Interfaces,
            Application/Services, Infrastructure/Persistence (repository + DbContext), a thin
            Controller wired to route "api/{route}" with full CRUD (GET all, GET by id, POST,
            PUT, DELETE — including 404 handling for an unknown id), and an xUnit Tests
            project covering both the happy paths and the not-found edge cases. Your only job
            right now is the Domain entity's fields.
            Detect whether the task below is written in Uzbek, Russian, or English, and write
            all comments in that same detected language (keep C# identifiers in English, as
            usual).
            Generate a single plain C# class (a Domain entity, not a DTO — no data annotations,
            no base class) named exactly "{componentName}", in namespace
            "{componentName}Api.Domain.Entities". Always include Id (int), Name (string),
            CreatedAt (DateTime), plus 2-4 more properties with correct C# types that make
            sense for the task below.
            Output ONLY the file, in exactly this format and nothing else — no markdown
            fences, no prose before or after:
            <<<FILE: {componentName}.cs>>>
            (entity file content here)
            """;

        public string BuildReadme(string componentName, string route, string task, string language, string mode)
        {
            var header = AgentWorkShared.BuildReadmeHeader(AgentId, DisplayName, task, language, mode);
            return header + $"""
                backend/                                ASP.NET Core 9 (C#) — Clean Architecture
                  {componentName}Api.csproj
                  appsettings.json
                  .gitignore
                  Program.cs
                  Domain/
                    Entities/{componentName}.cs
                  Application/
                    DTOs/{componentName}Dto.cs
                    DTOs/Create{componentName}Dto.cs
                    DTOs/Update{componentName}Dto.cs
                    Validators/Create{componentName}DtoValidator.cs   (FluentValidation)
                    Validators/Update{componentName}DtoValidator.cs   (FluentValidation)
                    Interfaces/I{componentName}Repository.cs
                    Interfaces/I{componentName}Service.cs
                    Services/{componentName}Service.cs
                  Infrastructure/
                    Persistence/AppDbContext.cs                       (EF Core, InMemory provider)
                    Persistence/{componentName}Repository.cs
                  Controllers/
                    {componentName}Controller.cs                      (full CRUD + 404 handling)
                  Tests/
                    {componentName}Api.Tests.csproj
                    {componentName}ServiceTests.cs                    (xUnit — happy paths + not-found edge cases)

                Run it:   cd backend && dotnet run
                Test it:  cd backend/Tests && dotnet test
                Serves:   {AgentWorkShared.GeneratedBackendBaseUrl}   (route: api/{route})
                Docs:     {AgentWorkShared.GeneratedBackendBaseUrl}/swagger   (interactive Swagger UI)

                Endpoints:
                  GET    /api/{route}        — list all
                  GET    /api/{route}/<id>   — get one (404 if missing)
                  POST   /api/{route}        — create (400 if invalid)
                  PUT    /api/{route}/<id>   — update (400 if invalid, 404 if missing)
                  DELETE /api/{route}/<id>   — delete (404 if missing)

                CORS, FluentValidation, EF Core (InMemory — no database install required),
                and a global JSON exception handler are already wired up in Program.cs — no
                manual setup needed to run this as-is. Swap to a real database later by
                adding the Npgsql.EntityFrameworkCore.PostgreSQL package and replacing the
                UseInMemoryDatabase(...) line in Program.cs with UseNpgsql(...) — see the
                Database agent's schema.sql/README.md for the matching table definition.
                """;
        }
    }
}
