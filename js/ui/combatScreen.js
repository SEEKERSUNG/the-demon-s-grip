// 战斗屏幕：指令菜单 → 战斗引擎 → 回合渲染 → 结算面板。
// action 函数由 main.js 统一挂到 GRPG。

import { CONTENT } from '../content/index.js';
import * as skills from '../systems/skills.js';
import * as combatSys from '../systems/combat.js';
import { esc, pct, itemById, skillById, toast, afterCombatReturn, showScreen } from './main.js';

const app = document.getElementById('app');
let game = null;
let selectedEnemy = null;
let pendingSkill = null;
let commandTab = 'attack';

function refresh() { renderCombatScreen(game, {}); }

// 由 SCREENS.combat 调用
export function renderCombatScreen(g, ctx = {}) {
  game = g;
  const combat = game.combat;
  if (!combat) { showScreen('map'); return; }

  const alive = combat.enemies.filter((e) => e.alive);
  if (selectedEnemy && !alive.some((e) => e.ref === selectedEnemy)) selectedEnemy = alive[0]?.ref || null;
  if (!selectedEnemy && alive.length) selectedEnemy = alive[0].ref;

  if (combat.phase === 'victory') return renderVictory(combat);
  if (combat.phase === 'defeat') { combatSys.syncPlayerState(game, combat); showScreen('gameover'); return; }
  if (combat.phase === 'fled') { combatSys.syncPlayerState(game, combat); afterCombatReturn(); return; }

  const u = combat.playerUnit;
  const skillsList = skills.usableSkills(game);
  const mp = u.curMp;

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

  app.innerHTML = `
  <div class="combat-screen">
    <div class="panel" style="display:flex;justify-content:space-between;align-items:center">
      <div><b>⚔️ 战斗</b> <span class="dim">回合 ${combat.turn}</span></div>
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
    <div class="command-panel">
      <div class="command-tabs">
        <button class="${commandTab === 'attack' ? 'active' : ''}" onclick="GRPG.setTab('attack')">攻击</button>
        <button class="${commandTab === 'skill' ? 'active' : ''}" onclick="GRPG.setTab('skill')">技能</button>
        <button class="${commandTab === 'item' ? 'active' : ''}" onclick="GRPG.setTab('item')">道具</button>
      </div>
      ${commandHtml}
    </div>
  </div>`;

  const log = document.getElementById('combat-log');
  if (log) log.scrollTop = log.scrollHeight;
}

function renderVictory(combat) {
  const drops = combat.drops || [];
  app.innerHTML = `
  <div class="combat-screen">
    <div class="victory-panel">
      <h2>🏆 胜利！</h2>
      <div class="loot-list">
        <div>经验 +${combat.xp}</div>
        <div>金币 +${combat.gold}</div>
        ${drops.length ? drops.map((d) => `<div>获得 ${itemById(d.id)?.emoji || ''} ${esc(itemById(d.id)?.name || d.id)} ×${d.qty}</div>`).join('') : ''}
      </div>
      <button class="primary" onclick="GRPG.finishCombat()">继续 ▸</button>
    </div>
  </div>`;
}

// ===== 动作（main.js 挂到 GRPG）=====
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
  afterCombatReturn();
}

function doAction(action) {
  const combat = game.combat;
  if (!combat || combat.phase !== 'player') return;
  const res = combatSys.doPlayerAction(game, combat, action);
  if (!res.ok) { toast('❌ ' + res.reason); return; }
  pendingSkill = null;
  refresh();
}

export const ACTIONS = { setTab, selectEnemy, cmdAttack, cmdSkill, cmdItem, cmdDefend, cmdFlee, finishCombat };
