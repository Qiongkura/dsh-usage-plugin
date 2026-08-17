# dsh-usage-plugin

A **DeepSeek Harness Token Usage Statistics** plugin: sidebar bottom entry + modal panel that aggregates token consumption across all sessions by day / model / session / workspace, with an asOf snapshot semantics.

- **Workspace grouping**: adds a `workspace` dimension that aggregates by the session's working directory;
- **Token-based sorting**: `sortBy: tokens-desc / tokens-asc` with a three-way toggle in the panel;
- **Subagent merging**: subagent usage is automatically folded into the originating root session.

## Features

| Feature | Description |
| --- | --- |
| Grouping Dimensions (multi-select) | Date (by day), Model (by provider/model), Session (with Chinese titles), Workspace (directory name only) |
| Sorting | Default / Most tokens first / Fewest tokens first |
| Time Range | Today / Last 7 days / Last 30 days / All time / Custom start & end dates |
| Statistics Detail | Bar chart + summary table (input, output, cache read, cache write, total, request count) + totals row |
| Subagent Merging | Subagent usage is automatically folded into the originating root session |
| Read-only Safety | Never creates / restores agents, never constructs prompts, never initiates model requests |
| asOf Snapshot | Panel freezes the statistics cutoff moment upon opening; usage generated after is counted next time |

## Architecture

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

## Install & Usage

### Quick install (three steps)

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

The script does everything automatically: **applies the usage patch to the host (when necessary)** → places the plugin into DSH → adds the plugin as a dependency of dsh-web-app → disables the official duplicate plugin → registers the plugin → runs `pnpm install` → builds host/client. Running the script repeatedly is safe (idempotent).

### Manual installation (without the script)

```bash
# 0. Apply usage patches to the host first (if the host doesn't have usage.query)
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

# 2. Add the plugin as a dependency of dsh-web-app
#    Edit packages/bundle/web-app/package.json, add:
#    "dsh-usage-plugin": "workspace:*"

# 3. Disable the official plugin: edit packages/bundle/web-app/cordis.patch.yml
#    - id: usage-query
#      disabled: true
#    - id: ui-usage
#      disabled: true

# 4. Register this plugin:
#    - id: usage-plugin
#      name: 'dsh-usage-plugin'

# 5. Install and build
cd D:/deepseek-harness
pnpm install
pnpm run build:lib:host
pnpm run build:lib:client
pnpm run build:web
pnpm run start:web
```

## Usage Example

```bash
# Server-side query (via RPC)
ctx.usageQuery.query({
  groupBy: ['day', 'model'],
  sortBy: 'tokens-desc',
  from: '2026-08-01',
  to: '2026-08-16',
})
```

Panel operations:

1. Click the 📊 **Usage Statistics** icon at the bottom of the sidebar
2. Select a time range → check grouping dimensions → choose a sorting mode
3. View the bar chart and summary table; click the backdrop, ×, or press `Esc` to close

## Configuration

| Key | Description | Default |
| --- | --- | --- |
| `READ_CONCURRENCY` | Max concurrent session-log reads per query | 4 |
| `CACHE_LIMIT` | Max cached per-session fold results | 500 |

> The plugin does not support external configuration. `UsageQueryConfig` is `Record<string, never>` — any config key is rejected.

## Testing

```bash
pnpm test       # vitest run
pnpm typecheck  # type checking only
```

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/xxx`)
3. Commit your changes (`git commit -m 'feat: add xxx'`)
4. Push to the branch (`git push origin feature/xxx`)
5. Open a Pull Request

## License

[MIT](LICENSE)

## Contact

- GitHub: https://github.com/Qiongkura
- WeChat: Qiongkura

## Known Limitations

- Requires the DSH host `usage.query` RPC endpoint; if the host lacks it, 7 patches (verified on official master `47f9438`) must be applied first;
- The plugin has not been published to npm; installation requires GitHub clone + workspace setup;
- Environments with only the desktop app (no DSH source repository) are not supported;
- The panel freezes the statistics cutoff moment upon opening; usage generated after is counted the next time the panel is opened (asOf snapshot semantics).

## Related Projects

- Originally derived from DeepSeek Harness official `@deepseek-ai/dsh-client-ui-usage` / `@deepseek-ai/dsh-usage-query`, enhanced with workspace grouping, Token sorting, and subagent merging;
- Underlying platform: [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
