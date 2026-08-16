# dsh-usage-plugin

DeepSeek Harness（DSH）的 **Token 用量统计** 插件：侧边栏底部入口 + 模态面板，查看所有会话的 Token 消耗。

它是 DSH 官方「用量统计」的**增强版**——在官方功能之上新增了**工作区分组**、**按 Token 排序**、**子代理用量合并**。

---

## 🚀 快速开始（三步）

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

打开网页后，**侧边栏底部**有一个 📊 图标，点开就是用量统计面板。

脚本会自动完成所有事情：**（必要时）给宿主打 usage 补丁** → 把插件放进 DSH → 把插件加入 dsh-web-app 依赖 → 禁用官方重复插件 → 注册 → `pnpm install` → 构建 host/client。

> ✅ 完整流程已在干净的官方 master（`47f9438`）上实测通过：补丁应用 → 构建 → 启动 → `usage.query` 返回数据，全部成功。

---

## 🩹 关于 usage 补丁（重要背景）

`usage.query` RPC 端点是本插件的依赖。但官方 deepseek-harness 仓库**目前还没有**这个端点（usage 功能独立开发，尚未合入官方）。因此：

- 如果宿主**已有** `usage.query` 端点 → 脚本跳过补丁
- 如果宿主**没有** → 脚本自动应用 `patches/` 目录里的 **6 个补丁**（已在官方 master `47f9438` 上验证可干净应用）

> 如果你的 DSH 仓库比基线新很多，补丁可能无法应用——脚本会明确报错，不会破坏你的仓库。

---

## ❓ 常见问题

### 1. 脚本报错「补丁无法应用」？

说明你的 DSH 仓库与补丁基线（官方 master `47f9438`）偏离较大。先确认仓库状态：

```bat
git -C D:\deepseek-harness log --oneline -1
git -C D:\deepseek-harness status
```

如果仓库没有未提交改动，可以重置到基线再装：

```bat
git -C D:\deepseek-harness fetch origin
git -C D:\deepseek-harness reset --hard origin/master
```

再重新运行 `install-into-dsh.bat`。

### 2. 为什么要禁用官方的 usage-query / ui-usage？

本插件是官方功能的**替代品**，两者注册的是**同一个服务**（`ctx.usageQuery`）和**同一个入口**。同时启用会冲突（启动报错 `service "usageQuery" has been registered` 或出现两个入口）。脚本会自动给官方插件加 `disabled: true`，让本插件接管——**数据获取完全由本插件自己完成**，不会丢数据。

想恢复官方插件？把 `packages\bundle\web-app\cordis.patch.yml` 里 `usage-query` / `ui-usage` 条目的 `disabled: true` 删除即可。

### 3. 能 `pnpm add dsh-usage-plugin` 吗？

**暂时不行**。插件还没发布到 npm，而且依赖的 DSH 官方包在 npm 上也不完整。请用上面的 GitHub + workspace 方式安装。

### 4. 没有 DSH 源码仓库，只有桌面应用？

插件目前需要挂进 DSH 源码仓库使用；只装了桌面应用的环境暂不支持单独安装。

### 5. 启动报错「Cannot find package 'dsh-usage-plugin'」？

说明插件没有进入 dsh-web-app 的依赖树（profiles 无法解析）。重新运行 `install-into-dsh.bat`（第 4 步会自动添加依赖并重新 install）。

---

## ✨ 功能特性

| 功能 | 说明 |
|---|---|
| **分组维度**（可多选） | **日期**（按天）、**模型**（按 provider/model）、**会话**（显示中文标题）、**工作区**（只显示目录名） |
| **排序方式** | 默认排序 / 用量从多到少 / 用量从少到多 |
| **时间范围** | 今天 / 近 7 天 / 近 30 天 / 全部 / 自定义起止日期 |
| **统计详情** | 条形图 + 汇总表（输入、输出、缓存读、缓存写、合计、请求数）+ 总计行 |
| **子代理合并** | 子代理（subagent）的用量自动归入发起它的根会话，不再单列一行 |
| **只读安全** | 从不创建/恢复代理、从不构造提示词、从不发起模型请求 |

### 面板操作

1. 点侧边栏底部 📊 **用量统计**
2. 选时间范围 → 勾分组维度 → 选排序方式
3. 看条形图和汇总表；点遮罩、× 或按 `Esc` 关闭

> 面板打开瞬间会冻结统计截止时刻，打开之后产生的用量下次打开才计入。

---

## 🔧 手动安装（不用脚本时）

```bash
# 0. 先给宿主打 usage 补丁（如果宿主还没有 usage.query 端点）
#    检查：grep -r "usage.query" packages/host/apiproxy/src/fetch/handler.ts
#    没有则（在 DSH 仓库根目录执行，注意补丁顺序不能乱）：
cd D:/deepseek-harness
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0001-feat-usage-daily-token-usage-panel-with-incremental-.patch
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0002-usage-session-titles-in-rows-full-totals-row-transpa.patch
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0003-usage-transparent-panel-and-date-inputs-keep-gray-bo.patch
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0004-fix-usage-panel-test-types.patch
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0005-usage-overlay-z-index.patch
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0006-usage-workspace-sort-portal.patch

# 1. 把插件 clone 进 DSH 仓库
git clone https://github.com/Qiongkura/dsh-usage-plugin.git \
  D:/deepseek-harness/packages/usage/usage-plugin

# 2. 把插件加入 dsh-web-app 依赖（关键！否则启动报
#    "Cannot find package 'dsh-usage-plugin'"）
#    编辑 packages/bundle/web-app/package.json 的 dependencies，添加：
#    "dsh-usage-plugin": "workspace:*"

# 3. 禁用官方插件：编辑 packages/bundle/web-app/cordis.patch.yml
#    找到这两段，在原条目上加 disabled: true：
#    - id: usage-query
#      name: '@deepseek-ai/dsh-usage-query'
#      disabled: true
#    - id: ui-usage
#      name: '@deepseek-ai/dsh-client-ui-usage'
#      disabled: true

# 4. 在同一个文件里注册本插件：
#    - id: usage-plugin
#      name: 'dsh-usage-plugin'

# 5. 安装并构建
cd D:/deepseek-harness
pnpm install
pnpm run build:lib:host
pnpm run build:lib:client
pnpm run build:web

# 6. 启动
pnpm run start:web
```

---

## 🏗️ 架构

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

- **`src/client/`** —— 浏览器端：侧边栏入口 + 用量面板。数据通过一次 `usage.query` RPC 获取。
- **`src/index.ts`** —— 宿主端 Cordis 服务：跨会话 Token 用量聚合（`ctx.usageQuery`）。
- **`src/server/`** —— 聚合纯函数（fold / raw / types）与 zod 契约 schema。

> `usage.query` RPC 端点由 DSH 宿主（dsh-host-apiproxy）提供；本插件只提供背后的聚合服务与前端面板。

## 环境要求

| 依赖 | 版本 | 说明 |
|---|---|---|
| DeepSeek Harness 源码仓库 | 较新版本（含 usage 域） | 宿主运行时 |
| Node.js | 20+ | |
| pnpm | 9+ | 构建 |

---

## 🛠️ 开发

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

---

## 📜 与官方 ui-usage 的关系

本插件源自 DeepSeek Harness 官方 `@deepseek-ai/dsh-client-ui-usage` / `@deepseek-ai/dsh-usage-query`，独立化后新增：

- 工作区分组维度（`workspace`）
- 按 Token 用量排序（`sortBy: tokens-desc / tokens-asc`）
- 子代理用量合并到根会话
- 工作区显示名简化（只显示目录名）

## License

[MIT](LICENSE)
