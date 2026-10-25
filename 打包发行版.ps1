# ============================================================
#  矿石雷达 发行版打包脚本（白名单制）
#  仅复制发行所需文件，原始工程文件不受影响。
#  输出：发行版\矿石雷达.mcaddon
# ============================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'

$PACK = Split-Path -Parent $MyInvocation.MyCommand.Path
$BP   = Join-Path $PACK '矿石雷达_BP'
$RP   = Join-Path $PACK '矿石雷达_RP'
$OUT  = Join-Path $PACK '发行版'
$DIST = Join-Path $OUT '临时'

# 清理旧发行版目录
Write-Host '清理旧发行版目录...' -ForegroundColor Cyan
if (Test-Path $OUT) { Remove-Item $OUT -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $DIST '矿石雷达_BP') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $DIST '矿石雷达_RP') -Force | Out-Null

$BP_DST = Join-Path $DIST '矿石雷达_BP'
$RP_DST = Join-Path $DIST '矿石雷达_RP'

Write-Host '正在打包行为包...' -ForegroundColor Cyan
# 清单文件 + 包Icon
Copy-Item (Join-Path $BP 'manifest.json' ) $BP_DST -Force
Copy-Item (Join-Path $BP 'pack_icon.png' ) $BP_DST -Force
# 语言包
Copy-Item (Join-Path $BP 'texts')     (Join-Path $BP_DST 'texts')     -Recurse -Force
# 物品文件
Copy-Item (Join-Path $BP 'items')     (Join-Path $BP_DST 'items')     -Recurse -Force
# 物品自定义分组目录
Copy-Item (Join-Path $BP 'item_catalog')  (Join-Path $BP_DST 'item_catalog')  -Recurse -Force
# 配方文件
Copy-Item (Join-Path $BP 'recipes')   (Join-Path $BP_DST 'recipes')   -Recurse -Force
# 脚本文件（排除未使用的 Server-ProUI 死代码）
Copy-Item (Join-Path $BP 'scripts')   (Join-Path $BP_DST 'scripts')   -Recurse -Force
Remove-Item (Join-Path $BP_DST 'scripts\Server-ProUI') -Recurse -Force -ErrorAction SilentlyContinue

Write-Host '正在打包资源包...' -ForegroundColor Cyan
# 清单文件 + 包Icon
Copy-Item (Join-Path $RP 'manifest.json' ) $RP_DST -Force
Copy-Item (Join-Path $RP 'pack_icon.png' ) $RP_DST -Force
# 语言包
Copy-Item (Join-Path $RP 'texts')     (Join-Path $RP_DST 'texts')     -Recurse -Force
# 纹理包
Copy-Item (Join-Path $RP 'textures')  (Join-Path $RP_DST 'textures')  -Recurse -Force
# 字体：只保留 glyph_F5.png，其余为工程文件
New-Item -ItemType Directory -Path (Join-Path $RP_DST 'font') -Force | Out-Null
Copy-Item (Join-Path $RP 'font\glyph_F5.png') (Join-Path $RP_DST 'font') -Force

# 许可证（MIT 合规）
Write-Host '包含 LICENSE...' -ForegroundColor Cyan
Copy-Item (Join-Path $PACK 'LICENSE') $DIST -Force

# 生成 .mcaddon（先压缩为 .zip 再改名）
Write-Host '正在生成 .mcaddon 包...' -ForegroundColor Cyan
$zipPath = Join-Path $OUT '矿石雷达.zip'
Compress-Archive -Path (Join-Path $DIST '矿石雷达_BP'), (Join-Path $DIST '矿石雷达_RP'), (Join-Path $DIST 'LICENSE') -DestinationPath $zipPath -Force
Rename-Item $zipPath (Join-Path $OUT '矿石雷达.mcaddon') -Force

# 清理临时目录
if (Test-Path $DIST) { Remove-Item $DIST -Recurse -Force }

$final = Join-Path $OUT '矿石雷达.mcaddon'
Write-Host ''
Write-Host ('打包完成！ 输出: ' + $final) -ForegroundColor Green