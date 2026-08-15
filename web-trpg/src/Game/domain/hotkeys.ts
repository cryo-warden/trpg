/**
 * The home-row hotkey scheme: LEFT hand selects targets, RIGHT hand
 * fires actions. Each possible target takes a key in TARGET_HOTKEYS
 * order down the displayed list; each action-bar slot takes a key in
 * ACTION_HOTKEYS order. Anything past the keys is reachable by
 * click/tap alone.
 */

export const TARGET_HOTKEYS: readonly string[] = [..."fdsarewqvcxz"];

export const ACTION_HOTKEYS: readonly string[] = [..."jkl;uiopnm,."];

export const targetHotkeyFor = (index: number): string | undefined =>
  TARGET_HOTKEYS[index];

export const actionHotkeyFor = (index: number): string | undefined =>
  ACTION_HOTKEYS[index];
