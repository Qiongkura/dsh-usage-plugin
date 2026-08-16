@echo off
REM ============================================================
REM  dsh-usage-plugin — 一键安装到 DSH 源码仓库（Windows）
REM
REM  用法：install-into-dsh.bat <DSH仓库根目录> [插件来源]
REM    DSH仓库根目录 : 必填，例如 G:\deepseek-harness
REM    插件来源       : 可选，默认 https://github.com/Qiongkura/dsh-usage-plugin.git
REM                    也可以是本地路径（如 C:\Users\Administrator\Desktop\dsh-usage-plugin）
REM
REM  前提：DSH 仓库必须已包含官方 usage 域（usage.query RPC 端点），
REM        本插件是官方 ui-usage/usage-query 的增强替代品，
REM        安装时会自动禁用官方两个插件条目，避免服务/插槽冲突。
REM ============================================================
setlocal enabledelayedexpansion

set "DSH_ROOT=%~1"
set "PLUGIN_SRC=%~2"
if "%DSH_ROOT%"=="" (
  echo [错误] 缺少 DSH 仓库根目录参数。用法：install-into-dsh.bat ^<DSH仓库根目录^> [插件来源]
  exit /b 1
)
if "%PLUGIN_SRC%"=="" set "PLUGIN_SRC=https://github.com/Qiongkura/dsh-usage-plugin.git"

echo ============================================================
echo  [1/7] 检查 DSH 仓库: %DSH_ROOT%
echo ============================================================
if not exist "%DSH_ROOT%\package.json" (
  echo   [错误] 找不到 %DSH_ROOT%\package.json，请确认传入的是 DSH 仓库根目录。
  exit /b 1
)
if not exist "%DSH_ROOT%\packages\bundle\web-app\cordis.patch.yml" (
  echo   [错误] 找不到 packages\bundle\web-app\cordis.patch.yml，仓库结构异常。
  exit /b 1
)

echo.
echo ============================================================
echo  [2/7] 检查宿主是否支持 usage.query 端点
echo ============================================================
set "HAS_USAGE="
findstr /C:"usage.query" "%DSH_ROOT%\packages\host\apiproxy\src\fetch\handler.ts" >nul 2>&1 && set "HAS_USAGE=1"
if not defined HAS_USAGE (
  echo   [错误] 宿主 apiproxy 未包含 usage.query 端点。
  echo         本插件依赖 DSH 官方 usage 域 RPC（usage.query），
  echo         请先把 DSH 仓库更新到包含 usage 域的最新版本：
  echo           git -C "%DSH_ROOT%" pull
  exit /b 1
)
echo   [通过] usage.query 端点存在。

echo.
echo ============================================================
echo  [3/7] 把插件放入 DSH workspace: packages\usage\usage-plugin
echo ============================================================
set "PLUGIN_DIR=%DSH_ROOT%\packages\usage\usage-plugin"
if exist "%PLUGIN_DIR%\.git" (
  echo   [跳过] %PLUGIN_DIR% 已存在（git 仓库）。
) else if exist "%PLUGIN_DIR%" (
  echo   [更新] %PLUGIN_DIR% 已存在，更新内容...
  if "%PLUGIN_SRC:~0,4%"=="http" (
    git -C "%PLUGIN_DIR%" pull 2>nul || echo   [警告] git pull 失败，保留现有内容
  ) else (
    xcopy /E /I /Y /Q "%PLUGIN_SRC%\src" "%PLUGIN_DIR%\src" >nul
    copy /Y "%PLUGIN_SRC%\package.json" "%PLUGIN_DIR%\package.json" >nul
    copy /Y "%PLUGIN_SRC%\tsconfig.json" "%PLUGIN_DIR%\tsconfig.json" >nul
    copy /Y "%PLUGIN_SRC%\tsdown.config.ts" "%PLUGIN_DIR%\tsdown.config.ts" >nul
    copy /Y "%PLUGIN_SRC%\README.md" "%PLUGIN_DIR%\README.md" >nul
    copy /Y "%PLUGIN_SRC%\LICENSE" "%PLUGIN_DIR%\LICENSE" >nul
  )
) else (
  echo   [克隆] git clone %PLUGIN_SRC%
  git clone "%PLUGIN_SRC%" "%PLUGIN_DIR%"
  if errorlevel 1 (
    echo   [错误] git clone 失败，请检查网络或插件来源地址。
    exit /b 1
  )
)

echo.
echo ============================================================
echo  [4/7] 禁用官方 usage 插件（避免冲突）
echo ============================================================
powershell -NoProfile -Command ^
  "$p='%DSH_ROOT%\packages\bundle\web-app\cordis.patch.yml'; " ^
  "$t=Get-Content $p -Raw; " ^
  "$changed=$false; " ^
  "foreach ($name in @('@deepseek-ai/dsh-usage-query','@deepseek-ai/dsh-client-ui-usage')) { " ^
  "  $pattern='(?m)^(\s*)- id: [^\r\n]+\r?\n\s*name: ''' + $name + '''' + '\r?\n'; " ^
  "  if ($t -match $pattern) { $t=$t -replace $pattern, ('$1- id: disabled-' + $name + '`n$1  enabled: false`n'); $changed=$true } " ^
  "}; " ^
  "if ($changed) { Set-Content $p $t -Encoding UTF8; Write-Output '  [完成] 已禁用官方 dsh-usage-query / dsh-client-ui-usage' } " ^
  "else { Write-Output '  [跳过] 官方 usage 插件未在 patch 中或已禁用' }"

echo.
echo ============================================================
echo  [5/7] 注册本插件: cordis.patch.yml
echo ============================================================
set "PATCH=%DSH_ROOT%\packages\bundle\web-app\cordis.patch.yml"
set "NEED_ADD="
findstr /C:"name: 'dsh-usage-plugin'" "%PATCH%" >nul 2>&1 || set "NEED_ADD=1"
if defined NEED_ADD (
  powershell -NoProfile -Command ^
    "$p='%PATCH%'; $t=Get-Content $p -Raw; " ^
    "if ($t -notmatch 'name: ''dsh-usage-plugin''') { " ^
    "  $anchor='    # Token usage statistics: the sidebar-foot trigger + modal over usage.query.'; " ^
    "  if ($t -notmatch 'Token usage statistics') { $anchor='    # Cross-session token-usage aggregation behind the usage.query API; the' }; " ^
    "  $idx=$t.IndexOf($anchor); " ^
    "  if ($idx -lt 0) { Write-Output '  [警告] 未找到注册锚点，请手动在 plugins 列表添加：'; Write-Output \"    - id: usage-plugin`n      name: 'dsh-usage-plugin'\"; exit 0 }; " ^
    "  $insert = \"`n    - id: usage-plugin`n      name: 'dsh-usage-plugin'\"; " ^
    "  $t=$t.Substring(0,$idx) + $anchor + $insert + $t.Substring($idx+$anchor.Length); " ^
    "  Set-Content $p $t -Encoding UTF8; " ^
    "  Write-Output '  [完成] 已注册 dsh-usage-plugin'; " ^
    "} else { Write-Output '  [跳过] 已注册过' }"
) else (
  echo   [跳过] 已注册过
)

echo.
echo ============================================================
echo  [6/7] pnpm install + 构建
echo ============================================================
pushd "%DSH_ROOT%"
where pnpm >nul 2>&1
if errorlevel 1 (
  echo   [错误] 未找到 pnpm，请先安装：npm install -g pnpm
  popd
  exit /b 1
)
echo   pnpm install ...
call pnpm install
if errorlevel 1 (
  echo   [错误] pnpm install 失败，请检查上方输出。
  popd
  exit /b 1
)
echo   pnpm run build:lib:host ...
call pnpm run build:lib:host
if errorlevel 1 (
  echo   [错误] host 构建失败。
  popd
  exit /b 1
)
echo   pnpm run build:lib:client ...
call pnpm run build:lib:client
popd

echo.
echo ============================================================
echo  安装完成！
echo ============================================================
echo  接下来：
echo    1. 构建 Web 界面（如尚未构建）：pnpm run build:web
echo    2. 启动：pnpm run start:web（或 node apps/cli/lib/bin.js web）
echo    3. 打开浏览器 http://127.0.0.1:3080
echo    4. 侧边栏底部即可看到"用量统计"入口
echo.
echo  提示：
echo    - 插件位于 %PLUGIN_DIR%
echo    - 官方 ui-usage/usage-query 已被禁用，本插件是增强替代品
echo      （新增工作区分组、Token 排序、子代理合并）
echo    - 想恢复官方插件：把 cordis.patch.yml 中 disabled- 开头的条目改回即可
echo.
endlocal
