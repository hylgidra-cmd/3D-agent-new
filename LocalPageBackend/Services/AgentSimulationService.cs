using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;

namespace LocalPageBackend.Services
{
    public enum AgentActivityState
    {
        Idle,
        Walking,
        Working
    }

    // Snapshot DTO returned to the frontend — State is serialized as a string
    // ("Idle" / "Walking" / "Working") so the client doesn't need to know the enum's int values.
    public record AgentLiveSnapshot(
        string Id,
        string Name,
        double X,
        double Y,
        string State,
        long UpdatedAt
    );

    // Mutable per-agent simulation record. Kept private to the service; callers only ever see
    // the immutable AgentLiveSnapshot produced by GetSnapshot().
    internal class AgentLiveRecord
    {
        public required string Id;
        public required string Name;
        public double X;
        public double Y;
        public double TargetX;
        public double TargetY;
        public AgentActivityState State = AgentActivityState.Idle;
        // Set while a real task (POST /api/agents/work) is in flight for this agent —
        // the ambient Idle/Walking/Working tick loop below skips agents with this set so
        // it doesn't yank them back to Idle/Walking mid-task.
        public bool ManualOverride;
    }

    // Ticks a continuous Idle -> Walking -> Working loop for the 6 office agents so the
    // frontend has something alive to render even when no real chat/task activity is happening.
    public class AgentSimulationService : BackgroundService
    {
        // Ids here must match IAgentWorkProvider.AgentId exactly for every role that has a
        // real work provider registered (see Services/AgentWork/*Provider.cs + Program.cs) —
        // AgentWorkController.TryStartManualWork/EndManualWork pin/release by this same id, and
        // a mismatch would silently no-op the 3D "Working" pin instead of erroring. Database,
        // QA, and DevOps were added alongside Frontend/Backend/UI_UX to grow the office roster;
        // Graphic/3D_Model/Android_iOS remain simulation-only for now (no work provider yet).
        private static readonly (string Id, string Name)[] Roster =
        {
            ("Frontend", "Frontend"),
            ("Backend", "Backend"),
            ("Database", "Database Engineer"),
            ("QA", "QA Tester"),
            ("DevOps", "DevOps"),
            ("UI_UX", "UI/UX Designer"),
            ("Graphic", "Graphic"),
            ("3D_Model", "3D Model"),
            ("Android_iOS", "Android/iOS"),
        };

        private const double MinCoord = 0;
        private const double MaxCoord = 100;
        private const double MoveSpeedPerTick = 6;

        private readonly TimeSpan _tickInterval = TimeSpan.FromSeconds(1);
        private readonly object _lock = new();
        private readonly Dictionary<string, AgentLiveRecord> _agents = new();
        private readonly Random _rng = new();

        public AgentSimulationService()
        {
            foreach (var (id, name) in Roster)
            {
                _agents[id] = new AgentLiveRecord
                {
                    Id = id,
                    Name = name,
                    X = _rng.Next((int)MinCoord, (int)MaxCoord),
                    Y = _rng.Next((int)MinCoord, (int)MaxCoord),
                };
            }
        }

        public List<AgentLiveSnapshot> GetSnapshot()
        {
            lock (_lock)
            {
                var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                return _agents.Values
                    .Select(a => new AgentLiveSnapshot(a.Id, a.Name, Math.Round(a.X, 1), Math.Round(a.Y, 1), a.State.ToString(), now))
                    .ToList();
            }
        }

        // Forces an agent straight to Working and pins it there — called when a real task
        // (POST /api/agents/work) starts, so the frontend's next /api/agents/live poll picks
        // up "Working" immediately instead of waiting on the random ambient tick.
        public bool TryStartManualWork(string agentId)
        {
            lock (_lock)
            {
                if (!_agents.TryGetValue(agentId, out var agent)) return false;
                agent.State = AgentActivityState.Working;
                agent.ManualOverride = true;
                return true;
            }
        }

        // Releases the pin and drops the agent back to Idle once the task finishes (success
        // or failure) — always call from a finally block.
        public void EndManualWork(string agentId)
        {
            lock (_lock)
            {
                if (_agents.TryGetValue(agentId, out var agent))
                {
                    agent.State = AgentActivityState.Idle;
                    agent.ManualOverride = false;
                }
            }
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                lock (_lock)
                {
                    foreach (var agent in _agents.Values)
                    {
                        Tick(agent);
                    }
                }

                try
                {
                    await Task.Delay(_tickInterval, stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    // Expected on shutdown.
                }
            }
        }

        private void Tick(AgentLiveRecord agent)
        {
            if (agent.ManualOverride) return;

            switch (agent.State)
            {
                case AgentActivityState.Idle:
                    // Small chance each tick to head off to a new spot (random walk / go-to-desk).
                    if (_rng.NextDouble() < 0.3)
                    {
                        agent.TargetX = _rng.Next((int)MinCoord, (int)MaxCoord);
                        agent.TargetY = _rng.Next((int)MinCoord, (int)MaxCoord);
                        agent.State = AgentActivityState.Walking;
                    }
                    break;

                case AgentActivityState.Walking:
                    MoveToward(agent, MoveSpeedPerTick);
                    if (HasReachedTarget(agent))
                    {
                        // Arrived — most of the time settle in to work, otherwise stay idle.
                        agent.State = _rng.NextDouble() < 0.7
                            ? AgentActivityState.Working
                            : AgentActivityState.Idle;
                    }
                    break;

                case AgentActivityState.Working:
                    // Occasionally wrap up and wander off again.
                    if (_rng.NextDouble() < 0.12)
                    {
                        agent.State = AgentActivityState.Idle;
                    }
                    break;
            }
        }

        private static void MoveToward(AgentLiveRecord agent, double speed)
        {
            var dx = agent.TargetX - agent.X;
            var dy = agent.TargetY - agent.Y;
            var distance = Math.Sqrt(dx * dx + dy * dy);

            if (distance <= speed)
            {
                agent.X = agent.TargetX;
                agent.Y = agent.TargetY;
                return;
            }

            agent.X += dx / distance * speed;
            agent.Y += dy / distance * speed;
        }

        private static bool HasReachedTarget(AgentLiveRecord agent)
        {
            const double epsilon = 0.01;
            return Math.Abs(agent.X - agent.TargetX) < epsilon && Math.Abs(agent.Y - agent.TargetY) < epsilon;
        }
    }
}
