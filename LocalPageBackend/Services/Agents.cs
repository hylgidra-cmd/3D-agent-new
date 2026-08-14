using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;

namespace LocalPageBackend.Services
{
    public interface IAgent
    {
        string Role { get; }
        Task<string> ExecuteAsync(string prompt);
    }

    public class FrontendAgent : IAgent
    {
        private readonly GeminiService _gemini;
        public string Role => "Frontend";

        public FrontendAgent(GeminiService gemini)
        {
            _gemini = gemini;
        }

        public async Task<string> ExecuteAsync(string prompt)
        {
            // The task description may arrive in Uzbek, Russian, or English — detect it and
            // reply in that same language for comments/UI text; keep identifiers in English
            // per normal convention. See AgentWorkController for the live, collaborative
            // (Frontend+Backend contract-sharing) version of this prompt actually wired to
            // the office's "Assign Task" flow — this class is not currently reachable
            // (OrchestratorService has no registered route in Program.cs).
            const string context = @"You are the Frontend agent on a full-stack development team. Detect whether the user's task is written in Uzbek, Russian, or English, and reply with clean, production-quality React (JavaScript) code whose comments and any UI-facing text (labels, placeholders, button text) are written in that same detected language. Do not use Tailwind. Do not include a login/auth screen unless explicitly asked.";
            return await _gemini.TryGenerateTextAsync(prompt, context) ?? string.Empty;
        }
    }

    public class BackendAgent : IAgent
    {
        private readonly GeminiService _gemini;
        public string Role => "Backend";

        public BackendAgent(GeminiService gemini)
        {
            _gemini = gemini;
        }

        public async Task<string> ExecuteAsync(string prompt)
        {
            // See FrontendAgent.ExecuteAsync for the language-detection note — same policy here.
            const string context = @"You are the Backend agent on a full-stack development team. Detect whether the user's task is written in Uzbek, Russian, or English, and reply with clean, production-quality C# ASP.NET Core code (a controller and its model) whose comments are written in that same detected language. Do not include authentication/login unless explicitly asked.";
            return await _gemini.TryGenerateTextAsync(prompt, context) ?? string.Empty;
        }
    }

    public class GraphicAgent : IAgent { public string Role => "Graphic"; public async Task<string> ExecuteAsync(string p) { await Task.Delay(100); return "Tayyor"; } }
    public class UiUxAgent : IAgent { public string Role => "UI_UX"; public async Task<string> ExecuteAsync(string p) { await Task.Delay(100); return "Tayyor"; } }
    public class ThreeDAgent : IAgent { public string Role => "3D_Model"; public async Task<string> ExecuteAsync(string p) { await Task.Delay(100); return "Tayyor"; } }
    public class MobileAgent : IAgent { public string Role => "Android_iOS"; public async Task<string> ExecuteAsync(string p) { await Task.Delay(100); return "Tayyor"; } }

    public class OrchestratorService
    {
        private readonly IEnumerable<IAgent> _agents;

        public OrchestratorService(IEnumerable<IAgent> agents)
        {
            _agents = agents;
        }

        public async Task<Dictionary<string, string>> RunAgentsAsync(string prompt, List<string> targetAgents)
        {
            var activeAgents = _agents.Where(a => targetAgents.Contains(a.Role));

            var tasks = activeAgents.Select(async agent =>
            {
                var result = await agent.ExecuteAsync(prompt);
                return new { agent.Role, Result = result };
            });

            var completedTasks = await Task.WhenAll(tasks);
            return completedTasks.ToDictionary(x => x.Role, x => x.Result);
        }
    }
}