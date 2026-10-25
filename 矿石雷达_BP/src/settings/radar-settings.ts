import { Player } from '@minecraft/server';

// 矿石类型 -> 方块的本地化键名,用于设置界面选择
export const ORE_LIST: { typeId: string; nameKey: string }[] = [
  { typeId: 'minecraft:coal_ore', nameKey: 'tile.coal_ore.name' },
  { typeId: 'minecraft:iron_ore', nameKey: 'tile.iron_ore.name' },
  { typeId: 'minecraft:gold_ore', nameKey: 'tile.gold_ore.name' },
  { typeId: 'minecraft:diamond_ore', nameKey: 'tile.diamond_ore.name' },
  { typeId: 'minecraft:emerald_ore', nameKey: 'tile.emerald_ore.name' },
  { typeId: 'minecraft:copper_ore', nameKey: 'tile.copper_ore.name' },
  { typeId: 'minecraft:lapis_ore', nameKey: 'tile.lapis_ore.name' },
  { typeId: 'minecraft:redstone_ore', nameKey: 'tile.redstone_ore.name' },
  { typeId: 'minecraft:quartz_ore', nameKey: 'tile.quartz_ore.name' },
  { typeId: 'minecraft:ancient_debris', nameKey: 'tile.ancient_debris.name' },
];

// 名单类型：白名单 / 黑名单
export enum ListType {
  Whitelist = 0,
  Blacklist = 1,
}

// 玩家雷达设置
export interface RadarSettingsData {
  oreTypes: string[];      // 参与名单判定的矿石 typeId 集合
  listType: ListType;      // 名单类型
  autoDetectOre: boolean;  // 按 typeId 自动检测矿石(而非仅 _ore 后缀)
}

const DEFAULT_SETTINGS: RadarSettingsData = {
  oreTypes: ORE_LIST.map((ore) => ore.typeId),
  listType: ListType.Whitelist,
  autoDetectOre: true,
};

const KEY_PREFIX = 'xxr_radar_';

// 玩家雷达设置
// 持久化:写入玩家动态属性
// 读取:优先使用按玩家 ID 隔离的本地 Map 缓存,初次加载时从动态属性读取
export class RadarSettings {
  private static cache = new Map<string, RadarSettings>();

  // 获取玩家设置(带本地缓存)
  static get(player: Player): RadarSettings {
    let inst = this.cache.get(player.id);
    if (!inst) {
      inst = new RadarSettings(player);
      this.cache.set(player.id, inst);
    }
    return inst;
  }

  private data: RadarSettingsData;

  private constructor(private player: Player) {
    this.data = this.load();
  }

  private load(): RadarSettingsData {
    const raw = this.player.getDynamicProperty(KEY_PREFIX + 'data') as string | undefined;
    if (!raw) return { ...DEFAULT_SETTINGS };
    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<RadarSettingsData>) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  getData(): RadarSettingsData {
    return this.data;
  }

  // 更新并同时写入动态属性与本地缓存
  setData(patch: Partial<RadarSettingsData>): void {
    Object.assign(this.data, patch);
    this.player.setDynamicProperty(KEY_PREFIX + 'data', JSON.stringify(this.data));
  }
}