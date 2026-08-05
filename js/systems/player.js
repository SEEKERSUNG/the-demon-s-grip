// 玩家属性 / 等级 / 经验 / 状态管理。依赖 equipment.js 的纯函数。

import { getEquipBonuses } from './equipment.js';

export const LV_GROWTH = { maxHp: 10, maxMp: 4, atk: 3, def: 2, spd: 1 };

export function xpNeeded(level) {
  return Math.round(Math.pow(level, 1.98) * 16 + 30);
}

// 综合属性 = 基础 + 装备加成。items = CONTENT.items
export function getStats(state, items = []) {
  const b = state.player.base;
  const eq = getEquipBonuses(state, items);
  return {
    maxHp: b.maxHp + eq.maxHp,
    maxMp: b.maxMp + eq.maxMp,
    atk: Math.max(1, b.atk + eq.atk),
    def: Math.max(0, b.def + eq.def),
    spd: b.spd + eq.spd,
    crit: Math.min(0.6, b.crit + eq.crit),
  };
}

export function isAlive(state) {
  return state.player.cur.hp > 0;
}

export function addXp(game, xp) {
  const { state } = game;
  state.player.xp += Math.max(0, xp);
  let ups = 0;
  while (state.player.xp >= xpNeeded(state.player.level)) {
    state.player.xp -= xpNeeded(state.player.level);
    levelUp(game);
    ups += 1;
  }
  if (ups > 0) {
    learnLevelSkills(game);
    game.events.emit('player:changed', { reason: 'levelup', times: ups });
  }
  return ups;
}

function levelUp(game) {
  const { state } = game;
  state.player.level += 1;
  const b = state.player.base;
  b.maxHp += LV_GROWTH.maxHp;
  b.maxMp += LV_GROWTH.maxMp;
  b.atk += LV_GROWTH.atk;
  b.def += LV_GROWTH.def;
  b.spd += LV_GROWTH.spd;
  const s = getStats(state, game.CONTENT.items);
  state.player.cur.hp = s.maxHp;
  state.player.cur.mp = s.maxMp;
}

export function heal(game, hp = 0, mp = 0) {
  const s = getStats(game.state, game.CONTENT.items);
  game.state.player.cur.hp = Math.min(s.maxHp, game.state.player.cur.hp + hp);
  game.state.player.cur.mp = Math.min(s.maxMp, game.state.player.cur.mp + mp);
}

export function fullRestore(game) {
  const s = getStats(game.state, game.CONTENT.items);
  game.state.player.cur.hp = s.maxHp;
  game.state.player.cur.mp = s.maxMp;
}

export function addGold(game, amount) {
  game.state.player.gold += Math.max(0, Math.round(amount));
  game.events.emit('gold:changed');
}

export function spendGold(game, amount) {
  const { state } = game;
  if (state.player.gold < amount) return false;
  state.player.gold -= amount;
  game.events.emit('gold:changed');
  return true;
}

export function hasSkill(state, skillId) {
  return state.player.learnedSkills.includes(skillId);
}

export function learnSkill(game, skillId) {
  if (!game.state.player.learnedSkills.includes(skillId)) {
    game.state.player.learnedSkills.push(skillId);
  }
}

// 升级到新等级时自动学习等级解锁技能
export function learnLevelSkills(game) {
  for (const sk of game.CONTENT.skills) {
    if (sk.learn?.level != null && sk.learn.level <= game.state.player.level && !hasSkill(game.state, sk.id)) {
      learnSkill(game, sk.id);
    }
  }
}
