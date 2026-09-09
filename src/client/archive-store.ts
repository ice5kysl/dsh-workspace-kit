/**
 * Soft-archive + per-workspace appearance store (browser face).
 *
 * - "Archiving" a workspace is a view-layer action: it hides the workspace
 *   (and its sessions) from the plugin's own surfaces and stays restorable,
 *   without deleting or mutating any host state.
 * - Per-workspace appearance: an optional SVG icon key and/or a `color`
 *   (CSS hex) shown at the row's left slot in the sidebar and Spotlight.
 *
 * Persisted in the browser via the framework store engine (localStorage,
 * key `dsh.workspace-kit.archive.v1`).
 *
 * @module dsh-workspace-kit/archive-store
 */

import { defineStore } from '@deepseek-ai/dsh-client-store'

/** Durable record of one archived workspace. */
export interface ArchiveRecord {
  /** ISO-8601 instant of the archive action. */
  readonly at: string
}

/** Optional per-workspace look (both fields optional; clear removes the entry). */
export interface WorkspaceAppearance {
  /** SVG icon key (see icons.tsx) shown at the row's icon slot. */
  readonly icon?: string
  /** CSS color (hex) used for the row icon slot background / dot. */
  readonly color?: string
}

export interface ArchiveState {
  /** workspaceId → archive record. */
  readonly archived: Record<string, ArchiveRecord>
  /** workspaceId → appearance. */
  readonly appearance: Record<string, WorkspaceAppearance>
  /** true = use the official sidebar browser; false = plugin sidebar (default). */
  readonly officialSidebar: boolean
}

/**
 * Declare the store handle. Created inside `apply()` (no module-level
 * handle) and handed to the slot registrations, whose framework instances key
 * persistence and exposure (`useStore` / bound `actions`).
 */
export function createArchiveStore() {
  return defineStore({
    init: (): ArchiveState => ({ archived: {}, appearance: {}, officialSidebar: false }),
    persist: 'dsh.workspace-kit.archive.v1',
    actions: {
      /** Mark one workspace archived. */
      archive(draft: ArchiveState, workspaceId: string, at: string): void {
        draft.archived[workspaceId] = { at }
      },
      /** Restore one workspace to the active set. */
      restore(draft: ArchiveState, workspaceId: string): void {
        delete draft.archived[workspaceId]
      },
      /** Set (or clear, when `null`) one workspace's icon/color look. */
      setAppearance(draft: ArchiveState, workspaceId: string, appearance: WorkspaceAppearance | null): void {
        // Stored snapshots written before the appearance field existed may
        // lack it; treat absence as an empty map instead of crashing.
        const state = draft as ArchiveState & { appearance?: Record<string, WorkspaceAppearance> }
        if (!state.appearance) state.appearance = {}
        if (appearance === null) {
          delete state.appearance[workspaceId]
        } else {
          state.appearance[workspaceId] = appearance
        }
      },
      /** Switch between the plugin sidebar and the official sidebar browser. */
      setOfficialSidebar(draft: ArchiveState, official: boolean): void {
        const state = draft as ArchiveState & { officialSidebar?: boolean }
        state.officialSidebar = official
      },
    },
  })
}

export type ArchiveStoreHandle = ReturnType<typeof createArchiveStore>
