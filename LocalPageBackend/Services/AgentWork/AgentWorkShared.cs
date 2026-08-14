using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace LocalPageBackend.Services.AgentWork
{
    // Naming, localization, sanitization, and file-I/O helpers shared by every
    // IAgentWorkProvider. Kept here (not duplicated per-provider) so a new specialist added to
    // the office automatically gets the same battle-tested path-safety and localization
    // behavior as Frontend/Backend without having to reimplement it.
    public static class AgentWorkShared
    {
        // The root cause of the "404 / JSON parse error" class of runtime failure: every
        // generated backend/ project is a brand-new, standalone ASP.NET Core app — it does NOT
        // run on this meta-server's own port (see LocalPageBackend/Properties/
        // launchSettings.json, which is 5278/7070 and has nothing to do with generated
        // projects). Pinning every provider to this single shared constant, instead of each
        // guessing independently, is what guarantees the Frontend agent's fetch() calls, the
        // QA agent's test HttpClient, and the DevOps agent's docker-compose port mapping all
        // land on the same place as the Backend agent's own Program.cs.
        public const string GeneratedBackendPort = "5080";
        public static readonly string GeneratedBackendBaseUrl = $"http://localhost:{GeneratedBackendPort}";

        // Windows' MAX_PATH (~260 chars) is the hard limit that actually bites — a model that
        // PascalCases the entire prompt into one identifier, or a marker filename/path it
        // invents outright, can easily blow past that and turn File.WriteAllTextAsync into an
        // IOException ("filename, directory name, or volume label syntax is incorrect"). 50
        // chars is generous for a single path segment's base name and leaves huge headroom
        // under the limit even combined with the temp directory path and nested folders.
        public const int MaxFileBaseNameLength = 50;
        // The scaffold nests a few folders deep (e.g. backend/Application/Interfaces/,
        // frontend/src/components/, devops/.github/workflows/) — this caps total relative path
        // length and folder depth so an LLM-invented path can't recreate the same MAX_PATH
        // problem by nesting instead of just using one long name.
        public const int MaxRelativePathLength = 200;
        public const int MaxPathDepth = 6;

        // Capped well under MaxFileBaseNameLength: componentName gets suffixes appended
        // (e.g. "Repository"/"Controller"-length names) — this leaves plenty of room even
        // before SanitizeRelativeFilePath's own truncation pass runs again later.
        public const int MaxComponentNameLength = 40;
        public const int MaxRouteSlugLength = 50;

        // ── Naming ────────────────────────────────────────────────────────────────────────

        // Cyrillic letters aren't valid C#/JS identifier characters, and the a-zA-Z0-9 split
        // below would otherwise treat an all-Cyrillic task as one big separator and fall back
        // to a generic "GeneratedComponent" name. Transliterating first keeps naming
        // meaningful for Russian/Uzbek-Cyrillic tasks too.
        private static readonly Dictionary<char, string> CyrillicToLatin = new()
        {
            ['а'] = "a", ['б'] = "b", ['в'] = "v", ['г'] = "g", ['д'] = "d", ['е'] = "e", ['ё'] = "e",
            ['ж'] = "zh", ['з'] = "z", ['и'] = "i", ['й'] = "i", ['к'] = "k", ['л'] = "l", ['м'] = "m",
            ['н'] = "n", ['о'] = "o", ['п'] = "p", ['р'] = "r", ['с'] = "s", ['т'] = "t", ['у'] = "u",
            ['ф'] = "f", ['х'] = "h", ['ц'] = "ts", ['ч'] = "ch", ['ш'] = "sh", ['щ'] = "sch",
            ['ъ'] = "", ['ы'] = "y", ['ь'] = "", ['э'] = "e", ['ю'] = "yu", ['я'] = "ya",
        };

        private static string TransliterateCyrillic(string input)
        {
            var builder = new StringBuilder(input.Length);
            foreach (var ch in input)
            {
                builder.Append(CyrillicToLatin.TryGetValue(char.ToLowerInvariant(ch), out var replacement)
                    ? replacement
                    : ch.ToString());
            }
            return builder.ToString();
        }

        // A long task description (the root cause of the MAX_PATH crash this guards against —
        // a model that PascalCases the *entire* prompt into one identifier) would otherwise
        // produce an arbitrarily long, unbroken identifier here with no natural place to cut.
        public static string ToPascalCase(string input)
        {
            var parts = Regex.Split(TransliterateCyrillic(input), @"[^a-zA-Z0-9]+").Where(part => part.Length > 0);
            var name = string.Concat(parts.Select(part => char.ToUpperInvariant(part[0]) + part[1..]));
            if (string.IsNullOrEmpty(name)) return "GeneratedComponent";
            return name.Length > MaxComponentNameLength ? name[..MaxComponentNameLength] : name;
        }

        public static string ToKebabCase(string input)
        {
            var parts = Regex.Split(TransliterateCyrillic(input), @"[^a-zA-Z0-9]+")
                .Where(part => part.Length > 0)
                .Select(part => part.ToLowerInvariant());
            var slug = string.Join("-", parts);
            if (string.IsNullOrEmpty(slug)) return "generated";
            return slug.Length > MaxRouteSlugLength ? slug[..MaxRouteSlugLength].Trim('-') : slug;
        }

        // SQL/snake_case identifiers (table names, etc.) — trivial from an already-kebab route.
        public static string ToSnakeCase(string kebabRoute) => kebabRoute.Replace('-', '_');

        // The task text a user submits can be an arbitrarily long, multi-paragraph
        // instruction, not a short label — safe to drop into a source comment (never
        // rendered) but not into on-screen UI (page <title>, heading text), where it would
        // show up as a wall of text instead of a title. componentName is already a single
        // PascalCase identifier capped at MaxComponentNameLength, so spacing its words back
        // out gives a short, readable heading regardless of how long the original task was.
        public static string ToDisplayTitle(string componentName) =>
            Regex.Replace(componentName, "(?<!^)([A-Z])", " $1");

        // ── Localization ─────────────────────────────────────────────────────────────────

        private static readonly (string Lang, string[] Markers)[] UzbekLatinMarkerSets =
        {
            ("uz", new[] { "yarat", "kerak", "uchun", "foydalanuvchi", "sahifa", "tugma", "ilova", "ro'yxat", "qo'sh", "bo'lsin" }),
        };

        // Cyrillic script strongly implies Russian for this lightweight heuristic — it does
        // not attempt to distinguish Russian from Uzbek written in the Cyrillic alphabet.
        // A real distinction would require actual language understanding (the LLM path).
        public static string DetectLanguage(string text)
        {
            if (Regex.IsMatch(text, "[Ѐ-ӿ]"))
            {
                return "ru";
            }

            var lower = text.ToLowerInvariant();
            foreach (var (lang, markers) in UzbekLatinMarkerSets)
            {
                if (markers.Any(marker => lower.Contains(marker)))
                {
                    return lang;
                }
            }

            return "en";
        }

        public sealed record LocalizedPhrases(string GeneratedByFormat, string EndpointLive, string Submit, string Placeholder, string ListEmpty);

        public static readonly Dictionary<string, LocalizedPhrases> Phrases = new()
        {
            ["en"] = new LocalizedPhrases("Generated by the {0} agent", "endpoint is live.", "Submit", "Enter a value...", "No items yet."),
            ["ru"] = new LocalizedPhrases("Сгенерировано агентом {0}", "эндпоинт запущен.", "Отправить", "Введите значение...", "Пока нет элементов."),
            ["uz"] = new LocalizedPhrases("{0} agenti tomonidan yaratildi", "endpoint ishga tushdi.", "Yuborish", "Qiymat kiriting...", "Hozircha elementlar yo'q."),
        };

        // Fills every template placeholder shared across agents. __GENERATED_BY__ is
        // parameterized by agentDisplayName so any new provider gets correct localized
        // attribution without needing its own placeholder variant.
        public static string FillTemplate(string template, string componentName, string route, string task, string language, string agentDisplayName)
        {
            var phrases = Phrases.TryGetValue(language, out var found) ? found : Phrases["en"];
            return template
                .Replace("__GENERATED_BY__", string.Format(phrases.GeneratedByFormat, agentDisplayName))
                .Replace("__BACKEND_BASE_URL__", GeneratedBackendBaseUrl)
                .Replace("__COMPONENT__", componentName)
                .Replace("__ROUTE__", route)
                .Replace("__TABLE__", ToSnakeCase(route))
                .Replace("__TASK__", task)
                .Replace("__DISPLAY_TITLE__", ToDisplayTitle(componentName))
                .Replace("__LANGUAGE__", language)
                .Replace("__PLACEHOLDER__", phrases.Placeholder)
                .Replace("__SUBMIT_LABEL__", phrases.Submit)
                .Replace("__LIST_EMPTY__", phrases.ListEmpty);
        }

        public static string BuildReadmeHeader(string canonicalAgentId, string displayName, string task, string language, string mode) => $"""
            LocalPage AI Office — generated {displayName} deliverable
            ========================================

            Agent: {canonicalAgentId}
            Task: {task}
            Detected language: {language}
            Generation mode: {mode}

            This is a complete, ready-to-use {displayName} deliverable on its own — not a
            single isolated file, and not bundled with any other agent's files. Assigning a
            task to the {canonicalAgentId} agent only ever generates the {canonicalAgentId}
            agent's own side; the other roster agents stay untouched.

            """;

        // ── LLM response parsing ─────────────────────────────────────────────────────────

        // Splits an LLM response on "<<<FILE: name>>>" markers into { fileName -> content }.
        public static Dictionary<string, string> ParseMarkedFiles(string llmOutput)
        {
            var files = new Dictionary<string, string>();

            try
            {
                var matches = Regex.Matches(llmOutput, @"<<<FILE:\s*([^\r\n>]+)>>>", RegexOptions.IgnoreCase);
                for (var i = 0; i < matches.Count; i++)
                {
                    var match = matches[i];
                    var fileName = SanitizeRelativeFilePath(match.Groups[1].Value);
                    if (fileName.Length == 0) continue;

                    var contentStart = match.Index + match.Length;
                    var contentEnd = i + 1 < matches.Count ? matches[i + 1].Index : llmOutput.Length;
                    var rawContent = llmOutput.Substring(contentStart, contentEnd - contentStart);
                    files[fileName] = StripCodeFences(rawContent);
                }
            }
            catch (Exception ex)
            {
                // Regex/index failure on a genuinely malformed response — log the raw output
                // so the exact shape that broke parsing is visible, and return whatever files
                // were parsed so far (possibly none). Caller treats a missing expected file as
                // "keep the deterministic scaffold's version", so this never crashes the request.
                var snippet = llmOutput.Length > 500 ? llmOutput[..500] + "…" : llmOutput;
                Console.WriteLine($"[AgentWork] ParseMarkedFiles failed: {ex.Message}\nRaw LLM output (truncated): {snippet}");
            }

            return files;
        }

        // Belt-and-braces: strips a leading/trailing ``` fence if the model added one despite
        // being told not to, plus any stray fence line left in the middle of a file's content
        // (e.g. a nested code block, or a fence the model closed early before the next
        // <<<FILE:>>> marker).
        public static string StripCodeFences(string content)
        {
            var trimmed = content.Trim();
            trimmed = Regex.Replace(trimmed, @"^```[a-zA-Z0-9]*\s*", "");
            trimmed = Regex.Replace(trimmed, @"```\s*$", "");
            trimmed = Regex.Replace(trimmed, @"(?m)^```[a-zA-Z0-9]*\s*$", "");
            return trimmed.Trim();
        }

        // Lightweight structural sanity checks — not a real compiler/parser, just enough to
        // catch the common way an LLM response goes wrong: a truncated file with unbalanced
        // brackets. A file that fails these is discarded so the deterministic scaffold's
        // already-correct version is kept instead of shipping broken code.
        public static bool HasBalancedBraces(string content) =>
            content.Count(c => c == '{') == content.Count(c => c == '}');

        public static bool HasBalancedParens(string content) =>
            content.Count(c => c == '(') == content.Count(c => c == ')');

        // ── Path safety ──────────────────────────────────────────────────────────────────

        // Gemini sometimes wraps the marker's filename in markdown emphasis or backticks
        // (e.g. "<<<FILE: **Component.cs**>>>" or "`Component.cs`") despite being told to
        // output the marker format exactly — strip that before the name is used as a
        // dictionary key or a filesystem path.
        //
        // Also normalizes a (possibly nested) relative path: strips directory-traversal
        // segments ("..") and absolute-path attempts (leading "/" or a drive letter) so a
        // marker like "<<<FILE: ../../evil.cs>>>" can't escape the temp directory, strips
        // characters Windows rejects from every segment, and truncates each segment's base
        // name — preserving the final segment's extension — plus the overall path length, so
        // a runaway LLM-generated identifier can never produce a path Windows refuses to open.
        public static string SanitizeRelativeFilePath(string rawPath, int maxSegmentBaseNameLength = MaxFileBaseNameLength)
        {
            var cleaned = rawPath.Trim().Trim('`', '*', '"', '\'', ' ').Trim();
            if (cleaned.Length == 0) return string.Empty;

            cleaned = cleaned.Replace('\\', '/');
            cleaned = Regex.Replace(cleaned, @"^[a-zA-Z]:", ""); // drop a leading drive letter, e.g. "C:"
            cleaned = cleaned.TrimStart('/');

            var rawSegments = cleaned.Split('/', StringSplitOptions.RemoveEmptyEntries);
            var safeSegments = new List<string>();

            for (var i = 0; i < rawSegments.Length; i++)
            {
                var segment = rawSegments[i];
                foreach (var invalidChar in Path.GetInvalidFileNameChars())
                {
                    segment = segment.Replace(invalidChar, '_');
                }
                segment = segment.Trim();

                // A segment that's only dots (".", "..", "...") is either a no-op or a
                // directory-traversal attempt — drop it rather than trying to "clean" it.
                if (segment.Length == 0 || segment.Trim('.').Length == 0) continue;

                var isFileSegment = i == rawSegments.Length - 1;
                if (isFileSegment)
                {
                    var extension = Path.GetExtension(segment);
                    var baseName = Path.GetFileNameWithoutExtension(segment);
                    if (baseName.Length > maxSegmentBaseNameLength)
                    {
                        baseName = baseName[..maxSegmentBaseNameLength];
                    }
                    // The file segment itself sanitized down to nothing (e.g. an
                    // extension-only or symbols-only name) — dropping just this segment
                    // while keeping the directory segments already added to safeSegments
                    // would leave a directory-shaped relative path (e.g. "backend/Domain"
                    // instead of "backend/Domain/Foo.cs"). Writing THAT as if it were a
                    // file later collides with the real directory of the same name and
                    // Windows reports the collision as "Access to the path ... is denied"
                    // instead of a clearer error — so invalidate the whole path here rather
                    // than let a directory-only fragment reach the caller.
                    if (baseName.Length == 0) return string.Empty;
                    segment = $"{baseName}{extension}";
                }
                else if (segment.Length > maxSegmentBaseNameLength)
                {
                    segment = segment[..maxSegmentBaseNameLength];
                }

                safeSegments.Add(segment);
                if (safeSegments.Count >= MaxPathDepth) break; // cap folder depth defensively
            }

            if (safeSegments.Count == 0) return string.Empty;

            var relativePath = string.Join('/', safeSegments);
            return relativePath.Length > MaxRelativePathLength ? relativePath[..MaxRelativePathLength] : relativePath;
        }

        // ── File I/O ──────────────────────────────────────────────────────────────────────

        // Antivirus real-time scanning (and, on some machines, the OneDrive cloud-file
        // provider) can hold a freshly created file open for a few hundred ms, which
        // surfaces as a transient UnauthorizedAccessException/IOException right after
        // Directory.CreateDirectory returns. Not a code bug — just the file not being
        // writable *yet* — so a short bounded retry clears it without masking a real,
        // persistent permission problem (which will still fail after 3 attempts).
        public static async Task WriteFileWithRetryAsync(string fullPath, string content, int maxAttempts = 3)
        {
            for (var attempt = 1; attempt <= maxAttempts; attempt++)
            {
                try
                {
                    await File.WriteAllTextAsync(fullPath, content);
                    return;
                }
                catch (Exception ex) when (attempt < maxAttempts && (ex is UnauthorizedAccessException or IOException))
                {
                    await Task.Delay(150 * attempt);
                }
            }
        }

        public static void TryDeleteFile(string? path)
        {
            if (string.IsNullOrEmpty(path)) return;
            try { File.Delete(path); } catch { /* best-effort scratch-file cleanup */ }
        }

        public static void TryDeleteDirectory(string? path)
        {
            if (string.IsNullOrEmpty(path)) return;
            try { Directory.Delete(path, recursive: true); } catch { /* best-effort scratch-dir cleanup */ }
        }
    }
}
