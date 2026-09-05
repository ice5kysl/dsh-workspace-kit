# dsh-workspace-kit

> GitHub：<https://github.com/ice5kysl/dsh-workspace-kit> ｜ MIT License ｜ 目标 dsh：`@deepseek-ai/dsh` ≥ 0.1.1-rc.2 ｜ 简体中文 · [English](./README.md)

按官方规范编写的 **dsh（DeepSeek Harness）插件**（Cordis bundle 形态），解决两个痛点：

1. **工作区太多、难找** → **⌘K / Ctrl+K Spotlight 搜索**：模糊搜索全部工作区与会话（含未归组、已归档），↑↓ 选择、回车**直接打开/跳转**。
2. **想归档旧工作区** → **软归档**（隐藏 + 可恢复，不删任何数据）：
   - **内置侧栏**：插件以 `sidebar.workspaces` 槽位低优先级（-1）**替换内置工作区浏览器**——归档后的工作区从「工作区」列表消失，收进可折叠的「已归档 (N)」分区，展开后可「恢复 / 打开 / 新建会话」；未归组会话也在独立分区。
   - **Spotlight**：空闲列表不显示已归档；输入关键词时命中项带「已归档」标记出现，方便定位与恢复。
   - 归档/恢复同样可从侧栏每行与 Spotlight 结果行操作。

插件分**两个 face**，由同一个 Loader 入口（`dsh-workspace-kit`）携带：

| Face | 文件 | 职责 |
|---|---|---|
| 宿主（node） | `lib/index.js` | `workspace_find` / `workspace_list` 模型工具；`/workspace-find`、`/workspace-list` 斜杠命令（只读定位，写动作留在 GUI） |
| 浏览器（client） | `lib/client.js` | Spotlight 面板（注册进官方空置的 `shell.overlay` 槽）+ 软归档 store（localStorage 持久化）+ 增强侧栏浏览器 |

> 设计取舍：dsh 官方模型只有**会话级**归档（不可逆）且内置侧栏浏览器无行级隐藏接缝，所以本插件采用「**视图层软归档** + **shadow 替换侧栏浏览器**」：归档状态由插件管理（浏览器持久化），并通过把 `sidebar.workspaces` 替换成自带「已归档」折叠分区的浏览器让归档真正从侧栏主列表消失。替换式浏览器 v1 的能力边界见 [known-limitations.zh-CN.md](./docs/known-limitations.zh-CN.md)。

除归档/恢复外，增强侧栏（启用时）还提供：

- **新建工作区**（搜索按钮旁的加号按钮）——系统目录选择器 → 注册 → 打开。
- **侧栏搜索**（展开输入框）——按工作区标题/路径与会话标题过滤，另有 **会话内容全文搜索**（≥2 字符防抖调官方 host 内容索引，结果按「会话内容命中」列出）。
- **每工作区图标 + 强调色**——hover 工作区行点调色板按钮（或直接点图标）：32 个 SVG 图标 + 9 色可选，「清除」还原；Spotlight 结果同步显示（浏览器持久化）。
- **拖拽排序**——工作区行拖动 → 官方 `insertBefore` 持久化；工作区内会话拖动 → `insertSessionBefore`；某工作区一旦手动拖过，其会话改按手动（账户）顺序展示（对齐内置 Manual 语义）。
- **内置风格对话框**——重命名/删除/归档确认统一走插件样式化弹窗。
- **侧栏一键切换**——底部常驻按钮在「增强侧栏 / 官方侧栏」间即时互切，选择持久化、重启保持。

会话里可直接说「用 workspace_find 找一下 pms 工作区」，或输入 `/workspace-find pms`。

## 截图

| 增强侧栏 | 每工作区图标与颜色选择器 | ⌘K Spotlight 搜索 |
| :---: | :---: | :---: |
| <img src="docs/screenshots/sidebar.png" width="230" alt="增强侧栏"> | <img src="docs/screenshots/icon-picker.png" width="230" alt="每工作区图标与颜色选择器"> | <img src="docs/screenshots/spotlight.png" width="360" alt="Spotlight 搜索面板"> |

## 多语言（i18n）

所有面向用户的文案均为中英双语（简体中文 / English）：

- **浏览器（client）**：优先读取 `localStorage` 键 `dsh.workspace-kit.locale`（`zh` | `en`），否则按 `navigator.language(s)` 判定（`zh*` → 中文，其它 → 英文）。
- **宿主（node）**：优先读取环境变量 `WSKIT_LOCALE`（`zh` | `en`），否则按 `LC_ALL` / `LANG` 判定（`zh*` → 中文），默认英文。
- 双语文案在调用点以 `L('中文', 'English', vars?)` 形式就地书写，基础设施在 `src/shared/i18n.ts`，语言探测分别在 `src/client/locale.ts` 与 `src/host/locale.ts`。

## 快速安装（本机个人 dsh）

已发布到 npm —— 如果你已在本机跑 dsh Web，一行即可安装：

```bash
dsh plugin --profile web add dsh-workspace-kit
```

下面的 git 方式用于开发 / 尝鲜最新源码。

前置：`dsh` 在 PATH（`@deepseek-ai/dsh` ≥ 0.1.1-rc.2），Node 20+。

```bash
# 0. 获取源码（或直接使用本地目录）
git clone https://github.com/ice5kysl/dsh-workspace-kit && cd dsh-workspace-kit

# 1. 构建（产出 lib/index.js + lib/client.js；npm install 的 prepare 钩子会自动构建）
npm install                # 安装构建期依赖（typescript/esbuild/@types 等）
npm run build

# 2. 安装进你的 web profile（等价于官方 dsh plugin add 组合包）
bash scripts/install-personal.sh
#    脚本会自动定位本目录，实际执行 dsh plugin --profile web add .，
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
src/host/     宿主侧：locale.ts（env 语言探测）、util.ts（搜索/列表纯函数）、
             tools.ts（模型工具）、commands.ts（斜杠命令）、index.ts（apply：
             按服务可用性注册）
src/client/   浏览器侧：locale.ts（navigator 语言探测）、archive-store.ts
             （defineStore 软归档集 + 外观，persist localStorage）、dialogs.tsx、
             SidebarToggle.tsx、Spotlight.tsx（⌘K 面板）、WorkspaceSidebar.tsx、
             index.ts（apply：槽位注册 + 动作闭包）
src/shared/   i18n.ts（两侧共享的纯 i18n 工具）
cordis.patch.yml   bundle 层：插入唯一 Loader 入口 dsh-workspace-kit
```

## 设计说明（为什么这样写，均依据官方文档/源码）

- 插件形态 = **组合包**（`dsh.bundle.patch`）+ **浏览器 face**（`dsh.client.platform: 'web'` + `./client` 导出）。host 扫描已启用的 Loader 条目，同一入口的包同时提供 node 与浏览器两侧，且**一个包只能有一个入口**（多入口解析到同一包名会被 client 模块系统拒绝）。
- Spotlight 挂载到 **`shell.overlay`（list/root）**——官方为"整窗自定义浮层"预留的槽。侧栏浏览器注册进 **`sidebar.workspaces`（single/root）并用 priority -1 shadow** 内置占用者（priority 升序、最低者渲染，同 priority 才会报错）——这是官方允许的"整体替换"路线，代价是内置浏览器的部分高级能力需要自行补齐或舍弃（见 known-limitations）。
- 数据读取只用框架标准 hook（`useWorkspaces`/`useSessions`/`useStore`），动作经注册的 `inject` 闭包调用官方会话服务：`ctx.workspaces.startSession(workspaceId)`（复用/新建并打开该工作区会话）与 `ctx.sessions.open(id)`。
- 归档集用框架 `defineStore` + `persist`（localStorage 裸 JSON，key `dsh.workspace-kit.archive.v1`），与内置视图偏好（如 `dsh.workspace.view.v5`）同一机制。
- 全局快捷键无官方注册 API（全仓无 keyboard 服务），按内置插件惯例自挂 `window` keydown（⌘K/Ctrl+K），面板常驻挂载、关闭时渲染 null 以保活监听。
- 宿主侧只做**只读**定位工具/命令：归档语义是视图层（浏览器）状态，宿主侧另存一份会导致与 GUI 不一致，故刻意不写。

## 兼容性

- 目标 dsh：`@deepseek-ai/dsh` v0.1.1-rc.2（`dsh web`，profile `web`）。浏览器 face 面向该版本的 `shell.overlay`/`IWorkspaces`/`ISessions` 契约；上游契约变更时需随版本校验。
- 已知限制与后续方向见 [docs/known-limitations.zh-CN.md](./docs/known-limitations.zh-CN.md)（英文版 [docs/known-limitations.md](./docs/known-limitations.md)）。

## License

[MIT](./LICENSE)
