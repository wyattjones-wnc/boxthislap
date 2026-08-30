@echo off
setlocal
cd /d "%~dp0.."
powershell.exe -NoProfile -NoExit -ExecutionPolicy Bypass -File "%~dp0refresh-psn-auth.ps1"

