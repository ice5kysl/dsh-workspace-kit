/**
 * Workspace sidebar (browser face of dsh-workspace-kit).
 *
 * Registers as a LOWER-priority occupant of the official `sidebar.workspaces`
 * slot, replacing the shipped browser so that soft-archived workspaces can be
 * folded out of the sidebar:
 *
 * - 「工作区」section lists non-archived workspaces; rows expand to sessions
 *   (click opens).  Drag a workspace row to reorder (persisted via
 *   `insertBefore`, like the shipped Manual mode); drag a session inside its
 *   workspace to reorder (persisted via `insertSessionBefore`) — after the
 *   first manual move that workspace keeps its manual order.
 * - 「已归档 (N)」 collapsed section: archived workspaces with 恢复/打开/➕.
 * - 未归组 sessions in their own collapsible section.
 * - Rail state (`wide=false`) renders a compact icon column.
 *
 * v1 scope (vs the shipped browser): no drag between workspaces for
 * sessions, no flat "all sessions" view toggle, no message-content search;
 * rename/delete/archive use confirm/prompt instead of styled dialogs.
 *
 * @module dsh-workspace-kit/workspace-sidebar
 */

import { useEffect, useMemo, useState, type CSSProperties, type DragEvent } from 'react'
import type { SessionId, SessionSearchResultItem, WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import type { ArchiveState, WorkspaceAppearance } from './archive-store.ts'
import { L } from './locale.ts'

/** Selector-shaped hook props provided by the renderer. */
export interface WorkspaceSidebarProps {
  /** Owner share: wide content vs 56px rail. */
  wide: boolean
  /** Owner share: request the shell to flip the sidebar to wide. */
  expandSidebar: () => void
  useSessions: <T>(selector: (state: any) => T) => T
  useWorkspaces: <T>(selector: (state: any) => T) => T
  useStore: <T>(selector: (state: ArchiveState) => T) => T
  actions: {
    archive(workspaceId: string, at: string): void
    restore(workspaceId: string): void
    setAppearance(workspaceId: string, appearance: WorkspaceAppearance | null): void
  }
  openSession(sessionId: SessionId): void
  startSession(workspaceId?: WorkspaceId): void
  renameSession(sessionId: SessionId, initial?: string): Promise<void>
  forkSession(sessionId: SessionId): void
  /** 新建工作区：打开系统目录选择器并注册选中目录。 */
  addWorkspace(): void
  /** 重命名一个工作区。 */
  renameWorkspace(workspaceId: WorkspaceId, initial?: string): void
  /** 删除工作区注册（目录与会话保留，会话回到未归组）。 */
  deleteWorkspace(workspaceId: WorkspaceId): void
  /** 归档会话（官方持久归档集，不可逆）。 */
  archiveSession(sessionId: SessionId): void
  /** 持久化重排工作区（拖拽）。beforeId 省略 = 追加到末尾。 */
  reorderWorkspace(workspaceId: WorkspaceId, beforeWorkspaceId?: WorkspaceId): void
  /** 持久化重排某工作区内的会话（拖拽）。beforeId 省略 = 追加到末尾。 */
  reorderSession(workspaceId: WorkspaceId, sessionId: SessionId, beforeSessionId?: SessionId): void
  /** 会话消息全文搜索（host 内容索引）。 */
  searchContent(query: string, signal: AbortSignal): Promise<SessionSearchResultItem[]>
}

interface SessionRowData {
  readonly id: SessionId
  readonly title: string
  readonly updatedAt: number
  readonly running: boolean
}

interface WsRowData {
  readonly id: WorkspaceId
  readonly title: string
  readonly path: string
  readonly sessionCount: number
  readonly archived: boolean
  /** Sessions in durable account order (registry order, filtered). */
  readonly sessions: readonly SessionRowData[]
}

type DragState =
  | { readonly kind: 'workspace'; readonly id: string }
  | { readonly kind: 'session'; readonly id: string; readonly wsId: string }
  | null

/** Emoji choices for the per-workspace icon picker. */
const EMOJI_CHOICES = [
  '📁','🗂️','📂','⭐','🔥','🚀','🧪','⚙️','📦','📄','🎯','🧠','💡','🛠️','🌐','🗄️',
  '🧩','🎨','📊','📈','🤖','👾','⚡','🎛️','🕹️','🌱','🏗️','📚','💰','🎮','🗺️','🧊',
] as const

/** Color choices (CSS hex) for the per-workspace accent picker. */
const COLOR_CHOICES = [
  '#2d66f7', '#7c3aed', '#0e9f6e', '#d97706', '#dc2626',
  '#db2777', '#0891b2', '#52525b', '#8a93a6',
] as const

function byUpdatedDesc(a: SessionRowData, b: SessionRowData): number {
  return a.updatedAt !== b.updatedAt ? (a.updatedAt > b.updatedAt ? -1 : 1) : 0
}

/** Workspaces + children session rows. Workspace rows keep registry order;
 *  per-workspace session lists keep the durable account order. */
function collectRows(
  workspacesState: any,
  sessionsState: any,
  archived: Readonly<Record<string, { at: string }>>,
): { active: WsRowData[]; archivedWs: WsRowData[]; ungrouped: SessionRowData[] } {
  const byId: Record<string, any> = sessionsState?.byId ?? {}
  const sessionIds: readonly string[] = Array.isArray(sessionsState?.ids) ? sessionsState.ids : []
  const items: readonly any[] = workspacesState?.items ?? []
  const builtinArchived = new Set<string>(workspacesState?.archivedSessionIds ?? [])

  const toSession = (id: string): SessionRowData | undefined => {
    const s = byId[id]
    if (!s || s.origin === 'subagent' || s.blank) return undefined
    return {
      id: id as SessionId,
      title: s.displayTitle ?? s.title ?? id,
      updatedAt: s.updatedAt ?? 0,
      running: Boolean(s.running),
    }
  }

  const accounted = new Set<string>()
  const byWorkspace = new Map<string, SessionRowData[]>()
  for (const item of items) {
    const wsId = String(item.workspaceId)
    const list: SessionRowData[] = []
    for (const sid of item.sessionIds ?? []) {
      accounted.add(String(sid))
      if (builtinArchived.has(String(sid))) continue // official archive: hidden everywhere
      const row = toSession(String(sid))
      if (row) list.push(row)
    }
    byWorkspace.set(wsId, list) // account order
  }

  const build = (item: any): WsRowData => {
    const wsId = String(item.workspaceId)
    const sessions = byWorkspace.get(wsId) ?? []
    return {
      id: item.workspaceId as WorkspaceId,
      title: item.title,
      path: item.path,
      sessionCount: sessions.length,
      archived: Boolean(archived[wsId]),
      sessions,
    }
  }

  const active: WsRowData[] = []
  const archivedWs: WsRowData[] = []
  for (const item of items) {
    const data = build(item)
    if (data.archived) archivedWs.push(data)
    else active.push(data)
  }

  const ungrouped: SessionRowData[] = []
  for (const id of sessionIds) {
    if (accounted.has(String(id)) || builtinArchived.has(String(id))) continue
    const row = toSession(String(id))
    if (row) ungrouped.push(row)
  }
  ungrouped.sort(byUpdatedDesc)
  return { active, archivedWs, ungrouped }
}

/** All visible sessions across active workspaces + ungrouped (recency). */
function collectFlatSessions(
  workspacesState: any,
  sessionsState: any,
  archived: Readonly<Record<string, { at: string }>>,
): SessionRowData[] {
  const byId: Record<string, any> = sessionsState?.byId ?? {}
  const sessionIds: readonly string[] = Array.isArray(sessionsState?.ids) ? sessionsState.ids : []
  const items: readonly any[] = workspacesState?.items ?? []
  const builtinArchived = new Set<string>(workspacesState?.archivedSessionIds ?? [])

  const toRow = (id: string): SessionRowData | undefined => {
    const s = byId[id]
    if (!s || s.origin === 'subagent' || s.blank) return undefined
    return {
      id: id as SessionId,
      title: s.displayTitle ?? s.title ?? id,
      updatedAt: s.updatedAt ?? 0,
      running: Boolean(s.running),
    }
  }

  const owned = new Set<string>()
  const out: SessionRowData[] = []
  for (const item of items) {
    if (archived[String(item.workspaceId)]) continue // soft-archived workspace folded away
    for (const sid of item.sessionIds ?? []) {
      owned.add(String(sid))
      if (builtinArchived.has(String(sid))) continue
      const row = toRow(String(sid))
      if (row) out.push(row)
    }
  }
  for (const id of sessionIds) {
    if (owned.has(String(id)) || builtinArchived.has(String(id))) continue
    const row = toRow(String(id))
    if (row) out.push(row)
  }
  out.sort(byUpdatedDesc)
  return out
}

/** One sidebar search hit (metadata-level: title / path / session title). */
interface SearchHit {
  readonly kind: 'workspace' | 'session'
  readonly id: string
  readonly title: string
  readonly sub: string
}

function buildSearchHits(
  workspacesState: any,
  sessionsState: any,
  archived: Readonly<Record<string, { at: string }>>,
  query: string,
): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return []
  const terms = q.split(/\s+/).filter(Boolean)
  const match = (text: string): boolean => {
    const t = text.toLowerCase()
    return terms.every((term) => t.includes(term))
  }

  const byId: Record<string, any> = sessionsState?.byId ?? {}
  const sessionIds: readonly string[] = Array.isArray(sessionsState?.ids) ? sessionsState.ids : []
  const items: readonly any[] = workspacesState?.items ?? []
  const builtinArchived = new Set<string>(workspacesState?.archivedSessionIds ?? [])

  const hits: SearchHit[] = []
  const wsBySession = new Map<string, string>()
  const wsTitleBySession = new Map<string, string>()
  const archivedWsIds = new Set<string>()
  for (const item of items) {
    const wsId = String(item.workspaceId)
    if (archived[wsId]) archivedWsIds.add(wsId)
    else if (match(`${item.title} ${item.path}`)) {
      hits.push({ kind: 'workspace', id: wsId, title: item.title, sub: item.path })
    }
    for (const sid of item.sessionIds ?? []) {
      wsBySession.set(String(sid), wsId)
      wsTitleBySession.set(String(sid), item.title)
    }
  }

  for (const id of sessionIds) {
    const s = byId[id]
    if (!s || s.origin === 'subagent' || s.blank) continue
    if (builtinArchived.has(String(id))) continue
    const wsId = wsBySession.get(String(id))
    if (wsId && archivedWsIds.has(wsId)) continue // archived workspace folded away
    const title = s.displayTitle ?? s.title ?? String(id)
    if (!match(`${title} ${s.cwd ?? ''}`)) continue
    hits.push({
      kind: 'session',
      id: String(id),
      title,
      sub: wsId ? (wsTitleBySession.get(String(id)) ?? '') : (s.cwd ?? L('未归组', 'Ungrouped')),
    })
  }
  return hits.slice(0, 40)
}

export function WorkspaceSidebar(props: WorkspaceSidebarProps): JSX.Element {
  const {
    wide, expandSidebar, useSessions, useWorkspaces, useStore, actions,
    openSession, startSession, renameSession, forkSession,
    addWorkspace, renameWorkspace, deleteWorkspace, archiveSession,
    reorderWorkspace, reorderSession, searchContent,
  } = props
  const archived = useStore((state) => state.archived ?? {})
  const appearanceMap = useStore((state) => state.appearance ?? {})
  const sessionsState = typeof useSessions === 'function' ? useSessions((state) => state) : undefined
  const workspacesState = typeof useWorkspaces === 'function' ? useWorkspaces((state) => state) : undefined

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [ungroupedOpen, setUngroupedOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  // Session ordering: 'updated' (recency) or 'manual' (durable account order).
  const [sortMode, setSortMode] = useState<'updated' | 'manual'>('updated')
  const [contentHits, setContentHits] = useState<SessionSearchResultItem[]>([])
  const [contentLoading, setContentLoading] = useState(false)
  const [drag, setDrag] = useState<DragState>(null)
  const [over, setOver] = useState<string | null>(null)
  const [pickerWs, setPickerWs] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped')

  const { active, archivedWs, ungrouped } = useMemo(
    () => collectRows(workspacesState, sessionsState, archived),
    [workspacesState, sessionsState, archived],
  )

  // Default session view = recency; after the first manual move a workspace
  // shows its persisted account order.
  const displaySessionsByWs = useMemo(() => {
    const map: Record<string, readonly SessionRowData[]> = {}
    for (const ws of [...active, ...archivedWs]) {
      const key = String(ws.id)
      map[key] = sortMode === 'manual'
        ? ws.sessions
        : [...ws.sessions].sort(byUpdatedDesc)
    }
    return map
  }, [active, archivedWs, sortMode])

  const flatSessions = useMemo(
    () => collectFlatSessions(workspacesState, sessionsState, archived),
    [workspacesState, sessionsState, archived],
  )

  const searchHits = useMemo(
    () => buildSearchHits(workspacesState, sessionsState, archived, searchQ),
    [workspacesState, sessionsState, archived, searchQ],
  )
  const searching = searchOpen && searchQ.trim().length > 0

  // Debounced message-content search (host index) while the box is open.
  useEffect(() => {
    if (!searchOpen) {
      setContentHits([])
      setContentLoading(false)
      return
    }
    const q = searchQ.trim()
    if (q.length < 2) {
      setContentHits([])
      setContentLoading(false)
      return
    }
    const ac = new AbortController()
    setContentLoading(true)
    const timer = setTimeout(() => {
      searchContent(q, ac.signal)
        .then((items) => {
          if (!ac.signal.aborted) {
            setContentHits(items)
            setContentLoading(false)
          }
        })
        .catch(() => {
          if (!ac.signal.aborted) {
            setContentHits([])
            setContentLoading(false)
          }
        })
    }, 250)
    return () => {
      clearTimeout(timer)
      ac.abort()
    }
  }, [searchOpen, searchQ, searchContent])

  const toggle = (id: string): void =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  /** Dispatch to the Spotlight palette (same plugin) to open. */
  const openSpotlight = (): void => {
    window.dispatchEvent(new CustomEvent('dsh-workspace-kit:open'))
    if (!wide) expandSidebar()
  }

  // ---- drag & drop (HTML5; reorder persists through the official verbs) ----
  const applyAppearance = (wsId: string, patch: Partial<WorkspaceAppearance> | null): void => {
    actions.setAppearance(wsId, patch === null ? null : { ...(appearanceMap[wsId] ?? {}), ...patch })
  }

  const stop = (e: DragEvent): void => e.preventDefault()

  const onWsDrop = (targetId: WorkspaceId | undefined) => (e: DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    const d = drag
    setDrag(null)
    setOver(null)
    if (!d || d.kind !== 'workspace' || d.id === targetId) return
    reorderWorkspace(d.id as WorkspaceId, targetId)
  }

  const onSessionDrop = (wsId: WorkspaceId, targetId: SessionId | undefined) => (e: DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    const d = drag
    setDrag(null)
    setOver(null)
    if (!d || d.kind !== 'session' || d.wsId !== String(wsId) || d.id === targetId) return
    setSortMode('manual')
    reorderSession(wsId, d.id as SessionId, targetId)
  }

  if (!wide) {
    return (
      <div style={styles.rail}>
        <button style={styles.railButton} title={L('Spotlight 搜索（⌘K）', 'Spotlight search (⌘K)')} onClick={openSpotlight}>⌘</button>
        <button
          style={styles.railButton}
          title={L('新建会话', 'New session')}
          onClick={() => {
            startSession()
            expandSidebar()
          }}
        >
          +
        </button>
        <button style={styles.railButton} title={L('展开侧栏', 'Expand sidebar')} onClick={expandSidebar}>»</button>
      </div>
    )
  }

  const renderSessions = (wsId: WorkspaceId | undefined, sessions: readonly SessionRowData[]): JSX.Element[] =>
    sessions.map((s) => {
      const dragKey = wsId ? `s:${wsId}:${s.id}` : `s:${s.id}`
      return (
        <div
          key={dragKey}
          style={{
            ...styles.sessionRow,
            ...(drag && drag.kind === 'session' && drag.id === String(s.id) ? styles.rowDragging : {}),
            ...(over === dragKey ? styles.rowDropOver : {}),
          }}
          title={s.title}
          draggable={wsId !== undefined}
          onMouseEnter={() => setHovered(dragKey)}
          onMouseDown={(e) => {
            e.stopPropagation()
            openSession(s.id)
          }}
          onDragStart={(e) => {
            if (wsId === undefined) return
            e.stopPropagation()
            setDrag({ kind: 'session', id: String(s.id), wsId: String(wsId) })
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragOver={(e) => {
            if (drag?.kind === 'session' && drag.wsId === String(wsId) && drag.id !== String(s.id)) {
              stop(e)
              setOver(dragKey)
            }
          }}
          onDragLeave={() => setOver((v) => (v === dragKey ? null : v))}
          onDrop={wsId ? onSessionDrop(wsId, s.id) : undefined}
          onDragEnd={() => {
            setDrag(null)
            setOver(null)
          }}
        >
          <span style={{ ...styles.dot, ...(s.running ? styles.dotRunning : {}) }} />
          <span style={styles.sessionTitle}>{s.title}</span>
          <span
            style={{ ...styles.sessionActions, display: hovered === dragKey ? 'flex' : 'none' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button style={styles.miniButton} title={L('重命名', 'Rename')} onClick={(e) => { e.stopPropagation(); void renameSession(s.id, s.title) }}>✎</button>
            <button style={styles.miniButton} title={L('复制会话（fork）', 'Duplicate session (fork)')} onClick={(e) => { e.stopPropagation(); forkSession(s.id) }}>⧉</button>
            <button style={styles.miniButton} title={L('归档会话（不可逆，仍可从搜索打开）', 'Archive session (irreversible, still searchable)')} onClick={(e) => { e.stopPropagation(); archiveSession(s.id) }}>{L('归档', 'Archive')}</button>
          </span>
        </div>
      )
    })

  const renderWsRow = (ws: WsRowData, draggable: boolean): JSX.Element => {
    const wsKey = `w:${ws.id}`
    const isOpen = Boolean(expanded[wsKey])
    const sessions = displaySessionsByWs[String(ws.id)] ?? []
    const app = appearanceMap[String(ws.id)] ?? {}
    const picking = pickerWs === String(ws.id)
    return (
      <div key={wsKey}>
        <div
          style={{
            ...styles.wsRow,
            ...(drag && drag.kind === 'workspace' && drag.id === String(ws.id) ? styles.rowDragging : {}),
            ...(over === wsKey ? styles.rowDropOver : {}),
          }}
          draggable={draggable}
          onMouseEnter={() => setHovered(wsKey)}
          onMouseDown={(e) => {
            e.stopPropagation()
            toggle(wsKey)
          }}
          onDragStart={(e) => {
            if (!draggable) return
            e.stopPropagation()
            setDrag({ kind: 'workspace', id: String(ws.id) })
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragOver={(e) => {
            if (draggable && drag?.kind === 'workspace' && drag.id !== String(ws.id)) {
              stop(e)
              setOver(wsKey)
            }
          }}
          onDragLeave={() => setOver((v) => (v === wsKey ? null : v))}
          onDrop={draggable ? onWsDrop(ws.id) : undefined}
          onDragEnd={() => {
            setDrag(null)
            setOver(null)
          }}
        >
          {(app.icon || app.color) && (
            <span
              style={styles.wsIconSlot}
              onMouseDown={(e) => {
                e.stopPropagation()
                setPickerWs(picking ? null : String(ws.id))
              }}
              title={L('点击修改图标 / 颜色', 'Click to change icon / color')}
            >
              {app.icon ? (
                <span style={styles.wsIconText}>{app.icon}</span>
              ) : (
                <span style={{ ...styles.wsColorDot, background: app.color }} />
              )}
            </span>
          )}
          <span style={styles.wsChevron}>{isOpen ? '▾' : '▸'}</span>
          <span style={styles.wsTitle}>{ws.title}</span>
          <span style={styles.wsCount}>{ws.sessionCount}</span>
          <span style={{ ...styles.wsActions, display: hovered === wsKey ? 'flex' : 'none' }} onMouseDown={(e) => e.stopPropagation()}>
            <button
              style={styles.miniButton}
              title={L('设置图标 / 颜色', 'Set icon / color')}
              onClick={(e) => {
                e.stopPropagation()
                setPickerWs(picking ? null : String(ws.id))
              }}
            >
              🎨
            </button>
            {!ws.archived && (
              <button style={styles.miniButton} title={L('在此工作区新建会话', 'New session in this workspace')} onClick={(e) => { e.stopPropagation(); startSession(ws.id) }}>＋</button>
            )}
            <button
              style={ws.archived ? styles.restoreButton : styles.miniButton}
              onClick={(e) => {
                e.stopPropagation()
                if (ws.archived) actions.restore(String(ws.id))
                else actions.archive(String(ws.id), new Date().toISOString())
              }}
            >
              {ws.archived ? L('恢复', 'Restore') : L('归档', 'Archive')}
            </button>
            {!ws.archived && (
              <button style={styles.miniButton} title={L('重命名工作区', 'Rename workspace')} onClick={(e) => { e.stopPropagation(); void renameWorkspace(ws.id, ws.title) }}>✎</button>
            )}
            <button style={styles.miniButton} title={L('删除工作区注册（目录与历史会话保留）', 'Remove workspace registration (directory and past sessions kept)')} onClick={(e) => { e.stopPropagation(); deleteWorkspace(ws.id) }}>🗑</button>
          </span>
        </div>
        {picking && (
          <div style={styles.pickerPanel} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.pickerLabel}>{L('图标', 'Icon')}</div>
            <div style={styles.pickerGrid}>
              {EMOJI_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  style={{ ...styles.pickerEmoji, ...(app.icon === emoji ? styles.pickerSelected : {}) }}
                  onClick={() => applyAppearance(String(ws.id), { icon: emoji })}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div style={styles.pickerLabel}>{L('颜色', 'Color')}</div>
            <div style={styles.pickerGrid}>
              {COLOR_CHOICES.map((color) => (
                <button
                  key={color}
                  style={{ ...styles.pickerSwatch, background: color, ...(app.color === color ? styles.pickerSelected : {}) }}
                  title={color}
                  onClick={() => applyAppearance(String(ws.id), { color })}
                />
              ))}
            </div>
            <button
              style={styles.pickerClear}
              onClick={() => {
                applyAppearance(String(ws.id), null)
                setPickerWs(null)
              }}
            >
              {L('清除图标与颜色', 'Clear icon and color')}
            </button>
          </div>
        )}
        {isOpen && sessions.length > 0 && (
          <div
            style={styles.sessionList}
            onDragOver={(e) => {
              if (drag?.kind === 'session' && drag.wsId === String(ws.id)) stop(e)
            }}
            onDrop={onSessionDrop(ws.id, undefined)}
          >
            {renderSessions(ws.id, sessions)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={styles.root} onMouseLeave={() => setHovered(null)}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>{L('工作区', 'Workspaces')}</span>
        <span style={styles.headerActions}>
          <button
            style={styles.headerAction}
            title={L('搜索工作区 / 会话（标题、路径）', 'Search workspaces / sessions (title, path)')}
            onClick={() => {
              setSearchOpen((v) => !v)
              if (searchOpen) setSearchQ('')
            }}
          >
            🔍
          </button>
          <button style={styles.headerAction} title={L('新建工作区（选择目录）', 'New workspace (pick a directory)')} onClick={addWorkspace}>＋</button>
          <button style={styles.headerAction} title={L('Spotlight（⌘K）', 'Spotlight (⌘K)')} onClick={openSpotlight}>⌘</button>
        </span>
      </div>

      {searchOpen && (
        <div style={styles.searchRow}>
          <input
            style={styles.searchInput}
            placeholder={L('搜索工作区 / 会话…', 'Search workspaces / sessions…')}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {!searching && (
        <div style={styles.viewPills}>
          <button
            type="button"
            style={{ ...styles.viewPill, ...(viewMode === 'grouped' ? styles.viewPillActive : {}) }}
            onClick={() => setViewMode('grouped')}
          >
            {L('按工作区', 'By workspace')}
          </button>
          <button
            type="button"
            style={{ ...styles.viewPill, ...(viewMode === 'flat' ? styles.viewPillActive : {}) }}
            onClick={() => setViewMode('flat')}
          >
            {L('全部会话', 'All sessions')}
          </button>
          {viewMode === 'grouped' && (
            <button
              type="button"
              style={styles.viewPill}
              title={L('会话排序：最近更新 或 手动（拖拽后的顺序）', 'Session order: recently updated or manual (drag order)')}
              onClick={() => setSortMode((v) => (v === 'updated' ? 'manual' : 'updated'))}
            >
              {sortMode === 'updated' ? L('排序:最近更新', 'Sort: Recent') : L('排序:手动', 'Sort: Manual')}
            </button>
          )}
        </div>
      )}

      <div style={styles.scroll}>
        {searching ? (
          searchHits.length === 0 && contentHits.length === 0 && !contentLoading ? (
            <div style={styles.empty}>{L('没有匹配「{q}」的工作区或会话', 'No workspaces or sessions match "{q}"', { q: searchQ.trim() })}</div>
          ) : (
            <>
              {contentLoading && <div style={styles.empty}>{L('正在搜索会话内容…', 'Searching session content…')}</div>}
              {searchHits.map((hit) => (
                <div
                  key={`${hit.kind}-${hit.id}`}
                  style={styles.hitRow}
                  title={hit.sub}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    if (hit.kind === 'workspace') startSession(hit.id as WorkspaceId)
                    else openSession(hit.id as SessionId)
                  }}
                >
                  <span style={styles.wsTitle}>{hit.title}</span>
                  <span style={styles.hitSub}>{hit.sub}</span>
                </div>
              ))}
              {contentHits.length > 0 && (
                <>
                  <div style={styles.contentLabel}>{L('会话内容命中（{n}）', 'Session content hits ({n})', { n: contentHits.length })}</div>
                  {contentHits.map((hit) => (
                    <div
                      key={`content-${hit.sessionId}`}
                      style={styles.hitRow}
                      title={hit.snippet}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        openSession(hit.sessionId)
                      }}
                    >
                      <span style={styles.contentSnippet}>{hit.snippet}</span>
                    </div>
                  ))}
                </>
              )}
            </>
          )
        ) : viewMode === 'flat' ? (
          <div style={styles.flatWrap}>
            {flatSessions.length === 0 ? (
              <div style={styles.empty}>{L('还没有会话。', 'No sessions yet.')}</div>
            ) : (
              renderSessions(undefined, flatSessions)
            )}
          </div>
        ) : (
          <>
            {active.length === 0 && ungrouped.length === 0 && (
              <div style={styles.empty}>{L('还没有工作区，点右上 ＋ 新建。', 'No workspaces yet — click ＋ in the top right to create one.')}</div>
            )}
            <div
              onDragOver={(e) => {
                if (drag?.kind === 'workspace') stop(e)
              }}
              onDrop={onWsDrop(undefined)}
            >
              {active.map((ws) => renderWsRow(ws, true))}
            </div>

            {ungrouped.length > 0 && (
              <>
                <div
                  style={styles.wsRow}
                  onMouseEnter={() => setHovered('bucket-ungrouped')}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    setUngroupedOpen((v) => !v)
                  }}
                >
                  <span style={styles.wsChevron}>{ungroupedOpen ? '▾' : '▸'}</span>
                  <span style={styles.wsTitle}>{L('未归组', 'Ungrouped')}</span>
                  <span style={styles.wsCount}>{ungrouped.length}</span>
                </div>
                {ungroupedOpen && <div style={styles.sessionList}>{renderSessions(undefined, ungrouped)}</div>}
              </>
            )}

            {archivedWs.length > 0 && (
              <>
                <div style={styles.sectionToggle} onClick={() => setArchivedOpen((v) => !v)}>
                  <span>{archivedOpen ? '▾' : '▸'}</span>
                  <span>{L('已归档（{n}）', 'Archived ({n})', { n: archivedWs.length })}</span>
                </div>
                {archivedOpen && archivedWs.map((ws) => renderWsRow(ws, false))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 },
  rail: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 8 },
  railButton: {
    width: 36, height: 36, borderRadius: 10, border: 'none', background: 'transparent',
    color: '#5a6478', fontSize: 16, cursor: 'pointer',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 4px' },
  headerTitle: {
    fontSize: 12, fontWeight: 700, color: '#8a93a6', letterSpacing: '0.04em', textTransform: 'uppercase',
  },
  headerActions: { display: 'flex', gap: 2, alignItems: 'center' },
  headerAction: {
    width: 24, height: 24, fontSize: 13, lineHeight: '22px', borderRadius: 7,
    border: 'none', background: 'transparent', color: '#5a6478', cursor: 'pointer',
  },
  searchRow: { padding: '0 10px 6px' },
  viewPills: { display: 'flex', gap: 4, padding: '2px 10px 4px' },
  viewPill: {
    fontSize: 11, lineHeight: '18px', padding: '0 10px', borderRadius: 9,
    border: '1px solid rgba(28, 35, 51, 0.12)', background: 'transparent', color: '#5a6478', cursor: 'pointer',
  },
  viewPillActive: {
    background: 'rgba(45, 102, 247, 0.10)', borderColor: 'rgba(45, 102, 247, 0.45)', color: '#2d66f7', fontWeight: 600,
  },
  flatWrap: { paddingTop: 2 },
  contentLabel: {
    padding: '8px 6px 4px', fontSize: 11, fontWeight: 600, color: '#8a93a6',
  },
  contentSnippet: {
    flex: 1, minWidth: 0, fontSize: 12, color: '#3c4659',
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
    overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4,
  },
  searchInput: {
    width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '5px 10px', borderRadius: 8,
    border: '1px solid rgba(45, 102, 247, 0.5)', outline: 'none', color: '#1c2333',
  },
  scroll: { flex: 1, overflowY: 'auto', padding: '0 6px 12px' },
  sectionLabel: { padding: '10px 6px 4px', fontSize: 11, fontWeight: 600, color: '#8a93a6' },
  sectionToggle: {
    display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '8px 6px 4px',
    fontSize: 11, fontWeight: 600, color: '#8a93a6', cursor: 'pointer',
    borderTop: '1px solid rgba(28, 35, 51, 0.06)',
  },
  empty: { padding: '14px 8px', fontSize: 12, color: '#a2aabe' },
  wsRow: {
    display: 'flex', alignItems: 'center', gap: 2, padding: '4px 2px', borderRadius: 6,
    cursor: 'pointer', userSelect: 'none',
  },
  wsChevron: { width: 10, fontSize: 10, color: '#a2aabe', flexShrink: 0 },
  wsTitle: {
    flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: '#3c4659',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  wsCount: { fontSize: 11, color: '#a2aabe', flexShrink: 0 },
  wsActions: { display: 'none', gap: 2, alignItems: 'center', flexShrink: 0 },
  sessionActions: { display: 'none', gap: 2, alignItems: 'center', flexShrink: 0 },
  sessionList: { marginLeft: 10, borderLeft: '1px solid rgba(28, 35, 51, 0.07)' },
  sessionRow: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px', borderRadius: 6,
    cursor: 'pointer', fontSize: 12, color: '#3c4659', userSelect: 'none',
  },
  dot: { width: 6, height: 6, borderRadius: 3, background: 'transparent', flexShrink: 0 },
  dotRunning: { background: '#2d66f7' },
  sessionTitle: { flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  miniButton: {
    fontSize: 11, lineHeight: '16px', padding: '0 6px', borderRadius: 6,
    border: '1px solid rgba(28, 35, 51, 0.12)', background: '#ffffff', color: '#5a6478', cursor: 'pointer',
  },
  restoreButton: {
    fontSize: 11, lineHeight: '16px', padding: '0 8px', borderRadius: 6,
    border: '1px solid rgba(45, 102, 247, 0.4)', background: 'rgba(45, 102, 247, 0.08)',
    color: '#2d66f7', cursor: 'pointer',
  },
  archivedHeader: { display: 'flex', alignItems: 'center', gap: 5, padding: '8px 6px 4px' },
  rowDragging: { opacity: 0.45 },
  rowDropOver: { background: 'rgba(45, 102, 247, 0.12)', outline: '1px dashed rgba(45, 102, 247, 0.6)' },
  hitRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8, cursor: 'pointer' },
  hitSub: {
    fontSize: 11, color: '#a2aabe', whiteSpace: 'nowrap', overflow: 'hidden',
    textOverflow: 'ellipsis', maxWidth: '45%',
  },
  wsIconSlot: {
    width: 16, height: 16, flexShrink: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'center', borderRadius: 5, cursor: 'pointer',
  },
  wsIconText: { fontSize: 13, lineHeight: 1 },
  wsColorDot: { width: 10, height: 10, borderRadius: 5 },
  pickerPanel: {
    margin: '2px 4px 6px 26px', padding: 8, borderRadius: 10,
    background: '#f5f7fa', border: '1px solid rgba(28, 35, 51, 0.08)',
  },
  pickerLabel: { fontSize: 11, fontWeight: 600, color: '#8a93a6', margin: '4px 0' },
  pickerGrid: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 2 },
  pickerEmoji: {
    width: 26, height: 26, fontSize: 15, lineHeight: 1, borderRadius: 7,
    border: '1px solid transparent', background: 'transparent', cursor: 'pointer',
  },
  pickerSwatch: {
    width: 22, height: 22, borderRadius: 7, border: '1px solid rgba(28, 35, 51, 0.14)',
    cursor: 'pointer',
  },
  pickerSelected: { outline: '2px solid #2d66f7', outlineOffset: 1 },
  pickerClear: {
    marginTop: 6, fontSize: 11, padding: '2px 10px', borderRadius: 7,
    border: '1px solid rgba(28, 35, 51, 0.14)', background: '#ffffff', color: '#5a6478', cursor: 'pointer',
  },
}
