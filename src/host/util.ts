/**
 * Pure host-side helpers over `ctx.workspaceRegistry`: list, ranked fuzzy
 * search, and single-workspace resolution with an honest ambiguity answer.
 * No state, no persistence: soft-archiving is a view concern owned by the
 * browser client half, so this code never mutates the registry and never
 * keeps a mirror of archive state that could drift from the GUI.
 *
 * User-facing copy is bilingual via `L()` (see `./locale.ts`).
 *
 * @module dsh-workspace-kit/util
 */

import type { Workspace, WorkspaceId } from '@deepseek-ai/dsh-workspace'
import { detectLocale, L } from './locale.ts'

/** One registry workspace enriched with cheap live facts for search/render. */
export interface WorkspaceEntry {
  readonly id: WorkspaceId
  readonly title: string
  readonly path: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly sessionCount: number
  readonly sessionIds: readonly string[]
  readonly missingDir: boolean
}

/** Ranked fuzzy match against one workspace. */
export interface WorkspaceMatch extends WorkspaceEntry {
  /** Lower is better. */
  readonly score: number
  /** Human hint of which field hit (`title` | `path` | `segments` | `recent`). */
  readonly why: string
}

export type ResolveResult =
  | { readonly ok: true; readonly entry: WorkspaceMatch }
  | { readonly ok: false; readonly reason: 'none' | 'ambiguous'; readonly candidates: readonly WorkspaceMatch[] }

/** Normalize query text: trim, collapse whitespace, lowercase. */
function norm(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Score `candidate` against every whitespace-separated term of `query`.
 * Case-insensitive; returns +Infinity when any term matches nothing.
 */
function scoreQuery(candidate: string, query: string): number {
  const c = norm(candidate)
  const terms = norm(query).split(' ')
    .filter((term) => term.length > 0)
  if (terms.length === 0) return 0
  let total = 0
  for (const term of terms) {
    const at = c.indexOf(term)
    if (at < 0) return Number.POSITIVE_INFINITY
    total += c === term ? 0
      : at === 0 ? 1
      : c.includes(term + ' ') || c.includes(' ' + term) ? 2
      : at + 2
  }
  return total
}

async function toEntry(ws: Workspace): Promise<WorkspaceEntry> {
  return {
    id: ws.id,
    title: ws.title,
    path: ws.path,
    createdAt: ws.createdAt,
    updatedAt: ws.updatedAt,
    sessionIds: [...ws.sessionIds],
    sessionCount: ws.sessionIds.length,
    missingDir: (await ws.status()) === 'missing-dir',
  }
}

/** Enrich every registry workspace; newest activity first. */
export async function listWorkspaces(registry: { list(): Workspace[] }): Promise<WorkspaceEntry[]> {
  const entries = await Promise.all(registry.list().map(toEntry))
  entries.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0))
  return entries
}

/**
 * Ranked fuzzy search over title, path segments, and full path.
 * Empty query returns everything sorted by recency.
 */
export async function findWorkspaces(
  registry: { list(): Workspace[] },
  query: string,
): Promise<WorkspaceMatch[]> {
  const q = norm(query)
  const entries = await listWorkspaces(registry)
  if (q.length === 0) return entries.map((entry) => ({ ...entry, score: 0, why: 'recent' }))
  const matches: WorkspaceMatch[] = []
  for (const entry of entries) {
    const segments = entry.path.replace(/[/\\]+$/, '').split(/[/\\]/).filter(Boolean)
    const haystacks: ReadonlyArray<{ text: string; why: string }> = [
      { text: entry.title, why: 'title' },
      { text: entry.path, why: 'path' },
      { text: segments.join(' '), why: 'segments' },
    ]
    let best = Number.POSITIVE_INFINITY
    let why = ''
    for (const { text, why: label } of haystacks) {
      const score = scoreQuery(text, q)
      if (score < best) {
        best = score
        why = label
      }
    }
    if (Number.isFinite(best)) matches.push({ ...entry, score: best, why })
  }
  matches.sort((a, b) => a.score - b.score || (a.updatedAt < b.updatedAt ? 1 : -1))
  return matches
}

/** Resolve a user query to one workspace when unambiguous. */
export async function resolveOne(
  registry: { list(): Workspace[] },
  query: string,
): Promise<ResolveResult> {
  const q = norm(query)
  if (q.length === 0) return { ok: false, reason: 'none', candidates: [] }
  const matches = await findWorkspaces(registry, q)
  if (matches.length === 0) return { ok: false, reason: 'none', candidates: [] }
  const exact = matches.filter((m) => m.title === q || m.path === q)
  // `matches.length` is checked above, so first/second are safe to read.
  const first = matches[0] as WorkspaceMatch
  if (exact.length === 1) return { ok: true, entry: exact[0] as WorkspaceMatch }
  if (matches.length === 1) return { ok: true, entry: first }
  const second = matches[1] as WorkspaceMatch
  if (first.score < second.score) return { ok: true, entry: first }
  return { ok: false, reason: 'ambiguous', candidates: matches.slice(0, 8) }
}

/** Localized human label of the matched field key. */
export function matchFieldLabel(why: string): string {
  if (detectLocale() !== 'zh') return why
  const zhLabels: Record<string, string> = { title: '标题', path: '路径', segments: '分段', recent: '最近活动' }
  return zhLabels[why] ?? why
}

/** Markdown line describing one workspace entry. */
export function entryLine(entry: WorkspaceEntry): string {
  const when = entry.updatedAt.slice(0, 10)
  const count = entry.sessionCount
  const missing = entry.missingDir ? L(' ⚠ 目录当前不存在', ' ⚠ directory currently missing') : ''
  const meta = L('（{count} 个会话，最近 {when}）', ' ({count} sessions, latest {when})', { count, when })
  return `· **${entry.title}** — ${entry.path}${meta}${missing}`
}
