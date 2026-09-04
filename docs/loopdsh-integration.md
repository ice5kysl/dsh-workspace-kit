# LoopDSH 平台接入 dsh-workspace-kit

LoopDSH 为每个用户启动独立的 `dsh web` 实例：`internal/harness` 以
`DSH_HOME=<data>/<userID>/home`、cwd=`<data>/<userID>/ws` 拉起进程；该 home 的
`profiles/web` 会在首次使用时从 dsh 随附模板自动初始化。因此平台接入 = **在每个
用户 home 的 web profile 里预置该插件 bundle**。

## 现状结论

- 插件本身与 dsh 部署位置无关（标准 npm 包 + bundle manifest），个人机与容器内均可安装。
- LoopDSH 代码库暂无 profile 模板/预置逻辑（`internal/harness` 只做进程管理、环境注入、
  LLM 配置写入与损坏会话隔离，见 `harness.go` 注释）。接入需要新增一个“实例初始化后
  幂等预置”的步骤。

## 推荐接入方案（按成本排序）

### 方案 A：harness 启动时幂等预置（改动最小，推荐起步）

在 `internal/harness` 的实例启动流程中（home 首次初始化之后、进程拉起之前），
对每个用户执行一次与个人安装相同的、**幂等**的预置：

1. 产物可达：把本插件目录（`dsh-workspace-kit`）打进部署镜像或作为卷挂载，
   `LOOPDSH_PLUGINS_DIR` 指向它（lib/ 需已构建）。
2. 幂等预置（等价 `dsh plugin --profile web add` 的效果）：
   - `package.json` 的 `dsh.profile.bundles` 未含 `dsh-workspace-kit` 时追加（插在
     `@deepseek-ai/dsh-web-app` 之后）；
   - `dependencies` 追加 `"dsh-workspace-kit": "link:<pluginsDir>"`；
   - 在 home 的 profiles/web 下执行 `pnpm install`（或用 `dsh plugin --profile web add`）。
3. 需注意 `dsh plugin` 在 profile 目录跑 pnpm；容器内需能解析/安装依赖
   （离线 store 或内网 registry），并把超时/失败作为实例健康检查的一部分。

安全提示：`dsh plugin add` 会执行包内 `prepare`（若从 git 安装），平台只应链接
**已构建产物**的本地目录（`link:` 不触发构建脚本），且插件代码只读
`ctx.workspaceRegistry` 与浏览器本地状态，无跨用户数据面。

### 方案 B：入口脚本预置 + 版本兼容矩阵（生产建议）

- 新增 `scripts/preset-workspace-kit.sh`（复用本仓库 `scripts/install-personal.sh` 的幂等思路），在实例容器
  entrypoint 中于 `dsh web` 启动前调用；脚本保持幂等（grep bundles / patch 已存在则跳过）。
- 升级 dsh 或插件版本时，profile 模板重生成可能重置 `dsh.profile.bundles`——
  预置脚本必须在每次实例启动时重跑，不能只做“首次”。
- 建立版本兼容测试：`@deepseek-ai/dsh` 升级到新 rc 后，浏览器契约
  （`shell.overlay`、`IWorkspaces.startSession`、`ISessions.open`、`defineStore` persist）
  若变更需同步更新插件源码并回归。

## 需要 LoopDSH 侧做的后续动作

1. 确定产物分发路径（镜像内置 vs 启动时构建）与 registry/离线 store 策略。
2. 在 harness 增加幂等预置 + 探活日志（“workspace-kit loaded”）。
3. 可选：平台管理后台加“工作区工具”开关（env 如 `LOOPDSH_FEATURE_WS_KIT=on` 默认关）。
4. 回归脚本：多用户实例并行启动、升级兼容、归档集仅本用户可见。

> 本文件是接入设计稿；未对 LoopDSH 部署代码做改动（当前仓库未包含 profile 模板逻辑，
> 接入点如上）。若需要，下一步可直接在 `internal/harness` 实现方案 A。
