/**
 * Model-facing tools of dsh-workspace-kit: locate and enumerate workspaces
 * from conversation, so the agent can answer "which workspace / in which
 * directory" and hand back an exact path to open or cd into. Read-only by
 * design.
 *
 * Tool metadata (descriptions/parameters) is English — the model consumes it;
 * output text is bilingual via `L()`.
 *
 * @module dsh-workspace-kit/tools
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { entryLine, findWorkspaces, listWorkspaces, matchFieldLabel } from './util.ts'
import { L } from './locale.ts'

/** Register both workspace tools on `ctx.tools`. */
export function registerWorkspaceTools(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'workspace_find',
    description:
      'Fuzzy-search workspaces (project directories that own dsh sessions) by title or path. ' +
      'Use it to locate which workspace/absolute path holds a project, e.g. when the user asks ' +
      '"which workspace is my pms project in". ' +
      'Returns ranked matches with absolute paths, session counts, and last activity.',
    parameters: {
      query: {
        type: 'string',
        required: true,
        description: 'Title or path keywords to search for, e.g. "pms" or a directory name.',
      },
      limit: {
        type: 'integer',
        description: 'Maximum matches to return (default 8).',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const limit = Math.max(1, Math.min(args.limit ?? 8, 20))
      const matches = await findWorkspaces(ctx.workspaceRegistry, args.query)
      if (matches.length === 0) {
        return L(
          '未找到匹配「{query}」的工作区。可尝试 workspace_list 查看全部。',
          'No workspace matches "{query}". Try workspace_list to see all workspaces.',
          { query: args.query },
        )
      }
      const head = matches.slice(0, limit)
      const body = head.map((m) => {
        const why = matchFieldLabel(m.why)
        const missing = m.missingDir ? L('，目录当前不存在', ', directory currently missing') : ''
        const meta = L(
          '（{count} 个会话，最近 {date}，命中：{why}{missing}）',
          ' ({count} sessions, latest {date}; matched: {why}{missing})',
          { count: m.sessionCount, date: m.updatedAt.slice(0, 10), why, missing },
        )
        return `· **${m.title}** — ${m.path}${meta}`
      }).join('\n')
      const note = matches.length > limit
        ? L('\n（共 {total} 个匹配，仅显示前 {limit} 个）', '\n ({total} matches in total; showing first {limit})', {
          total: matches.length,
          limit,
        })
        : ''
      return L(
        '匹配「{query}」的工作区：\n{body}{note}\n\n提示：可在 dsh Web 的 Spotlight（⌘K / Ctrl+K）中直接搜索并打开。',
        'Workspaces matching "{query}":\n{body}{note}\n\nTip: you can also search and open it from the Spotlight in dsh Web (⌘K / Ctrl+K).',
        { query: args.query, body, note },
      )
    },
  }))

  ctx.tools.register(defineTool({
    name: 'workspace_list',
    description:
      'List every workspace (project directories that own dsh sessions), newest activity first, ' +
      'with absolute paths and session counts. Use it for the full inventory of projects.',
    parameters: {
      limit: {
        type: 'integer',
        description: 'Maximum rows to return (default 20).',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const limit = Math.max(1, Math.min(args.limit ?? 20, 50))
      const entries = await listWorkspaces(ctx.workspaceRegistry)
      if (entries.length === 0) {
        return L(
          '当前没有任何工作区。在 dsh Web 中从某个项目目录开始会话后会自动创建。',
          'No workspaces yet. Start a session from a project directory in dsh Web and one will be created automatically.',
        )
      }
      const body = entries.slice(0, limit).map(entryLine).join('\n')
      const note = entries.length > limit
        ? L('\n（共 {total} 个工作区，仅显示前 {limit} 个）', '\n ({total} workspaces in total; showing first {limit})', {
          total: entries.length,
          limit,
        })
        : ''
      return L('共 {count} 个工作区：\n{body}{note}', '{count} workspaces in total:\n{body}{note}', {
        count: entries.length,
        body,
        note,
      })
    },
  }))
}
