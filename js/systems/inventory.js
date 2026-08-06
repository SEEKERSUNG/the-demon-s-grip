// 背包管理：持有量 / 增删 / 使用消耗品。

import * as player from './player.js';
import { progressObjective } from './quests.js';

export function countItem(state, itemId) {
  const slot = state.inventory.find((s) => s.id === itemId);
  return slot ? slot.qty : 0;
}

export function addItem(game, itemId, qty = 1) {
  const { state } = game;
  const slot = state.inventory.find((s) => s.id === itemId);
  if (slot) slot.qty += qty;
  else state.inventory.push({ id: itemId, qty });
  game.events.emit('inventory:changed');
  progressObjective(game, { type: 'collect', target: itemId, n: qty });
  return true;
}

export function removeItem(game, itemId, qty = 1) {
  const { state } = game;
  const slot = state.inventory.find((s) => s.id === itemId);
  if (!slot || slot.qty < qty) return false;
  slot.qty -= qty;
  if (slot.qty <= 0) {
    const i = state.inventory.indexOf(slot);
    state.inventory.splice(i, 1);
  }
  game.events.emit('inventory:changed');
  return true;
}

// 使用消耗品，返回结果信息数组
export function useItem(game, itemId) {
  const { state } = game;
  const item = game.CONTENT.items.find((x) => x.id === itemId);
  if (!item || !item.usable) return { ok: false, msg: '无法使用' };
  if (countItem(state, itemId) <= 0) return { ok: false, msg: '数量不足' };

  const messages = [];
  if (item.effect) {
    const s = player.getStats(state, game.CONTENT.items);
    const healHp = Math.min(item.effect.hp || 0, s.maxHp - state.player.cur.hp);
    const healMp = Math.min(item.effect.mp || 0, s.maxMp - state.player.cur.mp);
    if ((item.effect.hp || 0) + (item.effect.mp || 0) > 0 && healHp <= 0 && (item.effect.mp ? healMp <= 0 : true)) {
      return { ok: false, msg: 'HP/MP 已满，无需使用' };
    }
    player.heal(game, item.effect.hp || 0, item.effect.mp || 0);
    if (item.effect.hp) messages.push(`恢复了 ${Math.max(0, healHp)} 点 HP`);
    if (item.effect.mp) messages.push(`恢复了 ${Math.max(0, healMp)} 点 MP`);
  }
  if (item.learnSkill) {
    player.learnSkill(game, item.learnSkill);
    const sk = game.CONTENT.skills.find((x) => x.id === item.learnSkill);
    messages.push(`学会了技能：${sk ? sk.name : item.learnSkill}`);
  }
  removeItem(game, itemId, 1);
  return { ok: true, msg: messages.join('，') || '使用成功' };
}
