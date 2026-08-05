// 敌方AI：按 ai 表（权重/条件）选择技能。返回技能 id 或 null(普攻)。

export function chooseEnemyAction(enemy) {
  // ai: ['ATTACK' | 'skillId' | { skill, cond }]
  for (const entry of enemy.ai || []) {
    if (typeof entry === 'string') {
      if (entry === 'ATTACK') return null;
      return entry;
    }
    // 条件型
    const c = entry.cond || {};
    let ok = true;
    if (c.hpPct?.lt != null) ok = ok && enemy.curHp / enemy.stats.maxHp < c.hpPct.lt;
    if (c.hpPct?.gt != null) ok = ok && enemy.curHp / enemy.stats.maxHp > c.hpPct.gt;
    if (ok) return entry.skill;
  }
  // 兜底：从技能池挑第一个
  if (enemy.skillPool?.length) return enemy.skillPool[0];
  return null;
}
