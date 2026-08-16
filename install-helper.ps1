# dsh-usage-plugin — installer helper（由 install-into-dsh.bat 调用）
# 职责：把插件加入 dsh-web-app 依赖、禁用官方 usage 插件、注册本插件。
# 用 .ps1 独立文件避免 bat 内嵌 PowerShell 的转义问题。
param(
  [Parameter(Mandatory = $true)][string]$DshRoot,
  [Parameter(Mandatory = $true)][string]$PatchesDir
)

$ErrorActionPreference = 'Stop'
$webApp = Join-Path $DshRoot 'packages\bundle\web-app'
$pkgJson = Join-Path $webApp 'package.json'
$patchYml = Join-Path $webApp 'cordis.patch.yml'

function Read-NoBom([string]$path) {
  $text = [System.IO.File]::ReadAllText($path)
  return $text.TrimStart([char]0xFEFF)
}

function Write-NoBom([string]$path, [string]$text) {
  [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
}

# ---- 0. 宿主缺少 usage 域时应用补丁 ----
$handler = Join-Path $DshRoot 'packages\host\apiproxy\src\fetch\handler.ts'
$hasUsage = (Test-Path $handler) -and ((Get-Content $handler -Raw) -match 'usage\.query')
if (-not $hasUsage) {
  $patches = @(
    '0001-feat-usage-daily-token-usage-panel-with-incremental-.patch',
    '0002-usage-session-titles-in-rows-full-totals-row-transpa.patch',
    '0003-usage-transparent-panel-and-date-inputs-keep-gray-bo.patch',
    '0004-fix-usage-panel-test-types.patch',
    '0005-usage-overlay-z-index.patch',
    '0006-usage-workspace-sort-portal.patch'
  )
  foreach ($name in $patches) {
    $patchFile = Join-Path $PatchesDir $name
    if (-not (Test-Path $patchFile)) {
      Write-Error "Patch not found: $patchFile"
    }
    Write-Output "  [apply] $name"
    pushd $DshRoot
    git apply --check --ignore-whitespace $patchFile 2>$null
    if ($LASTEXITCODE -ne 0) {
      popd
      Write-Error "Patch $name does not apply. Host may already have part of the usage code, or diverge from baseline (official master 47f9438). To reset: git fetch origin; git reset --hard origin/master"
    }
    git apply --ignore-whitespace $patchFile
    if ($LASTEXITCODE -ne 0) {
      popd
      Write-Error "Patch $name failed to apply."
    }
    popd
  }
  Write-Output '  [OK] usage patches applied.'
} else {
  Write-Output '  [OK] Host already has usage.query (no patches needed).'
}

# ---- 1. 把插件加入 dsh-web-app 依赖 ----
$json = Read-NoBom $pkgJson | ConvertFrom-Json
if (-not $json.dependencies.PSObject.Properties.Name.Contains('dsh-usage-plugin')) {
  $json.dependencies | Add-Member -NotePropertyName 'dsh-usage-plugin' -NotePropertyValue 'workspace:*'
  $out = $json | ConvertTo-Json -Depth 20
  Write-NoBom $pkgJson $out
  Write-Output '  [完成] 已在 dsh-web-app 依赖中添加 dsh-usage-plugin'
} else {
  Write-Output '  [跳过] dsh-web-app 依赖已存在'
}

# ---- 2. 禁用官方 usage 插件（disabled: true）----
$patch = Read-NoBom $patchYml
$changed = $false
# 官方条目（补丁后）：- id: usage-query / name: '@deepseek-ai/dsh-usage-query'
foreach ($id in @('usage-query', 'ui-usage')) {
  $pattern = "(?m)^(\s*)- id: $id\r?\n(\s*)name: '@deepseek-ai/dsh-(usage-query|client-ui-usage)'"
  if ($patch -match $pattern) {
    # $1 = id 行缩进, $2 = name 行缩进；name 行原缩进已含 6 空格，直接在其后追加
    $replacement = "`$1- id: $id`n`$2name: '@deepseek-ai/dsh-`${3}'`n`$2disabled: true"
    $patch = $patch -replace $pattern, $replacement
    $changed = $true
  }
}
if ($changed) {
  Write-NoBom $patchYml $patch
  Write-Output '  [完成] 已禁用官方 usage-query / ui-usage（disabled: true）'
} else {
  Write-Output '  [跳过] 官方 usage 插件未找到或已禁用'
}

# ---- 3. 注册本插件 ----
if ($patch -notmatch "name: 'dsh-usage-plugin'") {
  $anchor = '    # Token usage statistics: the sidebar-foot trigger + modal over usage.query.'
  if ($patch -notmatch [regex]::Escape($anchor)) {
    $anchor = '    # Cross-session token-usage aggregation behind the usage.query API; the'
  }
  $idx = $patch.IndexOf($anchor)
  if ($idx -lt 0) {
    Write-Output '  [警告] 未找到注册锚点，请手动添加：'
    Write-Output "    - id: usage-plugin`n      name: 'dsh-usage-plugin'"
  } else {
    $insert = "`n    - id: usage-plugin`n      name: 'dsh-usage-plugin'"
    $patch = $patch.Substring(0, $idx) + $anchor + $insert + $patch.Substring($idx + $anchor.Length)
    Write-NoBom $patchYml $patch
    Write-Output '  [完成] 已注册 dsh-usage-plugin'
  }
} else {
  Write-Output '  [跳过] 已注册过'
}
