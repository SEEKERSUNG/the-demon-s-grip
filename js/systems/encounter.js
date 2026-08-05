// 遭遇生成：从地点敌人池按权重抽出 1-3 个敌人，启动战斗。

import { startCombat } from './combat.js';

// 从地点敌人池随机抽一场遭遇
export function pickEncounter(game, loc) {
  const pairs = loc.enemies || [];
  if (!pairs.length) return [];
  const count = game.rng.int(1, Math.min(3, Math.max(1, pairs.length)));
  const ids = [];
  for (let i = 0; i < count; i++) ids.push(game.rng.pickWeighted(pairs));
  return ids;
}

export function startLocationBattle(game, loc, context = {}) {
  const enemyIds = pickEncounter(game, loc);
  if (!enemyIds.length) return null;
  return startCombat(game, enemyIds, {
    type: 'random',
    locationId: loc.id,
    ...context,
  });
}

// 指定 BOSS 战
export function startBossBattle(game, bossId, context = {}) {
  return startCombat(game, [bossId], {
    type: 'boss',
    bossId,
    ...context,
  });
}
