# 已知限制与后续方向（dsh-workspace-kit）

基于对官方源码/文档（deepseek-ai/deepseek-harness @ master + 已安装 `@deepseek-ai/dsh` v0.1.1-rc.2）的核查，以下是本插件当前的边界、原因与后续可选方向。（English version: [known-limitations.md](./known-limitations.md)。）

## 当前限制

1. **侧栏通过 shadow 替换实现折叠，但替换式浏览器是 v1 子集**
   - 官方模型：只有**会话级**归档（`ctx.workspaceRegistry.archiveSession` → `archivedSessionIds`），且**没有 unarchive**；**没有工作区级归档/隐藏**动词；侧栏 workspace 浏览器是 `sidebar.workspaces`（single 槽）被内置包独占，行级动作无第三方接缝。
   - 归档状态存浏览器（`defineStore` persist → localStorage `dsh.workspace-kit.archive.v1`）。侧栏用 **priority -1 shadow `sidebar.workspaces`** 替换内置浏览器，实现「已归档 → 移出主列表、收进可折叠分区」；Spotlight 空闲列表同样不显示已归档，搜索时带标记出现。
   - 替换式浏览器已补回：**新建工作区**（🔍 旁的 ＋：系统目录选择器 → 注册 → 打开）、**侧栏内搜索**（🔍 展开输入框，按工作区标题/路径与会话标题过滤）、工作区行 **重命名 ✎ / 删除注册 🗑**（确认后删除，会话回未归组）、会话行 **归档**（官方不可逆归档集，含确认）、**拖拽排序**（工作区行 → 官方 `insertBefore`；工作区内会话行 → `insertSessionBefore`；某工作区一旦手动拖过，其会话改按手动（账户）顺序展示）、**视图切换**（按工作区 / 全部会话 pill）、**排序**（最近更新 / 手动）、**会话消息全文搜索**（≥2 字符防抖调官方 host 内容索引，结果分「会话内容命中」列出）、**内置风格对话框**（重命名/删除/归档确认统一走插件样式化弹窗）、每工作区 **emoji 图标 + 强调色** 选择器（浏览器持久化）、侧栏底部 **增强/官方侧栏一键切换**（`sidebar.footer.action`：切到官方侧栏即注销插件占用者，内置浏览器 priority 0 恢复渲染，选择持久化）。内置浏览器其余高级能力未补全。
   - 想"连侧栏一起隐藏"只有两条路（超出第三方插件能力）：(a) shadow 重写整个 `sidebar.workspaces`（等于重写内置浏览器，工作量大）；(b) 上游在 workspace-controller/registry 增加 `archiveWorkspace`/`unarchiveWorkspace` 动词与行级扩展点——推荐上游化。

2. **归档集是浏览器本地的**
   - 与内置"视图偏好"（如 `dsh.workspace.view.v5`）同机制：多浏览器/多设备不同步；换浏览器需重新归档。
   - 宿主侧刻意**不**保存第二份归档集：两侧各存一份必然漂移，而且没有第三方可用的 host↔client 自定义 RPC（client 只能消费构建期生成的 `ctx.remote.*` 命名空间）。

3. **Spotlight 打开工作区 = 官方"新建会话"流程**
   - `ctx.workspaces.startSession(workspaceId)` 复用该工作区可用的 blank 会话或新建并置为当前。若目录已被移动/删除，行为以官方 host 为准（可能报错展示在列表状态）。

4. **宿主侧工具只读且不含归档状态**
   - `workspace_find` / `workspace_list` 与 `/workspace-find`、`/workspace-list` 枚举官方 registry 的全部工作区（不含浏览器归档过滤），只做定位；归档/恢复写动作只在 GUI（浏览器）里。

5. **主题与文案**
   - UI 文案现为**中英双语**（简体中文 / English），经插件自带 locale 模块实现（浏览器：localStorage `dsh.workspace-kit.locale` → `navigator.language`；宿主：env `WSKIT_LOCALE` → `LC_ALL`/`LANG`，默认英文）。
   - 面板样式仍为**内联样式**，深/浅色模式未跟随系统主题。上游规范要求在仓库内用 CSS 变量 token + locale 字典（在官方仓库内由构建检查强制）；本插件作为 out-of-tree 包未接入该构建检查。

## 后续方向（backlog）

- **上游化**：为 workspace 域增加 `archiveWorkspace` / `unarchiveWorkspace`（host storageDomain 持久化 + follow 增量 + UI 行级入口），届时插件改为薄壳。
- **跨端同步归档集**（host 侧 domain 存储 + 自定义远程动词——需要上游 typert/generator 支持 out-of-tree 远程协议）。
- **Spotlight 增强**：面板内会话内容搜索、最近项目、`>` 命令模式、拖拽排序、主题跟随。
- **上游契约回归**：`@deepseek-ai/dsh` 升级到新 rc 后，重新校验浏览器契约（`shell.overlay`、`IWorkspaces.startSession`、`ISessions.open`、`defineStore` persist）并同步更新插件。
