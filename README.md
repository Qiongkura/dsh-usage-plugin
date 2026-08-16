# dsh-usage-plugin

DeepSeek Harness（DSH）的 **Token 用量统计** 附属插件：侧边栏底部入口 + 模态面板，提供跨会话的 Token 消耗聚合视图。

## 功能特性

- **四种分组维度**，可任意组合（至少选一个）：
  - **日期**：按天聚合
  - **模型**：按 `provider/model` 聚合
  - **会话**：按会话聚合（显示会话中文标题；子代理的用量自动归入发起它的根会话）
  - **工作区**：按会话所在工作区目录聚合（只显示目录名）
- **三种排序方式**：默认维度排序 / 用量从多到少 / 用量从少到多
- **时间范围**：今天 / 近 7 天 / 近 30 天 / 全部，或自定义起止日期
- **统计详情**：条形图（首个分组维度）+ 汇总表（输入、输出、缓存读、缓存写、合计、请求数）+ 总计行
- **子代理合并**：子代理（subagent）会话的用量沿 `parentSession` 链归并到根会话，面板不再为每个子代理单列一行
- **只读安全**：聚合服务从不创建/恢复代理、从不构造提示词、从不发起模型请求

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

- **`src/client/`** —— 浏览器端插件：侧边栏底部触发器 + 用量模态面板。数据通过一次一元 `usage.query` RPC 获取，插件自身不持有状态。
- **`src/index.ts`** —— 宿主端 Cordis 服务：跨会话 Token 用量聚合（`ctx.usageQuery`）。
- **`src/server/`** —— 聚合纯函数（fold / raw / types）与 zod 契约 schema。

## 环境要求

| 依赖 | 版本 | 说明 |
|---|---|---|
| DeepSeek Harness | rc.5+ | 宿主运行时（提供 `sessionQuery`、`sessionPersistence`、web GUI 插槽） |
| Node.js | 20+ | 宿主端 |
| pnpm | 9+ | 构建 |

> 注意：`usage.query` RPC 端点由宿主（dsh-host-apiproxy）提供，本插件只注册背后的聚合服务与前端面板，不重复注册端点。

## 安装与使用

### 方式一：作为 DSH workspace 成员（推荐开发方式）

把本仓库 clone 到 DSH 仓库内：

```bash
git clone https://github.com/<your>/dsh-usage-plugin.git \
  G:/deepseek-harness/packages/usage/usage-plugin
```

在 `packages/bundle/web-app/cordis.patch.yml` 的插件列表中注册：

```yaml
- id: usage-query
  name: 'dsh-usage-plugin'
```

重新构建并启动 `dsh web` 后，侧边栏底部会出现 📊 图标入口。

### 方式二：独立安装为 Cordis 插件

```bash
pnpm add dsh-usage-plugin
```

在你的 profile `cordis.yml` 中加载：

```yaml
plugins:
  - name: 'dsh-usage-plugin'
```

### 使用面板

1. 打开侧边栏底部 **用量统计**（📊）入口
2. 选择时间范围（今天 / 近 7 天 / 近 30 天 / 全部 / 自定义）
3. 勾选分组维度（日期 / 模型 / 会话 / 工作区）
4. 选择排序方式（默认 / 用量从多到少 / 用量从少到多）
5. 查看条形图与汇总表；点击遮罩、× 或按 `Esc` 关闭

面板打开瞬间会冻结统计截止时刻（`asOf`），打开后产生的用量在下次打开时才会计入。

## 开发

```bash
pnpm install
pnpm build      # tsc + tsdown 构建（lib/index.js + lib/client.js）
pnpm typecheck  # 仅类型检查
pnpm test       # 运行测试
```

### 目录结构

```
src/
├── index.ts              # 宿主端：UsageQuery 服务（cordis Service）
├── server/
│   ├── types.ts          # 查询/行/结果类型
│   ├── fold.ts           # 纯折叠：提取样本、分组、排序、校验
│   ├── raw.ts            # 原始日志行扫描（usage 事件 + 会话标题）
│   └── usage.schema.ts   # zod 契约（请求/响应校验）
└── client/
    ├── index.ts          # 浏览器端插件入口（注册字典 + 底部入口）
    ├── UsageTrigger.tsx  # 侧边栏底部触发器
    ├── UsagePanel.tsx    # 用量模态面板
    ├── usage-api.ts      # 浏览器端 usage 域类型（本地）
    ├── locales.ts        # zh/en 文案
    └── *.module.css      # 样式（CSS Modules）
```

## 与官方 ui-usage 的关系

本插件是 DeepSeek Harness 官方 `@deepseek-ai/dsh-client-ui-usage` / `@deepseek-ai/dsh-usage-query` 的独立化移植，在此基础上增加了：

- **工作区分组维度**（`workspace`）
- **按 Token 用量排序**（`sortBy: tokens-desc / tokens-asc`）
- 子代理用量合并到根会话
- 工作区显示名简化（只显示目录名）

## License

[MIT](LICENSE)
