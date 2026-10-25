import { ItemStack, system } from '@minecraft/server';
import { ItemComponentUseEvent, CustomComponentParameters } from '@minecraft/server';
import { OreRadar } from './radar/ore-radar';
import { registerRadarSettingCommand } from './settings/radar-setting';
import { t } from './i18n';

// 雷达处理器单例（isScanning/previousHits/playerMarkers 均按玩家隔离，可全局复用）
const radar = new OreRadar();

system.beforeEvents.startup.subscribe((init) => {
  radar.register();

  // 注册自定义物品组件：四个雷达共用此组件，参数来自物品 json 中 xxr:ore_radar 组件的 payload
  init.itemComponentRegistry.registerCustomComponent("xxr:ore_radar", {
    onUse(arg0: ItemComponentUseEvent, arg1: CustomComponentParameters) {
      const player = arg0.source;
      const itemStack = arg0.itemStack;
      if (!player || !itemStack) return;

      const params = arg1.params as unknown as { searchRadius: number; maxDisplay: number; textTimeLeft: number } | undefined;
      if (!params || typeof params.searchRadius !== 'number' || typeof params.maxDisplay !== 'number' || typeof params.textTimeLeft !== 'number') {
        player.sendMessage(t('xxr.radar.config_missing'));
        return;
      }

      radar.useRadar(player, itemStack, params);
    },
  });

  registerRadarSettingCommand(init);
});