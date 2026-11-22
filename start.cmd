@echo off
setlocal
cd /d "%~dp0"
set "COACH_NODE=node"
where node.exe >nul 2>nul
if errorlevel 1 (
  set "COACH_NODE="
  for /d %%D in ("%ProgramFiles%\WindowsApps\OpenAI.CodexPrimaryRuntime*") do if exist "%%D\dependencies\node\bin\node.exe" set "COACH_NODE=%%D\dependencies\node\bin\node.exe"
)
if not defined COACH_NODE (
  echo Node.js 24 or later is required.
  pause
  exit /b 1
)
"%COACH_NODE%" --env-file-if-exists=.env scripts/service.mjs %1
if errorlevel 1 goto done
if /i "%~1"=="stop" goto done
echo You can close this window. The background service stays running.
:done
pause
