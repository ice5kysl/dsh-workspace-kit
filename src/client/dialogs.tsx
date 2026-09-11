/**
 * Minimal styled dialog bridge (browser face of dsh-workspace-kit).
 *
 * Replaces window.prompt/confirm for plugin flows with in-app styled dialogs.
 * A tiny module-scoped store keeps exactly one request at a time; the
 * `DialogHost` component (registered into `shell.overlay`) renders it. UI
 * components never see ctx — they call the exported request helpers.
 *
 * @module dsh-workspace-kit/dialogs
 */

import { useEffect, useRef, useSyncExternalStore, type CSSProperties } from 'react'
import { L } from './locale.ts'

export type DialogRequest =
  | {
    readonly kind: 'confirm'
    readonly title: string
    readonly message?: string
    readonly okLabel?: string
  }
  | {
    readonly kind: 'prompt'
    readonly title: string
    readonly message?: string
    readonly initial?: string
    readonly placeholder?: string
    readonly okLabel?: string
  }

interface Pending {
  readonly request: DialogRequest
  resolve: (value: string | boolean | null) => void
}

let pending: Pending | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function settle(value: string | boolean | null): void {
  if (!pending) return
  const p = pending
  pending = null
  emit()
  p.resolve(value)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): DialogRequest | null {
  return pending?.request ?? null
}

/** Ask a styled confirm. Resolves true when the user confirms. */
export function requestConfirm(request: Omit<Extract<DialogRequest, { kind: 'confirm' }>, 'kind'>): Promise<boolean> {
  return new Promise((resolve) => {
    pending = { request: { kind: 'confirm', ...request }, resolve: resolve as (v: string | boolean | null) => void }
    emit()
  })
}

/** Ask a styled single-line prompt. Resolves the text, or null on cancel. */
export function requestPrompt(request: Omit<Extract<DialogRequest, { kind: 'prompt' }>, 'kind'>): Promise<string | null> {
  return new Promise((resolve) => {
    pending = { request: { kind: 'prompt', ...request }, resolve: resolve as (v: string | boolean | null) => void }
    emit()
  })
}

/** Dialog overlay host — register into `shell.overlay` (additive id). */
export function DialogHost(): JSX.Element | null {
  const request = useSyncExternalStore(subscribe, getSnapshot)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!request) return
    if (request.kind === 'prompt') {
      const frame = requestAnimationFrame(() => inputRef.current?.select())
      return () => cancelAnimationFrame(frame)
    }
  }, [request])

  useEffect(() => {
    if (!request) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        settle(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [request])

  if (!request) return null

  const ok = (): void => {
    if (request.kind === 'prompt') {
      const value = (inputRef.current?.value ?? '').trim()
      settle(value.length > 0 ? value : null)
    } else {
      settle(true)
    }
  }

  return (
    <div style={styles.backdrop} onMouseDown={() => settle(null)}>
      <div style={styles.card} role="dialog" aria-label={request.title} onMouseDown={(e) => e.stopPropagation()}>
        <div style={styles.title}>{request.title}</div>
        {request.kind === 'confirm' && request.message && <div style={styles.message}>{request.message}</div>}
        {request.kind === 'prompt' && (
          <>
            {request.message && <div style={styles.message}>{request.message}</div>}
            <input
              ref={inputRef}
              style={styles.input}
              defaultValue={request.initial}
              placeholder={request.placeholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') ok()
              }}
            />
          </>
        )}
        <div style={styles.actions}>
          <button style={styles.button} onClick={() => settle(null)}>
            {L('取消', 'Cancel')}
          </button>
          <button
            style={{ ...styles.button, ...styles.primary }}
            onClick={ok}
            autoFocus={request.kind === 'confirm'}
          >
            {request.okLabel ?? L('确定', 'OK')}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(15, 18, 26, 0.45)',
  },
  card: {
    width: 360,
    maxWidth: 'calc(100vw - 48px)',
    background: 'var(--dsw-alias-bg-layer-2, #ffffff)',
    color: 'var(--dsw-alias-label-primary, #1c2333)',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 18px 48px rgba(15, 18, 26, 0.3)',
  },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 8 },
  message: { fontSize: 12.5, color: 'var(--dsw-alias-label-secondary, #3c4659)', lineHeight: 1.5, marginBottom: 10, whiteSpace: 'pre-wrap' },
  input: {
    width: '100%', boxSizing: 'border-box', fontSize: 13, padding: '7px 10px', borderRadius: 8,
    border: '1px solid var(--dsw-alias-border-l2, rgba(28, 35, 51, 0.2))', outline: 'none', marginBottom: 12,
    background: 'var(--dsw-alias-bg-layer-1, transparent)', color: 'var(--dsw-alias-label-primary, inherit)',
  },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  button: {
    fontSize: 12.5, padding: '5px 14px', borderRadius: 8,
    border: '1px solid var(--dsw-alias-border-l2, rgba(28, 35, 51, 0.14))', background: 'var(--dsw-alias-bg-layer-1, #ffffff)', color: 'var(--dsw-alias-label-primary, #3c4659)', cursor: 'pointer',
  },
  primary: {
    background: 'var(--dsw-alias-button-primary-fill, #2d66f7)', borderColor: 'transparent', color: '#ffffff',
  },
}
