@echo off
echo 正在编译 TypeScript 项目...
tsc --project tsconfig.json
if %errorlevel% equ 0 (
    echo 编译成功！
) else (
    echo 编译失败！
)
pause