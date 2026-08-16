# Changelog — dsh-usage-plugin

本项目从 DeepSeek Harness 官方仓库的 `@deepseek-ai/dsh-client-ui-usage`（前端面板）与 `@deepseek-ai/dsh-usage-query`（聚合服务）独立化而来。本文件记录独立化之后的全部改动。

## [0.1.1] - 2026-08-16

### 修复

- **用量面板被代码块语言徽标遮挡**：对话区代码块的 sticky banner（语言标签「bat」等，吸顶层）会浮在用量统计面板上。面板 overlay 的 `z-index` 从 `100` 提升到 `1000`（与 `Modal` / `SettingsRoot` / `ImageLightbox` 等全屏浮层同级），确保面板永远盖住对话区内容。新增安装补丁 `patches/0005-usage-overlay-z-index.patch`（安装脚本与 README 已同步为 5 个补丁）。
- **构建失败 TS2717**：`src/server/usage-query.ts` 与 `src/index.ts` 是重复实现（重构遗留的死代码），二者同时对 `Context.usageQuery` 做声明合并导致类型冲突。已删除 `src/server/usage-query.ts`（不被任何构建入口引用）。
- **构建失败 rolldown 不兼容**：`tsdown@0.8.1` 依赖的 `rolldown@1.1.1` 移除了 `transformPlugin` 导出导致打包崩溃。`tsdown` 升级到 `^0.22.2`（与官方 DSH 构建链一致，官方已验证该组合）。

## [0.1.0] - 2026-08-16

### 新增（相对官方 ui-usage / usage-query）

- **工作区分组维度**：`groupBy` 新增 `workspace`，按会话所在工作区目录聚合；UI 只显示目录名（如 `Desktop`、`beamng-autopilot`）。
- **按 Token 用量排序**：请求新增 `sortBy: 'tokens-desc' | 'tokens-asc'`，面板提供「默认 / 用量从多到少 / 用量从少到多」三选一；排序同时作用于条形图与汇总表。
- **子代理用量合并**：会话视图中，子代理（`header.parentSession` 非空）的样本沿父链归并到根会话，不再为每个子代理单列一行；嵌套子代理（深度 1–3 层）同样归并到最顶层根会话。

### 修复

- **子代理合并根计算错误**：`rootOf` 原先在向上走到无父会话的根节点后错误返回了**起始 id**（子代理自身），导致合并完全不生效（面板 34 行全部是 UUID）。修复为返回最后访问的根节点；数据验证 34 行 → 8 行，总量守恒。
- **会话标题丢失（独立化前遗留问题）**：`usage.query` 响应经宿主 `client-connection` 的 zod schema 二次解析时，旧编译产物缺少 `sessionTitle` 字段，导致面板「会话」列显示 UUID 而非中文标题。修复：重建 client bundle，schema 纳入 `sessionTitle`（本插件已自带完整 schema，不依赖宿主旧产物）。

### 行为变更

- 会话视图默认把子代理归入根会话（不可关闭），使「会话」维度语义变为「会话族（root session）」。
- 面板新增排序 chips 行；维度 chips 增加「工作区」。

### 独立化适配

- 将前端面板、宿主聚合服务、zod 契约从 DSH monorepo 提取为独立 npm 包结构（单包双端：`lib/index.js` 宿主端 + `lib/client.js` 浏览器端）。
- 浏览器端 usage 域类型本地化（`src/client/usage-api.ts`），不再依赖 npm 上未包含 usage 域的 `dsh-api-remotes` 旧版。
- 构建：`tsc` + `tsdown`（node 端 ESM + 浏览器端 `__ModuleLoader__` 闭包 bundle，CSS Modules 内联注入）。
