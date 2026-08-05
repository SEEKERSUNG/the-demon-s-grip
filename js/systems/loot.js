// 掉落表 / 宝箱解析。纯函数 + game 注入。

import * as inventory from './inventory.js';
import * as player from './player.js';

// 按敌人的掉落表掷一次
export function rollDrops(game, enemyUnit) {
  const out = [];
  for (const d of enemyUnit.drops || []) {
    if (game.rng.chance(d.rate ?? 1)) {
      const qty = d.max && d.max > 1 ? game.rng.int(d.min || 1, d.max) : (d.min || 1);
      out.push({ id: d.item, qty });
    }
  }
  return out;
}

export function mergeLoot(list) {
  const map = new Map();
  for (const { id, qty } of list) map.set(id, (map.get(id) || 0) + qty);
  return [...map.entries()].map(([id, qty]) => ({ id, qty }));
}

export function grantLoot(game, loot) {
  for (const { id, qty } of loot) inventory.addItem(game, id, qty);
}

// 宝箱开启：返回 { items, gold, messages }
// 兼容两种数据约定：{ item: 'ID' }（单数）或 { items: ['ID', ...] }（数组），均可配 gold
export function openChest(game, chest) {
  const loot = [];
  let gold = chest.gold || 0;
  const itemIds = chest.item != null ? [chest.item] : (chest.items || []);
  itemIds.forEach((id) => loot.push({ id, qty: 1 }));
  if (gold > 0) player.addGold(game, gold);
  if (loot.length) grantLoot(game, loot);
  return {
    items: loot,
    gold,
    text: chest.text || '你打开了宝箱。',
  };
}
