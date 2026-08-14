using System;
using System.Collections.Generic;
using System.Linq;

namespace LocalPageBackend.Services.AgentWork
{
    // Indexes every registered IAgentWorkProvider by its AgentId so AgentWorkController can
    // resolve "Frontend" / "Backend" / "Database" / "QA" / "DevOps" / "UI_UX" — and whatever
    // gets registered next — generically, without a hardcoded if/else per role. Growing the
    // office's roster is purely a Program.cs registration change; this class and the
    // controller never need to know the concrete list of roles.
    public class AgentWorkProviderRegistry
    {
        private readonly Dictionary<string, IAgentWorkProvider> _byId;

        public AgentWorkProviderRegistry(IEnumerable<IAgentWorkProvider> providers)
        {
            _byId = providers.ToDictionary(p => p.AgentId, StringComparer.OrdinalIgnoreCase);
        }

        // Canonical ids of every currently-registered agent (e.g. for a future "which agents
        // exist" endpoint) — always the provider's own AgentId casing, never a request's.
        public IReadOnlyCollection<string> KnownAgentIds => _byId.Values.Select(p => p.AgentId).ToList();

        // Case-insensitive lookup by whatever casing the request body used. The returned
        // provider's own AgentId is the canonical casing to use everywhere downstream (file
        // paths, simulation pinning, README) — never the raw request string.
        public IAgentWorkProvider? Resolve(string requestedAgentId) =>
            _byId.TryGetValue(requestedAgentId, out var provider) ? provider : null;
    }
}
