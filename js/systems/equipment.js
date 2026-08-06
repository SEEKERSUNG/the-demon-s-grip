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

// 背包内增加计数（合并到已有条目，避免同物品拆成多行）。
// 不用 inventory.js 的 addItem，避免 inventory → player → equipment 循环依赖。
function addToInventory(state, itemId, qty) {
  const slot = state.inventory.find((s) => s.id === itemId);
  if (slot) slot.qty += qty;
  else state.inventory.push({ id: itemId, qty });
}

export function equipItem(game, itemId) {
  const { state } = game;
  const item = game.CONTENT.items.find((x) => x.id === itemId);
  if (!item || !isEquippable(item)) return false;
  if (item.levelReq && game.state.player.level < item.levelReq) return false;
  const slot = slotFor(item);
  const prev = state.player.equipped[slot];
  // 已装备同一件 → 无需操作（避免误扣背包里的同款）
  if (prev === itemId) return false;
  state.player.equipped[slot] = itemId;
  // 原装备退回背包（合并计数，不产生重复条目）
  if (prev) addToInventory(state, prev, 1);
  // 从背包扣除一件新装备
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
  addToInventory(state, id, 1);
  game.events.emit('inventory:changed');
  game.events.emit('player:changed', { reason: 'unequip' });
}
