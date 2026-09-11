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
 * - 「已归档 (N)」 collapsed section: archived workspaces with 恢复/打开/新建会话.
 * - 未归组 sessions in their own collapsible section.
 * - Rail state (`wide=false`) renders a compact icon column.
 *  - Session rows carry a live status indicator mirroring the shipped
 *    browser: an animated chase dot while work is running, an amber dot
 *    while the session waits on you (approval / plan review / question),
 *    a green dot for a finished-but-unopened session, and an empty slot
 *    otherwise (title alignment stays stable across all states)
 *
 * Scope (vs the shipped browser): sessions live under their workspace row
 * (no cross-workspace session drag, no flat all-sessions toggle — the
 * sidebar is intentionally workspace-first); search covers titles, paths
 * and session message content; rename/delete/archive go through the
 * plugin's styled dialog host.
 *
 * @module dsh-workspace-kit/workspace-sidebar
 */

import { useEffect, useMemo, useState, type CSSProperties, type DragEvent } from 'react'
import type { SessionSearchResultItem } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ArchiveState, WorkspaceAppearance } from './archive-store.ts'
import { L } from './locale.ts'
import { Archive, ArchiveRestore, ChevronDown, ChevronRight, ChevronsRight, Command, Copy, MoreVertical, Palette, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { WORKSPACE_ICON_KEYS, WorkspaceGlyph, iconKeyOf } from './icons.tsx'

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
  /** Live row status (undefined = idle, no indicator). */
  readonly status?: SessionStatus
}

/**
 * Row status kinds mirror the shipped workspace browser: `ongoing` (own
 * activity), `warning` (the session is waiting on the user), `done`
 * (finished while unopened — green reminder; idle sessions show nothing).
 */
type SessionStatusKind = 'ongoing' | 'warning' | 'done'

interface SessionStatus {
  readonly kind: SessionStatusKind
  /** Bilingual human-facing label (used as tooltip / aria-label). */
  readonly label: string
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

// Per-workspace icon palette lives in icons.tsx (lucide-react SVG keys).

/** Color choices (CSS hex) for the per-workspace accent picker. */
const COLOR_CHOICES = [
  '#2d66f7', '#7c3aed', '#0e9f6e', '#d97706', '#dc2626',
  '#db2777', '#0891b2', '#52525b', '#8a93a6',
] as const

// ---- live session-status indicators (parity with the shipped browser) ----
// The shipped browser derives one primary state per session row:
// pending user interaction (approval / plan-review / question) outranks own
// activity, own activity outranks the finished-unopened reminder, idle shows
// nothing. Ongoing = the brand-blue chase animation; warning = amber dot;
// done reminder = green dot.

const STATUS_DOT_COLOR: Readonly<Record<'warning' | 'done', string>> = {
  warning: '#d97706',
  done: '#0e9f6e',
}

/** Perimeter of the official 3×3 chase grid (2px cells on a 10px canvas). */
const CHASE_CELLS: readonly (readonly [number, number])[] = [
  [0, 0], [4, 0], [8, 0], [8, 4], [8, 8], [4, 8], [0, 8], [0, 4],
]

const STATUS_STYLE_ID = 'dsh-workspace-kit-status'
const STATUS_CSS = [
  '@keyframes dsh-wskit-chase{0%,12.4%{opacity:1}12.5%,24.9%{opacity:.6}25%,37.4%{opacity:.35}37.5%,to{opacity:.15}}',
  '.dsh-wskit-ongoing{position:relative;display:inline-flex;align-items:center;justify-content:center;color:#2d66f7}',
  '.dsh-wskit-matrix{display:block}',
  '.dsh-wskit-cell{fill:currentColor;opacity:.15;animation:dsh-wskit-chase 1s linear infinite}',
  '@media (prefers-reduced-motion:reduce){.dsh-wskit-cell{animation:none}.dsh-wskit-matrix{display:none}.dsh-wskit-ongoing:before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}}',
  '.dsh-wskit-menu-item{transition:background .12s ease}',
  '.dsh-wskit-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover, rgba(28,35,51,0.07))}',
].join('\n')

/** Inject the tiny chase keyframes once (browser face only; id-guarded). */
function ensureStatusStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STATUS_STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STATUS_STYLE_ID
  el.textContent = STATUS_CSS
  document.head.appendChild(el)
}
ensureStatusStyles()

/**
 * Map one session summary onto its row indicator with the shipped
 * precedence: waiting on the user > running > finished-but-unopened.
 */
function sessionStatusOf(s: any): SessionStatus | undefined {
  switch (s?.pendingInteraction) {
    case 'approval': return { kind: 'warning', label: L('等待审批', 'Waiting for approval') }
    case 'plan-review': return { kind: 'warning', label: L('计划待审', 'Plan awaiting review') }
    case 'question': return { kind: 'warning', label: L('等待回答', 'Waiting for answer') }
  }
  if (s?.running) return { kind: 'ongoing', label: L('进行中', 'Running') }
  if (s?.completed) return { kind: 'done', label: L('已完成', 'Completed') }
  return undefined
}

/**
 * Fixed-width leading slot keeps session titles aligned whether or not a
 * status is shown. `ongoing` renders the official-style chase SVG; other
 * non-idle states render a colored dot.
 */
function StatusGlyph({ status }: { status?: SessionStatus }): JSX.Element {
  if (!status) return <span style={styles.statusSlot} aria-hidden="true" />
  if (status.kind === 'ongoing') {
    return (
      <span style={styles.statusSlot} className="dsh-wskit-ongoing" role="img" aria-label={status.label} title={status.label}>
        <svg className="dsh-wskit-matrix" width={10} height={10} viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden="true">
          {CHASE_CELLS.map(([x, y], i) => (
            <rect
              key={`${x}-${y}`}
              className="dsh-wskit-cell"
              x={x}
              y={y}
              width={2}
              height={2}
              fill="#2d66f7"
              style={{ animationDelay: `${(i - CHASE_CELLS.length) * 125}ms` }}
            />
          ))}
        </svg>
      </span>
    )
  }
  return (
    <span style={styles.statusSlot} role="img" aria-label={status.label} title={status.label}>
      <span style={{ ...styles.stateDot, background: STATUS_DOT_COLOR[status.kind] }} />
    </span>
  )
}

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
      status: sessionStatusOf(s),
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
  // Row action menu ("···"): row key of the open vertical menu. Opening on
  // kebab hover, closing on row leave or after an action — pointer-safe
  // because the absolutely-positioned menu stays inside the row subtree.
  const [menu, setMenu] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  // Session ordering: 'updated' (recency) or 'manual' (durable account order).
  const [sortMode, setSortMode] = useState<'updated' | 'manual'>('updated')
  const [contentHits, setContentHits] = useState<SessionSearchResultItem[]>([])
  const [contentLoading, setContentLoading] = useState(false)
  const [drag, setDrag] = useState<DragState>(null)
  const [over, setOver] = useState<string | null>(null)
  const [pickerWs, setPickerWs] = useState<string | null>(null)

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
        <button style={styles.railButton} title={L('Spotlight 搜索（⌘K）', 'Spotlight search (⌘K)')} onClick={openSpotlight}><Command size={16} /></button>
        <button
          style={styles.railButton}
          title={L('新建会话', 'New session')}
          onClick={() => {
            startSession()
            expandSidebar()
          }}
        >
          <Plus size={16} />
        </button>
        <button style={styles.railButton} title={L('展开侧栏', 'Expand sidebar')} onClick={expandSidebar}><ChevronsRight size={16} /></button>
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
          onMouseLeave={() => {
            setHovered((v) => (v === dragKey ? null : v))
            setMenu((v) => (v === dragKey ? null : v))
          }}
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
          <StatusGlyph status={s.status} />
          <span style={styles.sessionTitle}>{s.title}</span>
          <span
            style={{ ...styles.sessionActions, display: hovered === dragKey || menu === dragKey ? 'flex' : 'none' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              style={styles.kebab}
              title={L('更多操作', 'More actions')}
              onMouseEnter={() => setMenu(dragKey)}
              onClick={(e) => { e.stopPropagation(); setMenu(menu === dragKey ? null : dragKey) }}
            >
              <MoreVertical size={13} />
            </button>
          </span>
          {menu === dragKey && (
            <div style={styles.rowMenu} onMouseDown={(e) => e.stopPropagation()}>
              <button style={styles.menuItem} className="dsh-wskit-menu-item" onClick={(e) => { e.stopPropagation(); setMenu(null); void renameSession(s.id, s.title) }}>
                <Pencil size={12} />{L('重命名', 'Rename')}
              </button>
              <button style={styles.menuItem} className="dsh-wskit-menu-item" onClick={(e) => { e.stopPropagation(); setMenu(null); forkSession(s.id) }}>
                <Copy size={12} />{L('复制会话（fork）', 'Duplicate (fork)')}
              </button>
              <button
                style={{ ...styles.menuItem, ...styles.menuItemDanger }} className="dsh-wskit-menu-item"
                title={L('不可逆，仍可从搜索打开', 'Irreversible, still searchable')}
                onClick={(e) => { e.stopPropagation(); setMenu(null); archiveSession(s.id) }}
              >
                <><Archive size={12} />{L('归档会话', 'Archive session')}</>
              </button>
            </div>
          )}
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
          onMouseLeave={() => {
            setHovered((v) => (v === wsKey ? null : v))
            setMenu((v) => (v === wsKey ? null : v))
          }}
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
              <WorkspaceGlyph icon={app.icon} color={app.color} size={15} />
            </span>
          )}
          <span style={styles.wsChevron}>{isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
          <span style={styles.wsTitle}>{ws.title}</span>
          <span style={styles.wsCount}>{ws.sessionCount}</span>
          <span style={{ ...styles.wsActions, display: hovered === wsKey || menu === wsKey ? 'flex' : 'none' }} onMouseDown={(e) => e.stopPropagation()}>
            <button
              style={styles.kebab}
              title={L('更多操作', 'More actions')}
              onMouseEnter={() => setMenu(wsKey)}
              onClick={(e) => { e.stopPropagation(); setMenu(menu === wsKey ? null : wsKey) }}
            >
              <MoreVertical size={13} />
            </button>
          </span>
          {menu === wsKey && (
            <div style={styles.rowMenu} onMouseDown={(e) => e.stopPropagation()}>
              {!ws.archived && (
                <button style={styles.menuItem} className="dsh-wskit-menu-item" onClick={(e) => { e.stopPropagation(); setMenu(null); startSession(ws.id) }}>
                  <Plus size={12} />{L('新建会话', 'New session')}
                </button>
              )}
              <button style={styles.menuItem} className="dsh-wskit-menu-item" onClick={(e) => { e.stopPropagation(); setMenu(null); setPickerWs(picking ? null : String(ws.id)) }}>
                <Palette size={12} />{L('图标 / 颜色', 'Icon / color')}
              </button>
              {!ws.archived && (
                <button style={styles.menuItem} className="dsh-wskit-menu-item" onClick={(e) => { e.stopPropagation(); setMenu(null); void renameWorkspace(ws.id, ws.title) }}>
                  <Pencil size={12} />{L('重命名', 'Rename')}
                </button>
              )}
              <button
                style={styles.menuItem}
                onClick={(e) => {
                  e.stopPropagation()
                  setMenu(null)
                  if (ws.archived) actions.restore(String(ws.id))
                  else actions.archive(String(ws.id), new Date().toISOString())
                }}
              >
                {ws.archived ? <><ArchiveRestore size={12} />{L('恢复此工作区', 'Restore workspace')}</> : <><Archive size={12} />{L('归档（软归档，可恢复）', 'Archive (soft, restorable)')}</>}
              </button>
              <button
                style={{ ...styles.menuItem, ...styles.menuItemDanger }} className="dsh-wskit-menu-item"
                title={L('目录与历史会话保留', 'Directory and past sessions kept')}
                onClick={(e) => { e.stopPropagation(); setMenu(null); deleteWorkspace(ws.id) }}
              >
                <Trash2 size={12} />{L('删除注册', 'Remove registration')}
              </button>
            </div>
          )}
        </div>
        {picking && (
          <div style={styles.pickerPanel} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.pickerLabel}>{L('图标', 'Icon')}</div>
            <div style={styles.pickerGrid}>
              {WORKSPACE_ICON_KEYS.map((key) => {
                const selected = iconKeyOf(app.icon) === key
                return (
                  <button
                    key={key}
                    title={key}
                    style={{ ...styles.pickerIcon, ...(selected ? styles.pickerSelected : {}) }}
                    onClick={() => applyAppearance(String(ws.id), { icon: key })}
                  >
                    <WorkspaceGlyph icon={key} size={15} />
                  </button>
                )
              })}
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
            <Search size={13} />
          </button>
          <button style={styles.headerAction} title={L('新建工作区（选择目录）', 'New workspace (pick a directory)')} onClick={addWorkspace}><Plus size={14} /></button>
          <button style={styles.headerAction} title={L('Spotlight（⌘K）', 'Spotlight (⌘K)')} onClick={openSpotlight}><Command size={13} /></button>
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
        ) : (
          <>
            {active.length === 0 && ungrouped.length === 0 && (
              <div style={styles.empty}>{L('还没有工作区，点右上角新建按钮。', 'No workspaces yet — use the new-workspace button in the top right.')}</div>
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
                  <span style={styles.wsChevron}>{ungroupedOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
                  <span style={styles.wsTitle}>{L('未归组', 'Ungrouped')}</span>
                  <span style={styles.wsCount}>{ungrouped.length}</span>
                </div>
                {ungroupedOpen && <div style={styles.sessionList}>{renderSessions(undefined, ungrouped)}</div>}
              </>
            )}

            {archivedWs.length > 0 && (
              <>
                <div style={styles.sectionToggle} onClick={() => setArchivedOpen((v) => !v)}>
                  <span style={styles.sectionChevron}>{archivedOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
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
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 4px' },
  headerTitle: {
    fontSize: 12, fontWeight: 700, color: '#8a93a6', letterSpacing: '0.04em', textTransform: 'uppercase',
  },
  headerActions: { display: 'flex', gap: 2, alignItems: 'center' },
  headerAction: {
    width: 24, height: 24, fontSize: 13, lineHeight: '22px', borderRadius: 7,
    border: 'none', background: 'transparent', color: '#5a6478', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  searchRow: { padding: '0 10px 6px' },
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
  sectionToggle: {
    display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '8px 6px 4px',
    fontSize: 11, fontWeight: 600, color: '#8a93a6', cursor: 'pointer',
    borderTop: '1px solid rgba(28, 35, 51, 0.06)',
  },
  sectionChevron: { display: 'inline-flex', color: '#a2aabe' },
  empty: { padding: '14px 8px', fontSize: 12, color: '#a2aabe' },
  wsRow: {
    position: 'relative',
    display: 'flex', alignItems: 'center', gap: 4, padding: '7px 4px', borderRadius: 7,
    cursor: 'pointer', userSelect: 'none',
  },
  wsChevron: {
    width: 14, flexShrink: 0, display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', color: 'var(--dsw-alias-label-tertiary, #9aa3b5)',
  },
  wsTitle: {
    flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: 'var(--dsw-alias-label-primary, #2e3a4d)', lineHeight: '20px',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  wsCount: { fontSize: 12, fontWeight: 500, color: 'var(--dsw-alias-label-tertiary, #8a93a6)', flexShrink: 0 },
  wsActions: { display: 'none', gap: 2, alignItems: 'center', flexShrink: 0 },
  kebab: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 20, height: 20, borderRadius: 6, border: 'none', cursor: 'pointer',
    background: 'transparent', color: 'var(--dsw-alias-label-tertiary, var(--fg-muted, #5a6478))',
  },
  rowMenu: {
    position: 'absolute', right: 6, top: '100%', zIndex: 30, minWidth: 168,
    display: 'flex', flexDirection: 'column', gap: 1, padding: 4, borderRadius: 9,
    background: 'var(--dsw-alias-bg-layer-2, var(--bg, #ffffff))', border: '1px solid var(--dsw-alias-border-l2, var(--border, rgba(28, 35, 51, 0.12)))',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.22)',
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 6,
    fontSize: 12, border: 'none', textAlign: 'left', cursor: 'pointer',
    background: 'transparent', color: 'var(--dsw-alias-label-primary, var(--fg, #3c4659))',
  },
  menuItemDanger: { color: 'var(--dsw-alias-state-error-primary, #dc2626)' },
  sessionActions: { display: 'none', gap: 2, alignItems: 'center', flexShrink: 0 },
  sessionList: { marginLeft: 10, borderLeft: '1px solid rgba(28, 35, 51, 0.07)' },
  sessionRow: {
    position: 'relative',
    display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px', borderRadius: 6,
    cursor: 'pointer', fontSize: 12, color: 'var(--dsw-alias-label-primary, var(--fg, #3c4659))', userSelect: 'none',
  },
  statusSlot: { width: 10, height: 10, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  stateDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  sessionTitle: { flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--dsw-alias-label-secondary, inherit)' },
  miniButton: {
    fontSize: 11, lineHeight: '16px', padding: '0 6px', borderRadius: 6,
    border: '1px solid var(--dsw-alias-border-l2, rgba(28, 35, 51, 0.12))', background: 'var(--dsw-alias-bg-layer-1, #ffffff)', color: 'var(--dsw-alias-label-secondary, #5a6478)', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  restoreButton: {
    fontSize: 11, lineHeight: '16px', padding: '0 8px', borderRadius: 6,
    border: '1px solid rgba(45, 102, 247, 0.4)', background: 'rgba(45, 102, 247, 0.14)',
    color: '#2d66f7', cursor: 'pointer',
  },
  rowDragging: { opacity: 0.45 },
  rowDropOver: { background: 'rgba(45, 102, 247, 0.12)', outline: '1px dashed rgba(45, 102, 247, 0.6)' },
  hitRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8, cursor: 'pointer' },
  hitSub: {
    fontSize: 11, color: '#a2aabe', whiteSpace: 'nowrap', overflow: 'hidden',
    textOverflow: 'ellipsis', maxWidth: '45%',
  },
  wsIconSlot: {
    width: 20, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'center', borderRadius: 6, cursor: 'pointer',
  },
  pickerPanel: {
    margin: '2px 4px 6px 26px', padding: 8, borderRadius: 10,
    background: 'var(--dsw-alias-bg-layer-1, #f5f7fa)', border: '1px solid var(--dsw-alias-border-l1, rgba(28, 35, 51, 0.08))',
  },
  pickerLabel: { fontSize: 11, fontWeight: 600, color: 'var(--dsw-alias-label-tertiary, #8a93a6)', margin: '4px 0' },
  pickerGrid: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 2 },
  pickerIcon: {
    width: 26, height: 26, borderRadius: 7,
    border: '1px solid transparent', background: 'transparent', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  pickerSwatch: {
    width: 22, height: 22, borderRadius: 7, border: '1px solid rgba(28, 35, 51, 0.14)',
    cursor: 'pointer',
  },
  pickerSelected: { outline: '2px solid #2d66f7', outlineOffset: 1 },
  pickerClear: {
    marginTop: 6, fontSize: 11, padding: '2px 10px', borderRadius: 7,
    border: '1px solid var(--dsw-alias-border-l2, rgba(28, 35, 51, 0.14))', background: 'var(--dsw-alias-bg-layer-1, #ffffff)', color: 'var(--dsw-alias-label-secondary, #5a6478)', cursor: 'pointer',
  },
}
