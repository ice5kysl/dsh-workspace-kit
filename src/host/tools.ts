/**
 * Model-facing tools of dsh-workspace-kit: locate and enumerate workspaces
 * from conversation, so the agent can answer "哪个工作区 / 在哪个目录" and
 * hand back an exact path to open or cd into. Read-only by design.
 *
 * @module dsh-workspace-kit/tools
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { entryLine, findWorkspaces, listWorkspaces } from './util.ts'

/** Register both workspace tools on `ctx.tools`. */
export function registerWorkspaceTools(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'workspace_find',
    description:
      'Fuzzy-search workspaces (project directories that own dsh sessions) by title or path. ' +
      'Use it to locate which workspace/absolute path holds a project, e.g. 找一下 pms 那个工作区. ' +
      'Returns ranked matches with absolute paths, session counts, and last activity.',
    parameters: {
      query: {
        type: 'string',
        required: true,
        description: 'Title or path keywords, e.g. "pms", "LoopDSH", "drum".',
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
        return `未找到匹配「${args.query}」的工作区。可尝试 workspace_list 查看全部。`
      }
      const head = matches.slice(0, limit)
      const body = head.map((m) =>
        `· **${m.title}** — ${m.path}（${m.sessionCount} 个会话，最近 ${m.updatedAt.slice(0, 10)}，命中：${m.why}）${m.missingDir ? ' ⚠ 目录当前不存在' : ''}`
      ).join('\n')
      const note = matches.length > limit ? `\n（共 ${matches.length} 个匹配，仅显示前 ${limit} 个）` : ''
      return `匹配「${args.query}」的工作区：\n${body}${note}\n\n提示：可在 dsh Web 的 Spotlight（⌘K / Ctrl+K）中直接搜索并打开。`
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
        return '当前没有任何工作区。在 dsh Web 中从某个项目目录开始会话后会自动创建。'
      }
      const body = entries.slice(0, limit).map(entryLine).join('\n')
      const note = entries.length > limit ? `\n（共 ${entries.length} 个工作区，仅显示前 ${limit} 个）` : ''
      return `共 ${entries.length} 个工作区：\n${body}${note}`
    },
  }))
}
