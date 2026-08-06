// 伤害/命中的唯一权威公式。

// 每回合 MP 自动回复量（仅玩家）。
// 公式：2 + 最大MP的4%，至少 1 点。
export function calcMpRegen(maxMp) {
  return Math.max(1, 2 + Math.floor(maxMp * 0.04));
}

// 返回 { damage, hit, crit, miss }
export function rollDamage(attacker, defender, skill, rng) {
  const a = attacker.stats;
  const d = defender.stats;
  const atkMult = attacker.buffs?.atkMult ?? 1;
  const defMult = defender.buffs?.defMult ?? 1;
  const power = skill ? skill.power : 1;

  const effAtk = Math.max(1, a.atk * atkMult);
  const effDef = Math.max(0, d.def * defMult);
  let base = effAtk - effDef * 0.5;
  base += rng.int(0, Math.max(1, Math.round(a.atk * 0.1)));
  base *= power;

  const hitChance = (skill?.hit ?? 1) * (1 - clamp((d.spd - a.spd) * 0.01, 0, 0.2));
  const hit = rng.next() < hitChance;
  if (!hit) return { damage: 0, hit: false, crit: false };

  const critChance = (a.crit || 0) + (skill?.critBonus || 0);
  const crit = rng.next() < critChance;
  let dmg = Math.round(base);
  if (crit) dmg = Math.round(dmg * 1.5);
  return { damage: Math.max(1, dmg), hit: true, crit };
}

// 治疗量：与施法者攻击力与体力挂钩
export function rollHeal(healer, power, rng) {
  const a = healer.stats;
  let amount = (a.atk * 0.6 + a.maxHp * 0.1) * (power || 1);
  amount += rng.int(0, Math.round(a.atk * 0.15));
  return Math.max(1, Math.round(amount));
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
