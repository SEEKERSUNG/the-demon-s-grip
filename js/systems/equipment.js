// 装备槽 / 装备效果汇总。纯函数，内容由调用方注入（兼容 node 无 DOM 回放）。

export const SLOTS = ['weapon', 'armor', 'accessory', 'accessory2'];

// 全部装备加成求和。items = CONTENT.items
export function getEquipBonuses(state, items = []) {
  const out = { maxHp: 0, maxMp: 0, atk: 0, def: 0, spd: 0, crit: 0 };
  for (const slot of SLOTS) {
    const id = state.player.equipped[slot];
    if (!id) continue;
    const it = items.find((x) => x.id === id);
    if (!it) continue;
    out.maxHp += it.maxHp || 0;
    out.maxMp += it.maxMp || 0;
    out.atk += it.atk || 0;
    out.def += it.def || 0;
    out.spd += it.spd || 0;
    out.crit += it.crit || 0;
  }
  return out;
}

export function isEquippable(item) {
  return item && (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory');
}

export function slotFor(item) {
  if (item.type === 'weapon') return 'weapon';
  if (item.type === 'armor') return 'armor';
  if (item.type === 'accessory') return item.slot || 'accessory'; // 尊重 accessory2 槽
  return null;
}

export function equipItem(game, itemId) {
  const { state } = game;
  const item = game.CONTENT.items.find((x) => x.id === itemId);
  if (!item || !isEquippable(item)) return false;
  const slot = slotFor(item);
  const prev = state.player.equipped[slot];
  state.player.equipped[slot] = itemId;
  if (prev && prev !== itemId) {
    state.inventory.push({ id: prev, qty: 1 });
  }
  const idx = state.inventory.findIndex((s) => s.id === itemId && s.qty > 0);
  if (idx >= 0) {
    state.inventory[idx].qty -= 1;
    if (state.inventory[idx].qty <= 0) state.inventory.splice(idx, 1);
  }
  game.events.emit('inventory:changed');
  game.events.emit('player:changed', { reason: 'equip' });
  return true;
}

export function unequip(game, slot) {
  const { state } = game;
  const id = state.player.equipped[slot];
  if (!id) return;
  state.player.equipped[slot] = null;
  state.inventory.push({ id, qty: 1 });
  game.events.emit('inventory:changed');
  game.events.emit('player:changed', { reason: 'unequip' });
}
