using System.Collections.Generic;
using System.Threading.Tasks;

namespace LocalPageBackend.Services.AgentWork
{
    // Frontend agent's deliverable: a React + Vite project (package.json, index.html, and a
    // src/components + src/services folder hierarchy) that calls the Backend agent's exact
    // route over HTTP. Never emits a backend/ folder — that's the Backend agent's job alone.
    public class FrontendAgentWorkProvider : IAgentWorkProvider
    {
        public string AgentId => "Frontend";
        public string DisplayName => "Frontend";

        private const string PackageJsonTemplate = """
            {
              "name": "__ROUTE__-frontend",
              "private": true,
              "version": "0.1.0",
              "type": "module",
              "scripts": {
                "dev": "vite",
                "build": "vite build",
                "preview": "vite preview"
              },
              "dependencies": {
                "react": "^18.2.0",
                "react-dom": "^18.2.0",
                "framer-motion": "^11.2.0"
              },
              "devDependencies": {
                "@vitejs/plugin-react": "^4.2.0",
                "vite": "^5.0.0",
                "tailwindcss": "^3.4.0",
                "postcss": "^8.4.0",
                "autoprefixer": "^10.4.0"
              }
            }
            """;

        private const string TailwindConfigTemplate = """
            /** @type {import('tailwindcss').Config} */
            export default {
              content: ["./index.html", "./src/**/*.{js,jsx}"],
              theme: {
                extend: {},
              },
              plugins: [],
            };
            """;

        private const string PostcssConfigTemplate = """
            export default {
              plugins: {
                tailwindcss: {},
                autoprefixer: {},
              },
            };
            """;

        private const string IndexCssTemplate = """
            @tailwind base;
            @tailwind components;
            @tailwind utilities;
            """;

        private const string IndexHtmlTemplate = """
            <!-- __GENERATED_BY__ — task: "__TASK__" -->
            <!doctype html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <title>__DISPLAY_TITLE__</title>
              </head>
              <body>
                <div id="root"></div>
                <script type="module" src="/src/main.jsx"></script>
              </body>
            </html>
            """;

        private const string ViteConfigTemplate = """
            import { defineConfig } from "vite";
            import react from "@vitejs/plugin-react";

            export default defineConfig({
              plugins: [react()],
            });
            """;

        private const string MainJsxTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            import React from "react";
            import ReactDOM from "react-dom/client";
            import App from "./App.jsx";
            import "./index.css";

            ReactDOM.createRoot(document.getElementById("root")).render(
              <React.StrictMode>
                <App />
              </React.StrictMode>
            );
            """;

        private const string AppJsxTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            import __COMPONENT__ from "./components/__COMPONENT__.jsx";

            export default function App() {
              return (
                <div className="min-h-screen bg-gray-950 px-4 py-10 text-gray-100">
                  <div className="mx-auto max-w-2xl">
                    <__COMPONENT__ />
                  </div>
                </div>
              );
            }
            """;

        private const string ApiServiceTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            // Calls the Backend agent's __COMPONENT__Controller directly — same route
            // ("api/__ROUTE__") and field names, so this is a connected pair, not an
            // isolated mock. This must match backend/Program.cs's builder.WebHost.UseUrls(...)
            // call — if you change one, change the other.
            const API_BASE = "__BACKEND_BASE_URL__";

            // Fails fast with a readable error instead of calling response.json() on a
            // non-JSON body (an HTML 404/500 page) if the route or base URL ever drift apart.
            async function parseJsonOrThrow(response, requestLabel) {
              if (!response.ok) {
                throw new Error(`${requestLabel} failed (${response.status} ${response.statusText})`);
              }
              return response.json();
            }

            export async function fetchAll() {
              const response = await fetch(`${API_BASE}/api/__ROUTE__`);
              return parseJsonOrThrow(response, "GET /api/__ROUTE__");
            }

            export async function fetchById(id) {
              const response = await fetch(`${API_BASE}/api/__ROUTE__/${id}`);
              return parseJsonOrThrow(response, `GET /api/__ROUTE__/${id}`);
            }

            export async function create(item) {
              const response = await fetch(`${API_BASE}/api/__ROUTE__`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item),
              });
              return parseJsonOrThrow(response, "POST /api/__ROUTE__");
            }

            export async function update(id, item) {
              const response = await fetch(`${API_BASE}/api/__ROUTE__/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item),
              });
              return parseJsonOrThrow(response, `PUT /api/__ROUTE__/${id}`);
            }

            export async function remove(id) {
              const response = await fetch(`${API_BASE}/api/__ROUTE__/${id}`, { method: "DELETE" });
              if (!response.ok) {
                throw new Error(`DELETE /api/__ROUTE__/${id} failed (${response.status} ${response.statusText})`);
              }
            }
            """;

        private const string ComponentTemplate = """
            // __GENERATED_BY__ — task: "__TASK__"
            import { useEffect, useState } from "react";
            import { motion, AnimatePresence } from "framer-motion";
            import { fetchAll, create, remove } from "../services/__COMPONENT__Api.js";

            export default function __COMPONENT__() {
              const [items, setItems] = useState([]);
              const [name, setName] = useState("");
              const [error, setError] = useState(null);
              const [loading, setLoading] = useState(true);

              useEffect(() => {
                fetchAll()
                  .then((data) => setItems(Array.isArray(data) ? data : []))
                  .catch((err) => setError(err.message))
                  .finally(() => setLoading(false));
              }, []);

              const handleSubmit = async (event) => {
                event.preventDefault();
                if (!name.trim()) return;
                try {
                  const created = await create({ name });
                  setItems((prev) => [...prev, created]);
                  setName("");
                  setError(null);
                } catch (err) {
                  setError(err.message);
                }
              };

              const handleDelete = async (id) => {
                try {
                  await remove(id);
                  setItems((prev) => prev.filter((item) => item.id !== id));
                } catch (err) {
                  setError(err.message);
                }
              };

              return (
                <div className="rounded-xl bg-gray-900 p-6 shadow-lg">
                  <h2 className="mb-4 text-xl font-semibold text-white">__DISPLAY_TITLE__</h2>
                  <AnimatePresence>
                    {error ? (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mb-4 rounded-md bg-red-950 px-3 py-2 text-sm text-red-300"
                      >
                        {error}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                  <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="__PLACEHOLDER__"
                      aria-label="__PLACEHOLDER__"
                      className="flex-1 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                    />
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950"
                    >
                      __SUBMIT_LABEL__
                    </motion.button>
                  </form>
                  {loading ? (
                    <p className="text-sm text-gray-400">…</p>
                  ) : (
                    <ul className="space-y-2">
                      {items.length === 0 ? (
                        <li className="text-sm text-gray-400">__LIST_EMPTY__</li>
                      ) : (
                        <AnimatePresence>
                          {items.map((item, index) => (
                            <motion.li
                              key={item.id ?? index}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: 8 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex items-center justify-between rounded-md bg-gray-800 px-3 py-2 text-sm text-gray-100"
                            >
                              <span>{item.name}</span>
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                aria-label={`Delete ${item.name}`}
                                className="text-gray-500 hover:text-red-400"
                              >
                                ×
                              </button>
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      )}
                    </ul>
                  )}
                </div>
              );
            }
            """;

        private string Fill(string template, string componentName, string route, string task, string language) =>
            AgentWorkShared.FillTemplate(template, componentName, route, task, language, DisplayName);

        public Dictionary<string, string> BuildDeterministicFiles(string componentName, string route, string task, string language) => new()
        {
            ["frontend/package.json"] = Fill(PackageJsonTemplate, componentName, route, task, language),
            ["frontend/index.html"] = Fill(IndexHtmlTemplate, componentName, route, task, language),
            ["frontend/vite.config.js"] = Fill(ViteConfigTemplate, componentName, route, task, language),
            ["frontend/tailwind.config.js"] = Fill(TailwindConfigTemplate, componentName, route, task, language),
            ["frontend/postcss.config.js"] = Fill(PostcssConfigTemplate, componentName, route, task, language),
            ["frontend/src/index.css"] = Fill(IndexCssTemplate, componentName, route, task, language),
            ["frontend/src/main.jsx"] = Fill(MainJsxTemplate, componentName, route, task, language),
            ["frontend/src/App.jsx"] = Fill(AppJsxTemplate, componentName, route, task, language),
            [$"frontend/src/services/{componentName}Api.js"] = Fill(ApiServiceTemplate, componentName, route, task, language),
            [$"frontend/src/components/{componentName}.jsx"] = Fill(ComponentTemplate, componentName, route, task, language),
        };

        // Asks Gemini for just this agent's one "creative" leaf file — the component's UI —
        // and returns it only if it passes basic structural validation. Everything that has to
        // stay wired correctly (package.json, main.jsx, the API service module, the route) is
        // never touched by the LLM, so it can only ever affect this one file.
        public async Task<(string Path, string Content)?> TryGenerateLlmOverlayAsync(
            GeminiService gemini, string componentName, string route, string task)
        {
            var output = await gemini.TryGenerateTextAsync(task, BuildLlmContext(componentName, route));
            if (string.IsNullOrWhiteSpace(output)) return null;

            var files = AgentWorkShared.ParseMarkedFiles(output);
            var jsxContent = files.TryGetValue($"{componentName}.jsx", out var explicitJsx)
                ? explicitJsx
                // Some models omit the marker when there's only one file — accept the whole
                // cleaned response as the component in that case.
                : AgentWorkShared.StripCodeFences(output);
            if (string.IsNullOrWhiteSpace(jsxContent)) return null;

            return IsWellFormedReactComponent(jsxContent, componentName)
                ? ($"frontend/src/components/{componentName}.jsx", jsxContent)
                : null;
        }

        private static bool IsWellFormedReactComponent(string content, string componentName)
        {
            if (string.IsNullOrWhiteSpace(content)) return false;
            var hasExpectedExport =
                content.Contains($"export default function {componentName}") ||
                content.Contains($"export default {componentName}");
            if (!hasExpectedExport) return false;
            if (!AgentWorkShared.HasBalancedBraces(content)) return false;
            if (!AgentWorkShared.HasBalancedParens(content)) return false;

            // Must go through the generated API service module — never invent its own
            // fetch call, base URL, or route.
            if (content.Contains("fetch(")) return false;
            if (System.Text.RegularExpressions.Regex.IsMatch(content, @"https?://")) return false;
            if (!content.Contains($"services/{componentName}Api")) return false;

            return true;
        }

        private static string BuildLlmContext(string componentName, string route) => $"""
            You are the Frontend agent on a collaborative full-stack team. A complete React +
            Vite project scaffold already exists around this file — package.json, index.html,
            tailwind.config.js, postcss.config.js, src/index.css (Tailwind directives),
            src/main.jsx, src/App.jsx, and an API service module at
            "../services/{componentName}Api.js" that exports async fetchAll(), fetchById(id),
            create(item), update(id, item), and remove(id), already correctly wired to call the
            Backend agent's exact endpoint (Base URL {AgentWorkShared.GeneratedBackendBaseUrl},
            route api/{route}; GET returns a list of items each with id/name/createdAt fields,
            GET /:id returns one, POST with a body containing name creates one and returns it,
            PUT /:id updates one, DELETE /:id removes one). Your only job right now is this one
            UI component.
            Detect whether the task below is written in Uzbek, Russian, or English, and write
            all comments AND user-facing UI text (labels, placeholders, button text) in that
            same detected language (keep JS/JSX identifiers in English, as usual).
            Generate a single React component, default-exported, named exactly
            "{componentName}", that imports the named exports it needs from
            "../services/{componentName}Api.js", fetches the list on mount (with a loading
            state), and can create a new item via a form and delete an existing one. Handle the
            empty-list state and the fetch-failed state explicitly — never leave the user
            looking at a blank screen with no explanation. Style it with Tailwind utility
            classes only (no inline style objects, no CSS modules) to match the rest of the
            scaffold, and prefer framer-motion (already a dependency) for hover/tap states and
            list-item enter/exit transitions over CSS transitions. The component's own heading
            text must be a short, human title (a few words derived from "{componentName}"),
            never the raw task text below.
            Do not call fetch() yourself, do not hardcode a base URL or route, and do not
            import from any path other than "../services/{componentName}Api.js" — always go
            through the service module's exports exactly as given, so the route can never drift
            out of sync with the backend.
            Output ONLY the file, in exactly this format and nothing else — no markdown
            fences, no prose before or after:
            <<<FILE: {componentName}.jsx>>>
            (component file content here)
            """;

        public string BuildReadme(string componentName, string route, string task, string language, string mode)
        {
            var header = AgentWorkShared.BuildReadmeHeader(AgentId, DisplayName, task, language, mode);
            return header + $"""
                frontend/                               React + Vite project
                  package.json
                  index.html
                  vite.config.js
                  src/main.jsx
                  src/App.jsx
                  src/services/{componentName}Api.js
                  src/components/{componentName}.jsx

                Run it:  cd frontend && npm install && npm run dev
                Calls:   {AgentWorkShared.GeneratedBackendBaseUrl}/api/{route}   (src/services/{componentName}Api.js)

                This calls a backend that isn't part of this zip. Ask the Backend agent for
                the SAME task text separately — componentName/route are both derived
                deterministically from the task wording, so an identical task description
                lines up with this frontend's route automatically. Until that backend is
                running, the UI still loads; it shows a clear on-screen error instead of
                crashing if the call fails.
                """;
        }
    }
}
