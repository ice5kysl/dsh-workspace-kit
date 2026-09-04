# Known limitations & roadmap (dsh-workspace-kit)

Based on a review of the official sources/docs (deepseek-ai/deepseek-harness @ master and the installed `@deepseek-ai/dsh` v0.1.1-rc.2), this is the current boundary of the plugin, why it exists, and the optional next steps. (简体中文版见 [known-limitations.zh-CN.md](./known-limitations.zh-CN.md)。)

## Current limitations

1. **The sidebar is replaced via shadow and the replacement browser is a v1 subset**
   - The official model only has **session-level** archiving (`ctx.workspaceRegistry.archiveSession` → `archivedSessionIds`) with **no unarchive**, and **no workspace-level archive/hide verb**; the sidebar workspace browser occupies `sidebar.workspaces` (single slot) as a built-in, with no third-party per-row seam.
   - Archive state lives in the browser (`defineStore` persist → localStorage `dsh.workspace-kit.archive.v1`). The sidebar **shadows `sidebar.workspaces` at priority -1** to replace the built-in browser so "archived" workspaces leave the main list into a collapsible section; Spotlight's idle list also hides them and shows an "Archived" marker when searching.
   - The replacement browser re-implements: **new workspace** (＋ beside 🔍: system directory picker → register → open), **in-sidebar search** (🔍 expandable input filtering workspace titles/paths and session titles), workspace **rename ✎ / delete-registration 🗑** (confirmed; sessions return to ungrouped), session **archive** (official irreversible set, with confirmation), **drag reorder** (workspace rows → official `insertBefore`; sessions within their workspace → `insertSessionBefore`; after the first manual move the workspace keeps its manual/account order), **view pills** (by workspace / all sessions), **sort** (recency / manual), **full-text session-content search** (≥2 chars, debounced, against the official host content index; hits listed under "session content hits"), **styled dialogs** (rename/delete/archive confirmations replace `prompt`/`confirm`), per-workspace **emoji icon + accent color** picker (browser-persisted), and a footer **enhanced/official sidebar toggle** (`sidebar.footer.action`; switching to the official sidebar unregisters the plugin occupant so the built-in browser at priority 0 renders again; the choice persists). The built-in browser's remaining advanced capabilities are not re-implemented.
   - Hiding the sidebar *entirely* is out of reach for a third-party plugin: (a) shadow-rewriting the whole `sidebar.workspaces` (≈ rewriting the built-in browser) or (b) upstream adding `archiveWorkspace`/`unarchiveWorkspace` verbs plus row-level extension points to the workspace controller/registry — the recommended upstream direction.

2. **The archive set is browser-local**
   - Same mechanism as built-in view preferences (e.g. `dsh.workspace.view.v5`): no sync across browsers/devices; a fresh browser needs re-archiving.
   - The host side deliberately keeps **no second copy**: two copies would drift, and there is no third-party host↔client custom RPC (the client can only consume build-time-generated `ctx.remote.*` namespaces).

3. **Spotlight opening a workspace = the official "new session" flow**
   - `ctx.workspaces.startSession(workspaceId)` reuses an available blank session or creates one and makes it current. If the directory was moved/deleted, behavior follows the official host (an error may surface in the list state).

4. **Host tools are read-only and ignore browser archive state**
   - `workspace_find` / `workspace_list` and `/workspace-find` / `/workspace-list` enumerate the official registry (all workspaces, without the browser's archive filter) for location purposes only; archive/restore write actions live only in the GUI (browser).

5. **Theme & copy conventions**
   - UI copy is now **bilingual (Simplified Chinese / English)** via the plugin's own locale module (browser: localStorage `dsh.workspace-kit.locale` → `navigator.language`; host: env `WSKIT_LOCALE` → `LC_ALL`/`LANG`; default English).
   - Styles are still **inline styles** and do not follow the system light/dark theme. The upstream convention wants CSS-variable tokens + locale dictionaries checked inside the official repo; as an out-of-tree package this plugin is not wired into that build check.

## Backlog (roadmap)

- **Upstream-ize**: add `archiveWorkspace` / `unarchiveWorkspace` verbs to the workspace domain (host storageDomain persistence + follow deltas + UI row-level entry points); the plugin then becomes a thin shell.
- **Cross-device archive sync** (host-side domain storage + custom remote verbs — needs upstream typert/generator support for out-of-tree remote protocols).
- **Spotlight enhancements**: session-content search in the palette, recent items, `>` command mode, drag reorder, theme following.
- **Upstream contract regression**: whenever `@deepseek-ai/dsh` moves to a new rc, re-validate the browser contract (`shell.overlay`, `IWorkspaces.startSession`, `ISessions.open`, `defineStore` persist) and update the plugin accordingly.
