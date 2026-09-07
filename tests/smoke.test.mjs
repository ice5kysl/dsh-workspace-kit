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

if (failed > 0) {
  console.log(`\n${failed} check(s) failed`)
  process.exitCode = 1
} else {
  console.log('\nall checks passed')
}
