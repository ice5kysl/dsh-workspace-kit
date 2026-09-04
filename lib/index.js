// src/shared/i18n.ts
function localize(locale, zh, en, vars) {
  const template = locale === "zh" ? zh : en;
  if (!vars) return template;
  return template.replace(
    /\{(\w+)\}/g,
    (raw, name2) => vars[name2] !== void 0 ? String(vars[name2]) : raw
  );
}
function normalizeLocale(raw) {
  const tag = (raw ?? "").toLowerCase();
  if (tag.startsWith("zh")) return "zh";
  return "en";
}

// src/host/locale.ts
var cached;
function detectLocale() {
  if (cached) return cached;
  const override = (process.env.WSKIT_LOCALE ?? "").toLowerCase();
  if (override === "zh" || override === "en") {
    cached = override;
    return cached;
  }
  const envLang = process.env.LC_ALL || process.env.LANG || "";
  cached = normalizeLocale(envLang);
  return cached;
}
function L(zh, en, vars) {
  return localize(detectLocale(), zh, en, vars);
}

// src/host/util.ts
function norm(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}
function scoreQuery(candidate, query) {
  const c = norm(candidate);
  const terms = norm(query).split(" ").filter((term) => term.length > 0);
  if (terms.length === 0) return 0;
  let total = 0;
  for (const term of terms) {
    const at = c.indexOf(term);
    if (at < 0) return Number.POSITIVE_INFINITY;
    total += c === term ? 0 : at === 0 ? 1 : c.includes(term + " ") || c.includes(" " + term) ? 2 : at + 2;
  }
  return total;
}
async function toEntry(ws) {
  return {
    id: ws.id,
    title: ws.title,
    path: ws.path,
    createdAt: ws.createdAt,
    updatedAt: ws.updatedAt,
    sessionIds: [...ws.sessionIds],
    sessionCount: ws.sessionIds.length,
    missingDir: await ws.status() === "missing-dir"
  };
}
async function listWorkspaces(registry) {
  const entries = await Promise.all(registry.list().map(toEntry));
  entries.sort((a, b) => a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0);
  return entries;
}
async function findWorkspaces(registry, query) {
  const q = norm(query);
  const entries = await listWorkspaces(registry);
  if (q.length === 0) return entries.map((entry) => ({ ...entry, score: 0, why: "recent" }));
  const matches = [];
  for (const entry of entries) {
    const segments = entry.path.replace(/[/\\]+$/, "").split(/[/\\]/).filter(Boolean);
    const haystacks = [
      { text: entry.title, why: "title" },
      { text: entry.path, why: "path" },
      { text: segments.join(" "), why: "segments" }
    ];
    let best = Number.POSITIVE_INFINITY;
    let why = "";
    for (const { text, why: label } of haystacks) {
      const score = scoreQuery(text, q);
      if (score < best) {
        best = score;
        why = label;
      }
    }
    if (Number.isFinite(best)) matches.push({ ...entry, score: best, why });
  }
  matches.sort((a, b) => a.score - b.score || (a.updatedAt < b.updatedAt ? 1 : -1));
  return matches;
}
function matchFieldLabel(why) {
  if (detectLocale() !== "zh") return why;
  const zhLabels = { title: "\u6807\u9898", path: "\u8DEF\u5F84", segments: "\u5206\u6BB5", recent: "\u6700\u8FD1\u6D3B\u52A8" };
  return zhLabels[why] ?? why;
}
function entryLine(entry) {
  const when = entry.updatedAt.slice(0, 10);
  const count = entry.sessionCount;
  const missing = entry.missingDir ? L(" \u26A0 \u76EE\u5F55\u5F53\u524D\u4E0D\u5B58\u5728", " \u26A0 directory currently missing") : "";
  const meta = L("\uFF08{count} \u4E2A\u4F1A\u8BDD\uFF0C\u6700\u8FD1 {when}\uFF09", " ({count} sessions, latest {when})", { count, when });
  return `\xB7 **${entry.title}** \u2014 ${entry.path}${meta}${missing}`;
}

// src/host/commands.ts
var MAX_CANDIDATES = 12;
function registerWorkspaceCommands(ctx, commands) {
  commands.register({
    name: "workspace-find",
    description: L("\u6309\u6807\u9898/\u8DEF\u5F84\u6A21\u7CCA\u641C\u7D22\u5E76\u5B9A\u4F4D\u5DE5\u4F5C\u533A", "Fuzzy-search workspaces by title/path and locate one"),
    input: { hint: L("\u5173\u952E\u8BCD\uFF0C\u5982 pms / demo", "Keywords, e.g. pms / demo") },
    async handler({ rawInput }) {
      const query = rawInput.trim();
      if (!query) {
        return { kind: "error", text: L("\u7528\u6CD5\uFF1A/workspace-find <\u5173\u952E\u8BCD>", "Usage: /workspace-find <keywords>") };
      }
      const matches = await findWorkspaces(ctx.workspaceRegistry, query);
      if (matches.length === 0) {
        return { kind: "error", text: L("\u6CA1\u6709\u5339\u914D\u300C{query}\u300D\u7684\u5DE5\u4F5C\u533A\u3002", 'No workspace matches "{query}".', { query }) };
      }
      const body = matches.slice(0, MAX_CANDIDATES).map((m) => entryLine(m)).join("\n");
      const note = matches.length > MAX_CANDIDATES ? L("\n\u2026\u8FD8\u6709 {rest} \u4E2A\u5339\u914D", "\n\u2026plus {rest} more matches", { rest: matches.length - MAX_CANDIDATES }) : "";
      return {
        kind: "success",
        text: L(
          "\u5339\u914D\u300C{query}\u300D\u7684\u5DE5\u4F5C\u533A\uFF1A\n{body}{note}\n\n\u5B8C\u6574\u5217\u8868\uFF1A/workspace-list",
          'Workspaces matching "{query}":\n{body}{note}\n\nFull list: /workspace-list',
          { query, body, note }
        )
      };
    }
  });
  commands.register({
    name: "workspace-list",
    description: L("\u5217\u51FA\u5168\u90E8\u5DE5\u4F5C\u533A\uFF08\u6309\u6700\u8FD1\u6D3B\u52A8\u6392\u5E8F\uFF09", "List all workspaces (newest activity first)"),
    async handler() {
      const entries = await listWorkspaces(ctx.workspaceRegistry);
      if (entries.length === 0) {
        return { kind: "success", text: L("\u5F53\u524D\u6CA1\u6709\u4EFB\u4F55\u5DE5\u4F5C\u533A\u3002", "No workspaces yet.") };
      }
      const body = entries.slice(0, MAX_CANDIDATES).map(entryLine).join("\n");
      const note = entries.length > MAX_CANDIDATES ? L("\n\u2026\u8FD8\u6709 {rest} \u4E2A\u5DE5\u4F5C\u533A", "\n\u2026plus {rest} more workspaces", { rest: entries.length - MAX_CANDIDATES }) : "";
      return {
        kind: "success",
        text: L("\u5171 {count} \u4E2A\u5DE5\u4F5C\u533A\uFF1A\n{body}{note}", "{count} workspaces in total:\n{body}{note}", {
          count: entries.length,
          body,
          note
        })
      };
    }
  });
}

// src/host/tools.ts
import { defineTool } from "@deepseek-ai/dsh-tools";
function registerWorkspaceTools(ctx) {
  ctx.tools.register(defineTool({
    name: "workspace_find",
    description: 'Fuzzy-search workspaces (project directories that own dsh sessions) by title or path. Use it to locate which workspace/absolute path holds a project, e.g. when the user asks "which workspace is my pms project in". Returns ranked matches with absolute paths, session counts, and last activity.',
    parameters: {
      query: {
        type: "string",
        required: true,
        description: 'Title or path keywords to search for, e.g. "pms" or a directory name.'
      },
      limit: {
        type: "integer",
        description: "Maximum matches to return (default 8)."
      }
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }]
    },
    async execute(args) {
      const limit = Math.max(1, Math.min(args.limit ?? 8, 20));
      const matches = await findWorkspaces(ctx.workspaceRegistry, args.query);
      if (matches.length === 0) {
        return L(
          "\u672A\u627E\u5230\u5339\u914D\u300C{query}\u300D\u7684\u5DE5\u4F5C\u533A\u3002\u53EF\u5C1D\u8BD5 workspace_list \u67E5\u770B\u5168\u90E8\u3002",
          'No workspace matches "{query}". Try workspace_list to see all workspaces.',
          { query: args.query }
        );
      }
      const head = matches.slice(0, limit);
      const body = head.map((m) => {
        const why = matchFieldLabel(m.why);
        const missing = m.missingDir ? L(" \u26A0 \u76EE\u5F55\u5F53\u524D\u4E0D\u5B58\u5728", " \u26A0 directory currently missing") : "";
        const meta = L(
          "\uFF08{count} \u4E2A\u4F1A\u8BDD\uFF0C\u6700\u8FD1 {date}\uFF0C\u547D\u4E2D\uFF1A{why}\uFF09",
          " ({count} sessions, latest {date}; matched: {why})",
          { count: m.sessionCount, date: m.updatedAt.slice(0, 10), why }
        );
        return `\xB7 **${m.title}** \u2014 ${m.path}${meta}${missing}`;
      }).join("\n");
      const note = matches.length > limit ? L("\n\uFF08\u5171 {total} \u4E2A\u5339\u914D\uFF0C\u4EC5\u663E\u793A\u524D {limit} \u4E2A\uFF09", "\n ({total} matches in total; showing first {limit})", {
        total: matches.length,
        limit
      }) : "";
      return L(
        "\u5339\u914D\u300C{query}\u300D\u7684\u5DE5\u4F5C\u533A\uFF1A\n{body}{note}\n\n\u63D0\u793A\uFF1A\u53EF\u5728 dsh Web \u7684 Spotlight\uFF08\u2318K / Ctrl+K\uFF09\u4E2D\u76F4\u63A5\u641C\u7D22\u5E76\u6253\u5F00\u3002",
        'Workspaces matching "{query}":\n{body}{note}\n\nTip: you can also search and open it from the Spotlight in dsh Web (\u2318K / Ctrl+K).',
        { query: args.query, body, note }
      );
    }
  }));
  ctx.tools.register(defineTool({
    name: "workspace_list",
    description: "List every workspace (project directories that own dsh sessions), newest activity first, with absolute paths and session counts. Use it for the full inventory of projects.",
    parameters: {
      limit: {
        type: "integer",
        description: "Maximum rows to return (default 20)."
      }
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }]
    },
    async execute(args) {
      const limit = Math.max(1, Math.min(args.limit ?? 20, 50));
      const entries = await listWorkspaces(ctx.workspaceRegistry);
      if (entries.length === 0) {
        return L(
          "\u5F53\u524D\u6CA1\u6709\u4EFB\u4F55\u5DE5\u4F5C\u533A\u3002\u5728 dsh Web \u4E2D\u4ECE\u67D0\u4E2A\u9879\u76EE\u76EE\u5F55\u5F00\u59CB\u4F1A\u8BDD\u540E\u4F1A\u81EA\u52A8\u521B\u5EFA\u3002",
          "No workspaces yet. Start a session from a project directory in dsh Web and one will be created automatically."
        );
      }
      const body = entries.slice(0, limit).map(entryLine).join("\n");
      const note = entries.length > limit ? L("\n\uFF08\u5171 {total} \u4E2A\u5DE5\u4F5C\u533A\uFF0C\u4EC5\u663E\u793A\u524D {limit} \u4E2A\uFF09", "\n ({total} workspaces in total; showing first {limit})", {
        total: entries.length,
        limit
      }) : "";
      return L("\u5171 {count} \u4E2A\u5DE5\u4F5C\u533A\uFF1A\n{body}{note}", "{count} workspaces in total:\n{body}{note}", {
        count: entries.length,
        body,
        note
      });
    }
  }));
}

// src/host/index.ts
var name = "workspace-kit";
var inject = ["workspaceRegistry", "tools", "commands"];
function apply(ctx) {
  const log = ctx.logger("workspace-kit");
  log.info("workspace-kit loaded");
  registerWorkspaceTools(ctx);
  log.info("workspace tools registered (workspace_find, workspace_list)");
  registerWorkspaceCommands(ctx, ctx.commands);
  log.info("workspace commands registered (/workspace-find, /workspace-list)");
}
export {
  apply,
  inject,
  name
};
