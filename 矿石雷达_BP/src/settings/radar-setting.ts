import {
  CustomCommand,
  CustomCommandResult,
  CustomCommandStatus,
  Player,
  StartupEvent,
  system,
} from '@minecraft/server';
import {
  CustomForm,
  DropdownItemData,
  ObservableBoolean,
  ObservableNumber,
} from '@minecraft/server-ui';
import { ListType, ORE_LIST, RadarSettings } from './radar-settings';
import { t } from '../i18n';

// 注册 /xxr:radar_setting 自定义指令，用于打开雷达设置界面
export function registerRadarSettingCommand(init: StartupEvent): void {
  const command: CustomCommand = {
    name: 'xxr:radar_setting',
    description: '打开矿石雷达设置界面',
    permissionLevel: 0,
    cheatsRequired: false,
  };

  init.customCommandRegistry.registerCommand(command, (origin): CustomCommandResult | undefined => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player)) {
      return {
        message: '该指令只能由玩家执行',
        status: CustomCommandStatus.Failure,
      };
    }

    system.run(() => {
      void new RadarSettingForm(player).show();
    });

    return {
      status: CustomCommandStatus.Success,
    };
  });
}

// 雷达设置表单
class RadarSettingForm {
  private settings: RadarSettings;

  constructor(private player: Player) {
    this.settings = RadarSettings.get(player);
  }

  private keepalive: { clientWritable: true } = { clientWritable: true };

  show(): Promise<unknown> {
    const data = this.settings.getData();

    const form = new CustomForm(this.player, t('xxr.radar.form_title'));

    // 名单类型：白名单 / 黑名单
    const listTypeObs = new ObservableNumber(data.listType, this.keepalive);
    listTypeObs.subscribe((value) => this.settings.setData({ listType: value as ListType }));
    const listItems: DropdownItemData[] = [
      { label: t('xxr.radar.list.whitelist'), value: ListType.Whitelist },
      { label: t('xxr.radar.list.blacklist'), value: ListType.Blacklist },
    ];
    form.dropdown(t('xxr.radar.list_type_label'), listTypeObs, listItems).spacer();

    // 自动检测矿石
    const autoObs = new ObservableBoolean(data.autoDetectOre, this.keepalive);
    autoObs.subscribe((value) => this.settings.setData({ autoDetectOre: value }));
    form.toggle(t('xxr.radar.auto_detect'), autoObs).spacer();

    // 扫描矿石类型 多选
    form.header(t('xxr.radar.ore_list'));
    for (const ore of ORE_LIST) {
      const oreObs = new ObservableBoolean(data.oreTypes.includes(ore.typeId), this.keepalive);
      oreObs.subscribe((checked) => {
        const oreTypes = new Set(this.settings.getData().oreTypes);
        if (checked) oreTypes.add(ore.typeId);
        else oreTypes.delete(ore.typeId);
        this.settings.setData({ oreTypes: [...oreTypes] });
      });
      form.toggle(t(ore.nameKey), oreObs);
    }

    return form.show();
  }
}