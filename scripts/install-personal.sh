#!/usr/bin/env bash
# 把 dsh-workspace-kit 安装进本机个人 dsh 的 web profile（官方 dsh plugin add 路径）。
# 前置：已在插件目录构建（npm run build），dsh 在 PATH。
# 用法（monorepo 布局）：bash plugins/dsh-workspace-kit/scripts/install-personal.sh
# 用法（独立仓库布局）：bash scripts/install-personal.sh
set -euo pipefail

# 定位插件目录：从本脚本位置向上找到 name=dsh-workspace-kit 的 package.json，
# 因此脚本在 monorepo 或独立仓库里都能运行。
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR=""
DIR="$SCRIPT_DIR"
while [[ "$DIR" != "/" ]]; do
  if [[ -f "$DIR/package.json" ]] && grep -q '"dsh-workspace-kit"' "$DIR/package.json"; then
    PLUGIN_DIR="$DIR"
    break
  fi
  DIR="$(dirname "$DIR")"
done

if [[ -z "$PLUGIN_DIR" ]]; then
  echo "❌ 找不到插件目录（本脚本需位于 dsh-workspace-kit 仓库/目录内）" >&2
  exit 1
fi

if [[ ! -f "$PLUGIN_DIR/lib/index.js" || ! -f "$PLUGIN_DIR/lib/client.js" ]]; then
  echo "❌ 未找到构建产物，请先在插件目录执行 npm run build" >&2
  exit 1
fi

if ! command -v dsh >/dev/null 2>&1; then
  echo "❌ 未找到 dsh，请先安装 @deepseek-ai/dsh" >&2
  exit 1
fi

echo "▶ 安装 dsh-workspace-kit 到 web profile（$HOME/.dsh/profiles/web）"
# dsh plugin --profile web add <path> 会把包作为组合包追加到 dsh.profile.bundles
# 并 pnpm 链接到 profile；包内 cordis.patch.yml 随后插入 Loader 行。
dsh plugin --profile web add "$PLUGIN_DIR"

echo
echo "▶ 校验组合树（打印包含 workspace-kit 的行）："
dsh --profile web --dump-config | grep -n "workspace-kit" || true

echo
echo "✅ 安装完成。"
echo "  现在需要重启 dsh web 才能生效：退出当前 dsh web 进程后重新执行 dsh web，"
echo "  然后刷新浏览器（http://127.0.0.1:3080）。"
echo "  生效后按 ⌘K / Ctrl+K 呼出工作区 Spotlight；每行可软归档/恢复。"
