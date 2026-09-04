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
function entryLine(entry) {
  const when = entry.updatedAt.slice(0, 10);
  const state = entry.missingDir ? " \u26A0 \u76EE\u5F55\u5F53\u524D\u4E0D\u5B58\u5728" : "";
  return `\xB7 **${entry.title}** \u2014 ${entry.path}\uFF08${entry.sessionCount} \u4E2A\u4F1A\u8BDD\uFF0C\u6700\u8FD1 ${when}\uFF09${state}`;
}

// src/host/commands.ts
var MAX_CANDIDATES = 12;
function registerWorkspaceCommands(ctx, commands) {
  commands.register({
    name: "workspace-find",
    description: "\u6309\u6807\u9898/\u8DEF\u5F84\u6A21\u7CCA\u641C\u7D22\u5E76\u5B9A\u4F4D\u5DE5\u4F5C\u533A",
    input: { hint: "\u5173\u952E\u8BCD\uFF0C\u5982 pms / LoopDSH" },
    async handler({ rawInput }) {
      const query = rawInput.trim();
      if (!query) {
        return { kind: "error", text: "\u7528\u6CD5\uFF1A/workspace-find <\u5173\u952E\u8BCD>" };
      }
      const matches = await findWorkspaces(ctx.workspaceRegistry, query);
      if (matches.length === 0) {
        return { kind: "error", text: `\u6CA1\u6709\u5339\u914D\u300C${query}\u300D\u7684\u5DE5\u4F5C\u533A\u3002` };
      }
      const body = matches.slice(0, MAX_CANDIDATES).map((m) => entryLine(m)).join("\n");
      const note = matches.length > MAX_CANDIDATES ? `
\u2026\u8FD8\u6709 ${matches.length - MAX_CANDIDATES} \u4E2A\u5339\u914D` : "";
      return {
        kind: "success",
        text: `\u5339\u914D\u300C${query}\u300D\u7684\u5DE5\u4F5C\u533A\uFF1A
${body}${note}

\u5B8C\u6574\u5217\u8868\uFF1A/workspace-list`
      };
    }
  });
  commands.register({
    name: "workspace-list",
    description: "\u5217\u51FA\u5168\u90E8\u5DE5\u4F5C\u533A\uFF08\u6309\u6700\u8FD1\u6D3B\u52A8\u6392\u5E8F\uFF09",
    async handler() {
      const entries = await listWorkspaces(ctx.workspaceRegistry);
      if (entries.length === 0) {
        return { kind: "success", text: "\u5F53\u524D\u6CA1\u6709\u4EFB\u4F55\u5DE5\u4F5C\u533A\u3002" };
      }
      const body = entries.slice(0, MAX_CANDIDATES).map(entryLine).join("\n");
      const note = entries.length > MAX_CANDIDATES ? `
\u2026\u8FD8\u6709 ${entries.length - MAX_CANDIDATES} \u4E2A\u5DE5\u4F5C\u533A` : "";
      return { kind: "success", text: `\u5171 ${entries.length} \u4E2A\u5DE5\u4F5C\u533A\uFF1A
${body}${note}` };
    }
  });
}

// src/host/tools.ts
import { defineTool } from "@deepseek-ai/dsh-tools";
function registerWorkspaceTools(ctx) {
  ctx.tools.register(defineTool({
    name: "workspace_find",
    description: "Fuzzy-search workspaces (project directories that own dsh sessions) by title or path. Use it to locate which workspace/absolute path holds a project, e.g. \u627E\u4E00\u4E0B pms \u90A3\u4E2A\u5DE5\u4F5C\u533A. Returns ranked matches with absolute paths, session counts, and last activity.",
    parameters: {
      query: {
        type: "string",
        required: true,
        description: 'Title or path keywords, e.g. "pms", "LoopDSH", "drum".'
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
        return `\u672A\u627E\u5230\u5339\u914D\u300C${args.query}\u300D\u7684\u5DE5\u4F5C\u533A\u3002\u53EF\u5C1D\u8BD5 workspace_list \u67E5\u770B\u5168\u90E8\u3002`;
      }
      const head = matches.slice(0, limit);
      const body = head.map(
        (m) => `\xB7 **${m.title}** \u2014 ${m.path}\uFF08${m.sessionCount} \u4E2A\u4F1A\u8BDD\uFF0C\u6700\u8FD1 ${m.updatedAt.slice(0, 10)}\uFF0C\u547D\u4E2D\uFF1A${m.why}\uFF09${m.missingDir ? " \u26A0 \u76EE\u5F55\u5F53\u524D\u4E0D\u5B58\u5728" : ""}`
      ).join("\n");
      const note = matches.length > limit ? `
\uFF08\u5171 ${matches.length} \u4E2A\u5339\u914D\uFF0C\u4EC5\u663E\u793A\u524D ${limit} \u4E2A\uFF09` : "";
      return `\u5339\u914D\u300C${args.query}\u300D\u7684\u5DE5\u4F5C\u533A\uFF1A
${body}${note}

\u63D0\u793A\uFF1A\u53EF\u5728 dsh Web \u7684 Spotlight\uFF08\u2318K / Ctrl+K\uFF09\u4E2D\u76F4\u63A5\u641C\u7D22\u5E76\u6253\u5F00\u3002`;
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
        return "\u5F53\u524D\u6CA1\u6709\u4EFB\u4F55\u5DE5\u4F5C\u533A\u3002\u5728 dsh Web \u4E2D\u4ECE\u67D0\u4E2A\u9879\u76EE\u76EE\u5F55\u5F00\u59CB\u4F1A\u8BDD\u540E\u4F1A\u81EA\u52A8\u521B\u5EFA\u3002";
      }
      const body = entries.slice(0, limit).map(entryLine).join("\n");
      const note = entries.length > limit ? `
\uFF08\u5171 ${entries.length} \u4E2A\u5DE5\u4F5C\u533A\uFF0C\u4EC5\u663E\u793A\u524D ${limit} \u4E2A\uFF09` : "";
      return `\u5171 ${entries.length} \u4E2A\u5DE5\u4F5C\u533A\uFF1A
${body}${note}`;
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
