// 战斗屏幕：指令菜单 → 战斗引擎 → 回合渲染 → 结算面板。
// action 函数由 main.js 统一挂到 GRPG。

import { CONTENT } from '../content/index.js';
import * as skills from '../systems/skills.js';
import * as combatSys from '../systems/combat.js';
import * as encounter from '../systems/encounter.js';
import * as autoBattle from '../systems/autoBattle.js';
import { esc, pct, itemById, skillById, toast, afterCombatReturn, showScreen, uiState, locById } from './main.js';

const app = document.getElementById('app');
let game = null;
let selectedEnemy = null;
let pendingSkill = null;
let commandTab = 'attack';
let lastCombat = null;   // 检测新战斗：重置跨战斗残留的指令状态

// ===== 自动战斗调度 =====
// 调度器可注入：uiSmoke 的同步 setTimeout 会让「渲染→定时→动作→渲染」递归死循环，
// 测试注入队列调度器手动驱动节拍；浏览器默认走 setTimeout。
const TICK_MS = 700;       // 自动指令间隔
const NEXT_MS = 1100;      // 胜利 → 下一场间隔
let scheduler = {
  schedule: (fn, ms) => setTimeout(fn, ms),
  cancel: (h) => clearTimeout(h),
};
let autoTimer = null;
export function setAutoScheduler(s) { scheduler = s; clearAutoTimer(); }
function clearAutoTimer() { if (autoTimer != null) { scheduler.cancel(autoTimer); autoTimer = null; } }

function refresh() { renderCombatScreen(game, {}); }

// 由 SCREENS.combat 调用
export function renderCombatScreen(g, ctx = {}) {
  game = g;
  const combat = game.combat;
  if (!combat) { showScreen('map'); return; }
  if (combat !== lastCombat) {
    // 新一场战斗：指令页归位攻击、清空目标选择与待释放技能
    lastCombat = combat;
    commandTab = 'attack';
    selectedEnemy = null;
    pendingSkill = null;
  }

  const alive = combat.enemies.filter((e) => e.alive);
  if (selectedEnemy && !alive.some((e) => e.ref === selectedEnemy)) selectedEnemy = alive[0]?.ref || null;
  if (!selectedEnemy && alive.length) selectedEnemy = alive[0].ref;

  if (combat.phase === 'victory') return renderVictory(combat);
  if (combat.phase === 'defeat') { stopAutoNow(true); combatSys.syncPlayerState(game, combat); game.combat = null; showScreen('gameover'); return; }
  if (combat.phase === 'fled') { stopAutoNow(true); combatSys.syncPlayerState(game, combat); game.combat = null; afterCombatReturn(); return; }

  const u = combat.playerUnit;
  const skillsList = skills.usableSkills(game);
  const mp = u.curMp;
  const autoOn = uiState.auto.enabled;

  const commandHtml = (() => {
    if (commandTab === 'attack') {
      return `
      <div class="command-grid">
        <button class="primary" onclick="GRPG.cmdAttack()">⚔️ 攻击</button>
        <button onclick="GRPG.cmdDefend()">🛡️ 防御</button>
        <button onclick="GRPG.cmdFlee()">💨 逃跑</button>
      </div>
      <div class="small dim">${alive.length > 1 ? `点击目标再攻击（当前目标：${esc(combat.enemies.find((e) => e.ref === selectedEnemy)?.name || '')}）` : ''}</div>`;
    }
    if (commandTab === 'skill') {
      const castable = skillsList.filter((sk) => !sk.id.startsWith('E_'));
      return `
      <div class="command-grid">
        ${castable.map((sk) => `
          <button class="${mp < (sk.mpCost || 0) ? 'insufficient' : ''}" onclick="GRPG.cmdSkill('${sk.id}')">
            ${sk.emoji}<br>${esc(sk.name)}<br><span class="small dim">${sk.mpCost}MP</span>
          </button>`).join('')}
      </div>
      ${pendingSkill ? `<div class="small gold-text">请选择目标（技能：${esc(skillById(pendingSkill)?.name)}）</div>` : ''}`;
    }
    if (commandTab === 'item') {
      const usable = game.state.inventory.map((s) => ({ s, def: itemById(s.id) })).filter((x) => x.def?.usable);
      return `
      <div class="command-grid">
        ${usable.map(({ s, def }) => `
          <button onclick="GRPG.cmdItem('${def.id}')">${def.emoji}<br>${esc(def.name)}<br><span class="small dim">×${s.qty}</span></button>`).join('')}
        ${usable.length === 0 ? '<div class="dim">背包里没有可用道具</div>' : ''}
      </div>`;
    }
    return '';
  })();

  const autoPanelHtml = `
    <div class="command-panel auto-panel">
      <div class="small gold-text">🪄 自动战斗中 · 第 ${uiState.auto.battles + 1} 场 · 预判：${esc(autoBattle.actionLabel(game, combat, uiState.auto))}</div>
      <div class="command-grid">
        <button class="primary" onclick="GRPG.stopAuto()">⏹ 停止自动战斗</button>
        <button onclick="GRPG.stopAutoFlee()">💨 立即撤退</button>
      </div>
      <div class="small dim">血量 ${pct(u.curHp, u.stats.maxHp)}%（回血线 ${Math.round(uiState.auto.healAt * 100)}% / 撤退线 ${Math.round(uiState.auto.dangerAt * 100)}%）· 停止后转手动操作</div>
    </div>`;

  app.innerHTML = `
  <div class="combat-screen">
    <div class="panel" style="display:flex;justify-content:space-between;align-items:center">
      <div><b>⚔️ 战斗</b> <span class="dim">回合 ${combat.turn}</span>${autoOn ? ' <span class="gold-text">🪄 自动战斗</span>' : ''}</div>
      <button onclick="GRPG.cmdFlee()">💨 逃跑</button>
    </div>
    <div class="combat-arena">
      <div class="enemy-row">
        ${combat.enemies.map((e) => {
          const hidden = !e.alive;
          return `
          <div class="enemy-unit ${hidden ? 'hidden' : ''} ${!hidden && e.ref === selectedEnemy ? 'selected' : ''}" onclick="GRPG.selectEnemy('${e.ref}')">
            <div class="e-emoji">${e.emoji}</div>
            <div class="e-name">${esc(e.name)} ${e.boss ? '<span class="small" style="color:#ffb347">BOSS</span>' : ''}</div>
            <div class="bar hp"><div style="width:${pct(e.curHp, e.stats.maxHp)}%"></div><span>${e.curHp}/${e.stats.maxHp}</span></div>
            ${e.buffs.atkMult > 1 ? '<div class="small gold-text">↑攻击强化</div>' : e.buffs.atkMult < 1 ? '<div class="small" style="color:#9aa3b5">↓攻击削弱</div>' : ''}
          </div>`;
        }).join('')}
      </div>
      <div class="player-unit">
        <div class="p-emoji">🧙</div>
        <div class="p-bars">
          <div class="bar hp"><div style="width:${pct(u.curHp, u.stats.maxHp)}%"></div><span>HP ${u.curHp}/${u.stats.maxHp}</span></div>
          <div class="bar mp"><div style="width:${pct(u.curMp, u.stats.maxMp)}%"></div><span>MP ${u.curMp}/${u.stats.maxMp}</span></div>
          ${u.buffs.defMult > 1 ? '<div class="small" style="color:#6ee7a0">↑防御姿态</div>' : ''}
        </div>
      </div>
    </div>
    <div class="combat-log" id="combat-log">
      ${combat.log.slice(-30).map((l) => `<div class="cl-line cl-${l.cls}">${esc(l.text)}</div>`).join('')}
    </div>
    ${autoOn ? autoPanelHtml : `
    <div class="command-panel">
      <div class="command-tabs">
        <button class="${commandTab === 'attack' ? 'active' : ''}" onclick="GRPG.setTab('attack')">攻击</button>
        <button class="${commandTab === 'skill' ? 'active' : ''}" onclick="GRPG.setTab('skill')">技能</button>
        <button class="${commandTab === 'item' ? 'active' : ''}" onclick="GRPG.setTab('item')">道具</button>
        <button class="auto-start" onclick="GRPG.startAutoBattle()">🪄 自动战斗</button>
      </div>
      ${commandHtml}
    </div>`}
  </div>`;

  const log = document.getElementById('combat-log');
  if (log) log.scrollTop = log.scrollHeight;

  // 自动战斗中：安排下一拍自动指令
  if (autoOn) scheduleAutoTick();
}

function renderVictory(combat) {
  const drops = combat.drops || [];
  const autoOn = uiState.auto.enabled;
  app.innerHTML = `
  <div class="combat-screen">
    <div class="victory-panel">
      <h2>🏆 胜利！</h2>
      <div class="loot-list">
        <div>经验 +${combat.xp}</div>
        <div>金币 +${combat.gold}</div>
        ${drops.length ? drops.map((d) => `<div>获得 ${itemById(d.id)?.emoji || ''} ${esc(itemById(d.id)?.name || d.id)} ×${d.qty}</div>`).join('') : ''}
      </div>
      ${autoOn
        ? `<div class="small gold-text">🪄 自动战斗中：检查状态后自动进入下一场…</div>
           <button onclick="GRPG.stopAuto()">⏹ 停止自动战斗并返回</button>`
        : `<button class="primary" onclick="GRPG.finishCombat()">继续 ▸</button>`}
    </div>
  </div>`;

  if (autoOn) scheduleAutoNext(combat);
}

// ===== 自动战斗驱动 =====

function scheduleAutoTick() {
  clearAutoTimer();
  autoTimer = scheduler.schedule(() => { autoTimer = null; autoTick(); }, TICK_MS);
}

function scheduleAutoNext(combat) {
  clearAutoTimer();
  autoTimer = scheduler.schedule(() => { autoTimer = null; autoNext(combat); }, NEXT_MS);
}

function stopAutoNow(silent) {
  clearAutoTimer();
  if (uiState.auto.enabled) {
    uiState.auto.enabled = false;
    if (!silent) toast('⏹ 自动战斗已停止');
  }
}

// 一拍：执行一条自动指令
function autoTick() {
  const cfg = uiState.auto;
  if (!cfg.enabled) return;
  const combat = game?.combat;
  if (!combat || combat.phase !== 'player') return;
  if (uiState.currentScreen !== 'combat') { stopAutoNow(true); return; }

  const action = autoBattle.chooseAutoAction(game, combat, cfg);
  const res = combatSys.doPlayerAction(game, combat, action);
  if (!res.ok) {
    // 决策指令失效（目标倒下/道具用尽/满血等）→ 回退普攻；再失败则停止自动战斗
    const target = combat.enemies.find((e) => e.alive);
    const fb = target ? combatSys.doPlayerAction(game, combat, { type: 'attack', target: target.ref }) : null;
    if (!fb?.ok) {
      stopAutoNow();
      refresh();
      return;
    }
  }
  refresh(); // 渲染 → 战斗阶段推进会自动安排下一拍（victory/defeat/fled 分支各自处理）
}

// 胜利后：检查撤退线 → 结算回地点并开下一场
function autoNext(combat) {
  const cfg = uiState.auto;
  if (!cfg.enabled) return;
  if (game?.combat !== combat) return; // 已被手动结算/重载
  if (combat.phase !== 'victory') return;

  const reason = autoBattle.autoDangerReason(game, cfg);
  // 结算本场（掉落/经验已在 victory 写入 state）
  game.combat = null;
  if (reason) {
    stopAutoNow(true);
    toast(reason, 'gold');
    afterCombatReturn();
    return;
  }
  if (uiState.pendingInterlude) { stopAutoNow(true); afterCombatReturn(); return; }

  const loc = game.state.location ? locById(game.state.location) : null;
  if (!loc || !loc.enemies?.length) {
    stopAutoNow(true);
    toast('🪄 此地已无可战斗的敌人，自动战斗结束');
    afterCombatReturn();
    return;
  }
  const next = encounter.startLocationBattle(game, loc);
  if (!next) {
    stopAutoNow(true);
    toast('🪄 无法开始下一场战斗，自动战斗结束');
    afterCombatReturn();
    return;
  }
  cfg.battles += 1;
  showScreen('combat');
}

// ===== 动作（main.js 挂到 GRPG）=====

// 手动停止自动战斗：转手动操作；若在胜利结算屏则直接返回
export function stopAuto() {
  stopAutoNow();
  if (game?.combat?.phase === 'victory') { finishCombat(); return; }
  if (game?.combat) refresh();
}

// 立即撤退：停止自动战斗并执行逃跑
export function stopAutoFlee() {
  stopAutoNow(true);
  doAction({ type: 'flee' });
}

// 自动战斗状态复位（读档/新游戏/回标题时调用，取消未触发的节拍）
export function resetAuto() {
  stopAutoNow(true);
  uiState.auto.battles = 0;
  uiState.auto.itemsPicked = false;
}

export function setTab(t) { commandTab = t; pendingSkill = null; refresh(); }

export function selectEnemy(ref) {
  selectedEnemy = ref;
  if (pendingSkill) {
    const sk = pendingSkill;
    pendingSkill = null;
    doAction({ type: 'skill', skillId: sk, target: ref });
  } else {
    refresh();
  }
}

export function cmdAttack() {
  if (!selectedEnemy) return;
  doAction({ type: 'attack', target: selectedEnemy });
}

export function cmdSkill(skillId) {
  const sk = skillById(skillId);
  if (!sk) return;
  if (sk.target === 'all_enemies' || sk.target === 'self') doAction({ type: 'skill', skillId });
  else { pendingSkill = skillId; refresh(); }
}

export function cmdItem(itemId) {
  doAction({ type: 'item', itemId });
}

export function cmdDefend() {
  doAction({ type: 'defend' });
}

export function cmdFlee() {
  doAction({ type: 'flee' });
}

export function finishCombat() {
  if (game) game.combat = null;
  afterCombatReturn();
}

function doAction(action) {
  const combat = game.combat;
  if (!combat || combat.phase !== 'player') return;
  const res = combatSys.doPlayerAction(game, combat, action);
  if (!res.ok) { pendingSkill = null; toast('❌ ' + res.reason); return; }
  pendingSkill = null;
  refresh();
}

export const ACTIONS = { setTab, selectEnemy, cmdAttack, cmdSkill, cmdItem, cmdDefend, cmdFlee, finishCombat, stopAuto, stopAutoFlee, resetAuto };
