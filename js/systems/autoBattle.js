// 自动战斗决策：纯逻辑，无 DOM，node 可测。
// cfg = { items: ['ID'...], healAt: 0.5, dangerAt: 0.25 }
//   items   —— 允许自动战斗使用的恢复道具白名单（默认=背包内全部恢复道具，背包实际持有量在决策时查询）
//   healAt  —— 血量低于此比例进入「治疗」决策
//   dangerAt—— 血量低于此比例进入「保命/撤退」决策（应 < healAt）

import { usableSkills } from './skills.js';
import * as inventory from './inventory.js';
import * as player from './player.js';

export const DEFAULT_AUTO_CFG = { items: [], healAt: 0.5, dangerAt: 0.25 };

// 白名单中当前可用的恢复道具（usable 且有 hp/mp 效果且背包有货）
export function selectedRecovery(game, cfg) {
  const out = [];
  for (const id of cfg?.items || []) {
    const item = game.CONTENT.items.find((x) => x.id === id);
    if (!item || !item.usable || !item.effect) continue;
    const qty = inventory.countItem(game.state, id);
    if (qty <= 0) continue;
    out.push({ id, item, qty });
  }
  return out;
}

// 保命用药：取恢复量最大的回血道具
function pickHealItem(game, cfg) {
  const list = selectedRecovery(game, cfg).filter((x) => (x.item.effect.hp || 0) > 0);
  if (!list.length) return null;
  list.sort((a, b) => (b.item.effect.hp || 0) - (a.item.effect.hp || 0));
  return list[0].id;
}

// MP 药：MP 偏低且没蓝放技能时补给
function pickMpItem(game, cfg) {
  const list = selectedRecovery(game, cfg).filter((x) => (x.item.effect.mp || 0) > 0);
  if (!list.length) return null;
  list.sort((a, b) => (b.item.effect.mp || 0) - (a.item.effect.mp || 0));
  return list[0].id;
}

// 可施放的治疗技能（MP 足够）
function pickHealSkill(game, unit) {
  const list = usableSkills(game).filter(
    (s) => s.type === 'heal' && (s.mpCost || 0) <= unit.curMp,
  );
  if (!list.length) return null;
  list.sort((a, b) => (b.power || 0) - (a.power || 0));
  return list[0].id;
}

// 最强可用伤害技能（MP 足够），按 power 降序
function pickAttackSkill(game, unit) {
  const list = usableSkills(game).filter(
    (s) => !s.id.startsWith('E_') && s.type === 'attack' && (s.power || 0) > 0 && (s.mpCost || 0) <= unit.curMp,
  );
  if (!list.length) return null;
  list.sort((a, b) => (b.power || 0) - (a.power || 0));
  return list[0].id;
}

// 攻击目标：血量最低的存活敌人（快速减员）
function lowestHpTarget(combat) {
  const alive = combat.enemies.filter((e) => e.alive);
  if (!alive.length) return null;
  alive.sort((a, b) => a.curHp - b.curHp);
  return alive[0].ref;
}

// 血量是否处于危险线以下且无任何恢复手段（决策共用的判定）
function noRecoveryLeft(game, combat, cfg) {
  if (pickHealItem(game, cfg)) return false;
  if (pickHealSkill(game, combat.playerUnit)) return false;
  return true;
}

// 决策一条战斗指令。返回 combat.doPlayerAction 认可的 action。
// 危险线：先用药 → 治疗技能 → 逃跑退出；治疗线：治疗技能（省药）→ 用药；其余进攻。
export function chooseAutoAction(game, combat, cfg) {
  const u = combat.playerUnit;
  const hpPct = u.curHp / Math.max(1, u.stats.maxHp);
  const mpPct = u.curMp / Math.max(1, u.stats.maxMp);
  const dangerAt = cfg?.dangerAt ?? DEFAULT_AUTO_CFG.dangerAt;
  const healAt = cfg?.healAt ?? DEFAULT_AUTO_CFG.healAt;
  const target = lowestHpTarget(combat);

  // 1) 危险线以下：不惜代价保命，无恢复手段则撤退
  if (hpPct <= dangerAt) {
    const item = pickHealItem(game, cfg);
    if (item) return { type: 'item', itemId: item };
    const heal = pickHealSkill(game, u);
    if (heal) return { type: 'skill', skillId: heal, target };
    return { type: 'flee' };
  }

  // 2) 治疗线以下：优先治疗技能省药，其次用药
  if (hpPct <= healAt) {
    const heal = pickHealSkill(game, u);
    if (heal) return { type: 'skill', skillId: heal, target };
    const item = pickHealItem(game, cfg);
    if (item) return { type: 'item', itemId: item };
    // 未到危险线且无恢复手段 → 继续进攻
  }

  // 3) 进攻：有蓝用最强技能；没蓝但选了 MP 药先补给，否则普攻
  const skill = pickAttackSkill(game, u);
  if (skill) return { type: 'skill', skillId: skill, target };
  if (mpPct <= 0.35) {
    const mpItem = pickMpItem(game, cfg);
    if (mpItem) return { type: 'item', itemId: mpItem };
  }
  return { type: 'attack', target };
}

// 场间（上一场胜利后）是否应停止自动战斗。返回原因字符串或 null。
// 血量危险且药/治疗技能都没有 → 停止；否则下一场开战后会自动恢复。
export function autoDangerReason(game, cfg) {
  const maxHp = player.getStats(game.state, game.CONTENT.items).maxHp;
  const hpPct = game.state.player.cur.hp / Math.max(1, maxHp);
  if (hpPct > (cfg?.dangerAt ?? DEFAULT_AUTO_CFG.dangerAt)) return null;
  if (selectedRecovery(game, cfg).some((x) => (x.item.effect.hp || 0) > 0)) return null;
  const healMpCost = usableSkills(game)
    .filter((s) => s.type === 'heal')
    .map((s) => s.mpCost || 0);
  if (healMpCost.some((c) => c <= game.state.player.cur.mp)) return null;
  return `⚠️ 血量危险且无恢复手段，自动战斗停止（HP ${game.state.player.cur.hp}/${maxHp}）`;
}

// 自动战斗面板「下一动」提示文案
export function actionLabel(game, combat, cfg) {
  const a = chooseAutoAction(game, combat, cfg);
  if (a.type === 'attack') return '普攻';
  if (a.type === 'flee') return '逃跑撤退';
  if (a.type === 'defend') return '防御';
  if (a.type === 'item') {
    const it = game.CONTENT.items.find((x) => x.id === a.itemId);
    return `使用 ${it ? it.name : a.itemId}`;
  }
  if (a.type === 'skill') {
    const sk = game.CONTENT.skills.find((x) => x.id === a.skillId);
    return `施放 ${sk ? sk.name : a.skillId}`;
  }
  return '攻击';
}
