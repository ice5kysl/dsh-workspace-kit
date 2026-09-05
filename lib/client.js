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
var import_react5 = require("react");

// node_modules/lucide-react/dist/esm/createLucideIcon.mjs
var import_react4 = require("react");

// node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs
var mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();

// node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs
var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

// node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs
var toCamelCase = (string) => string.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase()
);

// node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs
var toPascalCase = (string) => {
  const camelCase = toCamelCase(string);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};

// node_modules/lucide-react/dist/esm/Icon.mjs
var import_react3 = require("react");

// node_modules/lucide-react/dist/esm/defaultAttributes.mjs
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

// node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs
var hasA11yProp = (props) => {
  for (const prop in props) {
    if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
      return true;
    }
  }
  return false;
};

// node_modules/lucide-react/dist/esm/context.mjs
var import_react2 = require("react");
var LucideContext = (0, import_react2.createContext)({});
var useLucideContext = () => (0, import_react2.useContext)(LucideContext);

// node_modules/lucide-react/dist/esm/Icon.mjs
var Icon = (0, import_react3.forwardRef)(
  ({ color, size, strokeWidth, absoluteStrokeWidth, className = "", children, iconNode, ...rest }, ref) => {
    const {
      size: contextSize = 24,
      strokeWidth: contextStrokeWidth = 2,
      absoluteStrokeWidth: contextAbsoluteStrokeWidth = false,
      color: contextColor = "currentColor",
      className: contextClass = ""
    } = useLucideContext() ?? {};
    const calculatedStrokeWidth = absoluteStrokeWidth ?? contextAbsoluteStrokeWidth ? Number(strokeWidth ?? contextStrokeWidth) * 24 / Number(size ?? contextSize) : strokeWidth ?? contextStrokeWidth;
    return (0, import_react3.createElement)(
      "svg",
      {
        ref,
        ...defaultAttributes,
        width: size ?? contextSize ?? defaultAttributes.width,
        height: size ?? contextSize ?? defaultAttributes.height,
        stroke: color ?? contextColor,
        strokeWidth: calculatedStrokeWidth,
        className: mergeClasses("lucide", contextClass, className),
        ...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
        ...rest
      },
      [
        ...iconNode.map(([tag, attrs]) => (0, import_react3.createElement)(tag, attrs)),
        ...Array.isArray(children) ? children : [children]
      ]
    );
  }
);

// node_modules/lucide-react/dist/esm/createLucideIcon.mjs
var createLucideIcon = (iconName, iconNode) => {
  const Component = (0, import_react4.forwardRef)(
    ({ className, ...props }, ref) => (0, import_react4.createElement)(Icon, {
      ref,
      iconNode,
      className: mergeClasses(
        `lucide-${toKebabCase(toPascalCase(iconName))}`,
        `lucide-${iconName}`,
        className
      ),
      ...props
    })
  );
  Component.displayName = toPascalCase(iconName);
  return Component;
};

// node_modules/lucide-react/dist/esm/icons/book-open.mjs
var __iconNode = [
  ["path", { d: "M12 5v16", key: "1f6ucr" }],
  [
    "path",
    {
      d: "M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z",
      key: "1fyvmf"
    }
  ]
];
var BookOpen = createLucideIcon("book-open", __iconNode);

// node_modules/lucide-react/dist/esm/icons/bot.mjs
var __iconNode2 = [
  ["path", { d: "M12 8V4H8", key: "hb8ula" }],
  ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2", key: "enze0r" }],
  ["path", { d: "M2 14h2", key: "vft8re" }],
  ["path", { d: "M20 14h2", key: "4cs60a" }],
  ["path", { d: "M15 13v2", key: "1xurst" }],
  ["path", { d: "M9 13v2", key: "rq6x2g" }]
];
var Bot = createLucideIcon("bot", __iconNode2);

// node_modules/lucide-react/dist/esm/icons/brain.mjs
var __iconNode3 = [
  ["path", { d: "M12 18V5", key: "adv99a" }],
  ["path", { d: "M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4", key: "1e3is1" }],
  ["path", { d: "M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5", key: "1gqd8o" }],
  ["path", { d: "M17.997 5.125a4 4 0 0 1 2.526 5.77", key: "iwvgf7" }],
  ["path", { d: "M18 18a4 4 0 0 0 2-7.464", key: "efp6ie" }],
  ["path", { d: "M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517", key: "1gq6am" }],
  ["path", { d: "M6 18a4 4 0 0 1-2-7.464", key: "k1g0md" }],
  ["path", { d: "M6.003 5.125a4 4 0 0 0-2.526 5.77", key: "q97ue3" }]
];
var Brain = createLucideIcon("brain", __iconNode3);

// node_modules/lucide-react/dist/esm/icons/chart-column.mjs
var __iconNode4 = [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16", key: "c24i48" }],
  ["path", { d: "M18 17V9", key: "2bz60n" }],
  ["path", { d: "M13 17V5", key: "1frdt8" }],
  ["path", { d: "M8 17v-3", key: "17ska0" }]
];
var ChartColumn = createLucideIcon("chart-column", __iconNode4);

// node_modules/lucide-react/dist/esm/icons/chevron-down.mjs
var __iconNode5 = [["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]];
var ChevronDown = createLucideIcon("chevron-down", __iconNode5);

// node_modules/lucide-react/dist/esm/icons/chevron-right.mjs
var __iconNode6 = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]];
var ChevronRight = createLucideIcon("chevron-right", __iconNode6);

// node_modules/lucide-react/dist/esm/icons/chevrons-right.mjs
var __iconNode7 = [
  ["path", { d: "m6 17 5-5-5-5", key: "xnjwq" }],
  ["path", { d: "m13 17 5-5-5-5", key: "17xmmf" }]
];
var ChevronsRight = createLucideIcon("chevrons-right", __iconNode7);

// node_modules/lucide-react/dist/esm/icons/coins.mjs
var __iconNode8 = [
  ["path", { d: "M13.744 17.736a6 6 0 1 1-7.48-7.48", key: "bq4yh3" }],
  ["path", { d: "M15 6h1v4", key: "11y1tn" }],
  ["path", { d: "m6.134 14.768.866-.5 2 3.464", key: "17snzx" }],
  ["circle", { cx: "16", cy: "8", r: "6", key: "14bfc9" }]
];
var Coins = createLucideIcon("coins", __iconNode8);

// node_modules/lucide-react/dist/esm/icons/command.mjs
var __iconNode9 = [
  [
    "path",
    { d: "M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3", key: "11bfej" }
  ]
];
var Command = createLucideIcon("command", __iconNode9);

// node_modules/lucide-react/dist/esm/icons/construction.mjs
var __iconNode10 = [
  ["rect", { x: "2", y: "6", width: "20", height: "8", rx: "1", key: "1estib" }],
  ["path", { d: "M17 14v7", key: "7m2elx" }],
  ["path", { d: "M7 14v7", key: "1cm7wv" }],
  ["path", { d: "M17 3v3", key: "1v4jwn" }],
  ["path", { d: "M7 3v3", key: "7o6guu" }],
  ["path", { d: "M10 14 2.3 6.3", key: "1023jk" }],
  ["path", { d: "m14 6 7.7 7.7", key: "1s8pl2" }],
  ["path", { d: "m8 6 8 8", key: "hl96qh" }]
];
var Construction = createLucideIcon("construction", __iconNode10);

// node_modules/lucide-react/dist/esm/icons/copy.mjs
var __iconNode11 = [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
];
var Copy = createLucideIcon("copy", __iconNode11);

// node_modules/lucide-react/dist/esm/icons/database.mjs
var __iconNode12 = [
  ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3", key: "msslwz" }],
  ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5", key: "1wlel7" }],
  ["path", { d: "M3 12A9 3 0 0 0 21 12", key: "mv7ke4" }]
];
var Database = createLucideIcon("database", __iconNode12);

// node_modules/lucide-react/dist/esm/icons/file-text.mjs
var __iconNode13 = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
];
var FileText = createLucideIcon("file-text", __iconNode13);

// node_modules/lucide-react/dist/esm/icons/files.mjs
var __iconNode14 = [
  ["path", { d: "M15 2h-4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8", key: "14sh0y" }],
  [
    "path",
    {
      d: "M16.706 2.706A2.4 2.4 0 0 0 15 2v5a1 1 0 0 0 1 1h5a2.4 2.4 0 0 0-.706-1.706z",
      key: "1970lx"
    }
  ],
  ["path", { d: "M5 7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 1.732-1", key: "l4dndm" }]
];
var Files = createLucideIcon("files", __iconNode14);

// node_modules/lucide-react/dist/esm/icons/flame.mjs
var __iconNode15 = [
  [
    "path",
    {
      d: "M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4",
      key: "1slcih"
    }
  ]
];
var Flame = createLucideIcon("flame", __iconNode15);

// node_modules/lucide-react/dist/esm/icons/flask-conical.mjs
var __iconNode16 = [
  [
    "path",
    {
      d: "M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2",
      key: "18mbvz"
    }
  ],
  ["path", { d: "M6.453 15h11.094", key: "3shlmq" }],
  ["path", { d: "M8.5 2h7", key: "csnxdl" }]
];
var FlaskConical = createLucideIcon("flask-conical", __iconNode16);

// node_modules/lucide-react/dist/esm/icons/folder-open.mjs
var __iconNode17 = [
  [
    "path",
    {
      d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",
      key: "usdka0"
    }
  ]
];
var FolderOpen = createLucideIcon("folder-open", __iconNode17);

// node_modules/lucide-react/dist/esm/icons/folder.mjs
var __iconNode18 = [
  [
    "path",
    {
      d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
      key: "1kt360"
    }
  ]
];
var Folder = createLucideIcon("folder", __iconNode18);

// node_modules/lucide-react/dist/esm/icons/gamepad-2.mjs
var __iconNode19 = [
  ["line", { x1: "6", x2: "10", y1: "11", y2: "11", key: "1gktln" }],
  ["line", { x1: "8", x2: "8", y1: "9", y2: "13", key: "qnk9ow" }],
  ["line", { x1: "15", x2: "15.01", y1: "12", y2: "12", key: "krot7o" }],
  ["line", { x1: "18", x2: "18.01", y1: "10", y2: "10", key: "1lcuu1" }],
  [
    "path",
    {
      d: "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z",
      key: "mfqc10"
    }
  ]
];
var Gamepad2 = createLucideIcon("gamepad-2", __iconNode19);

// node_modules/lucide-react/dist/esm/icons/ghost.mjs
var __iconNode20 = [
  ["path", { d: "M15 10v1", key: "oj8wfp" }],
  [
    "path",
    {
      d: "M7.528 20.472a1.6 1.6 0 012.277 0l1.057 1.056a1.6 1.6 0 002.276 0l1.057-1.056a1.6 1.6 0 012.277 0l1.114 1.114a1.4 1.4 0 002.414-1V10a8 8 0 00-16 0v10.586a1.4 1.4 0 002.414 1z",
      key: "13lou3"
    }
  ],
  ["path", { d: "M9 10v1", key: "1e14fa" }]
];
var Ghost = createLucideIcon("ghost", __iconNode20);

// node_modules/lucide-react/dist/esm/icons/globe.mjs
var __iconNode21 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", key: "13o1zl" }],
  ["path", { d: "M2 12h20", key: "9i4pu4" }]
];
var Globe = createLucideIcon("globe", __iconNode21);

// node_modules/lucide-react/dist/esm/icons/joystick.mjs
var __iconNode22 = [
  [
    "path",
    {
      d: "M21 17a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2Z",
      key: "jg2n2t"
    }
  ],
  ["path", { d: "M6 15v-2", key: "gd6mvg" }],
  ["path", { d: "M12 15V9", key: "8c7uyn" }],
  ["circle", { cx: "12", cy: "6", r: "3", key: "1gm2ql" }]
];
var Joystick = createLucideIcon("joystick", __iconNode22);

// node_modules/lucide-react/dist/esm/icons/lightbulb.mjs
var __iconNode23 = [
  [
    "path",
    {
      d: "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",
      key: "1gvzjb"
    }
  ],
  ["path", { d: "M9 18h6", key: "x1upvd" }],
  ["path", { d: "M10 22h4", key: "ceow96" }]
];
var Lightbulb = createLucideIcon("lightbulb", __iconNode23);

// node_modules/lucide-react/dist/esm/icons/map.mjs
var __iconNode24 = [
  [
    "path",
    {
      d: "M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z",
      key: "169xi5"
    }
  ],
  ["path", { d: "M15 5.764v15", key: "1pn4in" }],
  ["path", { d: "M9 3.236v15", key: "1uimfh" }]
];
var Map2 = createLucideIcon("map", __iconNode24);

// node_modules/lucide-react/dist/esm/icons/package.mjs
var __iconNode25 = [
  [
    "path",
    {
      d: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",
      key: "1a0edw"
    }
  ],
  ["path", { d: "M12 22V12", key: "d0xqtd" }],
  ["polyline", { points: "3.29 7 12 12 20.71 7", key: "ousv84" }],
  ["path", { d: "m7.5 4.27 9 5.15", key: "1c824w" }]
];
var Package = createLucideIcon("package", __iconNode25);

// node_modules/lucide-react/dist/esm/icons/palette.mjs
var __iconNode26 = [
  [
    "path",
    {
      d: "M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z",
      key: "e79jfc"
    }
  ],
  ["circle", { cx: "13.5", cy: "6.5", r: ".5", fill: "currentColor", key: "1okk4w" }],
  ["circle", { cx: "17.5", cy: "10.5", r: ".5", fill: "currentColor", key: "f64h9f" }],
  ["circle", { cx: "6.5", cy: "12.5", r: ".5", fill: "currentColor", key: "qy21gx" }],
  ["circle", { cx: "8.5", cy: "7.5", r: ".5", fill: "currentColor", key: "fotxhn" }]
];
var Palette = createLucideIcon("palette", __iconNode26);

// node_modules/lucide-react/dist/esm/icons/pencil.mjs
var __iconNode27 = [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
];
var Pencil = createLucideIcon("pencil", __iconNode27);

// node_modules/lucide-react/dist/esm/icons/plus.mjs
var __iconNode28 = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
];
var Plus = createLucideIcon("plus", __iconNode28);

// node_modules/lucide-react/dist/esm/icons/puzzle.mjs
var __iconNode29 = [
  [
    "path",
    {
      d: "M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z",
      key: "w46dr5"
    }
  ]
];
var Puzzle = createLucideIcon("puzzle", __iconNode29);

// node_modules/lucide-react/dist/esm/icons/rocket.mjs
var __iconNode30 = [
  ["path", { d: "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5", key: "qeys4" }],
  [
    "path",
    {
      d: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09",
      key: "u4xsad"
    }
  ],
  [
    "path",
    {
      d: "M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z",
      key: "676m9"
    }
  ],
  ["path", { d: "M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05", key: "92ym6u" }]
];
var Rocket = createLucideIcon("rocket", __iconNode30);

// node_modules/lucide-react/dist/esm/icons/search.mjs
var __iconNode31 = [
  ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }]
];
var Search = createLucideIcon("search", __iconNode31);

// node_modules/lucide-react/dist/esm/icons/settings.mjs
var __iconNode32 = [
  [
    "path",
    {
      d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
      key: "1i5ecw"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
];
var Settings = createLucideIcon("settings", __iconNode32);

// node_modules/lucide-react/dist/esm/icons/sliders-horizontal.mjs
var __iconNode33 = [
  ["path", { d: "M10 5H3", key: "1qgfaw" }],
  ["path", { d: "M12 19H3", key: "yhmn1j" }],
  ["path", { d: "M14 3v4", key: "1sua03" }],
  ["path", { d: "M16 17v4", key: "1q0r14" }],
  ["path", { d: "M21 12h-9", key: "1o4lsq" }],
  ["path", { d: "M21 19h-5", key: "1rlt1p" }],
  ["path", { d: "M21 5h-7", key: "1oszz2" }],
  ["path", { d: "M8 10v4", key: "tgpxqk" }],
  ["path", { d: "M8 12H3", key: "a7s4jb" }]
];
var SlidersHorizontal = createLucideIcon("sliders-horizontal", __iconNode33);

// node_modules/lucide-react/dist/esm/icons/snowflake.mjs
var __iconNode34 = [
  ["path", { d: "m10 20-1.25-2.5L6 18", key: "18frcb" }],
  ["path", { d: "M10 4 8.75 6.5 6 6", key: "7mghy3" }],
  ["path", { d: "m14 20 1.25-2.5L18 18", key: "1chtki" }],
  ["path", { d: "m14 4 1.25 2.5L18 6", key: "1b4wsy" }],
  ["path", { d: "m17 21-3-6h-4", key: "15hhxa" }],
  ["path", { d: "m17 3-3 6 1.5 3", key: "11697g" }],
  ["path", { d: "M2 12h6.5L10 9", key: "kv9z4n" }],
  ["path", { d: "m20 10-1.5 2 1.5 2", key: "1swlpi" }],
  ["path", { d: "M22 12h-6.5L14 15", key: "1mxi28" }],
  ["path", { d: "m4 10 1.5 2L4 14", key: "k9enpj" }],
  ["path", { d: "m7 21 3-6-1.5-3", key: "j8hb9u" }],
  ["path", { d: "m7 3 3 6h4", key: "1otusx" }]
];
var Snowflake = createLucideIcon("snowflake", __iconNode34);

// node_modules/lucide-react/dist/esm/icons/sprout.mjs
var __iconNode35 = [
  [
    "path",
    {
      d: "M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3",
      key: "139s4v"
    }
  ],
  ["path", { d: "M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4", key: "1dlkgp" }],
  ["path", { d: "M5 21h14", key: "11awu3" }]
];
var Sprout = createLucideIcon("sprout", __iconNode35);

// node_modules/lucide-react/dist/esm/icons/star.mjs
var __iconNode36 = [
  [
    "path",
    {
      d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
      key: "r04s7s"
    }
  ]
];
var Star = createLucideIcon("star", __iconNode36);

// node_modules/lucide-react/dist/esm/icons/target.mjs
var __iconNode37 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["circle", { cx: "12", cy: "12", r: "6", key: "1vlfrh" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }]
];
var Target = createLucideIcon("target", __iconNode37);

// node_modules/lucide-react/dist/esm/icons/trash.mjs
var __iconNode38 = [
  ["path", { d: "M10 11v6", key: "nco0om" }],
  ["path", { d: "M14 11v6", key: "outv1u" }],
  ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", key: "miytrc" }],
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", key: "e791ji" }]
];
var Trash = createLucideIcon("trash", __iconNode38);

// node_modules/lucide-react/dist/esm/icons/trending-up.mjs
var __iconNode39 = [
  ["path", { d: "M16 7h6v6", key: "box55l" }],
  ["path", { d: "m22 7-8.5 8.5-5-5L2 17", key: "1t1m79" }]
];
var TrendingUp = createLucideIcon("trending-up", __iconNode39);

// node_modules/lucide-react/dist/esm/icons/wrench.mjs
var __iconNode40 = [
  [
    "path",
    {
      d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",
      key: "1ngwbx"
    }
  ]
];
var Wrench = createLucideIcon("wrench", __iconNode40);

// node_modules/lucide-react/dist/esm/icons/zap.mjs
var __iconNode41 = [
  [
    "path",
    {
      d: "M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z",
      key: "1v7up4"
    }
  ]
];
var Zap = createLucideIcon("zap", __iconNode41);

// src/client/icons.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var WORKSPACE_ICON_KEYS = [
  "folder",
  "folder-open",
  "files",
  "star",
  "flame",
  "rocket",
  "flask",
  "settings",
  "package",
  "file-text",
  "target",
  "brain",
  "lightbulb",
  "wrench",
  "globe",
  "database",
  "puzzle",
  "palette",
  "chart",
  "trending-up",
  "bot",
  "ghost",
  "zap",
  "sliders",
  "joystick",
  "sprout",
  "construction",
  "book",
  "coins",
  "gamepad",
  "map",
  "snowflake"
];
var ICONS = {
  "folder": Folder,
  "folder-open": FolderOpen,
  "files": Files,
  "star": Star,
  "flame": Flame,
  "rocket": Rocket,
  "flask": FlaskConical,
  "settings": Settings,
  "package": Package,
  "file-text": FileText,
  "target": Target,
  "brain": Brain,
  "lightbulb": Lightbulb,
  "wrench": Wrench,
  "globe": Globe,
  "database": Database,
  "puzzle": Puzzle,
  "palette": Palette,
  "chart": ChartColumn,
  "trending-up": TrendingUp,
  "bot": Bot,
  "ghost": Ghost,
  "zap": Zap,
  "sliders": SlidersHorizontal,
  "joystick": Joystick,
  "sprout": Sprout,
  "construction": Construction,
  "book": BookOpen,
  "coins": Coins,
  "gamepad": Gamepad2,
  "map": Map2,
  "snowflake": Snowflake
};
var LEGACY_EMOJI_CHOICES = [
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
function iconKeyOf(icon) {
  if (!icon) return void 0;
  if (icon in ICONS) return icon;
  const legacyIndex = LEGACY_EMOJI_CHOICES.indexOf(icon);
  return legacyIndex >= 0 ? WORKSPACE_ICON_KEYS[legacyIndex] : void 0;
}
function WorkspaceGlyph(props) {
  const { icon, color, size = 14, strokeWidth = 1.8, style } = props;
  const key = iconKeyOf(icon);
  if (key) {
    const IconComponent = ICONS[key];
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(IconComponent, { size, strokeWidth, "aria-hidden": true, style });
  }
  if (color) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { width: size - 4, height: size - 4, borderRadius: size / 2, background: color, ...style } });
  }
  return null;
}

// src/client/Spotlight.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
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
  const [open, setOpen] = (0, import_react5.useState)(false);
  const [query, setQuery] = (0, import_react5.useState)("");
  const [cursor, setCursor] = (0, import_react5.useState)(0);
  const [showArchived, setShowArchived] = (0, import_react5.useState)(false);
  const [kind, setKind] = (0, import_react5.useState)("all");
  const inputRef = (0, import_react5.useRef)(null);
  const flatRef = (0, import_react5.useRef)([]);
  const cursorRef = (0, import_react5.useRef)(0);
  cursorRef.current = cursor;
  const archived = useStore((state) => state.archived ?? {});
  const appearanceMap = useStore((state) => state.appearance ?? {});
  const sessionsState = typeof useSessions === "function" ? useSessions((state) => state) : void 0;
  const workspacesState = typeof useWorkspaces === "function" ? useWorkspaces((state) => state) : void 0;
  (0, import_react5.useEffect)(() => {
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
  (0, import_react5.useEffect)(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    setShowArchived(false);
    setKind("all");
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const sections = (0, import_react5.useMemo)(
    () => buildSections(query, sessionsState, workspacesState, archived, showArchived, kind),
    [query, sessionsState, workspacesState, archived, showArchived, kind]
  );
  const display = (0, import_react5.useMemo)(() => {
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
  (0, import_react5.useEffect)(() => {
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
  (0, import_react5.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles3.backdrop, onMouseDown: () => setOpen(false), role: "presentation", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "div",
    {
      style: styles3.panel,
      role: "dialog",
      "aria-label": L("Spotlight \u5DE5\u4F5C\u533A\u641C\u7D22", "Spotlight workspace search"),
      onMouseDown: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles3.chips, children: ["all", "workspaces", "sessions"].map((k) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: styles3.body, children: [
          rowCount === 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles3.empty, children: query.trim() ? L("\u6CA1\u6709\u5339\u914D\u300C{q}\u300D\u7684\u5DE5\u4F5C\u533A\u6216\u4F1A\u8BDD", 'No workspaces or sessions match "{q}"', { q: query.trim() }) : L("\u8FD8\u6CA1\u6709\u5DE5\u4F5C\u533A\u3002\u4ECE\u4E00\u4E2A\u9879\u76EE\u76EE\u5F55\u5F00\u59CB\u4F1A\u8BDD\u540E\u4F1A\u81EA\u52A8\u51FA\u73B0\u3002", "No workspaces yet. Start a session from a project directory and one will appear automatically.") }),
          display.sections.map((section) => {
            const rowsInSection = section.rows;
            if (rowsInSection.length === 0) return null;
            return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles3.sectionHeader, children: section.label }),
              rowsInSection.map((row) => {
                const index = display.flat.indexOf(row);
                const selected = index === cursor;
                const isArchivedWs = row.kind === "workspace" && row.archived;
                return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
                  "div",
                  {
                    style: { ...styles3.row, ...selected ? styles3.rowSelected : {} },
                    onMouseEnter: () => setCursor(index),
                    onMouseDown: (e) => {
                      e.stopPropagation();
                      activate(row);
                    },
                    children: [
                      row.kind === "workspace" && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: styles3.rowIconSlot, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                        WorkspaceGlyph,
                        {
                          icon: appearanceMap[String(row.id)]?.icon,
                          color: appearanceMap[String(row.id)]?.color,
                          size: 14
                        }
                      ) }),
                      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: styles3.rowMain, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: styles3.rowTitle, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: styles3.rowTitleText, children: row.kind === "workspace" ? row.title : row.title }),
                          isArchivedWs && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: styles3.badgeArchived, children: L("\u5DF2\u5F52\u6863", "Archived") }),
                          row.kind === "session" && row.running && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: styles3.badgeRunning, children: L("\u8FD0\u884C\u4E2D", "Running") })
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles3.rowSub, children: row.kind === "workspace" ? `${row.path} \xB7 ${L("{n} \u4E2A\u4F1A\u8BDD", "{n} sessions", { n: row.sessionCount })} \xB7 ${row.updatedAt.slice(0, 10)}` : row.cwd ?? "" })
                      ] }),
                      row.kind === "workspace" && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
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
                      row.kind === "session" && selected && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
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
          idleArchivedHidden && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
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
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: styles3.footer, children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: L("\u2191\u2193 \u9009\u62E9", "\u2191\u2193 Navigate") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: L("\u21B5 \u6253\u5F00", "\u21B5 Open") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: searching ? L("{n} \u4E2A\u5339\u914D", "{n} matches", { n: rowCount }) : L("{n} \u9879", "{n} items", { n: rowCount }) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { marginLeft: "auto" }, children: L("Esc \u5173\u95ED", "Esc Close") })
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
var import_react6 = require("react");
var import_jsx_runtime5 = require("react/jsx-runtime");
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
var STATUS_DOT_COLOR = {
  warning: "#d97706",
  done: "#0e9f6e"
};
var CHASE_CELLS = [
  [0, 0],
  [4, 0],
  [8, 0],
  [8, 4],
  [8, 8],
  [4, 8],
  [0, 8],
  [0, 4]
];
var STATUS_STYLE_ID = "dsh-workspace-kit-status";
var STATUS_CSS = [
  "@keyframes dsh-wskit-chase{0%,12.4%{opacity:1}12.5%,24.9%{opacity:.6}25%,37.4%{opacity:.35}37.5%,to{opacity:.15}}",
  ".dsh-wskit-ongoing{position:relative;display:inline-flex;align-items:center;justify-content:center;color:#2d66f7}",
  ".dsh-wskit-matrix{display:block}",
  ".dsh-wskit-cell{fill:currentColor;opacity:.15;animation:dsh-wskit-chase 1s linear infinite}",
  '@media (prefers-reduced-motion:reduce){.dsh-wskit-cell{animation:none}.dsh-wskit-matrix{display:none}.dsh-wskit-ongoing:before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}}'
].join("\n");
function ensureStatusStyles() {
  if (typeof document === "undefined" || document.getElementById(STATUS_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STATUS_STYLE_ID;
  el.textContent = STATUS_CSS;
  document.head.appendChild(el);
}
ensureStatusStyles();
function sessionStatusOf(s) {
  switch (s?.pendingInteraction) {
    case "approval":
      return { kind: "warning", label: L("\u7B49\u5F85\u5BA1\u6279", "Waiting for approval") };
    case "plan-review":
      return { kind: "warning", label: L("\u8BA1\u5212\u5F85\u5BA1", "Plan awaiting review") };
    case "question":
      return { kind: "warning", label: L("\u7B49\u5F85\u56DE\u7B54", "Waiting for answer") };
  }
  if (s?.running) return { kind: "ongoing", label: L("\u8FDB\u884C\u4E2D", "Running") };
  if (s?.completed) return { kind: "done", label: L("\u5DF2\u5B8C\u6210", "Completed") };
  return void 0;
}
function StatusGlyph({ status }) {
  if (!status) return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: styles4.statusSlot, "aria-hidden": "true" });
  if (status.kind === "ongoing") {
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: styles4.statusSlot, className: "dsh-wskit-ongoing", role: "img", "aria-label": status.label, title: status.label, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("svg", { className: "dsh-wskit-matrix", width: 10, height: 10, viewBox: "0 0 10 10", shapeRendering: "crispEdges", "aria-hidden": "true", children: CHASE_CELLS.map(([x, y], i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      "rect",
      {
        className: "dsh-wskit-cell",
        x,
        y,
        width: 2,
        height: 2,
        style: { animationDelay: `${(i - CHASE_CELLS.length) * 125}ms` }
      },
      `${x}-${y}`
    )) }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: styles4.statusSlot, role: "img", "aria-label": status.label, title: status.label, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: { ...styles4.stateDot, background: STATUS_DOT_COLOR[status.kind] } }) });
}
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
      status: sessionStatusOf(s)
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
  const [expanded, setExpanded] = (0, import_react6.useState)({});
  const [archivedOpen, setArchivedOpen] = (0, import_react6.useState)(false);
  const [ungroupedOpen, setUngroupedOpen] = (0, import_react6.useState)(false);
  const [hovered, setHovered] = (0, import_react6.useState)(null);
  const [searchOpen, setSearchOpen] = (0, import_react6.useState)(false);
  const [searchQ, setSearchQ] = (0, import_react6.useState)("");
  const [sortMode, setSortMode] = (0, import_react6.useState)("updated");
  const [contentHits, setContentHits] = (0, import_react6.useState)([]);
  const [contentLoading, setContentLoading] = (0, import_react6.useState)(false);
  const [drag, setDrag] = (0, import_react6.useState)(null);
  const [over, setOver] = (0, import_react6.useState)(null);
  const [pickerWs, setPickerWs] = (0, import_react6.useState)(null);
  const { active, archivedWs, ungrouped } = (0, import_react6.useMemo)(
    () => collectRows(workspacesState, sessionsState, archived),
    [workspacesState, sessionsState, archived]
  );
  const displaySessionsByWs = (0, import_react6.useMemo)(() => {
    const map = {};
    for (const ws of [...active, ...archivedWs]) {
      const key = String(ws.id);
      map[key] = sortMode === "manual" ? ws.sessions : [...ws.sessions].sort(byUpdatedDesc);
    }
    return map;
  }, [active, archivedWs, sortMode]);
  const searchHits = (0, import_react6.useMemo)(
    () => buildSearchHits(workspacesState, sessionsState, archived, searchQ),
    [workspacesState, sessionsState, archived, searchQ]
  );
  const searching = searchOpen && searchQ.trim().length > 0;
  (0, import_react6.useEffect)(() => {
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
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: styles4.rail, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { style: styles4.railButton, title: L("Spotlight \u641C\u7D22\uFF08\u2318K\uFF09", "Spotlight search (\u2318K)"), onClick: openSpotlight, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Command, { size: 16 }) }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
        "button",
        {
          style: styles4.railButton,
          title: L("\u65B0\u5EFA\u4F1A\u8BDD", "New session"),
          onClick: () => {
            startSession();
            expandSidebar();
          },
          children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Plus, { size: 16 })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { style: styles4.railButton, title: L("\u5C55\u5F00\u4FA7\u680F", "Expand sidebar"), onClick: expandSidebar, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ChevronsRight, { size: 16 }) })
    ] });
  }
  const renderSessions = (wsId, sessions) => sessions.map((s) => {
    const dragKey = wsId ? `s:${wsId}:${s.id}` : `s:${s.id}`;
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
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
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(StatusGlyph, { status: s.status }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: styles4.sessionTitle, children: s.title }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
            "span",
            {
              style: { ...styles4.sessionActions, display: hovered === dragKey ? "flex" : "none" },
              onMouseDown: (e) => e.stopPropagation(),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { style: styles4.miniButton, title: L("\u91CD\u547D\u540D", "Rename"), onClick: (e) => {
                  e.stopPropagation();
                  void renameSession(s.id, s.title);
                }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Pencil, { size: 11 }) }),
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { style: styles4.miniButton, title: L("\u590D\u5236\u4F1A\u8BDD\uFF08fork\uFF09", "Duplicate session (fork)"), onClick: (e) => {
                  e.stopPropagation();
                  forkSession(s.id);
                }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Copy, { size: 11 }) }),
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { style: styles4.miniButton, title: L("\u5F52\u6863\u4F1A\u8BDD\uFF08\u4E0D\u53EF\u9006\uFF0C\u4ECD\u53EF\u4ECE\u641C\u7D22\u6253\u5F00\uFF09", "Archive session (irreversible, still searchable)"), onClick: (e) => {
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
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
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
            (app.icon || app.color) && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              "span",
              {
                style: styles4.wsIconSlot,
                onMouseDown: (e) => {
                  e.stopPropagation();
                  setPickerWs(picking ? null : String(ws.id));
                },
                title: L("\u70B9\u51FB\u4FEE\u6539\u56FE\u6807 / \u989C\u8272", "Click to change icon / color"),
                children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(WorkspaceGlyph, { icon: app.icon, color: app.color, size: 15 })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: styles4.wsChevron, children: isOpen ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ChevronDown, { size: 13 }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ChevronRight, { size: 13 }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: styles4.wsTitle, children: ws.title }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: styles4.wsCount, children: ws.sessionCount }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { style: { ...styles4.wsActions, display: hovered === wsKey ? "flex" : "none" }, onMouseDown: (e) => e.stopPropagation(), children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
                "button",
                {
                  style: styles4.miniButton,
                  title: L("\u8BBE\u7F6E\u56FE\u6807 / \u989C\u8272", "Set icon / color"),
                  onClick: (e) => {
                    e.stopPropagation();
                    setPickerWs(picking ? null : String(ws.id));
                  },
                  children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Palette, { size: 11 })
                }
              ),
              !ws.archived && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { style: styles4.miniButton, title: L("\u5728\u6B64\u5DE5\u4F5C\u533A\u65B0\u5EFA\u4F1A\u8BDD", "New session in this workspace"), onClick: (e) => {
                e.stopPropagation();
                startSession(ws.id);
              }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Plus, { size: 11 }) }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
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
              !ws.archived && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { style: styles4.miniButton, title: L("\u91CD\u547D\u540D\u5DE5\u4F5C\u533A", "Rename workspace"), onClick: (e) => {
                e.stopPropagation();
                void renameWorkspace(ws.id, ws.title);
              }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Pencil, { size: 11 }) }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { style: styles4.miniButton, title: L("\u5220\u9664\u5DE5\u4F5C\u533A\u6CE8\u518C\uFF08\u76EE\u5F55\u4E0E\u5386\u53F2\u4F1A\u8BDD\u4FDD\u7559\uFF09", "Remove workspace registration (directory and past sessions kept)"), onClick: (e) => {
                e.stopPropagation();
                deleteWorkspace(ws.id);
              }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Trash, { size: 11 }) })
            ] })
          ]
        }
      ),
      picking && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: styles4.pickerPanel, onMouseDown: (e) => e.stopPropagation(), children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: styles4.pickerLabel, children: L("\u56FE\u6807", "Icon") }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: styles4.pickerGrid, children: WORKSPACE_ICON_KEYS.map((key) => {
          const selected = iconKeyOf(app.icon) === key;
          return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            "button",
            {
              title: key,
              style: { ...styles4.pickerIcon, ...selected ? styles4.pickerSelected : {} },
              onClick: () => applyAppearance(String(ws.id), { icon: key }),
              children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(WorkspaceGlyph, { icon: key, size: 15 })
            },
            key
          );
        }) }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: styles4.pickerLabel, children: L("\u989C\u8272", "Color") }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: styles4.pickerGrid, children: COLOR_CHOICES.map((color) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "button",
          {
            style: { ...styles4.pickerSwatch, background: color, ...app.color === color ? styles4.pickerSelected : {} },
            title: color,
            onClick: () => applyAppearance(String(ws.id), { color })
          },
          color
        )) }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
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
      isOpen && sessions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
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
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: styles4.root, onMouseLeave: () => setHovered(null), children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: styles4.header, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: styles4.headerTitle, children: L("\u5DE5\u4F5C\u533A", "Workspaces") }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { style: styles4.headerActions, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "button",
          {
            style: styles4.headerAction,
            title: L("\u641C\u7D22\u5DE5\u4F5C\u533A / \u4F1A\u8BDD\uFF08\u6807\u9898\u3001\u8DEF\u5F84\uFF09", "Search workspaces / sessions (title, path)"),
            onClick: () => {
              setSearchOpen((v) => !v);
              if (searchOpen) setSearchQ("");
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Search, { size: 13 })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { style: styles4.headerAction, title: L("\u65B0\u5EFA\u5DE5\u4F5C\u533A\uFF08\u9009\u62E9\u76EE\u5F55\uFF09", "New workspace (pick a directory)"), onClick: addWorkspace, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Plus, { size: 14 }) }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { style: styles4.headerAction, title: L("Spotlight\uFF08\u2318K\uFF09", "Spotlight (\u2318K)"), onClick: openSpotlight, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Command, { size: 13 }) })
      ] })
    ] }),
    searchOpen && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: styles4.searchRow, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      "input",
      {
        style: styles4.searchInput,
        placeholder: L("\u641C\u7D22\u5DE5\u4F5C\u533A / \u4F1A\u8BDD\u2026", "Search workspaces / sessions\u2026"),
        value: searchQ,
        onChange: (e) => setSearchQ(e.target.value),
        autoFocus: true
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: styles4.scroll, children: searching ? searchHits.length === 0 && contentHits.length === 0 && !contentLoading ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: styles4.empty, children: L("\u6CA1\u6709\u5339\u914D\u300C{q}\u300D\u7684\u5DE5\u4F5C\u533A\u6216\u4F1A\u8BDD", 'No workspaces or sessions match "{q}"', { q: searchQ.trim() }) }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
      contentLoading && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: styles4.empty, children: L("\u6B63\u5728\u641C\u7D22\u4F1A\u8BDD\u5185\u5BB9\u2026", "Searching session content\u2026") }),
      searchHits.map((hit) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
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
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: styles4.wsTitle, children: hit.title }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: styles4.hitSub, children: hit.sub })
          ]
        },
        `${hit.kind}-${hit.id}`
      )),
      contentHits.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: styles4.contentLabel, children: L("\u4F1A\u8BDD\u5185\u5BB9\u547D\u4E2D\uFF08{n}\uFF09", "Session content hits ({n})", { n: contentHits.length }) }),
        contentHits.map((hit) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "div",
          {
            style: styles4.hitRow,
            title: hit.snippet,
            onMouseDown: (e) => {
              e.stopPropagation();
              openSession(hit.sessionId);
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: styles4.contentSnippet, children: hit.snippet })
          },
          `content-${hit.sessionId}`
        ))
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
      active.length === 0 && ungrouped.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: styles4.empty, children: L("\u8FD8\u6CA1\u6709\u5DE5\u4F5C\u533A\uFF0C\u70B9\u53F3\u4E0A\u89D2\u65B0\u5EFA\u6309\u94AE\u3002", "No workspaces yet \u2014 use the new-workspace button in the top right.") }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
        "div",
        {
          onDragOver: (e) => {
            if (drag?.kind === "workspace") stop(e);
          },
          onDrop: onWsDrop(void 0),
          children: active.map((ws) => renderWsRow(ws, true))
        }
      ),
      ungrouped.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
          "div",
          {
            style: styles4.wsRow,
            onMouseEnter: () => setHovered("bucket-ungrouped"),
            onMouseDown: (e) => {
              e.stopPropagation();
              setUngroupedOpen((v) => !v);
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: styles4.wsChevron, children: ungroupedOpen ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ChevronDown, { size: 13 }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ChevronRight, { size: 13 }) }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: styles4.wsTitle, children: L("\u672A\u5F52\u7EC4", "Ungrouped") }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: styles4.wsCount, children: ungrouped.length })
            ]
          }
        ),
        ungroupedOpen && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: styles4.sessionList, children: renderSessions(void 0, ungrouped) })
      ] }),
      archivedWs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: styles4.sectionToggle, onClick: () => setArchivedOpen((v) => !v), children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: styles4.sectionChevron, children: archivedOpen ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ChevronDown, { size: 12 }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ChevronRight, { size: 12 }) }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { children: L("\u5DF2\u5F52\u6863\uFF08{n}\uFF09", "Archived ({n})", { n: archivedWs.length }) })
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
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center"
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
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center"
  },
  searchRow: { padding: "0 10px 6px" },
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
  sectionChevron: { display: "inline-flex", color: "#a2aabe" },
  empty: { padding: "14px 8px", fontSize: 12, color: "#a2aabe" },
  wsRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "7px 4px",
    borderRadius: 7,
    cursor: "pointer",
    userSelect: "none"
  },
  wsChevron: {
    width: 14,
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9aa3b5"
  },
  wsTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: 600,
    color: "#2e3a4d",
    lineHeight: "20px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  wsCount: { fontSize: 12, fontWeight: 500, color: "#8a93a6", flexShrink: 0 },
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
  statusSlot: { width: 10, height: 10, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" },
  stateDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  sessionTitle: { flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  miniButton: {
    fontSize: 11,
    lineHeight: "16px",
    padding: "0 6px",
    borderRadius: 6,
    border: "1px solid rgba(28, 35, 51, 0.12)",
    background: "#ffffff",
    color: "#5a6478",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4
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
    width: 20,
    height: 20,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    cursor: "pointer"
  },
  pickerPanel: {
    margin: "2px 4px 6px 26px",
    padding: 8,
    borderRadius: 10,
    background: "#f5f7fa",
    border: "1px solid rgba(28, 35, 51, 0.08)"
  },
  pickerLabel: { fontSize: 11, fontWeight: 600, color: "#8a93a6", margin: "4px 0" },
  pickerGrid: { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 2 },
  pickerIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    border: "1px solid transparent",
    background: "transparent",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center"
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
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs:
lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs:
lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs:
lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs:
lucide-react/dist/esm/defaultAttributes.mjs:
lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs:
lucide-react/dist/esm/context.mjs:
lucide-react/dist/esm/Icon.mjs:
lucide-react/dist/esm/createLucideIcon.mjs:
lucide-react/dist/esm/icons/book-open.mjs:
lucide-react/dist/esm/icons/bot.mjs:
lucide-react/dist/esm/icons/brain.mjs:
lucide-react/dist/esm/icons/chart-column.mjs:
lucide-react/dist/esm/icons/chevron-down.mjs:
lucide-react/dist/esm/icons/chevron-right.mjs:
lucide-react/dist/esm/icons/chevrons-right.mjs:
lucide-react/dist/esm/icons/coins.mjs:
lucide-react/dist/esm/icons/command.mjs:
lucide-react/dist/esm/icons/construction.mjs:
lucide-react/dist/esm/icons/copy.mjs:
lucide-react/dist/esm/icons/database.mjs:
lucide-react/dist/esm/icons/file-text.mjs:
lucide-react/dist/esm/icons/files.mjs:
lucide-react/dist/esm/icons/flame.mjs:
lucide-react/dist/esm/icons/flask-conical.mjs:
lucide-react/dist/esm/icons/folder-open.mjs:
lucide-react/dist/esm/icons/folder.mjs:
lucide-react/dist/esm/icons/gamepad-2.mjs:
lucide-react/dist/esm/icons/ghost.mjs:
lucide-react/dist/esm/icons/globe.mjs:
lucide-react/dist/esm/icons/joystick.mjs:
lucide-react/dist/esm/icons/lightbulb.mjs:
lucide-react/dist/esm/icons/map.mjs:
lucide-react/dist/esm/icons/package.mjs:
lucide-react/dist/esm/icons/palette.mjs:
lucide-react/dist/esm/icons/pencil.mjs:
lucide-react/dist/esm/icons/plus.mjs:
lucide-react/dist/esm/icons/puzzle.mjs:
lucide-react/dist/esm/icons/rocket.mjs:
lucide-react/dist/esm/icons/search.mjs:
lucide-react/dist/esm/icons/settings.mjs:
lucide-react/dist/esm/icons/sliders-horizontal.mjs:
lucide-react/dist/esm/icons/snowflake.mjs:
lucide-react/dist/esm/icons/sprout.mjs:
lucide-react/dist/esm/icons/star.mjs:
lucide-react/dist/esm/icons/target.mjs:
lucide-react/dist/esm/icons/trash.mjs:
lucide-react/dist/esm/icons/trending-up.mjs:
lucide-react/dist/esm/icons/wrench.mjs:
lucide-react/dist/esm/icons/zap.mjs:
lucide-react/dist/esm/lucide-react.mjs:
  (**
   * @license lucide-react v1.41.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/

		return module.exports;
	}
});

