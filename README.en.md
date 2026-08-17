# dsh-usage-plugin

<div align="center">

[中文](README.md) | **English**

</div>

A **Token Usage Statistics** plugin for DeepSeek Harness (DSH): sidebar bottom entry + modal panel to view Token consumption across all sessions.

It is an **enhanced version** of the official DSH "Usage Statistics" — adding **workspace grouping**, **Token-based sorting**, and **subagent usage merging** on top of the official functionality.

---

## 🚀 Quick Start (Three Steps)

> Prerequisite: Another computer has the **DSH source repository** (not just the desktop app installed).

```bat
:: Step 1: Clone this plugin
git clone https://github.com/Qiongkura/dsh-usage-plugin
cd dsh-usage-plugin

:: Step 2: One-click install (replace the path with your DSH repository root)
install-into-dsh.bat D:\deepseek-harness

:: Step 3: Start DSH, open http://127.0.0.1:3080
cd D:\deepseek-harness
pnpm run build:web    :: First-time build of the web UI (~3 seconds)
pnpm run start:web
```

After opening the web page, there is a 📊 icon at the **bottom of the sidebar** — click it to open the usage statistics panel.

The script does everything automatically: **applies the usage patch to the host (when necessary)** → places the plugin into DSH → adds the plugin as a dependency of dsh-web-app → disables the official duplicate plugin → registers the plugin → runs `pnpm install` → builds host/client. Running the script repeatedly is safe (idempotent — already-completed steps are skipped automatically).

> ✅ The full flow has been verified on a clean official master (`47f9438`): patch application → build → startup → `usage.query` returns data — all successful.

---

## 🩹 About the Usage Patch (Important Background)

The `usage.query` RPC endpoint is a dependency of this plugin. However, the official deepseek-harness repository **does not yet include** this endpoint (the usage feature is in independent development and has not been merged upstream). Therefore:

- If the host **already has** the `usage.query` endpoint → the script skips the patch
- If the host **does not have it** → the script automatically applies the **7 patches** from the `patches/` directory (verified to apply cleanly on official master `47f9438`)

What each of the 7 patches does:

| Patch | Description |
|---|---|
| `0001` | Adds the usage domain: host `usage.query` RPC endpoint, `dsh-usage-query` aggregation service, `ui-usage` panel & entry |
| `0002` | Session row displays Chinese titles, totals row, panel transparency |
| `0003` | Date input styling, unselected chip transparent / selected chip bordered |
| `0004` | Fixes type assertions in usage panel tests |
| `0005` | Raises panel overlay z-index (`z-index: 1000`) |
| `0006` | Workspace grouping dimension + Token sorting + panel overlay switches to portal rendering (fixes code block language label floating above the panel) |
| `0007` | Adds `react-dom` / `@types/react-dom` dependencies to `ui-usage` (required for portal rendering; without it, client build throws TS2307) |

> If your DSH repository has diverged significantly from the baseline, the patches may fail to apply — the script will report the error explicitly and will not break your repository.

---

## ❓ FAQ

### 1. Script error "Patch failed to apply"?

This means your DSH repository has diverged significantly from the patch baseline (official master `47f9438`). First check the repository status:

```bat
git -C D:\deepseek-harness log --oneline -1
git -C D:\deepseek-harness status
```

If there are no uncommitted changes, you can reset to the baseline and reinstall:

```bat
git -C D:\deepseek-harness fetch origin
git -C D:\deepseek-harness reset --hard origin/master
```

Then re-run `install-into-dsh.bat`.

### 2. Why disable the official usage-query / ui-usage?

This plugin is a **replacement** for the official feature — both register the **same service** (`ctx.usageQuery`) and the **same entry**. Enabling both simultaneously causes conflicts (startup error `service "usageQuery" has been registered` or two entries appearing). The script automatically adds `disabled: true` to the official plugin entries, allowing this plugin to take over — **all data fetching is handled entirely by this plugin**, with no data loss.

To restore the official plugin, remove the `disabled: true` flag from the `usage-query` / `ui-usage` entries in `packages\bundle\web-app\cordis.patch.yml`.

### 3. Can I install via `pnpm add dsh-usage-plugin`?

**Not yet**. The plugin has not been published to npm, and the DSH official packages on npm are incomplete. Please use the GitHub + workspace installation method described above.

### 4. No DSH source repository, only the desktop app?

The plugin currently requires integration with the DSH source repository; environments with only the desktop app installed are not supported for standalone installation.

### 5. Startup error "Cannot find package 'dsh-usage-plugin'"?

This means the plugin was not added to dsh-web-app's dependency tree (profiles cannot resolve it). Re-run `install-into-dsh.bat` (the script will automatically add the dependency and re-run `pnpm install`).

### 6. How to upgrade the plugin?

```bat
cd dsh-usage-plugin
git pull
install-into-dsh.bat D:\deepseek-harness
```

The script is idempotent: already-applied patches are skipped, already-added dependencies are skipped, already-disabled official plugins are skipped. Then rebuild the frontend:

```bat
cd D:\deepseek-harness
pnpm run build:lib:client
pnpm run build:web
```

### 7. How to uninstall the plugin?

1. Edit `packages\bundle\web-app\package.json` and remove the `"dsh-usage-plugin": "workspace:*"` dependency
2. Edit `packages\bundle\web-app\cordis.patch.yml`: remove the `- id: usage-plugin` registration entry, and remove the `disabled: true` from the `usage-query` / `ui-usage` entries (restore the official plugin)
3. Delete the plugin directory `packages\usage\usage-plugin`
4. (Optional) Revert usage patches: `git -C D:\deepseek-harness checkout -- packages/host/apiproxy packages/usage packages/client/ui-usage`
5. Re-run `pnpm install` and rebuild

---

## ✨ Features

| Feature | Description |
|---|---|
| **Grouping Dimensions** (multi-select) | **Date** (by day), **Model** (by provider/model), **Session** (with Chinese titles), **Workspace** (directory name only) |
| **Sorting** | Default / Most tokens first / Fewest tokens first |
| **Time Range** | Today / Last 7 days / Last 30 days / All time / Custom start & end dates |
| **Statistics Detail** | Bar chart + summary table (input, output, cache read, cache write, total, request count) + totals row |
| **Subagent Merging** | Subagent usage is automatically folded into the originating root session instead of being listed separately |
| **Read-only Safety** | Never creates / restores agents, never constructs prompts, never initiates model requests |

### Panel Operations

1. Click the 📊 **Usage Statistics** icon at the bottom of the sidebar
2. Select a time range → check grouping dimensions → choose a sorting mode
3. View the bar chart and summary table; click the backdrop, ×, or press `Esc` to close

> The panel freezes the statistics cutoff moment upon opening. Usage generated after opening is counted the next time the panel is opened.

---

## 📸 Screenshots

The panel displays by grouping dimension, shown in order: **Date → Model → Session → Workspace**:

**① By Date**
<img src="screenshots/by-date.png" width="640" alt="Grouped by date" />

**② By Model**
<img src="screenshots/by-model.png" width="640" alt="Grouped by model" />

**③ By Session**
<img src="screenshots/by-session.png" width="640" alt="Grouped by session" />

**④ By Workspace**
<img src="screenshots/by-workspace.png" width="640" alt="Grouped by workspace" />

---

## 🔧 Manual Installation (Without the Script)

```bash
# 0. Apply usage patches to the host first (if the host doesn't have the usage.query endpoint)
#    Check: grep -r "usage.query" packages/host/apiproxy/src/fetch/handler.ts
#    If not found (run from the DSH repo root; patch order must be preserved):
cd D:/deepseek-harness
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0001-feat-usage-daily-token-usage-panel-with-incremental-.patch
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0002-usage-session-titles-in-rows-full-totals-row-transpa.patch
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0003-usage-transparent-panel-and-date-inputs-keep-gray-bo.patch
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0004-fix-usage-panel-test-types.patch
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0005-usage-overlay-z-index.patch
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0006-usage-workspace-sort-portal.patch
git apply --ignore-whitespace ../dsh-usage-plugin/patches/0007-ui-usage-react-dom-deps.patch

# 1. Clone the plugin into the DSH repository
git clone https://github.com/Qiongkura/dsh-usage-plugin.git \
  D:/deepseek-harness/packages/usage/usage-plugin

# 2. Add the plugin as a dependency of dsh-web-app (critical! otherwise startup throws
#    "Cannot find package 'dsh-usage-plugin'")
#    Edit packages/bundle/web-app/package.json dependencies and add:
#    "dsh-usage-plugin": "workspace:*"

# 3. Disable the official plugin: edit packages/bundle/web-app/cordis.patch.yml
#    Find these two entries and add disabled: true:
#    - id: usage-query
#      name: '@deepseek-ai/dsh-usage-query'
#      disabled: true
#    - id: ui-usage
#      name: '@deepseek-ai/dsh-client-ui-usage'
#      disabled: true

# 4. Register this plugin in the same file:
#    - id: usage-plugin
#      name: 'dsh-usage-plugin'

# 5. Install and build
cd D:/deepseek-harness
pnpm install
pnpm run build:lib:host
pnpm run build:lib:client
pnpm run build:web

# 6. Start
pnpm run start:web
```

---

## 🏗️ Architecture

```
┌─────────────────────┐       ┌──────────────────────────────┐
│  Browser (web GUI)  │       │  Host (node)                 │
│  src/client/        │  RPC  │  src/index.ts                │
│  UsageTrigger       │──────▶│  UsageQuery (cordis service) │
│  UsagePanel         │       │  ├─ sessionQuery reads meta  │
│  usage-api (types)  │       │  ├─ sessionPersistence reads │
└─────────────────────┘       │  └─ folds usage events → rows │
                              └──────────────────────────────┘
```

- **`src/client/`** — Browser-side: sidebar entry + usage panel. Data is fetched via a single `usage.query` RPC call.
- **`src/index.ts`** — Host-side Cordis service: cross-session Token usage aggregation (`ctx.usageQuery`).
- **`src/server/`** — Pure aggregation functions (fold / raw / types) and zod contract schemas.

> The `usage.query` RPC endpoint is provided by the DSH host (dsh-host-apiproxy); this plugin only provides the backing aggregation service and frontend panel.

## Requirements

| Dependency | Version | Notes |
|---|---|---|
| DeepSeek Harness source repository | Official master `47f9438` or newer | Host runtime; if the usage domain is missing, the install script patches it automatically |
| Node.js | 20+ | |
| pnpm | 9+ | Build |

---

## 🛠️ Development

```bash
pnpm install
pnpm build      # tsc + tsdown build (lib/index.js + lib/client.js)
pnpm typecheck  # Type checking only
pnpm test       # Run tests
```

### Directory Structure

```
src/
├── index.ts              # Host-side: UsageQuery service (cordis Service)
├── server/
│   ├── types.ts          # Query/row/result types
│   ├── fold.ts           # Pure folding: extract samples, group, sort, validate
│   ├── raw.ts            # Raw log line scanning (usage events + session titles)
│   └── usage.schema.ts   # zod contract (request/response validation)
└── client/
    ├── index.ts          # Browser-side plugin entry (registers dictionary + bottom entry)
    ├── UsageTrigger.tsx  # Sidebar bottom trigger
    ├── UsagePanel.tsx    # Usage modal panel
    ├── usage-api.ts      # Browser-side usage domain types (local)
    ├── locales.ts        # zh/en copy
    └── *.module.css      # Styles (CSS Modules)
```

---

## 📜 Relationship to the Official ui-usage

This plugin originates from the DeepSeek Harness official `@deepseek-ai/dsh-client-ui-usage` / `@deepseek-ai/dsh-usage-query`. After being extracted as a standalone plugin, the following enhancements were added:

- Workspace grouping dimension (`workspace`)
- Token-based sorting (`sortBy: tokens-desc / tokens-asc`)
- Subagent usage merged into the root session
- Simplified workspace display name (directory name only)

## License

[MIT](LICENSE)
