using System.Collections.Generic;
using System.Threading.Tasks;

namespace LocalPageBackend.Services.AgentWork
{
    public class GraphicAgentWorkProvider : IAgentWorkProvider
    {
        public string AgentId => "Graphic";
        public string DisplayName => "Graphic Designer";

        public Dictionary<string, string> BuildDeterministicFiles(string componentName, string route, string task, string language)
        {
            var title = AgentWorkShared.ToDisplayTitle(componentName);

            var svgContent = $@"<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 800 600"" width=""100%"" height=""100%"">
  <defs>
    <linearGradient id=""grad1"" x1=""0%"" y1=""0%"" x2=""100%"" y2=""100%"">
      <stop offset=""0%"" style=""stop-color:#3b82f6;stop-opacity:1"" />
      <stop offset=""100%"" style=""stop-color:#9333ea;stop-opacity:1"" />
    </linearGradient>
    <filter id=""glow"" x=""-20%"" y=""-20%"" width=""140%"" height=""140%"">
      <feGaussianBlur stdDeviation=""10"" result=""blur"" />
      <feComposite in=""SourceGraphic"" in2=""blur"" operator=""over"" />
    </filter>
  </defs>
  <rect width=""100%"" height=""100%"" fill=""#0f172a"" />
  <circle cx=""400"" cy=""250"" r=""120"" fill=""url(#grad1)"" filter=""url(#glow)"" />
  <text x=""400"" y=""440"" fill=""#f8fafc"" font-family=""system-ui, sans-serif"" font-size=""32"" font-weight=""bold"" text-anchor=""middle"">{title}</text>
  <text x=""400"" y=""480"" fill=""#94a3b8"" font-family=""system-ui, sans-serif"" font-size=""18"" text-anchor=""middle"">{task}</text>
</svg>";

            var htmlPreview = $@"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""UTF-8"" />
  <title>{title} — Graphic Asset</title>
  <style>
    body {{ margin: 0; background: #0b0f19; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }}
    .card {{ background: #1e293b; padding: 24px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; }}
    svg {{ max-width: 600px; max-height: 400px; }}
  </style>
</head>
<body>
  <div class=""card"">
    <div style=""margin-bottom: 16px; color: #38bdf8; font-size: 14px; text-transform: uppercase;"">Graphic Asset Preview</div>
    {svgContent}
  </div>
</body>
</html>";

            return new Dictionary<string, string>
            {
                ["graphic/asset.svg"] = svgContent,
                ["graphic/preview.html"] = htmlPreview,
            };
        }

        public async Task<(string Path, string Content)?> TryGenerateLlmOverlayAsync(
            GeminiService gemini, string componentName, string route, string task)
        {
            var roleContext = @"You are a Senior Graphic Designer / SVG Illustrator.
Create a clean, beautiful, fully responsive SVG graphic code for the given user task.
Output ONLY raw valid SVG code (starts with <svg and ends with </svg>). No markdown, no commentary, no markdown codeblocks.";

            var prompt = $"Create an impressive SVG graphic for: {task}. Component name: {componentName}. Ensure clean vector paths and modern gradients.";
            var generatedSvg = await gemini.TryGenerateTextAsync(prompt, roleContext);

            if (string.IsNullOrWhiteSpace(generatedSvg)) return null;

            var cleanSvg = AgentWorkShared.StripCodeFences(generatedSvg);
            if (!cleanSvg.Contains("<svg") || !cleanSvg.Contains("</svg>")) return null;

            return ("graphic/asset.svg", cleanSvg);
        }

        public string BuildReadme(string componentName, string route, string task, string language, string mode)
        {
            return $"Graphic Design Deliverable for: {task}\nMode: {mode}\nOpen graphic/preview.html in any browser to inspect the SVG graphic.";
        }
    }
}

