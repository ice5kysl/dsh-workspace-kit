# dsh-workspace-kit

> 🏠 GitHub：<https://github.com/ice5kysl/dsh-workspace-kit> ｜ 📦 MIT License ｜ 目标 dsh：`@deepseek-ai/dsh` ≥ 0.1.1-rc.2

按官方规范编写的 **dsh（DeepSeek Harness）插件**（bundle 形态），解决两个痛点：

1. **工作区太多、难找** → **⌘K / Ctrl+K Spotlight 搜索**：模糊搜索全部工作区与会话（含未归组、已归档），↑↓ 选择、回车**直接打开/跳转**。
2. **想归档旧工作区** → **软归档**（隐藏 + 可恢复，不删任何数据）：
   - **内置侧栏**：插件以 `sidebar.workspaces` 槽位低优先级（-1）**替换内置工作区浏览器**——归档后的工作区从「工作区」列表消失，收进可折叠的「已归档 (N)」分区，展开后可「恢复 / 打开 / ➕新建会话」；未归组会话也在独立分区。
   - **Spotlight**：空闲列表不显示已归档；输入关键词时命中项带「已归档」标记出现，方便定位与恢复。
   - 归档/恢复同样可从侧栏每行与 Spotlight 结果行操作。

插件分**两个 face**，由同一个 Loader 入口（`dsh-workspace-kit`）携带：

| Face | 文件 | 职责 |
|---|---|---|
| 宿主（node） | `lib/index.js` | `workspace_find` / `workspace_list` 模型工具；`/workspace-find`、`/workspace-list` 斜杠命令（只读定位，写动作留在 GUI） |
| 浏览器（client） | `lib/client.js` | Spotlight 面板（注册进官方空置的 `shell.overlay` 槽）+ 软归档 store（localStorage 持久化） |

> 设计取舍：dsh 官方模型只有**会话级**归档（不可逆）且内置侧栏浏览器无行级隐藏接缝，所以本插件采用「**视图层软归档** + **shadow 替换侧栏浏览器**」：归档状态由插件管理（浏览器持久化），并通过把 `sidebar.workspaces` 替换成自带「已归档」折叠分区的浏览器让归档真正从侧栏主列表消失。替换式浏览器 v1 的能力边界见 [known-limitations.md](./docs/known-limitations.md)。

## 快速安装（本机个人 dsh）

前置：`dsh` 在 PATH（`@deepseek-ai/dsh` ≥ 0.1.1-rc.2），Node 20+。

```bash
# 0. 获取源码（或直接使用本地目录）
git clone https://github.com/ice5kysl/dsh-workspace-kit && cd dsh-workspace-kit

# 1. 构建（产出 lib/index.js + lib/client.js；npm install 的 prepare 钩子会自动构建）
npm install                # 安装构建期依赖（typescript/esbuild/@types 等）
npm run build

# 2. 安装进你的 web profile（等价于官方 dsh plugin add 组合包）
bash scripts/install-personal.sh
#    脚本会自动定位本目录，实际执行 dsh plugin --profile web add .
#    把这个包加入 ~/.dsh/profiles/web 的 dsh.profile.bundles（追加在
#    dsh-web-app 之后），包内 cordis.patch.yml 自动插入唯一 Loader 行。

# 3. 验证组合（无需重启）
dsh --profile web --dump-config | grep -n "workspace-kit"

# 4. 重启 GUI 生效
#    退出当前 dsh web（Ctrl+C 或 kill 进程）后重新运行 dsh web；
#    浏览器刷新 http://127.0.0.1:3080
```

> 也支持作为 monorepo 子目录使用（如 `plugins/dsh-workspace-kit`）：
> 安装脚本按 `package.json` 自动向上定位插件目录，两种布局都无需改命令。

生效后：

- **侧栏**：工作区按需展开会话；行上（hover）可「➕ 新建会话」「归档」；底部「已归档（N）」折叠分区可展开、恢复或打开。
- 任意界面按 **⌘K / Ctrl+K**（或侧栏「⌘K 搜索」按钮）呼出 Spotlight：结果区顶部有 **全部 / 工作区 / 会话** 类型过滤；空闲视图 = 未归档工作区 + 最近会话；输入关键词 = 工作区 + 会话（含未归组）模糊搜索，回车打开。
- **会话归档**：Spotlight 会话结果（选中行）提供「归档会话」——写入官方持久归档集，从工作区分组/侧栏等所有列表隐藏（仍可从搜索打开），**官方暂无 unarchive，操作前会确认**。
- **工作区图标/颜色**：每个工作区可自定义 emoji 图标 + 强调色（行左侧展示）。设置：hover 工作区行点 🎨 → 选 emoji / 颜色 / 清除；Spotlight 结果同步显示，浏览器持久化。
- **侧栏一键切换**：侧栏底部常驻「官方侧栏 / 增强侧栏」切换按钮（按钮文案=点击将切换到的那一侧）——增强侧栏（归档折叠/拖拽/图标）与官方侧栏即时互切，选择持久化，重启后保持。
- 会话里可直接说「用 workspace_find 找一下 pms 工作区」或输入 `/workspace-find pms`。

## 打包 / 分发（可选）

```bash
npm pack          # 产出 dsh-workspace-kit-0.1.0.tgz（含预构建 lib/，prepack 自动 build）
# 其他机器：dsh plugin --profile web add ./dsh-workspace-kit-0.1.0.tgz
```

## 开发

```bash
npm run typecheck   # tsc --noEmit（宿主 + 浏览器两侧源码）
npm run build       # esbuild：src/host → lib/index.js；src/client → lib/client.js
```

源码布局：

```
src/host/    宿主侧：util.ts（搜索/列表纯函数）、tools.ts（模型工具）、
             commands.ts（斜杠命令）、index.ts（apply：按服务可用性注册）
src/client/  浏览器侧：archive-store.ts（defineStore 软归档集，persist
             localStorage）、Spotlight.tsx（⌘K 面板 UI）、index.ts（apply：
             slots.inject('shell.overlay', …) 注册 + 动作闭包）
cordis.patch.yml   bundle 层：插入唯一 Loader 入口 dsh-workspace-kit
```

## 设计说明（为什么这样写，均依据官方文档/源码）

- 插件形态 = **组合包**（`dsh.bundle.patch`）+ **浏览器 face**（`dsh.client.platform: 'web'` + `./client` 导出）。host 扫描已启用的 Loader 条目，同一入口的包同时提供 node 与浏览器两侧，且**一个包只能有一个入口**（多入口解析到同一包名会被 client 模块系统拒绝）。
- Spotlight 挂载到 **`shell.overlay`（list/root）**——官方为“整窗自定义浮层”预留的槽。侧栏浏览器注册进 **`sidebar.workspaces`（single/root）并用 priority -1 shadow** 内置占用者（priority 升序、最低者渲染，同 priority 才会报错）——这是官方允许的“整体替换”路线，代价是内置浏览器的部分高级能力需要自行补齐或舍弃（见 known-limitations）。
- 数据读取只用框架标准 hook（`useWorkspaces`/`useSessions`/`useStore`），动作经注册的 `inject` 闭包调用官方会话服务：`ctx.workspaces.startSession(workspaceId)`（复用/新建并打开该工作区会话）与 `ctx.sessions.open(id)`。
- 归档集用框架 `defineStore` + `persist`（localStorage 裸 JSON，key `dsh.workspace-kit.archive.v1`），与内置视图偏好（如 `dsh.workspace.view.v5`）同一机制。
- 全局快捷键无官方注册 API（全仓无 keyboard 服务），按内置插件惯例自挂 `window` keydown（⌘K/Ctrl+K），面板常驻挂载、关闭时渲染 null 以保活监听。
- 宿主侧只做**只读**定位工具/命令：归档语义是视图层（浏览器）状态，宿主侧另存一份会导致与 GUI 不一致，故刻意不写。

## 兼容性

- 目标 dsh：`@deepseek-ai/dsh` v0.1.1-rc.2（`dsh web`，profile `web`）。浏览器 face 面向该版本的 `shell.overlay`/`IWorkspaces`/`ISessions` 契约；上游契约变更时需随版本校验。
- LoopDSH 平台每用户实例接入见 [docs/loopdsh-integration.md](./docs/loopdsh-integration.md)。
