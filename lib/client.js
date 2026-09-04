window.__ModuleLoader__.load({
	id: "dsh-workspace-kit",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// src/client/archive-store.ts
var import_client = require("@deepseek-ai/dsh-client-runtime/client");
function createArchiveStore() {
  return (0, import_client.defineStore)({
    init: () => ({ archived: {}, appearance: {}, officialSidebar: false }),
    persist: "dsh.workspace-kit.archive.v1",
    actions: {
      /** Mark one workspace archived. */
      archive(draft, workspaceId, at) {
        draft.archived[workspaceId] = { at };
      },
      /** Restore one workspace to the active set. */
      restore(draft, workspaceId) {
        delete draft.archived[workspaceId];
      },
      /** Set (or clear, when `null`) one workspace's icon/color look. */
      setAppearance(draft, workspaceId, appearance) {
        const state = draft;
        if (!state.appearance) state.appearance = {};
        if (appearance === null) {
          delete state.appearance[workspaceId];
        } else {
          state.appearance[workspaceId] = appearance;
        }
      },
      /** Switch between the plugin sidebar and the official sidebar browser. */
      setOfficialSidebar(draft, official) {
        const state = draft;
        state.officialSidebar = official;
      }
    }
  });
}

// src/client/dialogs.tsx
var import_react = require("react");

// src/shared/i18n.ts
function localize(locale, zh, en, vars) {
  const template = locale === "zh" ? zh : en;
  if (!vars) return template;
  return template.replace(
    /\{(\w+)\}/g,
    (raw, name2) => vars[name2] !== void 0 ? String(vars[name2]) : raw
  );
}
function normalizeLocale(raw) {
  const tag = (raw ?? "").toLowerCase();
  if (tag.startsWith("zh")) return "zh";
  return "en";
}

// src/client/locale.ts
var LOCALE_STORAGE_KEY = "dsh.workspace-kit.locale";
var explicit = null;
function detectLocale() {
  if (explicit) return explicit;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "zh" || stored === "en") return stored;
  } catch {
  }
  const nav = typeof navigator !== "undefined" ? navigator : void 0;
  const tags = nav?.languages && nav.languages.length > 0 ? [...nav.languages] : nav?.language ? [nav.language] : [];
  for (const tag of tags) {
    const locale = normalizeLocale(tag);
    if (locale === "zh") return locale;
  }
  return "en";
}
function L(zh, en, vars) {
  return localize(detectLocale(), zh, en, vars);
}

// src/client/dialogs.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var pending = null;
var listeners = /* @__PURE__ */ new Set();
function emit() {
  for (const listener of listeners) listener();
}
function settle(value) {
  if (!pending) return;
  const p = pending;
  pending = null;
  emit();
  p.resolve(value);
}
function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot() {
  return pending?.request ?? null;
}
function requestConfirm(request) {
  return new Promise((resolve) => {
    pending = { request: { kind: "confirm", ...request }, resolve };
    emit();
  });
}
function requestPrompt(request) {
  return new Promise((resolve) => {
    pending = { request: { kind: "prompt", ...request }, resolve };
    emit();
  });
}
function DialogHost() {
  const request = (0, import_react.useSyncExternalStore)(subscribe, getSnapshot);
  const inputRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (!request) return;
    if (request.kind === "prompt") {
      const frame = requestAnimationFrame(() => inputRef.current?.select());
      return () => cancelAnimationFrame(frame);
    }
  }, [request]);
  (0, import_react.useEffect)(() => {
    if (!request) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        settle(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [request]);
  if (!request) return null;
  const ok = () => {
    if (request.kind === "prompt") {
      const value = (inputRef.current?.value ?? "").trim();
      settle(value.length > 0 ? value : null);
    } else {
      settle(true);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.backdrop, onMouseDown: () => settle(null), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.card, role: "dialog", "aria-label": request.title, onMouseDown: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.title, children: request.title }),
    request.kind === "confirm" && request.message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.message, children: request.message }),
    request.kind === "prompt" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      request.message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.message, children: request.message }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          ref: inputRef,
          style: styles.input,
          defaultValue: request.initial,
          placeholder: request.placeholder,
          onKeyDown: (e) => {
            if (e.key === "Enter") ok();
          }
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.actions, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: styles.button, onClick: () => settle(null), children: L("\u53D6\u6D88", "Cancel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          style: { ...styles.button, ...styles.primary },
          onClick: ok,
          autoFocus: request.kind === "confirm",
          children: request.okLabel ?? L("\u786E\u5B9A", "OK")
        }
      )
    ] })
  ] }) });
}
var styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1e4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(15, 18, 26, 0.35)"
  },
  card: {
    width: 360,
    maxWidth: "calc(100vw - 48px)",
    background: "#ffffff",
    color: "#1c2333",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 18px 48px rgba(15, 18, 26, 0.3)"
  },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 8 },
  message: { fontSize: 12.5, color: "#3c4659", lineHeight: 1.5, marginBottom: 10, whiteSpace: "pre-wrap" },
  input: {
    width: "100%",
    boxSizing: "border-box",
    fontSize: 13,
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid rgba(28, 35, 51, 0.2)",
    outline: "none",
    marginBottom: 12
  },
  actions: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  button: {
    fontSize: 12.5,
    padding: "5px 14px",
    borderRadius: 8,
    border: "1px solid rgba(28, 35, 51, 0.14)",
    background: "#ffffff",
    color: "#3c4659",
    cursor: "pointer"
  },
  primary: {
    background: "#2d66f7",
    borderColor: "#2d66f7",
    color: "#ffffff"
  }
};

// src/client/SidebarToggle.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function SidebarToggle(props) {
  const { wide, useStore, actions } = props;
  const official = Boolean(useStore((state) => state.officialSidebar ?? false));
  const toggle = () => {
    const next = !official;
    actions.setOfficialSidebar(next);
    window.dispatchEvent(new CustomEvent("dsh-workspace-kit:sidebar-mode", { detail: { official: next } }));
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "button",
    {
      type: "button",
      style: wide ? styles2.wide : styles2.rail,
      title: official ? L(
        "\u5F53\u524D\u4E3A\u5B98\u65B9\u4FA7\u680F \u2014\u2014 \u70B9\u51FB\u5207\u6362\u5230\u589E\u5F3A\u4FA7\u680F\uFF08\u5F52\u6863\u6298\u53E0 / \u62D6\u62FD\u6392\u5E8F / \u56FE\u6807\u989C\u8272\uFF09",
        "Currently the official sidebar \u2014 click to switch to the enhanced sidebar (archive folding / drag reorder / icon colors)"
      ) : L("\u5F53\u524D\u4E3A\u589E\u5F3A\u4FA7\u680F \u2014\u2014 \u70B9\u51FB\u5207\u6362\u5230\u5B98\u65B9\u4FA7\u680F", "Currently the enhanced sidebar \u2014 click to switch to the official sidebar"),
      onClick: toggle,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: styles2.glyph, children: official ? "\u25D0" : "\u25D1" }),
        wide && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: official ? L("\u589E\u5F3A\u4FA7\u680F", "Enhanced sidebar") : L("\u5B98\u65B9\u4FA7\u680F", "Official sidebar") })
      ]
    }
  );
}
var styles2 = {
  wide: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    padding: "6px 10px",
    fontSize: 11,
    border: "none",
    background: "transparent",
    color: "#5a6478",
    cursor: "pointer",
    textAlign: "left"
  },
  rail: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 32,
    fontSize: 14,
    border: "none",
    background: "transparent",
    color: "#5a6478",
    cursor: "pointer"
  },
  glyph: {
    fontSize: 13,
    lineHeight: 1
  }
};

// src/client/Spotlight.tsx
var import_react2 = require("react");
var import_jsx_runtime3 = require("react/jsx-runtime");
var MAX_ROWS = 40;
function norm(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}
function scoreText(field, query) {
  const f = field.toLowerCase();
  const q = norm(query);
  if (q.length === 0) return 0;
  const terms = q.split(" ");
  let total = 0;
  for (const term of terms) {
    const at = f.indexOf(term);
    if (at < 0) return Number.POSITIVE_INFINITY;
    total += at === 0 ? 1 : f[at - 1] === " " || f[at - 1] === "/" ? 2 : at + 3;
  }
  return total;
}
function bestScore(query, fields) {
  let best = Number.POSITIVE_INFINITY;
  for (const field of fields) {
    const score = scoreText(field, query);
    if (score < best) best = score;
  }
  return best;
}
function byRecencyDesc(a, b) {
  return a < b ? 1 : a > b ? -1 : 0;
}
function workspaceIdOfSession(workspaceItems, sessionId) {
  for (const item of workspaceItems) {
    if (Array.isArray(item.sessionIds) && item.sessionIds.includes(sessionId)) {
      return item.workspaceId;
    }
  }
  return void 0;
}
function buildSections(query, sessionsState, workspacesState, archived, showArchived, kind) {
  const q = norm(query);
  const byId = sessionsState?.byId ?? {};
  const sessionIds = Array.isArray(sessionsState?.ids) ? sessionsState.ids : [];
  const workspaceItems = workspacesState?.items ?? [];
  const builtinArchivedSessionIds = new Set(workspacesState?.archivedSessionIds ?? []);
  const searching = q.length > 0;
  const activeWs = [];
  const archivedWs = [];
  for (const item of workspaceItems) {
    const id = item.workspaceId;
    const rec = archived[id];
    const score = searching ? bestScore(q, [item.title, item.path]) : 0;
    if (searching && !Number.isFinite(score)) continue;
    const row = {
      kind: "workspace",
      id,
      title: item.title,
      path: item.path,
      updatedAt: item.updatedAt,
      archivedAt: rec?.at,
      sessionCount: Array.isArray(item.sessionIds) ? item.sessionIds.length : 0,
      archived: Boolean(rec),
      score
    };
    if (rec) archivedWs.push(row);
    else activeWs.push(row);
  }
  const sortWs = (list) => [...list].sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.archivedAt && b.archivedAt) return byRecencyDesc(a.archivedAt, b.archivedAt);
    return byRecencyDesc(a.updatedAt, b.updatedAt);
  });
  const activeSorted = sortWs(activeWs);
  const archivedSorted = sortWs(archivedWs);
  const archivedWorkspaceIds = new Set(archivedSorted.map((r) => String(r.id)));
  const workspaceTitleById = /* @__PURE__ */ new Map();
  for (const item of workspaceItems) {
    for (const sid of item.sessionIds ?? []) workspaceTitleById.set(sid, item.title);
  }
  const sessions = [];
  for (const id of sessionIds) {
    const session = byId[id];
    if (!session || session.origin === "subagent" || session.blank) continue;
    const wsId = workspaceIdOfSession(workspaceItems, String(id));
    const workspaceArchived = wsId !== void 0 && archivedWorkspaceIds.has(wsId);
    const grouped = workspaceTitleById.has(String(id));
    const allowUngrouped = kind === "sessions";
    if (!searching) {
      if (workspaceArchived || builtinArchivedSessionIds.has(String(id)) || !grouped && !allowUngrouped) {
        continue;
      }
    }
    const score = searching ? bestScore(q, [session.displayTitle ?? "", session.title ?? "", session.cwd ?? ""]) : 1;
    if (searching && !Number.isFinite(score)) continue;
    sessions.push({
      kind: "session",
      id,
      title: session.displayTitle ?? session.title ?? id,
      cwd: session.cwd,
      workspaceTitle: workspaceTitleById.get(String(id)),
      workspaceArchived,
      updatedAt: session.updatedAt ?? 0,
      running: Boolean(session.running),
      score
    });
  }
  sessions.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? -1 : 1;
    return a.title < b.title ? -1 : 1;
  });
  const showWorkspaces = kind !== "sessions";
  const showSessions = kind !== "workspaces";
  if (searching) {
    const secs2 = [];
    const wsRows = [...activeSorted, ...archivedSorted].slice(0, MAX_ROWS);
    if (showWorkspaces && wsRows.length > 0) secs2.push({ key: "workspaces", label: L("\u5DE5\u4F5C\u533A", "Workspaces"), rows: wsRows });
    if (showSessions && sessions.length > 0) secs2.push({ key: "sessions", label: L("\u4F1A\u8BDD", "Sessions"), rows: sessions });
    return secs2;
  }
  const secs = [];
  if (showWorkspaces && activeSorted.length > 0) {
    secs.push({ key: "workspaces", label: L("\u5DE5\u4F5C\u533A", "Workspaces"), rows: activeSorted.slice(0, MAX_ROWS) });
  }
  if (showSessions) {
    const idleSessions = sessions.filter((s) => !s.workspaceArchived).slice(0, 30);
    if (idleSessions.length > 0) secs.push({ key: "sessions", label: L("\u4F1A\u8BDD", "Sessions"), rows: idleSessions });
  }
  if (showWorkspaces && archivedSorted.length > 0 && showArchived) {
    secs.push({ key: "archived", label: L("\u5DF2\u5F52\u6863", "Archived"), rows: archivedSorted.slice(0, MAX_ROWS) });
  }
  return secs;
}
function SpotlightPalette(props) {
  const { useSessions, useWorkspaces, useStore, actions, openWorkspace, openSession, archiveSession } = props;
  const [open, setOpen] = (0, import_react2.useState)(false);
  const [query, setQuery] = (0, import_react2.useState)("");
  const [cursor, setCursor] = (0, import_react2.useState)(0);
  const [showArchived, setShowArchived] = (0, import_react2.useState)(false);
  const [kind, setKind] = (0, import_react2.useState)("all");
  const inputRef = (0, import_react2.useRef)(null);
  const flatRef = (0, import_react2.useRef)([]);
  const cursorRef = (0, import_react2.useRef)(0);
  cursorRef.current = cursor;
  const archived = useStore((state) => state.archived ?? {});
  const appearanceMap = useStore((state) => state.appearance ?? {});
  const sessionsState = typeof useSessions === "function" ? useSessions((state) => state) : void 0;
  const workspacesState = typeof useWorkspaces === "function" ? useWorkspaces((state) => state) : void 0;
  (0, import_react2.useEffect)(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const onOpenRequest = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("dsh-workspace-kit:open", onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("dsh-workspace-kit:open", onOpenRequest);
    };
  }, []);
  (0, import_react2.useEffect)(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    setShowArchived(false);
    setKind("all");
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const sections = (0, import_react2.useMemo)(
    () => buildSections(query, sessionsState, workspacesState, archived, showArchived, kind),
    [query, sessionsState, workspacesState, archived, showArchived, kind]
  );
  const display = (0, import_react2.useMemo)(() => {
    const displaySections = [];
    const flatRows = [];
    let budget = MAX_ROWS;
    for (const section of sections) {
      if (budget <= 0) break;
      const take = section.rows.slice(0, budget);
      displaySections.push({ ...section, rows: take });
      flatRows.push(...take);
      budget -= take.length;
    }
    return { sections: displaySections, flat: flatRows };
  }, [sections]);
  (0, import_react2.useEffect)(() => {
    flatRef.current = display.flat;
    const max = Math.max(0, display.flat.length - 1);
    if (cursor > max) setCursor(max);
  }, [display.flat, cursor]);
  function activate(row) {
    if (row.kind === "workspace") openWorkspace(row.id);
    else openSession(row.id);
    setOpen(false);
  }
  function toggleArchived(row) {
    if (row.kind !== "workspace") return;
    if (row.archived) actions.restore(row.id);
    else actions.archive(row.id, (/* @__PURE__ */ new Date()).toISOString());
  }
  (0, import_react2.useEffect)(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      const rowsNow = flatRef.current;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        setCursor((c) => Math.max(0, Math.min(c + delta, Math.max(0, rowsNow.length - 1))));
        return;
      }
      if (event.key === "Enter" && rowsNow.length > 0) {
        event.preventDefault();
        const target = rowsNow[Math.max(0, Math.min(cursorRef.current, rowsNow.length - 1))];
        if (target) activate(target);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);
  if (!open) return null;
  const searching = norm(query).length > 0;
  const rowCount = display.flat.length;
  const archivedTotal = workspaceItemsArchivedCount(workspacesState, archived);
  const idleArchivedHidden = !searching && archivedTotal > 0 && !showArchived;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: styles3.backdrop, onMouseDown: () => setOpen(false), role: "presentation", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "div",
    {
      style: styles3.panel,
      role: "dialog",
      "aria-label": L("Spotlight \u5DE5\u4F5C\u533A\u641C\u7D22", "Spotlight workspace search"),
      onMouseDown: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "input",
          {
            ref: inputRef,
            style: styles3.input,
            placeholder: L("\u641C\u7D22\u5DE5\u4F5C\u533A\u6216\u4F1A\u8BDD\u2026\uFF08Esc \u5173\u95ED\uFF09", "Search workspaces or sessions\u2026 (Esc to close)"),
            value: query,
            onChange: (e) => {
              setQuery(e.target.value);
              setCursor(0);
            },
            "aria-label": L("\u641C\u7D22", "Search")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: styles3.chips, children: ["all", "workspaces", "sessions"].map((k) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "button",
          {
            type: "button",
            style: { ...styles3.chip, ...kind === k ? styles3.chipActive : {} },
            onClick: () => {
              setKind(k);
              setCursor(0);
            },
            children: k === "all" ? L("\u5168\u90E8", "All") : k === "workspaces" ? L("\u5DE5\u4F5C\u533A", "Workspaces") : L("\u4F1A\u8BDD", "Sessions")
          },
          k
        )) }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: styles3.body, children: [
          rowCount === 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: styles3.empty, children: query.trim() ? L("\u6CA1\u6709\u5339\u914D\u300C{q}\u300D\u7684\u5DE5\u4F5C\u533A\u6216\u4F1A\u8BDD", 'No workspaces or sessions match "{q}"', { q: query.trim() }) : L("\u8FD8\u6CA1\u6709\u5DE5\u4F5C\u533A\u3002\u4ECE\u4E00\u4E2A\u9879\u76EE\u76EE\u5F55\u5F00\u59CB\u4F1A\u8BDD\u540E\u4F1A\u81EA\u52A8\u51FA\u73B0\u3002", "No workspaces yet. Start a session from a project directory and one will appear automatically.") }),
          display.sections.map((section) => {
            const rowsInSection = section.rows;
            if (rowsInSection.length === 0) return null;
            return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: styles3.sectionHeader, children: section.label }),
              rowsInSection.map((row) => {
                const index = display.flat.indexOf(row);
                const selected = index === cursor;
                const isArchivedWs = row.kind === "workspace" && row.archived;
                return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                  "div",
                  {
                    style: { ...styles3.row, ...selected ? styles3.rowSelected : {} },
                    onMouseEnter: () => setCursor(index),
                    onMouseDown: (e) => {
                      e.stopPropagation();
                      activate(row);
                    },
                    children: [
                      row.kind === "workspace" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: styles3.rowIconSlot, children: appearanceMap[String(row.id)]?.icon ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: appearanceMap[String(row.id)]?.icon }) : appearanceMap[String(row.id)]?.color ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { ...styles3.rowColorDot, background: appearanceMap[String(row.id)]?.color } }) : null }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: styles3.rowMain, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: styles3.rowTitle, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: styles3.rowTitleText, children: row.kind === "workspace" ? row.title : row.title }),
                          isArchivedWs && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: styles3.badgeArchived, children: L("\u5DF2\u5F52\u6863", "Archived") }),
                          row.kind === "session" && row.running && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: styles3.badgeRunning, children: L("\u8FD0\u884C\u4E2D", "Running") })
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: styles3.rowSub, children: row.kind === "workspace" ? `${row.path} \xB7 ${L("{n} \u4E2A\u4F1A\u8BDD", "{n} sessions", { n: row.sessionCount })} \xB7 ${row.updatedAt.slice(0, 10)}` : row.cwd ?? "" })
                      ] }),
                      row.kind === "workspace" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                        "button",
                        {
                          style: styles3.actionButton,
                          title: isArchivedWs ? L("\u6062\u590D\u5DE5\u4F5C\u533A", "Restore workspace") : L("\u5F52\u6863\u5DE5\u4F5C\u533A\uFF08\u8F6F\u5F52\u6863\uFF0C\u53EF\u6062\u590D\uFF09", "Archive workspace (soft archive, restorable)"),
                          onMouseDown: (e) => {
                            e.stopPropagation();
                            toggleArchived(row);
                          },
                          children: isArchivedWs ? L("\u6062\u590D", "Restore") : L("\u5F52\u6863", "Archive")
                        }
                      ),
                      row.kind === "session" && selected && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                        "button",
                        {
                          style: styles3.actionButton,
                          title: L("\u5F52\u6863\u4F1A\u8BDD\uFF08\u5B98\u65B9\u5F52\u6863\u96C6\uFF0C\u4E0D\u53EF\u9006\uFF1A\u4F1A\u4ECE\u6240\u6709\u5217\u8868\u9690\u85CF\uFF0C\u4ECD\u53EF\u4ECE\u641C\u7D22\u6253\u5F00\uFF09", "Archive session (official archive set \u2014 irreversible: hidden from every list, still reachable via search)"),
                          onMouseDown: (e) => {
                            e.stopPropagation();
                            archiveSession(row.id);
                          },
                          children: L("\u5F52\u6863\u4F1A\u8BDD", "Archive session")
                        }
                      )
                    ]
                  },
                  `${row.kind}-${row.id}`
                );
              })
            ] }, section.key);
          }),
          idleArchivedHidden && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "div",
            {
              style: styles3.expandArchived,
              role: "button",
              tabIndex: 0,
              onClick: () => setShowArchived(true),
              onKeyDown: (e) => {
                if (e.key === "Enter") setShowArchived(true);
              },
              children: [
                "\u25B8 ",
                L("\u5DF2\u5F52\u6863 {n} \u9879\uFF08\u70B9\u51FB\u5C55\u5F00\u67E5\u770B / \u6062\u590D\uFF09", "Archived {n} \u2014 click to expand / restore", { n: archivedTotal })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: styles3.footer, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: L("\u2191\u2193 \u9009\u62E9", "\u2191\u2193 Navigate") }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: L("\u21B5 \u6253\u5F00", "\u21B5 Open") }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: searching ? L("{n} \u4E2A\u5339\u914D", "{n} matches", { n: rowCount }) : L("{n} \u9879", "{n} items", { n: rowCount }) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { marginLeft: "auto" }, children: L("Esc \u5173\u95ED", "Esc Close") })
        ] })
      ]
    }
  ) });
}
function workspaceItemsArchivedCount(workspacesState, archived) {
  const items = workspacesState?.items ?? [];
  let count = 0;
  for (const item of items) {
    if (archived[item.workspaceId]) count += 1;
  }
  return count;
}
var styles3 = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: "12vh",
    background: "rgba(15, 18, 26, 0.42)",
    backdropFilter: "blur(2px)"
  },
  panel: {
    width: 620,
    maxWidth: "calc(100vw - 48px)",
    background: "#ffffff",
    color: "#1c2333",
    borderRadius: 14,
    boxShadow: "0 24px 64px rgba(15, 18, 26, 0.35)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column"
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "16px 18px",
    fontSize: 16,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "inherit",
    borderBottom: "1px solid rgba(28, 35, 51, 0.08)"
  },
  chips: {
    display: "flex",
    gap: 6,
    padding: "8px 12px 2px"
  },
  chip: {
    fontSize: 12,
    lineHeight: "22px",
    padding: "0 12px",
    borderRadius: 11,
    border: "1px solid rgba(28, 35, 51, 0.14)",
    background: "transparent",
    color: "#5a6478",
    cursor: "pointer"
  },
  chipActive: {
    background: "rgba(45, 102, 247, 0.12)",
    borderColor: "rgba(45, 102, 247, 0.5)",
    color: "#2d66f7",
    fontWeight: 600
  },
  body: {
    maxHeight: "52vh",
    overflowY: "auto",
    padding: "6px"
  },
  sectionHeader: {
    padding: "8px 12px 4px",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.04em",
    color: "#8a93a6",
    textTransform: "uppercase"
  },
  empty: {
    padding: "28px 16px",
    textAlign: "center",
    color: "#7a8499",
    fontSize: 13
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 12px",
    borderRadius: 9,
    cursor: "pointer"
  },
  rowSelected: {
    background: "rgba(45, 102, 247, 0.10)"
  },
  rowMain: {
    flex: 1,
    minWidth: 0
  },
  rowIconSlot: {
    width: 18,
    height: 18,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  rowColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 6
  },
  rowTitleText: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  rowSub: {
    fontSize: 12,
    color: "#7a8499",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  badgeArchived: {
    fontSize: 10,
    lineHeight: "16px",
    padding: "0 6px",
    borderRadius: 8,
    background: "#eef1f6",
    color: "#5a6478",
    flexShrink: 0
  },
  badgeRunning: {
    fontSize: 10,
    lineHeight: "16px",
    padding: "0 6px",
    borderRadius: 8,
    background: "rgba(45, 102, 247, 0.12)",
    color: "#2d66f7",
    flexShrink: 0
  },
  actionButton: {
    flexShrink: 0,
    fontSize: 12,
    padding: "3px 10px",
    borderRadius: 8,
    border: "1px solid rgba(28, 35, 51, 0.14)",
    background: "#ffffff",
    color: "#3c4659",
    cursor: "pointer"
  },
  expandArchived: {
    margin: "6px 8px",
    padding: "8px 12px",
    borderRadius: 9,
    fontSize: 12,
    color: "#5a6478",
    background: "#f5f7fa",
    cursor: "pointer",
    textAlign: "center"
  },
  footer: {
    display: "flex",
    gap: 14,
    padding: "8px 16px",
    borderTop: "1px solid rgba(28, 35, 51, 0.08)",
    fontSize: 11,
    color: "#8a93a6"
  }
};

// src/client/WorkspaceSidebar.tsx
var import_react3 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
var EMOJI_CHOICES = [
  "\u{1F4C1}",
  "\u{1F5C2}\uFE0F",
  "\u{1F4C2}",
  "\u2B50",
  "\u{1F525}",
  "\u{1F680}",
  "\u{1F9EA}",
  "\u2699\uFE0F",
  "\u{1F4E6}",
  "\u{1F4C4}",
  "\u{1F3AF}",
  "\u{1F9E0}",
  "\u{1F4A1}",
  "\u{1F6E0}\uFE0F",
  "\u{1F310}",
  "\u{1F5C4}\uFE0F",
  "\u{1F9E9}",
  "\u{1F3A8}",
  "\u{1F4CA}",
  "\u{1F4C8}",
  "\u{1F916}",
  "\u{1F47E}",
  "\u26A1",
  "\u{1F39B}\uFE0F",
  "\u{1F579}\uFE0F",
  "\u{1F331}",
  "\u{1F3D7}\uFE0F",
  "\u{1F4DA}",
  "\u{1F4B0}",
  "\u{1F3AE}",
  "\u{1F5FA}\uFE0F",
  "\u{1F9CA}"
];
var COLOR_CHOICES = [
  "#2d66f7",
  "#7c3aed",
  "#0e9f6e",
  "#d97706",
  "#dc2626",
  "#db2777",
  "#0891b2",
  "#52525b",
  "#8a93a6"
];
function byUpdatedDesc(a, b) {
  return a.updatedAt !== b.updatedAt ? a.updatedAt > b.updatedAt ? -1 : 1 : 0;
}
function collectRows(workspacesState, sessionsState, archived) {
  const byId = sessionsState?.byId ?? {};
  const sessionIds = Array.isArray(sessionsState?.ids) ? sessionsState.ids : [];
  const items = workspacesState?.items ?? [];
  const builtinArchived = new Set(workspacesState?.archivedSessionIds ?? []);
  const toSession = (id) => {
    const s = byId[id];
    if (!s || s.origin === "subagent" || s.blank) return void 0;
    return {
      id,
      title: s.displayTitle ?? s.title ?? id,
      updatedAt: s.updatedAt ?? 0,
      running: Boolean(s.running)
    };
  };
  const accounted = /* @__PURE__ */ new Set();
  const byWorkspace = /* @__PURE__ */ new Map();
  for (const item of items) {
    const wsId = String(item.workspaceId);
    const list = [];
    for (const sid of item.sessionIds ?? []) {
      accounted.add(String(sid));
      if (builtinArchived.has(String(sid))) continue;
      const row = toSession(String(sid));
      if (row) list.push(row);
    }
    byWorkspace.set(wsId, list);
  }
  const build = (item) => {
    const wsId = String(item.workspaceId);
    const sessions = byWorkspace.get(wsId) ?? [];
    return {
      id: item.workspaceId,
      title: item.title,
      path: item.path,
      sessionCount: sessions.length,
      archived: Boolean(archived[wsId]),
      sessions
    };
  };
  const active = [];
  const archivedWs = [];
  for (const item of items) {
    const data = build(item);
    if (data.archived) archivedWs.push(data);
    else active.push(data);
  }
  const ungrouped = [];
  for (const id of sessionIds) {
    if (accounted.has(String(id)) || builtinArchived.has(String(id))) continue;
    const row = toSession(String(id));
    if (row) ungrouped.push(row);
  }
  ungrouped.sort(byUpdatedDesc);
  return { active, archivedWs, ungrouped };
}
function collectFlatSessions(workspacesState, sessionsState, archived) {
  const byId = sessionsState?.byId ?? {};
  const sessionIds = Array.isArray(sessionsState?.ids) ? sessionsState.ids : [];
  const items = workspacesState?.items ?? [];
  const builtinArchived = new Set(workspacesState?.archivedSessionIds ?? []);
  const toRow = (id) => {
    const s = byId[id];
    if (!s || s.origin === "subagent" || s.blank) return void 0;
    return {
      id,
      title: s.displayTitle ?? s.title ?? id,
      updatedAt: s.updatedAt ?? 0,
      running: Boolean(s.running)
    };
  };
  const owned = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of items) {
    if (archived[String(item.workspaceId)]) continue;
    for (const sid of item.sessionIds ?? []) {
      owned.add(String(sid));
      if (builtinArchived.has(String(sid))) continue;
      const row = toRow(String(sid));
      if (row) out.push(row);
    }
  }
  for (const id of sessionIds) {
    if (owned.has(String(id)) || builtinArchived.has(String(id))) continue;
    const row = toRow(String(id));
    if (row) out.push(row);
  }
  out.sort(byUpdatedDesc);
  return out;
}
function buildSearchHits(workspacesState, sessionsState, archived, query) {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const match = (text) => {
    const t = text.toLowerCase();
    return terms.every((term) => t.includes(term));
  };
  const byId = sessionsState?.byId ?? {};
  const sessionIds = Array.isArray(sessionsState?.ids) ? sessionsState.ids : [];
  const items = workspacesState?.items ?? [];
  const builtinArchived = new Set(workspacesState?.archivedSessionIds ?? []);
  const hits = [];
  const wsBySession = /* @__PURE__ */ new Map();
  const wsTitleBySession = /* @__PURE__ */ new Map();
  const archivedWsIds = /* @__PURE__ */ new Set();
  for (const item of items) {
    const wsId = String(item.workspaceId);
    if (archived[wsId]) archivedWsIds.add(wsId);
    else if (match(`${item.title} ${item.path}`)) {
      hits.push({ kind: "workspace", id: wsId, title: item.title, sub: item.path });
    }
    for (const sid of item.sessionIds ?? []) {
      wsBySession.set(String(sid), wsId);
      wsTitleBySession.set(String(sid), item.title);
    }
  }
  for (const id of sessionIds) {
    const s = byId[id];
    if (!s || s.origin === "subagent" || s.blank) continue;
    if (builtinArchived.has(String(id))) continue;
    const wsId = wsBySession.get(String(id));
    if (wsId && archivedWsIds.has(wsId)) continue;
    const title = s.displayTitle ?? s.title ?? String(id);
    if (!match(`${title} ${s.cwd ?? ""}`)) continue;
    hits.push({
      kind: "session",
      id: String(id),
      title,
      sub: wsId ? wsTitleBySession.get(String(id)) ?? "" : s.cwd ?? L("\u672A\u5F52\u7EC4", "Ungrouped")
    });
  }
  return hits.slice(0, 40);
}
function WorkspaceSidebar(props) {
  const {
    wide,
    expandSidebar,
    useSessions,
    useWorkspaces,
    useStore,
    actions,
    openSession,
    startSession,
    renameSession,
    forkSession,
    addWorkspace,
    renameWorkspace,
    deleteWorkspace,
    archiveSession,
    reorderWorkspace,
    reorderSession,
    searchContent
  } = props;
  const archived = useStore((state) => state.archived ?? {});
  const appearanceMap = useStore((state) => state.appearance ?? {});
  const sessionsState = typeof useSessions === "function" ? useSessions((state) => state) : void 0;
  const workspacesState = typeof useWorkspaces === "function" ? useWorkspaces((state) => state) : void 0;
  const [expanded, setExpanded] = (0, import_react3.useState)({});
  const [archivedOpen, setArchivedOpen] = (0, import_react3.useState)(false);
  const [ungroupedOpen, setUngroupedOpen] = (0, import_react3.useState)(false);
  const [hovered, setHovered] = (0, import_react3.useState)(null);
  const [searchOpen, setSearchOpen] = (0, import_react3.useState)(false);
  const [searchQ, setSearchQ] = (0, import_react3.useState)("");
  const [sortMode, setSortMode] = (0, import_react3.useState)("updated");
  const [contentHits, setContentHits] = (0, import_react3.useState)([]);
  const [contentLoading, setContentLoading] = (0, import_react3.useState)(false);
  const [drag, setDrag] = (0, import_react3.useState)(null);
  const [over, setOver] = (0, import_react3.useState)(null);
  const [pickerWs, setPickerWs] = (0, import_react3.useState)(null);
  const [viewMode, setViewMode] = (0, import_react3.useState)("grouped");
  const { active, archivedWs, ungrouped } = (0, import_react3.useMemo)(
    () => collectRows(workspacesState, sessionsState, archived),
    [workspacesState, sessionsState, archived]
  );
  const displaySessionsByWs = (0, import_react3.useMemo)(() => {
    const map = {};
    for (const ws of [...active, ...archivedWs]) {
      const key = String(ws.id);
      map[key] = sortMode === "manual" ? ws.sessions : [...ws.sessions].sort(byUpdatedDesc);
    }
    return map;
  }, [active, archivedWs, sortMode]);
  const flatSessions = (0, import_react3.useMemo)(
    () => collectFlatSessions(workspacesState, sessionsState, archived),
    [workspacesState, sessionsState, archived]
  );
  const searchHits = (0, import_react3.useMemo)(
    () => buildSearchHits(workspacesState, sessionsState, archived, searchQ),
    [workspacesState, sessionsState, archived, searchQ]
  );
  const searching = searchOpen && searchQ.trim().length > 0;
  (0, import_react3.useEffect)(() => {
    if (!searchOpen) {
      setContentHits([]);
      setContentLoading(false);
      return;
    }
    const q = searchQ.trim();
    if (q.length < 2) {
      setContentHits([]);
      setContentLoading(false);
      return;
    }
    const ac = new AbortController();
    setContentLoading(true);
    const timer = setTimeout(() => {
      searchContent(q, ac.signal).then((items) => {
        if (!ac.signal.aborted) {
          setContentHits(items);
          setContentLoading(false);
        }
      }).catch(() => {
        if (!ac.signal.aborted) {
          setContentHits([]);
          setContentLoading(false);
        }
      });
    }, 250);
    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [searchOpen, searchQ, searchContent]);
  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  const openSpotlight = () => {
    window.dispatchEvent(new CustomEvent("dsh-workspace-kit:open"));
    if (!wide) expandSidebar();
  };
  const applyAppearance = (wsId, patch) => {
    actions.setAppearance(wsId, patch === null ? null : { ...appearanceMap[wsId] ?? {}, ...patch });
  };
  const stop = (e) => e.preventDefault();
  const onWsDrop = (targetId) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const d = drag;
    setDrag(null);
    setOver(null);
    if (!d || d.kind !== "workspace" || d.id === targetId) return;
    reorderWorkspace(d.id, targetId);
  };
  const onSessionDrop = (wsId, targetId) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const d = drag;
    setDrag(null);
    setOver(null);
    if (!d || d.kind !== "session" || d.wsId !== String(wsId) || d.id === targetId) return;
    setSortMode("manual");
    reorderSession(wsId, d.id, targetId);
  };
  if (!wide) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: styles4.rail, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: styles4.railButton, title: L("Spotlight \u641C\u7D22\uFF08\u2318K\uFF09", "Spotlight search (\u2318K)"), onClick: openSpotlight, children: "\u2318" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "button",
        {
          style: styles4.railButton,
          title: L("\u65B0\u5EFA\u4F1A\u8BDD", "New session"),
          onClick: () => {
            startSession();
            expandSidebar();
          },
          children: "+"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: styles4.railButton, title: L("\u5C55\u5F00\u4FA7\u680F", "Expand sidebar"), onClick: expandSidebar, children: "\xBB" })
    ] });
  }
  const renderSessions = (wsId, sessions) => sessions.map((s) => {
    const dragKey = wsId ? `s:${wsId}:${s.id}` : `s:${s.id}`;
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "div",
      {
        style: {
          ...styles4.sessionRow,
          ...drag && drag.kind === "session" && drag.id === String(s.id) ? styles4.rowDragging : {},
          ...over === dragKey ? styles4.rowDropOver : {}
        },
        title: s.title,
        draggable: wsId !== void 0,
        onMouseEnter: () => setHovered(dragKey),
        onMouseDown: (e) => {
          e.stopPropagation();
          openSession(s.id);
        },
        onDragStart: (e) => {
          if (wsId === void 0) return;
          e.stopPropagation();
          setDrag({ kind: "session", id: String(s.id), wsId: String(wsId) });
          e.dataTransfer.effectAllowed = "move";
        },
        onDragOver: (e) => {
          if (drag?.kind === "session" && drag.wsId === String(wsId) && drag.id !== String(s.id)) {
            stop(e);
            setOver(dragKey);
          }
        },
        onDragLeave: () => setOver((v) => v === dragKey ? null : v),
        onDrop: wsId ? onSessionDrop(wsId, s.id) : void 0,
        onDragEnd: () => {
          setDrag(null);
          setOver(null);
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { ...styles4.dot, ...s.running ? styles4.dotRunning : {} } }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: styles4.sessionTitle, children: s.title }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
            "span",
            {
              style: { ...styles4.sessionActions, display: hovered === dragKey ? "flex" : "none" },
              onMouseDown: (e) => e.stopPropagation(),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: styles4.miniButton, title: L("\u91CD\u547D\u540D", "Rename"), onClick: (e) => {
                  e.stopPropagation();
                  void renameSession(s.id, s.title);
                }, children: "\u270E" }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: styles4.miniButton, title: L("\u590D\u5236\u4F1A\u8BDD\uFF08fork\uFF09", "Duplicate session (fork)"), onClick: (e) => {
                  e.stopPropagation();
                  forkSession(s.id);
                }, children: "\u29C9" }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: styles4.miniButton, title: L("\u5F52\u6863\u4F1A\u8BDD\uFF08\u4E0D\u53EF\u9006\uFF0C\u4ECD\u53EF\u4ECE\u641C\u7D22\u6253\u5F00\uFF09", "Archive session (irreversible, still searchable)"), onClick: (e) => {
                  e.stopPropagation();
                  archiveSession(s.id);
                }, children: L("\u5F52\u6863", "Archive") })
              ]
            }
          )
        ]
      },
      dragKey
    );
  });
  const renderWsRow = (ws, draggable) => {
    const wsKey = `w:${ws.id}`;
    const isOpen = Boolean(expanded[wsKey]);
    const sessions = displaySessionsByWs[String(ws.id)] ?? [];
    const app = appearanceMap[String(ws.id)] ?? {};
    const picking = pickerWs === String(ws.id);
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
        "div",
        {
          style: {
            ...styles4.wsRow,
            ...drag && drag.kind === "workspace" && drag.id === String(ws.id) ? styles4.rowDragging : {},
            ...over === wsKey ? styles4.rowDropOver : {}
          },
          draggable,
          onMouseEnter: () => setHovered(wsKey),
          onMouseDown: (e) => {
            e.stopPropagation();
            toggle(wsKey);
          },
          onDragStart: (e) => {
            if (!draggable) return;
            e.stopPropagation();
            setDrag({ kind: "workspace", id: String(ws.id) });
            e.dataTransfer.effectAllowed = "move";
          },
          onDragOver: (e) => {
            if (draggable && drag?.kind === "workspace" && drag.id !== String(ws.id)) {
              stop(e);
              setOver(wsKey);
            }
          },
          onDragLeave: () => setOver((v) => v === wsKey ? null : v),
          onDrop: draggable ? onWsDrop(ws.id) : void 0,
          onDragEnd: () => {
            setDrag(null);
            setOver(null);
          },
          children: [
            (app.icon || app.color) && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              "span",
              {
                style: styles4.wsIconSlot,
                onMouseDown: (e) => {
                  e.stopPropagation();
                  setPickerWs(picking ? null : String(ws.id));
                },
                title: L("\u70B9\u51FB\u4FEE\u6539\u56FE\u6807 / \u989C\u8272", "Click to change icon / color"),
                children: app.icon ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: styles4.wsIconText, children: app.icon }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { ...styles4.wsColorDot, background: app.color } })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: styles4.wsChevron, children: isOpen ? "\u25BE" : "\u25B8" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: styles4.wsTitle, children: ws.title }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: styles4.wsCount, children: ws.sessionCount }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: { ...styles4.wsActions, display: hovered === wsKey ? "flex" : "none" }, onMouseDown: (e) => e.stopPropagation(), children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                "button",
                {
                  style: styles4.miniButton,
                  title: L("\u8BBE\u7F6E\u56FE\u6807 / \u989C\u8272", "Set icon / color"),
                  onClick: (e) => {
                    e.stopPropagation();
                    setPickerWs(picking ? null : String(ws.id));
                  },
                  children: "\u{1F3A8}"
                }
              ),
              !ws.archived && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: styles4.miniButton, title: L("\u5728\u6B64\u5DE5\u4F5C\u533A\u65B0\u5EFA\u4F1A\u8BDD", "New session in this workspace"), onClick: (e) => {
                e.stopPropagation();
                startSession(ws.id);
              }, children: "\uFF0B" }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                "button",
                {
                  style: ws.archived ? styles4.restoreButton : styles4.miniButton,
                  onClick: (e) => {
                    e.stopPropagation();
                    if (ws.archived) actions.restore(String(ws.id));
                    else actions.archive(String(ws.id), (/* @__PURE__ */ new Date()).toISOString());
                  },
                  children: ws.archived ? L("\u6062\u590D", "Restore") : L("\u5F52\u6863", "Archive")
                }
              ),
              !ws.archived && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: styles4.miniButton, title: L("\u91CD\u547D\u540D\u5DE5\u4F5C\u533A", "Rename workspace"), onClick: (e) => {
                e.stopPropagation();
                void renameWorkspace(ws.id, ws.title);
              }, children: "\u270E" }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: styles4.miniButton, title: L("\u5220\u9664\u5DE5\u4F5C\u533A\u6CE8\u518C\uFF08\u76EE\u5F55\u4E0E\u5386\u53F2\u4F1A\u8BDD\u4FDD\u7559\uFF09", "Remove workspace registration (directory and past sessions kept)"), onClick: (e) => {
                e.stopPropagation();
                deleteWorkspace(ws.id);
              }, children: "\u{1F5D1}" })
            ] })
          ]
        }
      ),
      picking && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: styles4.pickerPanel, onMouseDown: (e) => e.stopPropagation(), children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles4.pickerLabel, children: L("\u56FE\u6807", "Icon") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles4.pickerGrid, children: EMOJI_CHOICES.map((emoji) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "button",
          {
            style: { ...styles4.pickerEmoji, ...app.icon === emoji ? styles4.pickerSelected : {} },
            onClick: () => applyAppearance(String(ws.id), { icon: emoji }),
            children: emoji
          },
          emoji
        )) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles4.pickerLabel, children: L("\u989C\u8272", "Color") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles4.pickerGrid, children: COLOR_CHOICES.map((color) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "button",
          {
            style: { ...styles4.pickerSwatch, background: color, ...app.color === color ? styles4.pickerSelected : {} },
            title: color,
            onClick: () => applyAppearance(String(ws.id), { color })
          },
          color
        )) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "button",
          {
            style: styles4.pickerClear,
            onClick: () => {
              applyAppearance(String(ws.id), null);
              setPickerWs(null);
            },
            children: L("\u6E05\u9664\u56FE\u6807\u4E0E\u989C\u8272", "Clear icon and color")
          }
        )
      ] }),
      isOpen && sessions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "div",
        {
          style: styles4.sessionList,
          onDragOver: (e) => {
            if (drag?.kind === "session" && drag.wsId === String(ws.id)) stop(e);
          },
          onDrop: onSessionDrop(ws.id, void 0),
          children: renderSessions(ws.id, sessions)
        }
      )
    ] }, wsKey);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: styles4.root, onMouseLeave: () => setHovered(null), children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: styles4.header, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: styles4.headerTitle, children: L("\u5DE5\u4F5C\u533A", "Workspaces") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: styles4.headerActions, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "button",
          {
            style: styles4.headerAction,
            title: L("\u641C\u7D22\u5DE5\u4F5C\u533A / \u4F1A\u8BDD\uFF08\u6807\u9898\u3001\u8DEF\u5F84\uFF09", "Search workspaces / sessions (title, path)"),
            onClick: () => {
              setSearchOpen((v) => !v);
              if (searchOpen) setSearchQ("");
            },
            children: "\u{1F50D}"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: styles4.headerAction, title: L("\u65B0\u5EFA\u5DE5\u4F5C\u533A\uFF08\u9009\u62E9\u76EE\u5F55\uFF09", "New workspace (pick a directory)"), onClick: addWorkspace, children: "\uFF0B" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { style: styles4.headerAction, title: L("Spotlight\uFF08\u2318K\uFF09", "Spotlight (\u2318K)"), onClick: openSpotlight, children: "\u2318" })
      ] })
    ] }),
    searchOpen && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles4.searchRow, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      "input",
      {
        style: styles4.searchInput,
        placeholder: L("\u641C\u7D22\u5DE5\u4F5C\u533A / \u4F1A\u8BDD\u2026", "Search workspaces / sessions\u2026"),
        value: searchQ,
        onChange: (e) => setSearchQ(e.target.value),
        autoFocus: true
      }
    ) }),
    !searching && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: styles4.viewPills, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "button",
        {
          type: "button",
          style: { ...styles4.viewPill, ...viewMode === "grouped" ? styles4.viewPillActive : {} },
          onClick: () => setViewMode("grouped"),
          children: L("\u6309\u5DE5\u4F5C\u533A", "By workspace")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "button",
        {
          type: "button",
          style: { ...styles4.viewPill, ...viewMode === "flat" ? styles4.viewPillActive : {} },
          onClick: () => setViewMode("flat"),
          children: L("\u5168\u90E8\u4F1A\u8BDD", "All sessions")
        }
      ),
      viewMode === "grouped" && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "button",
        {
          type: "button",
          style: styles4.viewPill,
          title: L("\u4F1A\u8BDD\u6392\u5E8F\uFF1A\u6700\u8FD1\u66F4\u65B0 \u6216 \u624B\u52A8\uFF08\u62D6\u62FD\u540E\u7684\u987A\u5E8F\uFF09", "Session order: recently updated or manual (drag order)"),
          onClick: () => setSortMode((v) => v === "updated" ? "manual" : "updated"),
          children: sortMode === "updated" ? L("\u6392\u5E8F:\u6700\u8FD1\u66F4\u65B0", "Sort: Recent") : L("\u6392\u5E8F:\u624B\u52A8", "Sort: Manual")
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles4.scroll, children: searching ? searchHits.length === 0 && contentHits.length === 0 && !contentLoading ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles4.empty, children: L("\u6CA1\u6709\u5339\u914D\u300C{q}\u300D\u7684\u5DE5\u4F5C\u533A\u6216\u4F1A\u8BDD", 'No workspaces or sessions match "{q}"', { q: searchQ.trim() }) }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
      contentLoading && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles4.empty, children: L("\u6B63\u5728\u641C\u7D22\u4F1A\u8BDD\u5185\u5BB9\u2026", "Searching session content\u2026") }),
      searchHits.map((hit) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
        "div",
        {
          style: styles4.hitRow,
          title: hit.sub,
          onMouseDown: (e) => {
            e.stopPropagation();
            if (hit.kind === "workspace") startSession(hit.id);
            else openSession(hit.id);
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: styles4.wsTitle, children: hit.title }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: styles4.hitSub, children: hit.sub })
          ]
        },
        `${hit.kind}-${hit.id}`
      )),
      contentHits.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles4.contentLabel, children: L("\u4F1A\u8BDD\u5185\u5BB9\u547D\u4E2D\uFF08{n}\uFF09", "Session content hits ({n})", { n: contentHits.length }) }),
        contentHits.map((hit) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "div",
          {
            style: styles4.hitRow,
            title: hit.snippet,
            onMouseDown: (e) => {
              e.stopPropagation();
              openSession(hit.sessionId);
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: styles4.contentSnippet, children: hit.snippet })
          },
          `content-${hit.sessionId}`
        ))
      ] })
    ] }) : viewMode === "flat" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles4.flatWrap, children: flatSessions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles4.empty, children: L("\u8FD8\u6CA1\u6709\u4F1A\u8BDD\u3002", "No sessions yet.") }) : renderSessions(void 0, flatSessions) }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
      active.length === 0 && ungrouped.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles4.empty, children: L("\u8FD8\u6CA1\u6709\u5DE5\u4F5C\u533A\uFF0C\u70B9\u53F3\u4E0A \uFF0B \u65B0\u5EFA\u3002", "No workspaces yet \u2014 click \uFF0B in the top right to create one.") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "div",
        {
          onDragOver: (e) => {
            if (drag?.kind === "workspace") stop(e);
          },
          onDrop: onWsDrop(void 0),
          children: active.map((ws) => renderWsRow(ws, true))
        }
      ),
      ungrouped.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          "div",
          {
            style: styles4.wsRow,
            onMouseEnter: () => setHovered("bucket-ungrouped"),
            onMouseDown: (e) => {
              e.stopPropagation();
              setUngroupedOpen((v) => !v);
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: styles4.wsChevron, children: ungroupedOpen ? "\u25BE" : "\u25B8" }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: styles4.wsTitle, children: L("\u672A\u5F52\u7EC4", "Ungrouped") }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: styles4.wsCount, children: ungrouped.length })
            ]
          }
        ),
        ungroupedOpen && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles4.sessionList, children: renderSessions(void 0, ungrouped) })
      ] }),
      archivedWs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: styles4.sectionToggle, onClick: () => setArchivedOpen((v) => !v), children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: archivedOpen ? "\u25BE" : "\u25B8" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: L("\u5DF2\u5F52\u6863\uFF08{n}\uFF09", "Archived ({n})", { n: archivedWs.length }) })
        ] }),
        archivedOpen && archivedWs.map((ws) => renderWsRow(ws, false))
      ] })
    ] }) })
  ] });
}
var styles4 = {
  root: { display: "flex", flexDirection: "column", height: "100%", minWidth: 0 },
  rail: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingTop: 8 },
  railButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: "none",
    background: "transparent",
    color: "#5a6478",
    fontSize: 16,
    cursor: "pointer"
  },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px 4px" },
  headerTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#8a93a6",
    letterSpacing: "0.04em",
    textTransform: "uppercase"
  },
  headerActions: { display: "flex", gap: 2, alignItems: "center" },
  headerAction: {
    width: 24,
    height: 24,
    fontSize: 13,
    lineHeight: "22px",
    borderRadius: 7,
    border: "none",
    background: "transparent",
    color: "#5a6478",
    cursor: "pointer"
  },
  searchRow: { padding: "0 10px 6px" },
  viewPills: { display: "flex", gap: 4, padding: "2px 10px 4px" },
  viewPill: {
    fontSize: 11,
    lineHeight: "18px",
    padding: "0 10px",
    borderRadius: 9,
    border: "1px solid rgba(28, 35, 51, 0.12)",
    background: "transparent",
    color: "#5a6478",
    cursor: "pointer"
  },
  viewPillActive: {
    background: "rgba(45, 102, 247, 0.10)",
    borderColor: "rgba(45, 102, 247, 0.45)",
    color: "#2d66f7",
    fontWeight: 600
  },
  flatWrap: { paddingTop: 2 },
  contentLabel: {
    padding: "8px 6px 4px",
    fontSize: 11,
    fontWeight: 600,
    color: "#8a93a6"
  },
  contentSnippet: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    color: "#3c4659",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: 1.4
  },
  searchInput: {
    width: "100%",
    boxSizing: "border-box",
    fontSize: 12,
    padding: "5px 10px",
    borderRadius: 8,
    border: "1px solid rgba(45, 102, 247, 0.5)",
    outline: "none",
    color: "#1c2333"
  },
  scroll: { flex: 1, overflowY: "auto", padding: "0 6px 12px" },
  sectionLabel: { padding: "10px 6px 4px", fontSize: 11, fontWeight: 600, color: "#8a93a6" },
  sectionToggle: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    padding: "8px 6px 4px",
    fontSize: 11,
    fontWeight: 600,
    color: "#8a93a6",
    cursor: "pointer",
    borderTop: "1px solid rgba(28, 35, 51, 0.06)"
  },
  empty: { padding: "14px 8px", fontSize: 12, color: "#a2aabe" },
  wsRow: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    padding: "4px 2px",
    borderRadius: 6,
    cursor: "pointer",
    userSelect: "none"
  },
  wsChevron: { width: 10, fontSize: 10, color: "#a2aabe", flexShrink: 0 },
  wsTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: 500,
    color: "#3c4659",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  wsCount: { fontSize: 11, color: "#a2aabe", flexShrink: 0 },
  wsActions: { display: "none", gap: 2, alignItems: "center", flexShrink: 0 },
  sessionActions: { display: "none", gap: 2, alignItems: "center", flexShrink: 0 },
  sessionList: { marginLeft: 10, borderLeft: "1px solid rgba(28, 35, 51, 0.07)" },
  sessionRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 4px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
    color: "#3c4659",
    userSelect: "none"
  },
  dot: { width: 6, height: 6, borderRadius: 3, background: "transparent", flexShrink: 0 },
  dotRunning: { background: "#2d66f7" },
  sessionTitle: { flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  miniButton: {
    fontSize: 11,
    lineHeight: "16px",
    padding: "0 6px",
    borderRadius: 6,
    border: "1px solid rgba(28, 35, 51, 0.12)",
    background: "#ffffff",
    color: "#5a6478",
    cursor: "pointer"
  },
  restoreButton: {
    fontSize: 11,
    lineHeight: "16px",
    padding: "0 8px",
    borderRadius: 6,
    border: "1px solid rgba(45, 102, 247, 0.4)",
    background: "rgba(45, 102, 247, 0.08)",
    color: "#2d66f7",
    cursor: "pointer"
  },
  archivedHeader: { display: "flex", alignItems: "center", gap: 5, padding: "8px 6px 4px" },
  rowDragging: { opacity: 0.45 },
  rowDropOver: { background: "rgba(45, 102, 247, 0.12)", outline: "1px dashed rgba(45, 102, 247, 0.6)" },
  hitRow: { display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 8, cursor: "pointer" },
  hitSub: {
    fontSize: 11,
    color: "#a2aabe",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "45%"
  },
  wsIconSlot: {
    width: 16,
    height: 16,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
    cursor: "pointer"
  },
  wsIconText: { fontSize: 13, lineHeight: 1 },
  wsColorDot: { width: 10, height: 10, borderRadius: 5 },
  pickerPanel: {
    margin: "2px 4px 6px 26px",
    padding: 8,
    borderRadius: 10,
    background: "#f5f7fa",
    border: "1px solid rgba(28, 35, 51, 0.08)"
  },
  pickerLabel: { fontSize: 11, fontWeight: 600, color: "#8a93a6", margin: "4px 0" },
  pickerGrid: { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 2 },
  pickerEmoji: {
    width: 26,
    height: 26,
    fontSize: 15,
    lineHeight: 1,
    borderRadius: 7,
    border: "1px solid transparent",
    background: "transparent",
    cursor: "pointer"
  },
  pickerSwatch: {
    width: 22,
    height: 22,
    borderRadius: 7,
    border: "1px solid rgba(28, 35, 51, 0.14)",
    cursor: "pointer"
  },
  pickerSelected: { outline: "2px solid #2d66f7", outlineOffset: 1 },
  pickerClear: {
    marginTop: 6,
    fontSize: 11,
    padding: "2px 10px",
    borderRadius: 7,
    border: "1px solid rgba(28, 35, 51, 0.14)",
    background: "#ffffff",
    color: "#5a6478",
    cursor: "pointer"
  }
};

// src/client/index.ts
var name = "workspace-kit";
var inject = ["slots", "sessions", "workspaces"];
var PERSIST_KEY = "dsh.workspace-kit.archive.v1";
function readPersistedOfficialSidebar() {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(PERSIST_KEY) : null;
    if (!raw) return false;
    return Boolean(JSON.parse(raw).officialSidebar);
  } catch {
    return false;
  }
}
function alertError(prefix, error) {
  void requestConfirm({ title: prefix, message: String(error), okLabel: L("\u77E5\u9053\u4E86", "Got it") });
}
function apply(raw) {
  const ctx = raw;
  const log = ctx.logger("workspace-kit:client");
  const store = createArchiveStore();
  const openSession = (sessionId) => {
    ctx.sessions.open(sessionId);
  };
  const startSession = (workspaceId) => {
    ctx.workspaces.startSession(workspaceId);
  };
  const renameSession = async (sessionId, initial) => {
    const title = await requestPrompt({ title: L("\u91CD\u547D\u540D\u4F1A\u8BDD", "Rename session"), initial, placeholder: L("\u8F93\u5165\u65B0\u540D\u79F0", "Enter a new name") });
    if (title == null) return;
    const session = ctx.sessions.binding(sessionId)?.session;
    if (!session) {
      alertError(L("\u91CD\u547D\u540D\u5931\u8D25", "Rename failed"), new Error(`unknown session "${sessionId}"`));
      return;
    }
    const result = await session.rename(title);
    if (!result.ok) alertError(L("\u91CD\u547D\u540D\u5931\u8D25", "Rename failed"), new Error(result.error.message));
  };
  const forkSession = (sessionId) => {
    ctx.sessions.fork({ sessionId, increaseTitle: true }).then((childId) => ctx.sessions.open(childId)).catch((error) => log.info("fork failed", String(error)));
  };
  const archiveSession = (sessionId) => {
    void (async () => {
      const ok = await requestConfirm({
        title: L("\u5F52\u6863\u4F1A\u8BDD", "Archive session"),
        message: L(
          "\u5F52\u6863\u540E\u8BE5\u4F1A\u8BDD\u4F1A\u4ECE\u5DE5\u4F5C\u533A\u5206\u7EC4\u3001\u4FA7\u680F\u548C\u6240\u6709\u5217\u8868\u9690\u85CF\uFF08\u5B98\u65B9\u5F52\u6863\u96C6\uFF0C\u4E0D\u53EF\u9006\uFF0C\u6682\u65E0\u6062\u590D\u5165\u53E3\uFF1B\u4ECD\u53EF\u901A\u8FC7\u641C\u7D22\u6253\u5F00\uFF09\u3002\u786E\u5B9A\u5F52\u6863\uFF1F",
          "Archiving hides this session from workspace groups, the sidebar, and every list (official archive set \u2014 irreversible, no restore entry yet; it stays reachable via search). Archive now?"
        ),
        okLabel: L("\u5F52\u6863", "Archive")
      });
      if (!ok) return;
      ctx.workspaces.archiveSession(sessionId).catch((error) => log.info("archive session failed", String(error)));
    })();
  };
  const addWorkspace = () => {
    void (async () => {
      try {
        const path = await ctx.workspaces.pickDirectory();
        if (!path) return;
        const view = await ctx.workspaces.create({ path });
        startSession(view.workspaceId);
      } catch (error) {
        alertError(L("\u65B0\u5EFA\u5DE5\u4F5C\u533A\u5931\u8D25", "Failed to create workspace"), error);
      }
    })();
  };
  const renameWorkspace = async (workspaceId, initial) => {
    const title = await requestPrompt({ title: L("\u91CD\u547D\u540D\u5DE5\u4F5C\u533A", "Rename workspace"), initial, placeholder: L("\u8F93\u5165\u65B0\u540D\u79F0", "Enter a new name") });
    if (title == null) return;
    try {
      await ctx.workspaces.rename(workspaceId, title);
    } catch (error) {
      alertError(L("\u91CD\u547D\u540D\u5931\u8D25", "Rename failed"), error);
    }
  };
  const deleteWorkspace = (workspaceId) => {
    void (async () => {
      const ok = await requestConfirm({
        title: L("\u5220\u9664\u5DE5\u4F5C\u533A\u6CE8\u518C", "Remove workspace registration"),
        message: L(
          "\u9879\u76EE\u76EE\u5F55\u4E0E\u5386\u53F2\u4F1A\u8BDD\u90FD\u4F1A\u4FDD\u7559\uFF08\u4F1A\u8BDD\u56DE\u5230\u672A\u5F52\u7EC4\uFF09\u3002\u786E\u5B9A\u5220\u9664\u8BE5\u5DE5\u4F5C\u533A\u6CE8\u518C\uFF1F",
          "The project directory and past sessions are kept (sessions return to ungrouped). Remove this workspace registration?"
        ),
        okLabel: L("\u5220\u9664", "Remove")
      });
      if (!ok) return;
      ctx.workspaces.delete(workspaceId).catch((error) => alertError(L("\u5220\u9664\u5931\u8D25", "Remove failed"), error));
    })();
  };
  const reorderWorkspace = (workspaceId, beforeWorkspaceId) => {
    ctx.workspaces.insertBefore(workspaceId, beforeWorkspaceId).catch((error) => alertError(L("\u6392\u5E8F\u5931\u8D25", "Reorder failed"), error));
  };
  const reorderSession = (workspaceId, sessionId, beforeSessionId) => {
    ctx.workspaces.insertSessionBefore(workspaceId, sessionId, beforeSessionId).catch((error) => alertError(L("\u6392\u5E8F\u5931\u8D25", "Reorder failed"), error));
  };
  const searchContent = async (query, signal) => {
    const result = await ctx.sessions.search(query, signal);
    if (!result.ok) throw new Error(result.error.message);
    return result.value.items;
  };
  const sidebarInject = () => ({
    openSession,
    startSession,
    renameSession,
    forkSession,
    addWorkspace,
    renameWorkspace,
    deleteWorkspace,
    archiveSession,
    reorderWorkspace,
    reorderSession,
    searchContent
  });
  let officialSidebar = readPersistedOfficialSidebar();
  let oursReg = null;
  const registerOurs = () => {
    if (oursReg) return;
    oursReg = ctx.slots.register(
      { name: "sidebar.workspaces", priority: -1, store, inject: sidebarInject },
      WorkspaceSidebar
    );
  };
  const dropOurs = () => {
    if (oursReg) {
      oursReg();
      oursReg = null;
    }
  };
  const syncSidebar = () => {
    if (officialSidebar) dropOurs();
    else registerOurs();
  };
  ctx.slots.inject("sidebar.workspaces", () => {
    syncSidebar();
    return () => {
      oursReg?.();
      oursReg = null;
    };
  });
  ctx.slots.inject(
    "sidebar.footer.action",
    () => ctx.slots.register(
      { name: "sidebar.footer.action", id: "workspace-kit.sidebar-toggle", order: 0, store },
      SidebarToggle
    )
  );
  ctx.effect(() => {
    const onMode = (event) => {
      const detail = event.detail;
      const next = Boolean(detail?.official);
      if (next === officialSidebar) return;
      officialSidebar = next;
      syncSidebar();
      log.info(`sidebar: ${officialSidebar ? "official" : "plugin"}`);
    };
    window.addEventListener("dsh-workspace-kit:sidebar-mode", onMode);
    return () => window.removeEventListener("dsh-workspace-kit:sidebar-mode", onMode);
  }, "workspace-kit: sidebar-mode");
  ctx.slots.inject("shell.overlay", () => {
    const disposePalette = ctx.slots.register(
      {
        name: "shell.overlay",
        id: "workspace-kit.spotlight",
        order: 100,
        store,
        inject: () => ({ openWorkspace: startSession, openSession, archiveSession })
      },
      SpotlightPalette
    );
    const disposeDialogs = ctx.slots.register(
      { name: "shell.overlay", id: "workspace-kit.dialogs", order: 200 },
      DialogHost
    );
    return () => {
      disposePalette();
      disposeDialogs();
    };
  });
  log.info(`Workspace kit client ready (sidebar: ${officialSidebar ? "official" : "plugin"})`);
}

		return module.exports;
	}
});

