# dsh-usage-plugin（DSH 用量统计插件）

<div align="center">

**中文** | [English](README.en.md)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Star](https://img.shields.io/github/stars/Qiongkura/dsh-usage-plugin.svg)](https://github.com/Qiongkura/dsh-usage-plugin/stargazers)
[![Issues](https://img.shields.io/github/issues/Qiongkura/dsh-usage-plugin.svg)](https://github.com/Qiongkura/dsh-usage-plugin/issues)

</div>

一个 **DeepSeek Harness 用量统计插件**：侧边栏底部入口 + 模态面板，按天/模型/会话/工作区自由组合汇总 Token 用量，Web 统计面板（asOf 快照语义）。

- **工作区分组**：新增 `workspace` 维度，按会话所在工作区目录聚合；
- **按 Token 排序**：`sortBy: tokens-desc / tokens-asc`，面板提供三选一切换；
- **子代理用量合并**：子代理的用量自动归入发起它的根会话，不再单列一行。

## 功能

| 功能 | 说明 |
| --- | --- |
| 分组维度（可多选） | 日期（按天）、模型（按 provider/model）、会话（显示中文标题）、工作区（只显示目录名） |
| 排序方式 | 默认排序 / 用量从多到少 / 用量从少到多 |
| 时间范围 | 今天 / 近 7 天 / 近 30 天 / 全部 / 自定义起止日期 |
| 统计详情 | 条形图 + 汇总表（输入、输出、缓存读、缓存写、合计、请求数）+ 总计行 |
| 子代理合并 | 子代理（subagent）的用量自动归入发起它的根会话 |
| 只读安全 | 从不创建/恢复代理、从不构造提示词、从不发起模型请求 |
| asOf 快照语义 | 面板打开瞬间冻结统计截止时刻，打开之后产生的用量下次打开才计入 |

## 架构

```
┌─────────────────────┐       ┌──────────────────────────────┐
│  Browser (web GUI)  │       │  Host (node)                 │
│  src/client/        │  RPC  │  src/index.ts                │
│  UsageTrigger       │──────▶│  UsageQuery (cordis service) │
│  UsagePanel         │       │  ├─ sessionQuery 读会话元数据 │
│  usage-api (types)  │       │  ├─ sessionPersistence 读日志│
└─────────────────────┘       │  └─ 折叠 usage 事件 → 聚合行  │
                              └──────────────────────────────┘
```

- **`src/client/`** — 浏览器端：侧边栏入口 + 用量面板。数据通过一次 `usage.query` RPC 获取。
- **`src/index.ts`** — 宿主端 Cordis 服务：跨会话 Token 用量聚合（`ctx.usageQuery`）。
- **`src/server/`** — 聚合纯函数（fold / raw / types）与 zod 契约 schema。

> `usage.query` RPC 端点由 DSH 宿主（dsh-host-apiproxy）提供；本插件只提供背后的聚合服务与前端面板。

### 子代理合并

会话视图中，子代理（`header.parentSession` 非空）的样本沿父链归并到根会话（嵌套深度 1–3 层），不再为每个子代理单列一行；「会话」维度语义变为「会话族（root session）」。

## 📦 环境依赖

```bash
Node.js >= 20
pnpm >= 9
DeepSeek Harness 源码仓库（官方 master 47f9438 或更新）
```

## 安装与使用

### 快速安装（三步）

> 前提：另一台电脑上有 **DSH 源码仓库**（不是只装了桌面应用）。

```bat
:: 第 1 步：下载本插件
git clone https://github.com/Qiongkura/dsh-usage-plugin
cd dsh-usage-plugin

:: 第 2 步：一键安装（把路径换成你的 DSH 仓库根目录）
install-into-dsh.bat D:\deepseek-harness

:: 第 3 步：启动 DSH，打开 http://127.0.0.1:3080
cd D:\deepseek-harness
pnpm run build:web    :: 首次需要构建 Web 界面（约 3 秒）
pnpm run start:web
```

脚本会自动完成所有事情：**（必要时）给宿主打 usage 补丁** → 把插件放进 DSH → 把插件加入 dsh-web-app 依赖 → 禁用官方重复插件 → 注册 → `pnpm install` → 构建 host/client。重复运行脚本是安全的（幂等）。

### 手动安装（不用脚本时）

```bash
# 0. 先给宿主打 usage 补丁（如果宿主还没有 usage.query 端点）
cd D:/deepseek-harness
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0001-feat-usage-daily-token-usage-panel-with-incremental-.patch
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0002-usage-session-titles-in-rows-full-totals-row-transpa.patch
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0003-usage-transparent-panel-and-date-inputs-keep-gray-bo.patch
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0004-fix-usage-panel-test-types.patch
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0005-usage-overlay-z-index.patch
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0006-usage-workspace-sort-portal.patch
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0007-ui-usage-react-dom-deps.patch

# 1. 把插件 clone 进 DSH 仓库
git clone https://github.com/Qiongkura/dsh-usage-plugin.git \
  D:/deepseek-harness/packages/usage/usage-plugin

# 2. 把插件加入 dsh-web-app 依赖
#    编辑 packages/bundle/web-app/package.json，添加：
#    "dsh-usage-plugin": "workspace:*"

# 3. 禁用官方插件：编辑 packages/bundle/web-app/cordis.patch.yml
#    - id: usage-query
#      disabled: true
#    - id: ui-usage
#      disabled: true

# 4. 注册本插件：
#    - id: usage-plugin
#      name: 'dsh-usage-plugin'

# 5. 安装并构建
cd D:/deepseek-harness
pnpm install
pnpm run build:lib:host
pnpm run build:lib:client
pnpm run build:web
pnpm run start:web
```

## 📝 使用示例

```bash
# 服务端查询（通过 RPC）
ctx.usageQuery.query({
  groupBy: ['day', 'model'],
  sortBy: 'tokens-desc',
  from: '2026-08-01',
  to: '2026-08-16',
})
```

面板操作：

1. 点侧边栏底部 📊 **用量统计**
2. 选时间范围 → 勾分组维度 → 选排序方式
3. 看条形图和汇总表；点遮罩、× 或按 `Esc` 关闭

## ⚙️ 运行参数

| 配置项 | 说明 | 默认 |
| --- | --- | --- |
| `READ_CONCURRENCY` | 单次查询最大并发读取会话数 | 4 |
| `CACHE_LIMIT` | 最大缓存会话折叠结果数 | 500 |

> 插件不支持外部配置；`UsageQueryConfig` 类型为 `Record<string, never>`，任何配置键都会被拒绝。

## 🧪 测试

```bash
pnpm test       # vitest run
pnpm typecheck  # 仅类型检查
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的功能分支 (`git checkout -b feature/xxx`)
3. 提交你的修改 (`git commit -m 'feat: 新增xxx功能'`)
4. 推送到分支 (`git push origin feature/xxx`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

## 📮 联系方式

- GitHub：https://github.com/Qiongkura
- 微信：Qiongkura

## 已知限制

- 依赖 DSH 官方 `usage.query` RPC 端点，若宿主不含该端点需先打补丁（7 个补丁基于官方 master `47f9438` 验证）；
- 插件尚未发布到 npm，目前只能通过 GitHub clone + workspace 方式安装；
- 只装了桌面应用（无 DSH 源码仓库）的环境暂不支持独立安装；
- 面板打开瞬间冻结统计截止时刻，打开之后产生的用量下次打开才计入（asOf 快照语义）。

## 与相关项目的关系

- 源自 DeepSeek Harness 官方 `@deepseek-ai/dsh-client-ui-usage` / `@deepseek-ai/dsh-usage-query`，独立化后新增工作区分组、Token 排序、子代理合并；
- 底层平台：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
