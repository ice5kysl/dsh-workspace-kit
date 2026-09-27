/**
 * Standalone smoke test for the host face (no cordis runtime needed).
 * Applies the plugin to a minimal fake ctx (logger / tools / commands /
 * workspaceRegistry) and asserts the registration contract: both model tools
 * and both slash commands register under their documented names, and their
 * execute/handler paths answer over the fake registry.
 *
 * Run: npm test   (or: node tests/smoke.test.mjs, from the plugin directory)
 */

import assert from 'node:assert/strict'

// Pin the host locale before the plugin module runs `L()` at apply time, so
// the user-facing copy assertions below are deterministic on any machine.
process.env.WSKIT_LOCALE = 'en'

const { apply, inject, name: pluginName } = await import('../lib/index.js')

function fakeWorkspace({ id, title, path, updatedAt, sessionIds, missing = false }) {
  return {
    id,
    title,
    path,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt,
    sessionIds,
    status: async () => (missing ? 'missing-dir' : 'ok'),
  }
}

const demo = fakeWorkspace({
  id: 'ws-demo',
  title: 'demo',
  path: '/home/alice/code/demo',
  updatedAt: '2026-09-06T10:00:00.000Z',
  sessionIds: ['s1', 's2'],
})
const pms = fakeWorkspace({
  id: 'ws-pms',
  title: 'pms',
  path: '/home/alice/code/pms',
  updatedAt: '2026-09-07T10:00:00.000Z',
  sessionIds: ['s3'],
})

function applyKit(workspaces) {
  const tools = []
  const commands = []
  apply({
    logger: () => ({ info: () => {} }),
    workspaceRegistry: { list: () => workspaces },
    tools: { register: (tool) => { tools.push(tool) } },
    commands: { register: (command) => { commands.push(command) } },
  })
  return { tools, commands }
}

const { tools, commands } = applyKit([demo, pms])
const findTool = tools.find((tool) => tool.name === 'workspace_find')
const listTool = tools.find((tool) => tool.name === 'workspace_list')
const findCommand = commands.find((command) => command.name === 'workspace-find')
const listCommand = commands.find((command) => command.name === 'workspace-list')

let failed = 0
async function check(name, fn) {
  try {
    await fn()
    console.log(`  [ok] ${name}`)
  } catch (error) {
    failed += 1
    console.log(`  [FAIL] ${name}: ${error.message}`)
  }
}

console.log('dsh-workspace-kit host smoke test:')

await check('plugin identity: name + inject declare the cordis contract', () => {
  assert.equal(pluginName, 'workspace-kit')
  assert.deepEqual([...inject], ['workspaceRegistry', 'tools', 'commands'])
})

await check('registers exactly the two model tools', () => {
  assert.deepEqual(tools.map((tool) => tool.name), ['workspace_find', 'workspace_list'])
})

await check('registers exactly the two slash commands', () => {
  assert.deepEqual(commands.map((command) => command.name), ['workspace-find', 'workspace-list'])
})

await check('workspace_find metadata: required query param, text output render', () => {
  assert.equal(typeof findTool.description, 'string')
  assert.ok(findTool.description.length > 0)
  assert.equal(findTool.parameters.properties.query.type, 'string')
  assert.deepEqual(findTool.parameters.required, ['query'])
  assert.deepEqual(findTool.output.render({}, 'x'), [{ type: 'text', text: 'x' }])
})

await check('workspace_find execute ranks the fuzzy title hit with path + meta', async () => {
  const text = await findTool.execute({ query: 'demo' })
  assert.ok(text.includes('**demo** — /home/alice/code/demo'))
  assert.ok(text.includes('2 sessions'))
  assert.ok(!text.includes('/home/alice/code/pms'))
})

await check('workspace_find execute rejects args missing the required query', async () => {
  await assert.rejects(() => findTool.execute({}))
})

await check('workspace_find execute answers honestly when nothing matches', async () => {
  const text = await findTool.execute({ query: 'no-such-project' })
  assert.ok(text.includes('No workspace matches "no-such-project"'))
})

await check('workspace_list execute lists every workspace, newest activity first', async () => {
  const text = await listTool.execute({})
  assert.ok(text.startsWith('2 workspaces in total:'))
  assert.ok(text.indexOf('/home/alice/code/pms') < text.indexOf('/home/alice/code/demo'))
})

await check('/workspace-find without keywords returns a usage error', async () => {
  const result = await findCommand.handler({ rawInput: '   ' })
  assert.equal(result.kind, 'error')
  assert.ok(result.text.includes('Usage: /workspace-find <keywords>'))
})

await check('/workspace-find returns matching workspace lines', async () => {
  const result = await findCommand.handler({ rawInput: 'pms' })
  assert.equal(result.kind, 'success')
  assert.ok(result.text.includes('**pms** — /home/alice/code/pms'))
  assert.ok(result.text.includes('/workspace-list'))
})

await check('/workspace-find reports no matches as an error', async () => {
  const result = await findCommand.handler({ rawInput: 'no-such-project' })
  assert.equal(result.kind, 'error')
  assert.ok(result.text.includes('No workspace matches "no-such-project"'))
})

await check('/workspace-list returns the full inventory', async () => {
  const result = await listCommand.handler()
  assert.equal(result.kind, 'success')
  assert.ok(result.text.includes('**demo**'))
  assert.ok(result.text.includes('**pms**'))
})

await check('empty registry: tool and command both answer the empty state', async () => {
  const empty = applyKit([])
  const emptyListTool = empty.tools.find((tool) => tool.name === 'workspace_list')
  const emptyListCommand = empty.commands.find((command) => command.name === 'workspace-list')
  assert.ok((await emptyListTool.execute({})).includes('No workspaces yet'))
  const result = await emptyListCommand.handler()
  assert.equal(result.kind, 'success')
  assert.ok(result.text.includes('No workspaces yet'))
})

/** Browser-face test doubles. */

/** React stub sufficient for importing the client bundle in Node. */
function fakeReact() {
  return {
    createElement: () => null,
    Fragment: {},
    createContext: () => ({ Provider: () => null, Consumer: () => null, displayName: '' }),
    useState: () => [undefined, () => {}],
    useEffect: () => {},
    useLayoutEffect: () => {},
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useRef: (value) => ({ current: value }),
    useSyncExternalStore: () => undefined,
    forwardRef: (component) => component,
    memo: (component) => component,
  }
}

/** Load lib/client.js through the official ModuleLoader envelope. */
let clientRegistration
async function loadClient() {
  if (!clientRegistration) {
    globalThis.window = {
      __ModuleLoader__: { load: (entry) => { clientRegistration = entry } },
      addEventListener: () => {},
      removeEventListener: () => {},
    }
    await import('../lib/client.js')
  }
  return clientRegistration.factory((id) => {
    if (id === 'react') return fakeReact()
    if (id === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null, Fragment: {} }
    if (id === '@deepseek-ai/dsh-client-store') return { defineStore: () => ({ getState: () => ({}), subscribe: () => () => {}, setState: () => {} }) }
    throw new Error(`unexpected external: ${id}`)
  })
}

/**
 * Minimal client Context: records every slot registration and exposes the
 * inject factory of the `sidebar.workspaces` occupant (the navigation seam).
 */
function fakeClientCtx({ sessions = {}, uiWorkspace = {} } = {}) {
  const entries = []
  const ctx = {
    logger: () => ({ info: () => {} }),
    effect: () => {},
    sessions,
    workspaces: {},
    uiWorkspace,
    slots: {
      inject: (_slot, cb) => { cb() },
      register: (options) => { entries.push(options); return () => {} },
    },
    registeredInject(slot) {
      const entry = entries.find((e) => e.name === slot)
      if (!entry) throw new Error(`no registration for slot "${slot}"`)
      return entry.inject()
    },
  }
  return ctx
}

await check('session status: pending interaction outranks running; running outranks done', async () => {
  const client = await loadClient()
  const { sessionStatusOf, sessionStatusOfUnified } = client

  // The fixed bug: a session WAITING on the user must not show the running
  // spinner. The pending kind comes from the separate interaction snapshot,
  // never from a field on the session record.
  const waiting = sessionStatusOf({ running: true }, 'approval')
  assert.equal(waiting.kind, 'warning', 'approval outranks running')
  assert.equal(sessionStatusOf({ running: true }, 'plan-review').kind, 'warning')
  assert.equal(sessionStatusOf({ running: true }, 'question').kind, 'warning', 'user-questions kind is "question" (verified against dsh-client-ui-workspace visiblePendingKind)')

  // The shipped precedence otherwise: running > done > nothing.
  assert.equal(sessionStatusOf({ running: true }, undefined).kind, 'ongoing')
  assert.equal(sessionStatusOf({ completed: true }, undefined).kind, 'done')
  assert.equal(sessionStatusOf({}, undefined), undefined)
  // An unknown interaction kind never hides real activity.
  assert.equal(sessionStatusOf({ running: true }, 'something-else').kind, 'ongoing')

  // dsh >= 0.1.6 unified status record (useSessionStatus), where the legacy
  // pending map and SessionSummary.completed are both gone.
  assert.equal(sessionStatusOfUnified({ running: true, pendingInteraction: { kind: 'question' } }).kind, 'warning')
  assert.equal(sessionStatusOfUnified({ running: true }).kind, 'ongoing')
  assert.equal(sessionStatusOfUnified({ running: false, completionUnread: true }).kind, 'done')
  assert.equal(sessionStatusOfUnified({ running: false, completionUnread: false }), undefined)
  // Absent status falls back to the session row's own running flag.
  assert.equal(sessionStatusOfUnified(undefined, { running: true }).kind, 'ongoing')
  assert.equal(sessionStatusOfUnified(undefined, {}), undefined)
})

await check('navigation: dsh >= 0.1.6 opens through uiWorkspace.openSession', async () => {
  const client = await loadClient()
  const seen = []
  const ctx = fakeClientCtx({
    uiWorkspace: {
      openSession: (id) => seen.push(['uiWorkspace.openSession', id]),
      startSession: () => {},
      pickDirectory: async () => null,
    },
    // Emulates 0.1.6+: the method is simply gone, so reaching for it throws.
    sessions: {
      open: () => { throw new Error('ISessions.open() was removed in dsh 0.1.6') },
      fork: async () => 'child-1',
    },
  })
  client.apply(ctx)
  const actions = ctx.registeredInject('sidebar.workspaces')
  actions.openSession('s-1')
  assert.deepEqual(seen, [['uiWorkspace.openSession', 's-1']])

  // Fork must land on the child through the same navigation path.
  actions.forkSession('s-0')
  await Promise.resolve()
  await Promise.resolve()
  assert.deepEqual(seen, [
    ['uiWorkspace.openSession', 's-1'],
    ['uiWorkspace.openSession', 'child-1'],
  ])
})

await check('navigation: dsh <= 0.1.5 falls back to sessions.open', async () => {
  const client = await loadClient()
  const seen = []
  const ctx = fakeClientCtx({
    uiWorkspace: { startSession: () => {}, pickDirectory: async () => null },
    sessions: { open: (id) => seen.push(['sessions.open', id]) },
  })
  client.apply(ctx)
  const actions = ctx.registeredInject('sidebar.workspaces')
  actions.openSession('s-9')
  assert.deepEqual(seen, [['sessions.open', 's-9']])
})

if (failed > 0) {
  console.log(`\n${failed} check(s) failed`)
  process.exitCode = 1
} else {
  console.log('\nall checks passed')
}
