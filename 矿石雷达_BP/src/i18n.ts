import type { RawMessage } from '@minecraft/server';

// 本地化辅助：按键名生成 raw-text，文案与占位符定义在资源包语言的 xxr.* 键中
export function t(key: string, ...args: (string | number)[]): RawMessage {
  return args.length > 0
    ? { translate: key, with: args.map(String) }
    : { translate: key };
}