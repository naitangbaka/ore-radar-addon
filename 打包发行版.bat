@echo off
rem 一键打包发行版：调用 PowerShell 脚本 打包发行版.ps1
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0打包发行版.ps1"
pause