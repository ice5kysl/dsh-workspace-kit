/**
 * Human slash-commands of dsh-workspace-kit (web profile): quick
 * keyboard-driven lookup of workspaces from the composer ("/" menu fuzzy
 * matches command names). Read-only; archive/restore stays in the GUI client
 * where the soft-archive view state lives.
 *
 * @module dsh-workspace-kit/commands
 */

import type { Context } from '@deepseek-ai/cordis'
import type { CommandRuntime } from '@deepseek-ai/dsh-commands'
import { entryLine, findWorkspaces, listWorkspaces } from './util.ts'

const MAX_CANDIDATES = 12

/** Register the slash commands on `ctx.commands`. */
export function registerWorkspaceCommands(ctx: Context, commands: CommandRuntime): void {
  commands.register({
    name: 'workspace-find',
    description: '按标题/路径模糊搜索并定位工作区',
    input: { hint: '关键词，如 pms / LoopDSH' },
    async handler({ rawInput }) {
      const query = rawInput.trim()
      if (!query) {
        return { kind: 'error', text: '用法：/workspace-find <关键词>' }
      }
      const matches = await findWorkspaces(ctx.workspaceRegistry, query)
      if (matches.length === 0) {
        return { kind: 'error', text: `没有匹配「${query}」的工作区。` }
      }
      const body = matches.slice(0, MAX_CANDIDATES).map((m) => entryLine(m)).join('\n')
      const note = matches.length > MAX_CANDIDATES ? `\n…还有 ${matches.length - MAX_CANDIDATES} 个匹配` : ''
      return {
        kind: 'success',
        text: `匹配「${query}」的工作区：\n${body}${note}\n\n完整列表：/workspace-list`,
      }
    },
  })

  commands.register({
    name: 'workspace-list',
    description: '列出全部工作区（按最近活动排序）',
    async handler() {
      const entries = await listWorkspaces(ctx.workspaceRegistry)
      if (entries.length === 0) {
        return { kind: 'success', text: '当前没有任何工作区。' }
      }
      const body = entries.slice(0, MAX_CANDIDATES).map(entryLine).join('\n')
      const note = entries.length > MAX_CANDIDATES
        ? `\n…还有 ${entries.length - MAX_CANDIDATES} 个工作区`
        : ''
      return { kind: 'success', text: `共 ${entries.length} 个工作区：\n${body}${note}` }
    },
  })
}
