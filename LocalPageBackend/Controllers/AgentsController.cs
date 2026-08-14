using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System.Collections.Generic;
using LocalPageBackend.Services;
using System.IO;
using System.IO.Compression;
using System;
using System.Text;
using System.Text.RegularExpressions;

namespace LocalPageBackend.Controllers
{
    [ApiController]
    [Route("api/agents")]
    public class AgentsController : ControllerBase
    {
        private readonly OrchestratorService _orchestrator;

        public AgentsController(OrchestratorService orchestrator)
        {
            _orchestrator = orchestrator;
        }

        [HttpPost("execute")]
        public async Task<IActionResult> ExecuteTask([FromBody] PromptRequest request)
        {
            try
            {
                // 1. AI ga siz aytmasangiz ham tizim o'zi qat'iy buyruq (System Prompt) qo'shib yuboradi:
                string strictPrompt = request.Prompt + "\n\nDIQQAT! Sen faqatgina 100% toza, ishlaydigan kod yozishing shart. Hech qanday tushuntirish, izohlar va o'zbekcha gaplar umuman yozilmasin. Frontend uchun qora mavzudagi (dark mode), zamonaviy va chiroyli inline CSS (yoki Tailwind uslubi) ishlat, sayt chiroyli ko'rinsin. Fetch manzili doim 'http://localhost:5050/api/cars' bo'lsin!";

                var result = await _orchestrator.RunAgentsAsync(strictPrompt, request.TargetAgents);

                using var memoryStream = new MemoryStream();
                using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
                {
                    if (result.ContainsKey("Frontend"))
                    {
                        // 2. AI dan kelgan kodni avtomatik "musr"dan tozalaymiz
                        string rawFrontend = CleanAiCode(result["Frontend"]);

                        AddFileToZip(archive, "frontend/package.json", "{ \"name\": \"localpage-ai-front\", \"private\": true, \"version\": \"0.0.0\", \"type\": \"module\", \"scripts\": { \"dev\": \"vite\", \"build\": \"vite build\", \"preview\": \"vite preview\" }, \"dependencies\": { \"react\": \"^18.2.0\", \"react-dom\": \"^18.2.0\", \"sass\": \"^1.69.5\" }, \"devDependencies\": { \"@vitejs/plugin-react\": \"^4.2.0\", \"vite\": \"^5.0.0\" } }");
                        AddFileToZip(archive, "frontend/vite.config.js", "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });");
                        AddFileToZip(archive, "frontend/index.html", "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\" />\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n<title>AI Project</title>\n</head>\n<body style=\"margin:0; background-color:#121212; color:#ffffff; font-family:sans-serif;\">\n<div id=\"root\"></div>\n<script type=\"module\" src=\"/src/main.jsx\"></script>\n</body>\n</html>");
                        AddFileToZip(archive, "frontend/src/main.jsx", "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App.jsx';\nReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);");
                        AddFileToZip(archive, "frontend/src/App.jsx", "import React from 'react';\nimport Output from './Frontend_Output.jsx';\nexport default function App() { return <Output />; }");
                        AddFileToZip(archive, "frontend/src/Frontend_Output.jsx", rawFrontend);
                    }

                    if (result.ContainsKey("Backend"))
                    {
                        // 3. AI dan kelgan kodni tozalaymiz
                        string rawBackend = CleanAiCode(result["Backend"]);

                        // 4. .NET versiyasini avtomatik 10.0 qilib belgilaymiz!
                        AddFileToZip(archive, "backend/LocalPageAPI.csproj", "<Project Sdk=\"Microsoft.NET.Sdk.Web\">\n<PropertyGroup>\n<TargetFramework>net10.0</TargetFramework>\n<Nullable>enable</Nullable>\n<ImplicitUsings>enable</ImplicitUsings>\n</PropertyGroup>\n</Project>");
                        // 5. Serverni avtomatik 5050-portga bog'laymiz!
                        AddFileToZip(archive, "backend/Program.cs", "using Microsoft.AspNetCore.Builder;\nusing Microsoft.Extensions.DependencyInjection;\n\nvar builder = WebApplication.CreateBuilder(args);\nbuilder.Services.AddControllers();\nbuilder.Services.AddCors(o => o.AddPolicy(\"AllowAll\", p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));\nvar app = builder.Build();\napp.UseCors(\"AllowAll\");\napp.MapControllers();\napp.Run(\"http://localhost:5050\");");
                        AddFileToZip(archive, "backend/Controllers/Backend_Output.cs", rawBackend);
                    }
                }

                string base64Zip = Convert.ToBase64String(memoryStream.ToArray());

                return Ok(new
                {
                    status = "Success",
                    zipFile = base64Zip
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Google API xatosi: " + ex.Message });
            }
        }

        private void AddFileToZip(ZipArchive archive, string path, string content)
        {
            var entry = archive.CreateEntry(path);
            using var stream = entry.Open();
            byte[] bytes = Encoding.UTF8.GetBytes(content);
            stream.Write(bytes, 0, bytes.Length);
        }

        // ENG ASOSIY QISM: AI yozgan "musr" gaplarni va markdown(```)larni qirqib, faqat toza kodni sug'urib oladigan funksiya
        private string CleanAiCode(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return "";

            if (text.Contains("```"))
            {
                var pattern = @"```(?:csharp|jsx|javascript|json|html|css)?\s*(.*?)\s*```";
                var match = Regex.Match(text, pattern, RegexOptions.Singleline);
                if (match.Success)
                {
                    return match.Groups[1].Value.Trim();
                }
            }
            return text.Trim();
        }
    }

    public class PromptRequest
    {
        public string Prompt { get; set; }
        public List<string> TargetAgents { get; set; }
    }
}