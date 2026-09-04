/**
 * dsh-workspace-kit — single Loader entry (package name `dsh-workspace-kit`).
 *
 * Host face (this module): provides the workspace locate/enumerate capability
 * as model tools (`workspace_find`, `workspace_list`) and human slash
 * commands (`/workspace-find`, `/workspace-list`). All three services are
 * declared in `inject`, so cordis activates this entry only once they are
 * live. Tools and commands are read-only by design — the soft archive/restore
 * view state belongs to the browser client face, which is the surface the GUI
 * user actually declutters.
 *
 * Browser face (`./client`): the archive + Spotlight UI (see src/client).
 *
 * @module dsh-workspace-kit
 */

import type { Context } from '@deepseek-ai/cordis'
import { registerWorkspaceCommands } from './commands.ts'
import { registerWorkspaceTools } from './tools.ts'

export const name = 'workspace-kit'
export const inject = ['workspaceRegistry', 'tools', 'commands'] as const

export function apply(ctx: Context): void {
  const log = ctx.logger('workspace-kit')
  log.info('workspace-kit loaded')

  registerWorkspaceTools(ctx)
  log.info('workspace tools registered (workspace_find, workspace_list)')

  registerWorkspaceCommands(ctx, ctx.commands)
  log.info('workspace commands registered (/workspace-find, /workspace-list)')
}
