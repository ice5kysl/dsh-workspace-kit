/**
 * Human slash-commands of dsh-workspace-kit (web profile): quick
 * keyboard-driven lookup of workspaces from the composer ("/" menu fuzzy
 * matches command names). Read-only; archive/restore stays in the GUI client
 * where the soft-archive view state lives.
 *
 * Command copy is bilingual via `L()` (resolved once per process).
 *
 * @module dsh-workspace-kit/commands
 */

import type { Context } from '@deepseek-ai/cordis'
import type { CommandRuntime } from '@deepseek-ai/dsh-commands'
import { entryLine, findWorkspaces, listWorkspaces } from './util.ts'
import { L } from './locale.ts'

const MAX_CANDIDATES = 12

/** Register the slash commands on `ctx.commands`. */
export function registerWorkspaceCommands(ctx: Context, commands: CommandRuntime): void {
  commands.register({
    name: 'workspace-find',
    description: L('按标题/路径模糊搜索并定位工作区', 'Fuzzy-search workspaces by title/path and locate one'),
    input: { hint: L('关键词，如 pms / demo', 'Keywords, e.g. pms / demo') },
    async handler({ rawInput }) {
      const query = rawInput.trim()
      if (!query) {
        return { kind: 'error', text: L('用法：/workspace-find <关键词>', 'Usage: /workspace-find <keywords>') }
      }
      const matches = await findWorkspaces(ctx.workspaceRegistry, query)
      if (matches.length === 0) {
        return { kind: 'error', text: L('没有匹配「{query}」的工作区。', 'No workspace matches "{query}".', { query }) }
      }
      const body = matches.slice(0, MAX_CANDIDATES).map((m) => entryLine(m)).join('\n')
      const note = matches.length > MAX_CANDIDATES
        ? L('\n…还有 {rest} 个匹配', '\n…plus {rest} more matches', { rest: matches.length - MAX_CANDIDATES })
        : ''
      return {
        kind: 'success',
        text: L(
          '匹配「{query}」的工作区：\n{body}{note}\n\n完整列表：/workspace-list',
          'Workspaces matching "{query}":\n{body}{note}\n\nFull list: /workspace-list',
          { query, body, note },
        ),
      }
    },
  })

  commands.register({
    name: 'workspace-list',
    description: L('列出全部工作区（按最近活动排序）', 'List all workspaces (newest activity first)'),
    async handler() {
      const entries = await listWorkspaces(ctx.workspaceRegistry)
      if (entries.length === 0) {
        return { kind: 'success', text: L('当前没有任何工作区。', 'No workspaces yet.') }
      }
      const body = entries.slice(0, MAX_CANDIDATES).map(entryLine).join('\n')
      const note = entries.length > MAX_CANDIDATES
        ? L('\n…还有 {rest} 个工作区', '\n…plus {rest} more workspaces', { rest: entries.length - MAX_CANDIDATES })
        : ''
      return {
        kind: 'success',
        text: L('共 {count} 个工作区：\n{body}{note}', '{count} workspaces in total:\n{body}{note}', {
          count: entries.length,
          body,
          note,
        }),
      }
    },
  })
}
