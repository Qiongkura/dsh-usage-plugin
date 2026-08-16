@echo off
setlocal enabledelayedexpansion

set "DSH_ROOT=%~1"
set "PLUGIN_SRC=%~2"
if "%DSH_ROOT%"=="" (
  echo [ERROR] Missing DSH repo root. Usage: install-into-dsh.bat ^<DSH-REPO-ROOT^> [plugin-source]
  exit /b 1
)
if "%PLUGIN_SRC%"=="" set "PLUGIN_SRC=https://github.com/Qiongkura/dsh-usage-plugin.git"

echo ============================================================
echo  [1/8] Validate DSH repo: %DSH_ROOT%
echo ============================================================
if not exist "%DSH_ROOT%\package.json" (
  echo   [ERROR] %DSH_ROOT%\package.json not found. Pass the DSH repo root.
  exit /b 1
)
if not exist "%DSH_ROOT%\packages\bundle\web-app\cordis.patch.yml" (
  echo   [ERROR] packages\bundle\web-app\cordis.patch.yml not found. Repo structure looks wrong.
  exit /b 1
)

echo.
echo ============================================================
echo  [2/8] Ensure usage.query endpoint + register plugin
echo ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-helper.ps1" -DshRoot "%DSH_ROOT%" -PatchesDir "%~dp0patches"
if errorlevel 1 (
  echo   [ERROR] Patch/registration step failed. See output above.
  exit /b 1
)

echo.
echo ============================================================
echo  [3/8] Copy plugin into workspace: packages\usage\usage-plugin
echo ============================================================
set "PLUGIN_DIR=%DSH_ROOT%\packages\usage\usage-plugin"
if exist "%PLUGIN_DIR%\.git" (
  echo   [SKIP] %PLUGIN_DIR% already exists as a git repo.
) else if exist "%PLUGIN_DIR%" (
  echo   [UPDATE] %PLUGIN_DIR% exists; refreshing contents...
  if "%PLUGIN_SRC:~0,4%"=="http" (
    git -C "%PLUGIN_DIR%" pull 2>nul || echo   [WARN] git pull failed; keeping existing contents
  ) else (
    xcopy /E /I /Y /Q "%PLUGIN_SRC%\src" "%PLUGIN_DIR%\src" >nul
    copy /Y "%PLUGIN_SRC%\package.json" "%PLUGIN_DIR%\package.json" >nul
    copy /Y "%PLUGIN_SRC%\tsconfig.json" "%PLUGIN_DIR%\tsconfig.json" >nul
    copy /Y "%PLUGIN_SRC%\tsdown.config.ts" "%PLUGIN_DIR%\tsdown.config.ts" >nul
    copy /Y "%PLUGIN_SRC%\README.md" "%PLUGIN_DIR%\README.md" >nul
    copy /Y "%PLUGIN_SRC%\LICENSE" "%PLUGIN_DIR%\LICENSE" >nul
  )
) else (
  echo   [CLONE] git clone %PLUGIN_SRC%
  git clone "%PLUGIN_SRC%" "%PLUGIN_DIR%"
  if errorlevel 1 (
    echo   [ERROR] git clone failed. Check network or plugin source.
    exit /b 1
  )
)

echo.
echo ============================================================
echo  [4/8] pnpm install
echo ============================================================
pushd "%DSH_ROOT%"
where pnpm >nul 2>&1
if errorlevel 1 (
  echo   [ERROR] pnpm not found. Install it first: npm install -g pnpm
  popd
  exit /b 1
)
call pnpm install
popd

echo.
echo ============================================================
echo  [5/8] Build host libs
echo ============================================================
pushd "%DSH_ROOT%"
call pnpm run build:lib:host
if errorlevel 1 (
  echo   [ERROR] host build failed.
  popd
  exit /b 1
)
popd

echo.
echo ============================================================
echo  [6/8] Build client libs
echo ============================================================
pushd "%DSH_ROOT%"
call pnpm run build:lib:client
if errorlevel 1 (
  echo   [ERROR] client build failed.
  popd
  exit /b 1
)
popd

echo.
echo ============================================================
echo  INSTALL COMPLETE
echo ============================================================
echo  Next steps:
echo    1. Build the web UI:   pnpm run build:web
echo    2. Start DSH:          pnpm run start:web
echo    3. Open http://127.0.0.1:3080 - the usage stats entry is at
echo       the bottom of the sidebar.
echo.
echo  Notes:
echo    - Plugin lives at %PLUGIN_DIR%
echo    - Official ui-usage/usage-query are disabled (disabled: true);
echo      this plugin is the enhanced replacement.
echo    - To restore the official plugins, remove the disabled: true
echo      lines in cordis.patch.yml.
echo.
endlocal
