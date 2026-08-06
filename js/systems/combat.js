// 回合制战斗引擎。纯逻辑，UI 通过 startCombat / doPlayerAction 驱动。
// 战斗对象独立于存档 state（只读引用 game.state），胜利后统一结算写入 state。

import { getSkill } from './skills.js';
import { playerUnit } from './skills.js';
import { rollDamage, rollHeal, calcMpRegen } from './stats.js';
import { chooseEnemyAction } from './enemyAction.js';
import { rollDrops, mergeLoot, grantLoot } from './loot.js';
import * as player from './player.js';
import * as inventory from './inventory.js';
import * as quests from './quests.js';
import { setFlag } from './flags.js';

// ---- 单位构建 ----

export function spawnEnemy(game, def) {
  return {
    ref: def.id,
    name: def.name,
    emoji: def.emoji || '👹',
    boss: !!def.boss,
    level: def.level || 1,
    stats: {
      maxHp: def.stats.hp,
      maxMp: def.stats.mp || 0,
      atk: def.stats.atk,
      def: def.stats.def,
      spd: def.stats.spd,
      crit: def.crit || 0.05,
    },
    curHp: def.stats.hp,
    curMp: def.stats.mp || 0,
    buffs: { atkMult: 1, defMult: 1 },
    buffTurns: {},
    ai: def.ai,
    skillPool: def.skillPool || [],
    drops: def.drops || [],
    xp: def.xp || 0,
    gold: def.gold || 0,
    alive: true,
  };
}

// enemyIds: 敌人 id 数组。context: { type, locationId, eventId, onWin }
export function startCombat(game, enemyIds, context = {}) {
  const enemies = enemyIds.map((id) => {
    const def = game.CONTENT.enemies.find((e) => e.id === id);
    if (!def) throw new Error(`战斗中找不到敌人: ${id}`);
    return spawnEnemy(game, def);
  });
  const combat = {
    context,
    playerUnit: playerUnit(game),
    enemies,
    turn: 1,
    phase: 'player',          // player | enemy | victory | defeat | fled
    log: [],
    xp: enemies.reduce((s, e) => s + e.xp, 0),
    gold: enemies.reduce((s, e) => s + e.gold, 0),
    drops: [],
    fled: false,
    killedRefs: [],
  };
  game.combat = combat;
  addLog(combat, `⚔️ 战斗开始！${enemies.map((e) => e.name).join('、')} 出现了！`, 'title');
  game.events.emit('combat:start', { combat });
  return combat;
}

export function addLog(combat, text, cls = '') {
  combat.log.push({ text, cls });
}

export function aliveEnemies(combat) {
  return combat.enemies.filter((e) => e.alive);
}

// ---- 战斗指令入口 ----

// action: { type:'attack'|'skill'|'item'|'defend'|'flee', target, skillId, itemId }
export function doPlayerAction(game, combat, action) {
  if (combat.phase !== 'player') return { ok: false, reason: '当前无法行动' };

  // 玩家先手
  const playerFirst = combat.playerUnit.stats.spd >= Math.max(...combat.enemies.map((e) => e.stats.spd));
  if (playerFirst) {
    const r = applyPlayerAction(game, combat, action);
    if (!r.ok) return r;
    afterPlayerPhase(game, combat);
    if (combat.phase !== 'player') return { ok: true };
    runEnemyPhase(game, combat);
  } else {
    runEnemyPhase(game, combat);
    if (combat.phase !== 'player') return { ok: true };
    const r = applyPlayerAction(game, combat, action);
    if (!r.ok) return r;
    afterPlayerPhase(game, combat);
  }

  if (combat.phase === 'player') {
    combat.turn += 1;
    // 每回合自动回复 MP（仅玩家）
    const regen = calcMpRegen(combat.playerUnit.stats.maxMp);
    combat.playerUnit.curMp = Math.min(combat.playerUnit.stats.maxMp, combat.playerUnit.curMp + regen);
    tickBuffs(combat.playerUnit);
    combat.enemies.forEach((e) => { if (e.alive) tickBuffs(e); });
  }
  return { ok: true };
}

function afterPlayerPhase(game, combat) {
  cleanupDead(game, combat);
  if (combat.enemies.every((e) => !e.alive)) {
    victory(game, combat);
    return;
  }
}

function runEnemyPhase(game, combat) {
  for (const enemy of combat.enemies) {
    if (!enemy.alive || combat.phase !== 'player') continue;
    const skillId = chooseEnemyAction(enemy);
    const skill = skillId ? getSkill(game.CONTENT, skillId) : null;
    const attacker = enemy;
    if (skill?.type === 'buff') {
      applyBuff(game, combat, attacker, skill, [attacker]);
    } else if (skill?.type === 'heal') {
      applySkillTo(game, combat, attacker, skill, [attacker]);
    } else {
      applySkillTo(game, combat, attacker, skill, [combat.playerUnit]);
    }
    if (combat.playerUnit.curHp <= 0) {
      combat.playerUnit.curHp = 0;
      defeat(game, combat);
      return;
    }
  }
}

// ---- 玩家行动应用 ----

function applyPlayerAction(game, combat, action) {
  const u = combat.playerUnit;
  switch (action.type) {
    case 'attack': {
      const target = combat.enemies.find((e) => e.ref === action.target && e.alive);
      if (!target) return { ok: false, reason: '目标已倒下' };
      applySkillTo(game, combat, u, null, [target]);
      return { ok: true };
    }
    case 'skill': {
      const skill = getSkill(game.CONTENT, action.skillId);
      if (!skill) return { ok: false, reason: '未知技能' };
      if (!game.skills.usableSkills(game).some(s => s.id === skill.id)) return { ok: false, reason: '尚未学会' };
      if (u.curMp < (skill.mpCost || 0)) return { ok: false, reason: 'MP 不足' };
      u.curMp -= skill.mpCost || 0;
      let targets;
      if (skill.target === 'all_enemies') targets = aliveEnemies(combat);
      else if (skill.target === 'self') targets = [u];
      else targets = [combat.enemies.find((e) => e.ref === action.target && e.alive)];
      if (!targets || targets.length === 0 || targets[0] === undefined) return { ok: false, reason: '目标已倒下' };
      applySkillTo(game, combat, u, skill, targets);
      return { ok: true };
    }
    case 'item': {
      // 战斗单位 HP 未同步到 state，先用单位值覆盖再结算，避免误判"HP已满"
      game.state.player.cur.hp = u.curHp;
      game.state.player.cur.mp = u.curMp;
      const res = inventory.useItem(game, action.itemId);
      u.curHp = game.state.player.cur.hp;
      u.curMp = game.state.player.cur.mp;
      if (!res.ok) return { ok: false, reason: res.msg };
      addLog(combat, `🧪 使用了道具：${res.msg}`, 'heal');
      return { ok: true };
    }
    case 'defend': {
      const u2 = combat.playerUnit;
      u2.buffs.defMult = 2;
      u2.buffTurns.defMult = 1;
      addLog(combat, '🛡️ 你摆出防御姿态。', 'info');
      return { ok: true };
    }
    case 'flee': {
      const avgEnemySpd = combat.enemies.filter((e) => e.alive).reduce((s, e) => s + e.stats.spd, 0)
        / Math.max(1, combat.enemies.filter((e) => e.alive).length);
      let chance = 0.5 + (u.stats.spd - avgEnemySpd) * 0.02;
      chance = Math.max(0.25, Math.min(0.9, chance));
      if (game.rng.chance(chance)) {
        combat.phase = 'fled';
        combat.fled = true;
        addLog(combat, '🏃 你成功逃离了战斗！', 'info');
        game.events.emit('combat:end', { result: 'fled', combat });
      } else {
        addLog(combat, '💨 逃跑失败！', 'info');
        const attacker = combat.enemies.find((e) => e.alive);
        if (attacker) applySkillTo(game, combat, attacker, null, [u]);
        if (combat.playerUnit.curHp <= 0) {
          combat.playerUnit.curHp = 0;
          defeat(game, combat);
        }
      }
      return { ok: true };
    }
    default:
      return { ok: false, reason: '未知指令' };
  }
}

// 通用技能/攻击应用（敌我通用）
function applySkillTo(game, combat, attacker, skill, targets) {
  const targetsArr = Array.isArray(targets) ? targets : [targets];
  if (skill?.type === 'heal') {
    for (const t of targetsArr) {
      const amount = rollHeal(attacker, skill.power, game.rng);
      t.curHp = Math.min(t.stats.maxHp, t.curHp + amount);
      addLog(combat, `✨ ${attacker.name} 施放【${skill.name}】，${t.name} 恢复 ${amount} 点HP`, 'heal');
    }
    return;
  }
  if (skill?.type === 'buff' || skill?.type === 'debuff') {
    applyBuff(game, combat, attacker, skill, targetsArr);
    return;
  }
  // 伤害类（普攻或 attack/special）
  for (const t of targetsArr) {
    const r = rollDamage(attacker, t, skill, game.rng);
    if (!r.hit) {
      addLog(combat, `💨 ${attacker.name} 的攻击落空了！`, 'hit');
      continue;
    }
    t.curHp = Math.max(0, t.curHp - r.damage);
    const skillName = skill ? `【${skill.name}】` : '';
    const critTxt = r.crit ? '💥 暴击！' : '';
    addLog(combat, `${critTxt}${attacker.name} ${skill ? `施放${skillName}` : '发起攻击'}，对 ${t.name} 造成 ${r.damage} 点伤害`, r.crit ? 'crit' : 'dmg');
    if (t.isPlayer && t.curHp <= 0) t.curHp = 0;
  }
}

function applyBuff(game, combat, caster, skill, targets) {
  const isDebuff = skill?.type === 'debuff';
  const stat = isDebuff ? 'defMult' : 'atkMult';
  const mult = isDebuff ? 0.7 : (skill?.buff?.amt ?? 1.25);
  const dur = skill?.buff?.turns ?? 3;
  for (const t of targets) {
    t.buffs[stat] = mult;
    t.buffTurns[stat] = dur;
  }
  if (skill) {
    const verb = isDebuff ? '削弱了' : '增强了';
    addLog(combat, `✨ ${caster.name} 施放【${skill.name}】${verb} ${targets.map((t) => t.name).join('、')}！`, 'info');
  }
}

function tickBuffs(unit) {
  for (const k in unit.buffTurns) {
    unit.buffTurns[k] -= 1;
    if (unit.buffTurns[k] <= 0) {
      unit.buffs[k] = 1;
      delete unit.buffTurns[k];
    }
  }
}

function cleanupDead(game, combat) {
  for (const e of combat.enemies) {
    if (e.alive && e.curHp <= 0) {
      e.alive = false;
      e.curHp = 0;
      combat.killedRefs.push(e.ref);
      addLog(combat, `💀 ${e.name} 被击败了！`, 'crit');
    }
  }
}

// ---- 胜负结算 ----

function victory(game, combat) {
  combat.phase = 'victory';
  // 先把战斗损耗写回存档（升级回满逻辑随后处理）
  syncPlayerState(game, combat);

  // 掉落
  const loot = [];
  for (const e of combat.enemies) {
    if (e.ref === combat.context.bossId) {
      (combat.context.bossDrops || []).forEach((d) => loot.push({ id: d.item, qty: d.qty || 1 }));
    }
    loot.push(...rollDrops(game, e));
  }
  combat.drops = mergeLoot(loot);

  // 写入 state
  const ups = player.addXp(game, combat.xp);
  player.addGold(game, combat.gold);
  grantLoot(game, combat.drops);
  game.state.battlesWon += 1;

  // 任务击杀进度
  for (const ref of combat.killedRefs) quests.progressObjective(game, { type: 'kill', target: ref });
  // 事件/剧情 onWin
  if (combat.context.onWin) applyOnWin(game, combat);

  addLog(combat, `🏆 战斗胜利！获得 ${combat.xp} 经验、${combat.gold} 金币`, 'gold');
  if (ups > 0) addLog(combat, `⬆️ 等级提升到 Lv.${game.state.player.level}！`, 'title');
  game.events.emit('combat:end', { result: 'victory', combat });
}

export function applyOnWin(game, combat) {
  const ow = combat.context.onWin;
  if (!ow) return;
  if (ow.flags) ow.flags.forEach((f) => setFlag(game, f));
  if (ow.quests) ow.quests.forEach((qid) => {
    // 完成一个任务（视为交还）
    const q = game.CONTENT.quests.find((x) => x.id === qid);
    if (q) quests.completeQuest(game, q);
  });
  if (ow.story) game.state.flags['__story_' + ow.story] = true;
}

function defeat(game, combat) {
  combat.phase = 'defeat';
  addLog(combat, '☠️ 你倒下了……', 'crit');
  game.events.emit('combat:end', { result: 'defeat', combat });
}

// 战斗结束后把当前 HP/MP 同步回存档
export function syncPlayerState(game, combat) {
  game.state.player.cur.hp = combat.playerUnit.curHp;
  game.state.player.cur.mp = combat.playerUnit.curMp;
}
