/**
 * Host-side (node) locale detection for dsh-workspace-kit.
 *
 * Resolution order:
 *   1. `WSKIT_LOCALE=zh|en` environment variable (explicit override);
 *   2. `LC_ALL` / `LANG` starting with `zh` → Chinese;
 *   3. default: English.
 *
 * The locale is resolved once per process (host tools/commands are registered
 * at startup and the value is stable for the process lifetime).
 *
 * @module dsh-workspace-kit/host-locale
 */

import { localize, normalizeLocale, type Locale, type Vars } from '../shared/i18n.ts'

let cached: Locale | undefined

/** Resolve the effective locale for this process (cached). */
export function detectLocale(): Locale {
  if (cached) return cached
  const override = (process.env.WSKIT_LOCALE ?? '').toLowerCase()
  if (override === 'zh' || override === 'en') {
    cached = override as Locale
    return cached
  }
  const envLang = process.env.LC_ALL || process.env.LANG || ''
  cached = normalizeLocale(envLang)
  return cached
}

/**
 * Localized string helper for host-side copy.
 *
 * @param zh Chinese text (may contain `{name}` placeholders)
 * @param en English text (may contain `{name}` placeholders)
 * @param vars optional placeholder values
 */
export function L(zh: string, en: string, vars?: Vars): string {
  return localize(detectLocale(), zh, en, vars)
}
