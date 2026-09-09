/**
 * dsh-workspace-kit — browser (client) face.
 *
 * Registrations, all official seams, sharing one store:
 *
 * 1. `sidebar.workspaces` (single/root) — the plugin workspace browser
 *    (archive folding, drag reorder, icons, search incl. content hits).
 *    Registered at priority -1 so it shadows the shipped browser; the footer
 *    toggle unregisters it on the fly to fall back to the official browser.
 * 2. `sidebar.footer.action` (list/root) — always-visible toggle between the
 *    plugin sidebar and the official sidebar (choice persisted).
 * 3. `shell.overlay` (list/root) — ⌘K Spotlight palette + styled dialog host.
 *
 * The same Loader entry carries the host face (`lib/index.js`), so this
 * module ships as the package's `./client` export and only ever runs in the
 * browser cordis tree.
 *
 * @module dsh-workspace-kit/client
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ISessions, SessionSearchResultItem } from '@deepseek-ai/dsh-api-session-controller/client'
import type { IWorkspaces, WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { createArchiveStore } from './archive-store.ts'
import { DialogHost, requestConfirm, requestPrompt } from './dialogs.tsx'
import { L } from './locale.ts'
import { SidebarToggle } from './SidebarToggle.tsx'
import { SpotlightPalette } from './Spotlight.tsx'
import { WorkspaceSidebar } from './WorkspaceSidebar.tsx'

export const name = 'workspace-kit'
export const inject = ['slots', 'sessions', 'workspaces', 'uiWorkspace'] as const

const PERSIST_KEY = 'dsh.workspace-kit.archive.v1'

/** Minimal service faces this plugin consumes (typed locally at the boundary). */
interface SlotsLike {
  /** Run `cb` for the lifetime of the slot declaration (re-runs after redeclare). */
  inject(slot: string, cb: () => unknown): void
  /** Register one component into a declared slot. Returns a disposer. */
  register(options: Record<string, unknown>, component: unknown): () => void
}

interface ClientCtxLike {
  logger(name: string): { info(...parts: unknown[]): void }
  effect(fn: () => (() => void) | void, name?: string): void
  slots: SlotsLike
  sessions: ISessions
  workspaces: IWorkspaces
  uiWorkspace: UiWorkspaceLike
}

/** Cross-controller navigation/directory capability (dsh-client-ui-workspace). */
interface UiWorkspaceLike {
  /** Start the official New Session flow and navigate to its Session. */
  startSession(workspaceId?: WorkspaceId): void
  /** Open the host-native directory picker; null when cancelled. */
  pickDirectory(): Promise<string | null>
}

/** Persisted sidebar choice (official vs plugin), read once at boot. */
function readPersistedOfficialSidebar(): boolean {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PERSIST_KEY) : null
    if (!raw) return false
    return Boolean(JSON.parse(raw).officialSidebar)
  } catch {
    return false
  }
}

function alertError(prefix: string, error: unknown): void {
  void requestConfirm({ title: prefix, message: String(error), okLabel: L('知道了', 'Got it') })
}

export function apply(raw: Context): void {
  const ctx = raw as unknown as ClientCtxLike
  const log = ctx.logger('workspace-kit:client')
  const store = createArchiveStore()

  // Shared navigation actions (same pattern as the shipped browser's inject).
  const openSession = (sessionId: SessionId): void => {
    ctx.sessions.open(sessionId)
  }
  const startSession = (workspaceId?: WorkspaceId): void => {
    ctx.uiWorkspace.startSession(workspaceId)
  }
  const renameSession = async (sessionId: SessionId, initial?: string): Promise<void> => {
    const title = await requestPrompt({ title: L('重命名会话', 'Rename session'), initial, placeholder: L('输入新名称', 'Enter a new name') })
    if (title == null) return
    const session = ctx.sessions.binding(sessionId)?.session
    if (!session) {
      alertError(L('重命名失败', 'Rename failed'), new Error(`unknown session "${sessionId}"`))
      return
    }
    const result = await session.rename(title)
    if (!result.ok) alertError(L('重命名失败', 'Rename failed'), new Error(result.error.message))
  }
  const forkSession = (sessionId: SessionId): void => {
    ctx.sessions.fork({ sessionId, increaseTitle: true })
      .then((childId) => ctx.sessions.open(childId))
      .catch((error: unknown) => log.info('fork failed', String(error)))
  }
  // Archive a session into the host's durable (irreversible) archive set.
  const archiveSession = (sessionId: SessionId): void => {
    void (async () => {
      const ok = await requestConfirm({
        title: L('归档会话', 'Archive session'),
        message: L(
          '归档后该会话会从工作区分组、侧栏和所有列表隐藏（官方归档集，不可逆，暂无恢复入口；仍可通过搜索打开）。确定归档？',
          'Archiving hides this session from workspace groups, the sidebar, and every list (official archive set — irreversible, no restore entry yet; it stays reachable via search). Archive now?',
        ),
        okLabel: L('归档', 'Archive'),
      })
      if (!ok) return
      ctx.workspaces.archiveSession(sessionId)
        .catch((error: unknown) => log.info('archive session failed', String(error)))
    })()
  }
  // 新建工作区：系统目录选择器 → 注册 → 打开该工作区会话。
  const addWorkspace = (): void => {
    void (async () => {
      try {
        const path = await ctx.uiWorkspace.pickDirectory()
        if (!path) return
        const view = await ctx.workspaces.create({ path })
        startSession(view.workspaceId)
      } catch (error) {
        alertError(L('新建工作区失败', 'Failed to create workspace'), error)
      }
    })()
  }
  const renameWorkspace = async (workspaceId: WorkspaceId, initial?: string): Promise<void> => {
    const title = await requestPrompt({ title: L('重命名工作区', 'Rename workspace'), initial, placeholder: L('输入新名称', 'Enter a new name') })
    if (title == null) return
    try {
      await ctx.workspaces.rename(workspaceId, title)
    } catch (error) {
      alertError(L('重命名失败', 'Rename failed'), error)
    }
  }
  const deleteWorkspace = (workspaceId: WorkspaceId): void => {
    void (async () => {
      const ok = await requestConfirm({
        title: L('删除工作区注册', 'Remove workspace registration'),
        message: L(
          '项目目录与历史会话都会保留（会话回到未归组）。确定删除该工作区注册？',
          'The project directory and past sessions are kept (sessions return to ungrouped). Remove this workspace registration?',
        ),
        okLabel: L('删除', 'Remove'),
      })
      if (!ok) return
      ctx.workspaces.delete(workspaceId)
        .catch((error: unknown) => alertError(L('删除失败', 'Remove failed'), error))
    })()
  }
  // 拖拽排序：持久化到官方 registry 顺序（等价内置"手动排序"）。
  const reorderWorkspace = (workspaceId: WorkspaceId, beforeWorkspaceId?: WorkspaceId): void => {
    ctx.workspaces.insertBefore(workspaceId, beforeWorkspaceId)
      .catch((error: unknown) => alertError(L('排序失败', 'Reorder failed'), error))
  }
  const reorderSession = (workspaceId: WorkspaceId, sessionId: SessionId, beforeSessionId?: SessionId): void => {
    ctx.workspaces.insertSessionBefore(workspaceId, sessionId, beforeSessionId)
      .catch((error: unknown) => alertError(L('排序失败', 'Reorder failed'), error))
  }
  // 会话消息全文搜索（官方 host 内容索引）。
  const searchContent = async (query: string, signal: AbortSignal): Promise<SessionSearchResultItem[]> => {
    const result = await ctx.sessions.search(query, signal)
    if (!result.ok) throw new Error(result.error.message)
    return result.value.items
  }

  const sidebarInject = () => ({
    openSession,
    startSession,
    renameSession,
    forkSession,
    addWorkspace,
    renameWorkspace,
    deleteWorkspace,
    archiveSession,
    reorderWorkspace,
    reorderSession,
    searchContent,
  })

  // ---- plugin sidebar occupant: register only while the plugin browser is
  // the chosen one (priority -1 shadows the shipped browser's default 0). ----
  let officialSidebar = readPersistedOfficialSidebar()
  let oursReg: (() => void) | null = null

  const registerOurs = (): void => {
    if (oursReg) return
    oursReg = ctx.slots.register(
      { name: 'sidebar.workspaces', priority: -1, store, inject: sidebarInject },
      WorkspaceSidebar,
    )
  }
  const dropOurs = (): void => {
    if (oursReg) {
      oursReg()
      oursReg = null
    }
  }
  const syncSidebar = (): void => {
    if (officialSidebar) dropOurs()
    else registerOurs()
  }

  // Own the registration lifecycle: re-runs whenever the sidebar slot is
  // redeclared, and never double-registers with the live toggle path.
  ctx.slots.inject('sidebar.workspaces', () => {
    syncSidebar()
    return () => {
      oursReg?.()
      oursReg = null
    }
  })

  // Footer toggle + cross-component event → instant switch.
  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register(
      { name: 'sidebar.footer.action', id: 'workspace-kit.sidebar-toggle', order: 0, store },
      SidebarToggle,
    ),
  )

  ctx.effect(() => {
    const onMode = (event: Event): void => {
      const detail = (event as CustomEvent<{ official?: boolean }>).detail
      const next = Boolean(detail?.official)
      if (next === officialSidebar) return
      officialSidebar = next
      syncSidebar()
      log.info(`sidebar: ${officialSidebar ? 'official' : 'plugin'}`)
    }
    window.addEventListener('dsh-workspace-kit:sidebar-mode', onMode)
    return () => window.removeEventListener('dsh-workspace-kit:sidebar-mode', onMode)
  }, 'workspace-kit: sidebar-mode')

  // Spotlight palette + styled dialog host (additive rows in the overlay).
  ctx.slots.inject('shell.overlay', () => {
    const disposePalette = ctx.slots.register(
      {
        name: 'shell.overlay',
        id: 'workspace-kit.spotlight',
        order: 100,
        store,
        inject: () => ({ openWorkspace: startSession, openSession, archiveSession }),
      },
      SpotlightPalette,
    )
    const disposeDialogs = ctx.slots.register(
      { name: 'shell.overlay', id: 'workspace-kit.dialogs', order: 200 },
      DialogHost,
    )
    return () => {
      disposePalette()
      disposeDialogs()
    }
  })

  log.info(`Workspace kit client ready (sidebar: ${officialSidebar ? 'official' : 'plugin'})`)
}
