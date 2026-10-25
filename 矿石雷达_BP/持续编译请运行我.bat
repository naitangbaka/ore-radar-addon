@echo off
echo ========================================
echo TypeScript 监控编译模式
echo 配置文件: tsconfig.json
echo 按 Ctrl+C 停止监控
echo ========================================
echo.

tsc -w -p .
pause