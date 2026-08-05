// 商店：买入/卖出/库存（有限库存递减、无限库存不扣）。

import * as inventory from './inventory.js';
import * as player from './player.js';

export function getShop(CONTENT, id) {
  return CONTENT.shops.find((s) => s.id === id);
}

// 当前库存视图：合并初始 stock 与已售数量
export function stockView(game, shop) {
  const sold = game.state.shopStock?.[shop.id] || {};
  return shop.stock.map((st) => {
    const remaining = st.qty == null ? null : st.qty - (sold[st.item] || 0);
    return { ...st, remaining };
  });
}

export function buy(game, shop, itemId, qty = 1) {
  const { state } = game;
  const entry = shop.stock.find((s) => s.item === itemId);
  if (!entry) return { ok: false, msg: '商店没有这件商品' };
  const sold = (state.shopStock ||= {})[shop.id] || ((state.shopStock[shop.id] = {}));
  const remaining = entry.qty == null ? Infinity : entry.qty - (sold[itemId] || 0);
  if (remaining < qty) return { ok: false, msg: '库存不足' };
  const total = entry.cost * qty;
  if (!player.spendGold(game, total)) return { ok: false, msg: '金币不足' };
  inventory.addItem(game, itemId, qty);
  sold[itemId] = (sold[itemId] || 0) + qty;
  return { ok: true, msg: `购入 ${itemId} ×${qty}` };
}

export function sell(game, itemId, qty = 1) {
  const { state } = game;
  const item = game.CONTENT.items.find((x) => x.id === itemId);
  if (!item) return { ok: false, msg: '未知道具' };
  if (item.quest) return { ok: false, msg: '任务道具无法出售' };
  if (inventory.countItem(state, itemId) < qty) return { ok: false, msg: '数量不足' };
  const price = item.sellPrice ?? Math.floor((item.price || 0) * 0.5);
  inventory.removeItem(game, itemId, qty);
  player.addGold(game, price * qty);
  return { ok: true, msg: `售出 ${item.name} ×${qty}，获得 ${price * qty} 金币` };
}
