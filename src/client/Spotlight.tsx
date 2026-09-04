/**
 * Spotlight palette (browser face of dsh-workspace-kit).
 *
 * ⌘K / Ctrl+K opens a Spotlight-style search over workspaces and sessions.
 *
 * Behavior contract:
 * - 主列表（空闲视图）只显示「未归档」工作区 + 属于它们（或未归组）的会话；
 *   已归档工作区折叠在底部「已归档 (N)」分区里，展开后可恢复或直接打开。
 * - 输入关键词时在工作区 + 会话（含未归组）中模糊搜索；已归档工作区命中时带
 *   「已归档」标记出现在结果里（定位 / 恢复都从搜索可达），其会话也可被搜到。
 * - Enter 打开；行内「归档 / 恢复」切换软归档状态（浏览器持久化，不删数据）。
 *
 * The palette mounts into the framework's `shell.overlay` list slot (root
 * scope, currently unoccupied) and stays mounted while closed, keeping its
 * own global keydown listener alive.
 *
 * @module dsh-workspace-kit/spotlight
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { SessionId, WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import type { ArchiveState } from './archive-store.ts'

/** Selector-shaped hook props provided by the renderer. */
export interface SpotlightPaletteProps {
  useSessions: <T>(selector: (state: any) => T) => T
  useWorkspaces: <T>(selector: (state: any) => T) => T
  useStore: <T>(selector: (state: ArchiveState) => T) => T
  actions: {
    archive(workspaceId: string, at: string): void
    restore(workspaceId: string): void
  }
  openWorkspace(workspaceId: WorkspaceId): void
  openSession(sessionId: SessionId): void
  /** Archive a session into the host's durable archive set (irreversible). */
  archiveSession(sessionId: SessionId): void
}

/** Result type filter (top chips). */
export type SpotlightKind = 'all' | 'workspaces' | 'sessions'

interface WorkspaceRow {
  readonly kind: 'workspace'
  readonly id: WorkspaceId
  readonly title: string
  readonly path: string
  readonly updatedAt: string
  readonly archivedAt: string | undefined
  readonly sessionCount: number
  readonly archived: boolean
  readonly score: number
}

interface SessionRow {
  readonly kind: 'session'
  readonly id: SessionId
  readonly title: string
  readonly cwd: string | undefined
  readonly workspaceTitle: string | undefined
  readonly workspaceArchived: boolean
  readonly updatedAt: number
  readonly running: boolean
  readonly score: number
}

type Row = WorkspaceRow | SessionRow

interface Section {
  readonly key: 'workspaces' | 'sessions' | 'archived'
  readonly label: string
  readonly rows: readonly Row[]
}

const MAX_ROWS = 40

/** Lowercase, whitespace-collapsed query text. */
function norm(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Rank one field against the query; +Infinity = no match. Case-insensitive. */
function scoreText(field: string, query: string): number {
  const f = field.toLowerCase()
  const q = norm(query)
  if (q.length === 0) return 0
  const terms = q.split(' ')
  let total = 0
  for (const term of terms) {
    const at = f.indexOf(term)
    if (at < 0) return Number.POSITIVE_INFINITY
    total += at === 0 ? 1 : f[at - 1] === ' ' || f[at - 1] === '/' ? 2 : at + 3
  }
  return total
}

function bestScore(query: string, fields: readonly string[]): number {
  let best = Number.POSITIVE_INFINITY
  for (const field of fields) {
    const score = scoreText(field, query)
    if (score < best) best = score
  }
  return best
}

function byRecencyDesc(a: string, b: string): number {
  return a < b ? 1 : a > b ? -1 : 0
}

/** Workspace id owning the given session id, when any. */
function workspaceIdOfSession(
  workspaceItems: readonly any[],
  sessionId: string,
): string | undefined {
  for (const item of workspaceItems) {
    if (Array.isArray(item.sessionIds) && item.sessionIds.includes(sessionId)) {
      return item.workspaceId
    }
  }
  return undefined
}

/**
 * Build sections for the current query + archive state.
 * - Idle (empty query): active workspaces + their recent sessions + an
 *   expandable "archived" section holding archived workspaces.
 * - Searching: ranked matches across workspaces (archived hits carry a
 *   badge) and every session, ungrouped and archived-workspace ones
 *   included.
 */
function buildSections(
  query: string,
  sessionsState: any,
  workspacesState: any,
  archived: Readonly<Record<string, { at: string }>>,
  showArchived: boolean,
  kind: SpotlightKind,
): Section[] {
  const q = norm(query)
  const byId: Record<string, any> = sessionsState?.byId ?? {}
  const sessionIds: readonly string[] = Array.isArray(sessionsState?.ids) ? sessionsState.ids : []
  const workspaceItems: readonly any[] = workspacesState?.items ?? []
  const builtinArchivedSessionIds = new Set<string>(workspacesState?.archivedSessionIds ?? [])
  const searching = q.length > 0

  // Workspace rows, split active / archived.
  const activeWs: WorkspaceRow[] = []
  const archivedWs: WorkspaceRow[] = []
  for (const item of workspaceItems) {
    const id = item.workspaceId as WorkspaceId
    const rec = archived[id]
    const score = searching ? bestScore(q, [item.title, item.path]) : 0
    if (searching && !Number.isFinite(score)) continue
    const row: WorkspaceRow = {
      kind: 'workspace',
      id,
      title: item.title,
      path: item.path,
      updatedAt: item.updatedAt,
      archivedAt: rec?.at,
      sessionCount: Array.isArray(item.sessionIds) ? item.sessionIds.length : 0,
      archived: Boolean(rec),
      score,
    }
    if (rec) archivedWs.push(row)
    else activeWs.push(row)
  }
  const sortWs = (list: WorkspaceRow[]): WorkspaceRow[] =>
    [...list].sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score
      if (a.archivedAt && b.archivedAt) return byRecencyDesc(a.archivedAt, b.archivedAt)
      return byRecencyDesc(a.updatedAt, b.updatedAt)
    })
  const activeSorted = sortWs(activeWs)
  const archivedSorted = sortWs(archivedWs)
  const archivedWorkspaceIds = new Set(archivedSorted.map((r) => String(r.id)))

  // Session rows.
  const workspaceTitleById = new Map<string, string>()
  for (const item of workspaceItems) {
    for (const sid of item.sessionIds ?? []) workspaceTitleById.set(sid, item.title)
  }
  const sessions: SessionRow[] = []
  for (const id of sessionIds) {
    const session = byId[id]
    if (!session || session.origin === 'subagent' || session.blank) continue
    const wsId = workspaceIdOfSession(workspaceItems, String(id))
    const workspaceArchived = wsId !== undefined && archivedWorkspaceIds.has(wsId)
    const grouped = workspaceTitleById.has(String(id))
    const allowUngrouped = kind === 'sessions'
    if (!searching) {
      // Idle view: sessions of archived workspaces and built-in archived
      // sessions stay out; ungrouped sessions only show on the 会话 tab.
      if (workspaceArchived || builtinArchivedSessionIds.has(String(id)) || (!grouped && !allowUngrouped)) {
        continue
      }
    }
    const score = searching
      ? bestScore(q, [session.displayTitle ?? '', session.title ?? '', session.cwd ?? ''])
      : 1
    if (searching && !Number.isFinite(score)) continue
    sessions.push({
      kind: 'session',
      id: id as SessionId,
      title: session.displayTitle ?? session.title ?? id,
      cwd: session.cwd,
      workspaceTitle: workspaceTitleById.get(String(id)),
      workspaceArchived,
      updatedAt: session.updatedAt ?? 0,
      running: Boolean(session.running),
      score,
    })
  }
  sessions.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? -1 : 1
    return a.title < b.title ? -1 : 1
  })

  // Cap every section; total budget is enforced by the caller over `flat`.
  const showWorkspaces = kind !== 'sessions'
  const showSessions = kind !== 'workspaces'
  if (searching) {
    const secs: Section[] = []
    const wsRows = [...activeSorted, ...archivedSorted].slice(0, MAX_ROWS)
    if (showWorkspaces && wsRows.length > 0) secs.push({ key: 'workspaces', label: '工作区', rows: wsRows })
    if (showSessions && sessions.length > 0) secs.push({ key: 'sessions', label: '会话', rows: sessions })
    return secs
  }

  // Idle view.
  const secs: Section[] = []
  if (showWorkspaces && activeSorted.length > 0) {
    secs.push({ key: 'workspaces', label: '工作区', rows: activeSorted.slice(0, MAX_ROWS) })
  }
  if (showSessions) {
    const idleSessions = sessions.filter((s) => !s.workspaceArchived).slice(0, 30)
    if (idleSessions.length > 0) secs.push({ key: 'sessions', label: '会话', rows: idleSessions })
  }
  if (showWorkspaces && archivedSorted.length > 0 && showArchived) {
    secs.push({ key: 'archived', label: '已归档', rows: archivedSorted.slice(0, MAX_ROWS) })
  }
  return secs
}

/** Palette overlay. All hooks are unconditional; open state is local. */
export function SpotlightPalette(props: SpotlightPaletteProps): JSX.Element | null {
  const { useSessions, useWorkspaces, useStore, actions, openWorkspace, openSession, archiveSession } = props
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [showArchived, setShowArchived] = useState(false)
  const [kind, setKind] = useState<SpotlightKind>('all')
  const inputRef = useRef<HTMLInputElement>(null)
  const flatRef = useRef<readonly Row[]>([])
  const cursorRef = useRef(0)
  cursorRef.current = cursor

  const archived = useStore((state) => state.archived ?? {})
  const appearanceMap = useStore((state) => state.appearance ?? {})
  // Framework-provided global hooks may not be seated yet at first render
  // (composition order is not guaranteed); treat them as optional feeds.
  const sessionsState = typeof useSessions === 'function' ? useSessions((state) => state) : undefined
  const workspacesState = typeof useWorkspaces === 'function' ? useWorkspaces((state) => state) : undefined

  /** Global ⌘K / Ctrl+K toggle (component stays mounted while closed). */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    // The workspace sidebar's "⌘K 搜索" button opens the palette through this
    // window event (components share no ctx).
    const onOpenRequest = (): void => setOpen(true)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('dsh-workspace-kit:open', onOpenRequest)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('dsh-workspace-kit:open', onOpenRequest)
    }
  }, [])

  // Reset transient state each time the palette opens.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setCursor(0)
    setShowArchived(false)
    setKind('all')
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  const sections = useMemo<Section[]>(
    () => buildSections(query, sessionsState, workspacesState, archived, showArchived, kind),
    [query, sessionsState, workspacesState, archived, showArchived, kind],
  )

  // Slice sections against one shared row budget so what renders and what
  // the keyboard walks are exactly the same list.
  const display = useMemo<{ sections: Section[]; flat: Row[] }>(() => {
    const displaySections: Section[] = []
    const flatRows: Row[] = []
    let budget = MAX_ROWS
    for (const section of sections) {
      if (budget <= 0) break
      const take = section.rows.slice(0, budget)
      displaySections.push({ ...section, rows: take })
      flatRows.push(...take)
      budget -= take.length
    }
    return { sections: displaySections, flat: flatRows }
  }, [sections])

  useEffect(() => {
    flatRef.current = display.flat
    const max = Math.max(0, display.flat.length - 1)
    if (cursor > max) setCursor(max)
  }, [display.flat, cursor])

  function activate(row: Row): void {
    if (row.kind === 'workspace') openWorkspace(row.id)
    else openSession(row.id)
    setOpen(false)
  }

  function toggleArchived(row: Row): void {
    if (row.kind !== 'workspace') return
    if (row.archived) actions.restore(row.id)
    else actions.archive(row.id, new Date().toISOString())
  }

  // In-palette keyboard handling while open.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      const rowsNow = flatRef.current
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        return
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const delta = event.key === 'ArrowDown' ? 1 : -1
        setCursor((c) => Math.max(0, Math.min(c + delta, Math.max(0, rowsNow.length - 1))))
        return
      }
      if (event.key === 'Enter' && rowsNow.length > 0) {
        event.preventDefault()
        const target = rowsNow[Math.max(0, Math.min(cursorRef.current, rowsNow.length - 1))]
        if (target) activate(target)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!open) return null

  const searching = norm(query).length > 0
  const rowCount = display.flat.length
  // Total archived workspaces (idle hint + footer), independent of folding.
  const archivedTotal = workspaceItemsArchivedCount(workspacesState, archived)
  const idleArchivedHidden = !searching && archivedTotal > 0 && !showArchived

  return (
    <div style={styles.backdrop} onMouseDown={() => setOpen(false)} role="presentation">
      <div
        style={styles.panel}
        role="dialog"
        aria-label="Spotlight 工作区搜索"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          style={styles.input}
          placeholder="搜索工作区或会话…（Esc 关闭）"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setCursor(0)
          }}
          aria-label="搜索"
        />
        <div style={styles.chips}>
          {(['all', 'workspaces', 'sessions'] as const).map((k) => (
            <button
              key={k}
              type="button"
              style={{ ...styles.chip, ...(kind === k ? styles.chipActive : {}) }}
              onClick={() => {
                setKind(k)
                setCursor(0)
              }}
            >
              {k === 'all' ? '全部' : k === 'workspaces' ? '工作区' : '会话'}
            </button>
          ))}
        </div>
        <div style={styles.body}>
          {rowCount === 0 && (
            <div style={styles.empty}>
              {query.trim()
                ? `没有匹配「${query}」的工作区或会话`
                : '还没有工作区。从一个项目目录开始会话后会自动出现。'}
            </div>
          )}
          {display.sections.map((section) => {
            const rowsInSection = section.rows
            if (rowsInSection.length === 0) return null
            return (
              <div key={section.key}>
                <div style={styles.sectionHeader}>{section.label}</div>
                {rowsInSection.map((row) => {
                  const index = display.flat.indexOf(row)
                  const selected = index === cursor
                  const isArchivedWs = row.kind === 'workspace' && row.archived
                  return (
                    <div
                      key={`${row.kind}-${row.id}`}
                      style={{ ...styles.row, ...(selected ? styles.rowSelected : {}) }}
                      onMouseEnter={() => setCursor(index)}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        activate(row)
                      }}
                    >
                      {row.kind === 'workspace' && (
                        <span style={styles.rowIconSlot}>
                          {appearanceMap[String(row.id)]?.icon ? (
                            <span>{appearanceMap[String(row.id)]?.icon}</span>
                          ) : appearanceMap[String(row.id)]?.color ? (
                            <span style={{ ...styles.rowColorDot, background: appearanceMap[String(row.id)]?.color }} />
                          ) : null}
                        </span>
                      )}
                      <div style={styles.rowMain}>
                        <div style={styles.rowTitle}>
                          <span style={styles.rowTitleText}>
                            {row.kind === 'workspace' ? row.title : row.title}
                          </span>
                          {isArchivedWs && <span style={styles.badgeArchived}>已归档</span>}
                          {row.kind === 'session' && row.running && (
                            <span style={styles.badgeRunning}>运行中</span>
                          )}
                        </div>
                        <div style={styles.rowSub}>
                          {row.kind === 'workspace'
                            ? `${row.path} · ${row.sessionCount} 个会话 · ${row.updatedAt.slice(0, 10)}`
                            : row.cwd ?? ''}
                        </div>
                      </div>
                      {row.kind === 'workspace' && (
                        <button
                          style={styles.actionButton}
                          title={isArchivedWs ? '恢复工作区' : '归档工作区（软归档，可恢复）'}
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            toggleArchived(row)
                          }}
                        >
                          {isArchivedWs ? '恢复' : '归档'}
                        </button>
                      )}
                      {row.kind === 'session' && selected && (
                        <button
                          style={styles.actionButton}
                          title="归档会话（官方归档集，不可逆：会从所有列表隐藏，仍可从搜索打开）"
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            archiveSession(row.id)
                          }}
                        >
                          归档会话
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
          {idleArchivedHidden && (
            <div
              style={styles.expandArchived}
              role="button"
              tabIndex={0}
              onClick={() => setShowArchived(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setShowArchived(true)
              }}
            >
              ▸ 已归档 {archivedTotal} 项（点击展开查看 / 恢复）
            </div>
          )}
        </div>
        <div style={styles.footer}>
          <span>↑↓ 选择</span>
          <span>↵ 打开</span>
          <span>{searching ? `${rowCount} 个匹配` : `${rowCount} 项`}</span>
          <span style={{ marginLeft: 'auto' }}>Esc 关闭</span>
        </div>
      </div>
    </div>
  )
}

/** Count workspaces currently marked archived in the plugin store. */
function workspaceItemsArchivedCount(
  workspacesState: any,
  archived: Readonly<Record<string, { at: string }>>,
): number {
  const items: readonly any[] = workspacesState?.items ?? []
  let count = 0
  for (const item of items) {
    if (archived[item.workspaceId]) count += 1
  }
  return count
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '12vh',
    background: 'rgba(15, 18, 26, 0.42)',
    backdropFilter: 'blur(2px)',
  },
  panel: {
    width: 620,
    maxWidth: 'calc(100vw - 48px)',
    background: '#ffffff',
    color: '#1c2333',
    borderRadius: 14,
    boxShadow: '0 24px 64px rgba(15, 18, 26, 0.35)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '16px 18px',
    fontSize: 16,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'inherit',
    borderBottom: '1px solid rgba(28, 35, 51, 0.08)',
  },
  chips: {
    display: 'flex',
    gap: 6,
    padding: '8px 12px 2px',
  },
  chip: {
    fontSize: 12,
    lineHeight: '22px',
    padding: '0 12px',
    borderRadius: 11,
    border: '1px solid rgba(28, 35, 51, 0.14)',
    background: 'transparent',
    color: '#5a6478',
    cursor: 'pointer',
  },
  chipActive: {
    background: 'rgba(45, 102, 247, 0.12)',
    borderColor: 'rgba(45, 102, 247, 0.5)',
    color: '#2d66f7',
    fontWeight: 600,
  },
  body: {
    maxHeight: '52vh',
    overflowY: 'auto',
    padding: '6px',
  },
  sectionHeader: {
    padding: '8px 12px 4px',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.04em',
    color: '#8a93a6',
    textTransform: 'uppercase',
  },
  empty: {
    padding: '28px 16px',
    textAlign: 'center',
    color: '#7a8499',
    fontSize: 13,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 12px',
    borderRadius: 9,
    cursor: 'pointer',
  },
  rowSelected: {
    background: 'rgba(45, 102, 247, 0.10)',
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowIconSlot: {
    width: 18,
    height: 18,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  rowTitleText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  rowSub: {
    fontSize: 12,
    color: '#7a8499',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  badgeArchived: {
    fontSize: 10,
    lineHeight: '16px',
    padding: '0 6px',
    borderRadius: 8,
    background: '#eef1f6',
    color: '#5a6478',
    flexShrink: 0,
  },
  badgeRunning: {
    fontSize: 10,
    lineHeight: '16px',
    padding: '0 6px',
    borderRadius: 8,
    background: 'rgba(45, 102, 247, 0.12)',
    color: '#2d66f7',
    flexShrink: 0,
  },
  actionButton: {
    flexShrink: 0,
    fontSize: 12,
    padding: '3px 10px',
    borderRadius: 8,
    border: '1px solid rgba(28, 35, 51, 0.14)',
    background: '#ffffff',
    color: '#3c4659',
    cursor: 'pointer',
  },
  expandArchived: {
    margin: '6px 8px',
    padding: '8px 12px',
    borderRadius: 9,
    fontSize: 12,
    color: '#5a6478',
    background: '#f5f7fa',
    cursor: 'pointer',
    textAlign: 'center',
  },
  footer: {
    display: 'flex',
    gap: 14,
    padding: '8px 16px',
    borderTop: '1px solid rgba(28, 35, 51, 0.08)',
    fontSize: 11,
    color: '#8a93a6',
  },
}
