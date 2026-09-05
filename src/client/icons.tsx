/**
 * SVG icon set for per-workspace appearance (browser face).
 *
 * Replaces the old emoji palette: a workspace appearance stores a *key*
 * from `WORKSPACE_ICONS` (lucide-react, bundled into lib/client.js) instead
 * of an emoji glyph. Snapshots persisted before this change (localStorage
 * `dsh.workspace-kit.archive.v1`) hold emoji strings in the same index order
 * as the old picker, so `iconKeyOf` maps them 1:1 to the new keys — no user
 * setting is lost and nothing needs a data migration.
 *
 * @module dsh-workspace-kit/icons
 */

import type { CSSProperties } from 'react'
import {
  BookOpen,
  Bot,
  Brain,
  ChartColumn,
  Coins,
  Construction,
  Database,
  FileText,
  Files,
  Flame,
  FlaskConical,
  Folder,
  FolderOpen,
  Gamepad2,
  Ghost,
  Globe,
  Joystick,
  Lightbulb,
  Map,
  Package,
  Palette,
  Puzzle,
  Rocket,
  Settings,
  SlidersHorizontal,
  Snowflake,
  Sprout,
  Star,
  Target,
  TrendingUp,
  Wrench,
  Zap,
} from 'lucide-react'

/** Every lucide icon is this shape; captured from one instance for typing. */
type IconComponent = typeof Folder

/** Palette of per-workspace icons (pick order = key order). */
export const WORKSPACE_ICON_KEYS = [
  'folder', 'folder-open', 'files', 'star', 'flame', 'rocket',
  'flask', 'settings', 'package', 'file-text', 'target', 'brain',
  'lightbulb', 'wrench', 'globe', 'database', 'puzzle', 'palette',
  'chart', 'trending-up', 'bot', 'ghost', 'zap', 'sliders',
  'joystick', 'sprout', 'construction', 'book', 'coins', 'gamepad',
  'map', 'snowflake',
] as const

export type WorkspaceIconKey = (typeof WORKSPACE_ICON_KEYS)[number]

const ICONS: Readonly<Record<WorkspaceIconKey, IconComponent>> = {
  'folder': Folder,
  'folder-open': FolderOpen,
  'files': Files,
  'star': Star,
  'flame': Flame,
  'rocket': Rocket,
  'flask': FlaskConical,
  'settings': Settings,
  'package': Package,
  'file-text': FileText,
  'target': Target,
  'brain': Brain,
  'lightbulb': Lightbulb,
  'wrench': Wrench,
  'globe': Globe,
  'database': Database,
  'puzzle': Puzzle,
  'palette': Palette,
  'chart': ChartColumn,
  'trending-up': TrendingUp,
  'bot': Bot,
  'ghost': Ghost,
  'zap': Zap,
  'sliders': SlidersHorizontal,
  'joystick': Joystick,
  'sprout': Sprout,
  'construction': Construction,
  'book': BookOpen,
  'coins': Coins,
  'gamepad': Gamepad2,
  'map': Map,
  'snowflake': Snowflake,
}

/** Emoji strings the pre-SVG picker offered, in pick order (index 1:1 with keys). */
const LEGACY_EMOJI_CHOICES = [
  '📁', '🗂️', '📂', '⭐', '🔥', '🚀', '🧪', '⚙️', '📦', '📄',
  '🎯', '🧠', '💡', '🛠️', '🌐', '🗄️', '🧩', '🎨', '📊', '📈',
  '🤖', '👾', '⚡', '🎛️', '🕹️', '🌱', '🏗️', '📚', '💰', '🎮',
  '🗺️', '🧊',
] as const

/**
 * Normalize a stored `icon` value to a current palette key. Accepts new
 * keys as-is; legacy emoji values resolve positionally to the equivalent
 * new key; anything else (never produced by this plugin) is undefined.
 */
export function iconKeyOf(icon: string | undefined | null): WorkspaceIconKey | undefined {
  if (!icon) return undefined
  if (icon in ICONS) return icon as WorkspaceIconKey
  const legacyIndex = (LEGACY_EMOJI_CHOICES as readonly string[]).indexOf(icon)
  return legacyIndex >= 0 ? WORKSPACE_ICON_KEYS[legacyIndex] : undefined
}

/**
 * Render one workspace icon. When the stored value is a legacy emoji it is
 * transparently resolved to the matching SVG. A missing/unresolvable icon
 * falls back to the accent color dot (when a color is set) — the same visual
 * contract the emoji version had.
 */
export function WorkspaceGlyph(props: {
  /** Stored appearance.icon — a palette key or a legacy emoji value. */
  icon?: string | null
  /** Stored appearance.color (CSS hex), used as the dot fallback. */
  color?: string | null
  size?: number
  strokeWidth?: number
  style?: CSSProperties
}): JSX.Element | null {
  const { icon, color, size = 14, strokeWidth = 1.8, style } = props
  const key = iconKeyOf(icon)
  if (key) {
    const IconComponent = ICONS[key]
    return <IconComponent size={size} strokeWidth={strokeWidth} aria-hidden style={style} />
  }
  if (color) {
    return <span style={{ width: size - 4, height: size - 4, borderRadius: size / 2, background: color, ...style }} />
  }
  return null
}
