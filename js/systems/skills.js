// 技能定义查找 / 玩家可用技能集合。

import { getStats as playerStats } from './player.js';

export function getSkill(CONTENT, id) {
  return CONTENT.skills.find((x) => x.id === id);
}

// 玩家可用技能 = 已学会 + 当前装备解锁
export function usableSkills(game) {
  const { state, CONTENT } = game;
  const ids = new Set(state.player.learnedSkills);
  for (const slot of ['weapon', 'armor', 'accessory', 'accessory2']) {
    const eqId = state.player.equipped[slot];
    const item = eqId && CONTENT.items.find((x) => x.id === eqId);
    if (item?.skillUnlocks) item.skillUnlocks.forEach((s) => ids.add(s));
  }
  return CONTENT.skills.filter((s) => ids.has(s.id));
}

// 花费MP是否足够
export function canCast(game, skill) {
  return game.state.player.cur.mp >= (skill.mpCost || 0);
}

export function playerUnit(game) {
  const { state, CONTENT } = game;
  const stats = playerStats(state, CONTENT.items);
  return {
    name: state.player.name,
    emoji: state.player.emoji || '🧙',
    isPlayer: true,
    stats,
    curHp: state.player.cur.hp,
    curMp: state.player.cur.mp,
    buffs: { atkMult: 1, defMult: 1 },
  };
}
