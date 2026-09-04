/**
 * Sidebar footer toggle (browser face of dsh-workspace-kit).
 *
 * Occupies the official `sidebar.footer.action` list slot (always visible,
 * whichever workspace browser renders) and flips between the plugin sidebar
 * (archive folding) and the official sidebar browser. The choice persists in
 * the plugin store and is applied by the client apply() listener, which
 * registers/unregisters the plugin's `sidebar.workspaces` occupant.
 *
 * @module dsh-workspace-kit/sidebar-toggle
 */

import type { CSSProperties } from 'react'
import type { ArchiveState } from './archive-store.ts'

/** Selector-shaped props provided by the renderer. */
export interface SidebarToggleProps {
  /** Owner share: wide content vs 56px rail. */
  wide: boolean
  useStore: <T>(selector: (state: ArchiveState) => T) => T
  actions: {
    setOfficialSidebar(official: boolean): void
  }
}

export function SidebarToggle(props: SidebarToggleProps): JSX.Element {
  const { wide, useStore, actions } = props
  const official = Boolean(useStore((state) => state.officialSidebar ?? false))

  const toggle = (): void => {
    const next = !official
    actions.setOfficialSidebar(next)
    window.dispatchEvent(new CustomEvent('dsh-workspace-kit:sidebar-mode', { detail: { official: next } }))
  }

  return (
    <button
      type="button"
      style={wide ? styles.wide : styles.rail}
      title={
        official
          ? '当前为官方侧栏 —— 点击切换到增强侧栏（归档折叠 / 拖拽排序 / 图标颜色）'
          : '当前为增强侧栏 —— 点击切换到官方侧栏'
      }
      onClick={toggle}
    >
      <span style={styles.glyph}>{official ? '◐' : '◑'}</span>
      {wide && <span>{official ? '增强侧栏' : '官方侧栏'}</span>}
    </button>
  )
}

const styles: Record<string, CSSProperties> = {
  wide: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '6px 10px',
    fontSize: 11,
    border: 'none',
    background: 'transparent',
    color: '#5a6478',
    cursor: 'pointer',
    textAlign: 'left',
  },
  rail: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 32,
    fontSize: 14,
    border: 'none',
    background: 'transparent',
    color: '#5a6478',
    cursor: 'pointer',
  },
  glyph: {
    fontSize: 13,
    lineHeight: 1,
  },
}
