import { world, system, Player, Block, Dimension, TextPrimitive, GameMode, ItemStack } from '@minecraft/server';
import { ORE_ICONS } from './config';
import { ListType, RadarSettings } from '../settings/radar-settings';
import { t } from '../i18n';

export interface RadarEntry {
    loc: { x: number; y: number; z: number };
    typeId: string;
    localizationKey: string;
}

export interface OreRadarConfig {
    searchRadius: number;   // 搜索半径（米）
    maxDisplay: number;     // 最大文字标记数
    textTimeLeft: number;   // 标记持续时间（秒）
}

export class OreRadar {
    protected batchSize: number = 200;        // 每 tick(wait 帧)扫描方块数
    protected textYOffset: number = 0.5;      // 文字标记 Y 轴偏移

    private isScanning = new Set<string>();
    private previousHits = new Map<string, Set<string>>();
    private playerMarkers = new Map<string, RadarEntry[]>();

    // 供自定义物品组件的 onUse 调用：处理冷却、去重并启动扫描
    useRadar(player: Player, itemStack: ItemStack, config: OreRadarConfig): void {
        // 冷却中引擎不会触发 onUse，故无需额外检查；此处仅再次启动物品冷却以刷新计时
        player.startItemCooldown('ore_radar_use', itemStack.getComponent('minecraft:cooldown')?.cooldownTicks ?? 0);

        const playerId = player.id;
        if (this.isScanning.has(playerId)) return;
        this.isScanning.add(playerId);
        this.startOreSearch(player, itemStack, config);
    }

    // 判断方块是否为雷达目标（读取玩家的名单与自动检测设置）
    protected isTargetBlock(block: Block, player: Player): boolean {
        const settings = RadarSettings.get(player).getData();

        const typeId = block.typeId;

        // 识别矿石：自动检测按 typeId 匹配所有矿石(含 deepslate 变体)，否则仅 _ore 后缀
        const isOre = settings.autoDetectOre
            ? (/ore/.test(typeId) || typeId === 'minecraft:ancient_debris')
            : (/_ore$/.test(typeId) || typeId === 'minecraft:ancient_debris');
        if (!isOre) return false;

        // 名单过滤始终生效：白名单只扫选中矿石，黑名单排除选中矿石。
        // 深层变体(minecraft:deepslate_*_ore)归一到主矿石再匹配
        const baseTypeId = typeId.replace(/^minecraft:deepslate_/, 'minecraft:');
        const inList = settings.oreTypes.includes(baseTypeId);
        return settings.listType === ListType.Whitelist ? inList : !inList;
    }

    protected onScanComplete(
        player: Player,
        entries: RadarEntry[],
        scanDimension: Dimension,
        config: OreRadarConfig,
        typeId: string,
    ): void {
        this.isScanning.delete(player.id);

        if (entries.length === 0) {
            player.sendMessage(t('xxr.radar.no_target', config.searchRadius));
            return;
        }

        entries.sort((a, b) => {
            const da = (a.loc.x - player.location.x) ** 2 + (a.loc.y - player.location.y) ** 2 + (a.loc.z - player.location.z) ** 2;
            const db = (b.loc.x - player.location.x) ** 2 + (b.loc.y - player.location.y) ** 2 + (b.loc.z - player.location.z) ** 2;
            return da - db;
        });

        player.sendMessage(t('xxr.radar.found', entries.length));
        player.playSound('random.levelup');

        const displayCount = Math.min(entries.length, config.maxDisplay);
        const markers: RadarEntry[] = [];
        for (let i = 0; i < displayCount; i++) {
            const entry = entries[i]!;
            const icon = ORE_ICONS[entry.typeId];
            // 自识别：有预设图标用图标，无图标退回本地化键名
            const message = icon
                ? { text: icon }
                : { translate: entry.localizationKey };
            const text = new TextPrimitive(
                { x: entry.loc.x + 0.5, y: entry.loc.y + this.textYOffset, z: entry.loc.z + 0.5 },
                message,
            );
            if (icon) {
                text.backgroundColorOverride = { red: 0, green: 0, blue: 0, alpha: 0 };
            }
            text.timeLeft = config.textTimeLeft;
            text.visibleTo = [player];
            world.primitiveShapesManager.addText(text, scanDimension);
            markers.push(entry);
        }
        this.playerMarkers.set(player.id, markers);

        if (entries.length > config.maxDisplay) {
            player.sendMessage(t('xxr.radar.max_display', config.maxDisplay));
        }

        // 按玩家隔离的命中缓存：只记录上一次 vs 本次
        const playerId = player.id;
        const prevHits = this.previousHits.get(playerId);
        const key = (e: RadarEntry) => `${e.loc.x},${e.loc.y},${e.loc.z}`;
        const newHits = entries.filter(e => !prevHits?.has(key(e)));
        this.previousHits.set(playerId, new Set(entries.map(key)));

        this.consumeDurability(player, typeId, newHits.length);
    }

    // 扣除雷达耐久：命中时扣除，支持耐久附魔减免
    protected consumeDurability(player: Player, typeId: string, hitCount: number): void {
        if (player.getGameMode() === GameMode.Creative) return;

        const inventory = player.getComponent('inventory');
        if (!inventory || !inventory.container) return;

        const slot = player.selectedSlotIndex;
        const item = inventory.container.getItem(slot);
        if (!item || item.typeId !== typeId) return;

        const durabilityComp = item.getComponent('minecraft:durability');
        if (!durabilityComp) return;

        if (durabilityComp.unbreakable) return;

        const unbreakingComp = item.getComponent('minecraft:enchantable');
        const unbreakingLevel = unbreakingComp
            ? (unbreakingComp.getEnchantment('unbreaking')?.level ?? 0)
            : 0;

        const damageChance = durabilityComp.getDamageChance(unbreakingLevel);
        const shouldDeduct = Math.random() < damageChance;
        if (!shouldDeduct) return;

        const remainingDurability = durabilityComp.maxDurability - durabilityComp.damage;
        if (remainingDurability <= 0) return;

        const actualDeduct = Math.min(hitCount, remainingDurability);
        durabilityComp.damage += actualDeduct;
        console.log(`剩余耐久${durabilityComp.maxDurability - durabilityComp.damage}`);

        inventory.container.setItem(slot, item);
    }

    // 检查雷达是否可用（耐久是否耗尽）
    private canUseRadar(player: Player, typeId: string): boolean {
        const inventory = player.getComponent('inventory');
        if (!inventory || !inventory.container) return true;

        const item = inventory.container.getItem(player.selectedSlotIndex);
        if (!item || item.typeId !== typeId) return true;

        const durabilityComp = item.getComponent('minecraft:durability');
        if (!durabilityComp) return true;

        // 只有明确检测到耐久耗尽才返回 false
        return durabilityComp.damage < durabilityComp.maxDurability;
    }

    private startOreSearch(player: Player, itemStack: ItemStack, config: OreRadarConfig): void {
        const typeId = itemStack.typeId;
        if (!this.canUseRadar(player, typeId)) {
            player.sendMessage(t('xxr.radar.no_durability'));
            this.isScanning.delete(player.id);
            return;
        }
        player.sendMessage(t('xxr.radar.scanning'))
        player.playSound('random.orb');

        this.removePlayerMarkers(player);

        const scanDimension = player.dimension;
        const center = player.location;

        const radius = config.searchRadius;
        const yLow = Math.max(-radius, scanDimension.heightRange.min - center.y);
        const yHigh = Math.min(radius, scanDimension.heightRange.max - center.y);

        // 点的生成、排序与方块扫描全部在协程内分帧完成，启动阶段不阻塞主线程
        system.runJob(this.scanJob(player, scanDimension, center, yLow, yHigh, config, typeId));
    }

    // 分帧扫描协程：点的生成、排序与方块扫描全部按批次让出，避免启动与扫描阶段卡顿
    private *scanJob(
        player: Player,
        scanDimension: Dimension,
        center: { x: number; y: number; z: number },
        yLow: number,
        yHigh: number,
        config: OreRadarConfig,
        typeId: string,
    ): Generator<void, void, void> {
        const entries: RadarEntry[] = [];
        const dimensionId = scanDimension.id;
        const radius = config.searchRadius;
        const radiusSq = radius * radius;

        // 按 distSq 分桶生成扫描点。distSq 为离散整数，桶下标即距离，
        // 桶数组天然由近到远有序，免去额外排序（避免启动阶段一次同步 sort 造成卡顿）。
        const buckets: { x: number; y: number; z: number }[][] = [];
        let produced = 0;
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    const distSq = dx * dx + dy * dy + dz * dz;
                    if (distSq > radiusSq) continue;
                    if (dy < yLow || dy > yHigh) continue;
                    const layer = (buckets[distSq] ??= []);
                    layer.push({ x: dx, y: dy, z: dz });
                    if (++produced % this.batchSize === 0) {
                        // 若玩家已切换维度或移出可扫描状态，提前退出
                        if (player.dimension.id !== dimensionId) {
                            this.isScanning.delete(player.id);
                            this.cleanupScan(player, entries, scanDimension, config, typeId);
                            return;
                        }
                        yield;
                    }
                }
            }
        }
        yield;

        // 扫描：按 distSq 从小到大（由近到远）遍历各层
        let scanned = 0;
        for (let distSq = 0; distSq <= radiusSq; distSq++) {
            const layer = buckets[distSq];
            if (!layer) continue;
            for (const p of layer) {
                if (player.dimension.id !== dimensionId) {
                    this.isScanning.delete(player.id);
                    this.cleanupScan(player, entries, scanDimension, config, typeId);
                    return;
                }

                const block = scanDimension.getBlock({
                    x: center.x + p.x,
                    y: center.y + p.y,
                    z: center.z + p.z,
                });

                if (block && this.isTargetBlock(block, player)) {
                    entries.push({
                        loc: block.location,
                        typeId: block.typeId,
                        localizationKey: block.localizationKey,
                    });

                    // 找到上限即提前退出，不必遍历完整个范围
                    if (entries.length >= config.maxDisplay) {
                        this.cleanupScan(player, entries, scanDimension, config, typeId);
                        return;
                    }
                }

                // 每处理 batchSize 个方块让出一个 tick，防止一帧内卡顿
                if (++scanned % this.batchSize === 0) {
                    yield;
                }
            }
        }

        this.cleanupScan(player, entries, scanDimension, config, typeId);
    }

    // 扫描结束后的统一清理入口
    private cleanupScan(
        player: Player,
        entries: RadarEntry[],
        scanDimension: Dimension,
        config: OreRadarConfig,
        typeId: string,
    ): void {
        this.onScanComplete(player, entries, scanDimension, config, typeId);
    }

    private removePlayerMarkers(player: Player): void {
        const entries = this.playerMarkers.get(player.id);
        if (!entries) return;

        for (const entry of entries) {
            const textLoc = {
                x: entry.loc.x + 0.5,
                y: entry.loc.y + this.textYOffset,
                z: entry.loc.z + 0.5,
            };
            const shapes = world.primitiveShapesManager.getShapes({ location: textLoc, maxDistance: 0.5 });
            for (const shape of shapes) {
                // 只移除属于该玩家的私有标记
                if (shape.visibleTo.includes(player)) {
                    shape.remove();
                }
            }
        }
        this.playerMarkers.delete(player.id);
    }

    // 注册雷达相关的事件（方块被破坏时清除对应标记）
    register(): void {
        world.afterEvents.playerBreakBlock.subscribe((event) => {
            this.onBlockBreak(event);
        });
    }

    private onBlockBreak(event: { readonly block: Block }): void {
        const block = event.block;
        const textLoc = {
            x: block.location.x + 0.5,
            y: block.location.y + this.textYOffset,
            z: block.location.z + 0.5,
        };
        const shapes = world.primitiveShapesManager.getShapes({ location: textLoc, maxDistance: 0.5 });
        for (const shape of shapes) {
            shape.remove();
        }
    }
}