// 屏幕渲染。每个 screen 是 (ctx) => void，负责 innerHTML + 事件绑定。
// 战斗屏幕见 combatScreen.js。

import { CONTENT } from '../content/index.js';
import { saveToSlot, loadFromSlot, listSlots, slotInfo, SLOT_COUNT, deleteSlot, saveAutoSlot, loadAutoSlot, autoSlotInfo, deleteAutoSlot, exportSaveData, importSaveData, importSaveToSlot } from '../core/save.js';
import * as player from '../systems/player.js';
import * as inventory from '../systems/inventory.js';
import * as equipment from '../systems/equipment.js';
import * as skills from '../systems/skills.js';
import * as explore from '../systems/explore.js';
import * as encounter from '../systems/encounter.js';
import * as quests from '../systems/quests.js';
import * as dialogue from '../systems/dialogue.js';
import * as shop from '../systems/shop.js';
import * as npc from '../systems/npc.js';
import { EVENTS } from '../core/events.js';
import { esc, itemById, skillById, locById, regionById, questById, npcById, pct, toast, rarityText, itemStatsText, slotLabel, doSave, doLoad, startNewGame, backToTitle, openMenu, afterCombatReturn, loadAutoSave } from './main.js';
import { GAME_VERSION, GAME_TITLE } from '../core/version.js';

const app = document.getElementById('app');

let game = null;
export const uiState = { pendingInterlude: null, pendingNext: null, backStack: [], currentScreen: null, menuReturn: null, inventoryTab: 'bag', activeSlot: -1, quickReturn: null };

export function setGame(g) { game = g; if (g) wireGameEvents(g); }
export function getGame() { return game; }

let wiredFor = null;
function wireGameEvents(g) {
  if (wiredFor === g) return;
  wiredFor = g;
  g.events.on('chapter:start', ({ chapter }) => showScreen('story', { chapter }));
  g.events.on('chapter:end', ({ chapter, next }) => {
    uiState.pendingInterlude = chapter;
    uiState.pendingNext = next || null;
  });
  g.events.on('dialogue:openShop', ({ shopId }) => {
    showScreen('shop', { shopId, returnTo: 'location' });
  });
  g.events.on('quest:accepted', ({ quest }) => toast(`📋 接取任务：${quest.name}`, 'gold'));
  g.events.on('quest:completed', ({ quest }) => toast(`✅ 任务完成：${quest.name}`, 'gold'));
  g.events.on('toast', ({ text }) => toast(text, 'gold'));
}

// ===== 路由 =====
export function showScreen(name, ctx = {}) {
  if (!SCREENS[name]) { app.innerHTML = `<div class="screen">未知屏幕: ${name}</div>`; return; }
  uiState.currentScreen = name;
  SCREENS[name](ctx || {});
  window.scrollTo(0, 0);
}

// ===== 通用部件 =====
function hudHtml() {
  const s = player.getStats(game.state, CONTENT.items);
  const p = game.state.player;
  return `
  <div class="hud">
    <div class="name">🧙 ${esc(p.name)} <span class="dim">Lv.${p.level}</span></div>
    <div class="bar-wrap">
      <div class="bar hp"><div style="width:${pct(p.cur.hp, s.maxHp)}%"></div><span>HP ${p.cur.hp}/${s.maxHp}</span></div>
      <div class="bar mp"><div style="width:${pct(p.cur.mp, s.maxMp)}%"></div><span>MP ${p.cur.mp}/${s.maxMp}</span></div>
      <div class="bar xp"><div style="width:${pct(p.xp, player.xpNeeded(p.level))}%"></div><span>EXP ${p.xp}/${player.xpNeeded(p.level)}</span></div>
    </div>
    <div class="gold">💰 ${p.gold}</div>
  </div>`;
}

// 统一的顶部导航栏：左侧返回按钮（可隐藏）+ 标题 + 右侧菜单按钮（可隐藏）
function topNav(backAction, title, showMenu = true) {
  const backHtml = backAction
    ? `<button class="nav-back" onclick="${backAction}">← 返回</button>`
    : '<span class="nav-spacer"></span>';
  const menuHtml = showMenu
    ? `<button class="nav-menu" onclick="GRPG.openMenu()">☰ 菜单</button>`
    : '<span class="nav-spacer"></span>';
  return `<div class="top-nav">${backHtml}<div class="nav-title">${title}</div>${menuHtml}</div>`;
}

function backBtn(go) {
  return `<div class="row"><button onclick="GRPG.showScreen('${go}')">← 返回</button></div>`;
}

// 菜单里的自动保存状态行（玩家感知自动保存是否生效）
function autoSaveStatusHtml() {
  const info = autoSlotInfo();
  if (!info) return '<div class="small dim" style="margin:0 0 10px">💾 自动保存未开启——新开档或读档后自动开启</div>';
  const d = new Date(info.savedAt);
  const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  return `<div class="small dim" style="margin:0 0 10px">💾 自动保存 · 独立槽位 · 上次 ${t}</div>`;
}

function formatAutoSaveTime(info) {
  if (!info) return '';
  const d = new Date(info.savedAt);
  const t = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const ch = ['', '第一章·渔村夜袭', '第二章·讨伐魔王之路', '第三章·百年之约'][info.chapter] || `第${info.chapter}章`;
  return `Lv.${info.level} ${info.name} · ${ch} · ${t}`;
}

function typeText(el, text, onDone) {
  el.textContent = '';
  let i = 0;
  const timer = setInterval(() => {
    i += 2;
    el.textContent = text.slice(0, i);
    if (i >= text.length) { clearInterval(timer); onDone && onDone(); }
  }, 14);
}

function itemIcon(id, qty) {
  const it = itemById(id);
  if (!it) return '';
  return `<span class="emoji">${it.emoji}</span>${qty ? ` <span class="dim small">×${qty}</span>` : ''}`;
}

// 地点能否进入
function locLockReason(loc) {
  if (loc.reqLevel && game.state.player.level < loc.reqLevel) return `需要等级 Lv.${loc.reqLevel}`;
  if (loc.reqFlag && !game.state.flags[loc.reqFlag]) return '尚未解锁';
  if (loc.reqQuest) {
    const qs = game.state.quests[loc.reqQuest];
    if (!qs) return '需先接取相关任务';
  }
  return null;
}

// ===== 底部快捷栏 =====
function bottomBar() {
  return `
  <div class="bottom-bar">
    <button onclick="GRPG.openQuests()">📋 任务</button>
    <button onclick="GRPG.openInventory()">🎒 背包</button>
    <button onclick="GRPG.openStatus()">🧙 状态</button>
  </div>`;
}

// ===== 屏幕实现 =====
export const SCREENS = {
  // ----- 标题 -----
  title() {
    const hasSave = listSlots().length > 0 || autoSlotInfo() != null;
    app.innerHTML = `
    <div class="title-screen">
      <div class="sub">魔 幻 传 奇 · 单 机 RPG</div>
      <h1>${GAME_TITLE}</h1>
      <div class="menu">
        <button class="primary" onclick="GRPG.showScreen('newgame')">新的旅程</button>
        <button ${hasSave ? '' : 'disabled'} onclick="GRPG.continueLast()">继续旅程</button>
        <button onclick="GRPG.showScreen('load',{back:'title'})">载入存档</button>
        <button onclick="GRPG.showScreen('about',{back:'title'})">关于</button>
      </div>
      <div class="credits">第三章 · 三族战争 · 结局未竟 · 敬请期待后续篇章</div>
      <div class="version">v${GAME_VERSION}</div>
    </div>`;
  },

  // ----- 关于 -----
  about({ back = 'title' } = {}) {
    const inGame = back === 'menu';
    app.innerHTML = `
    <div class="screen">
      ${inGame ? topNav("GRPG.showScreen('menu')", '❓ 关于') + hudHtml() : ''}
      <div class="panel">
        <div class="panel-title">关于本游戏</div>
        <p>《${GAME_TITLE}》是一款浏览器单机魔幻RPG，采用完全数据驱动架构。</p>
        <p class="dim small">· 当前版本 v${GAME_VERSION}</p>
        <p class="dim small">· 所有道具、NPC、任务、地图、章节均为数据条目，可无限扩展</p>
        <p class="dim small">· 三章主线：渔村夜袭 → 讨伐魔王之路 → 百年之约</p>
        <p class="dim small">· 运行：在游戏目录执行 <code>python3 -m http.server 8000</code>，浏览器打开 localhost:8000</p>
        <p class="dim small">· 在线试玩：<a href="https://seekersung.github.io/the-demon-s-grip/" target="_blank">seekersung.github.io/the-demon-s-grip</a></p>
        <p class="dim small">· GitHub：<a href="https://github.com/SEEKERSUNG/the-demon-s-grip" target="_blank">github.com/SEEKERSUNG/the-demon-s-grip</a></p>
      </div>
      ${inGame ? '' : backBtn(back)}
    </div>`;
  },

  // ----- 新游戏选档 -----
  newgame() {
    app.innerHTML = `
    <div class="screen">
      <div class="panel">
        <div class="panel-title">选择存档位 · 新的旅程</div>
        ${Array.from({ length: SLOT_COUNT }, (_, i) => `
          <div class="save-slot">
            <div class="slot-info"><b>存档位 ${i + 1}</b><br><span class="slot-time">${slotLabel(i)}</span></div>
            <button class="primary" ${slotInfo(i) ? '' : ''} onclick="GRPG.startNewGame(${i})">${slotInfo(i) ? '覆盖开新局' : '开始冒险'}</button>
          </div>`).join('')}
      </div>
      ${backBtn('title')}
    </div>`;
  },

  // ----- 载入存档 -----
  load({ back = 'title' } = {}) {
    const inGame = back === 'menu';
    const autoInfo = autoSlotInfo();
    const autoHtml = autoInfo
      ? `<div class="save-slot auto">
          <div class="slot-info"><b>🔄 自动存档</b><span class="auto-save-badge">（独立槽位）</span><br><span class="slot-time">${formatAutoSaveTime(autoInfo)}</span></div>
          <div class="save-actions">
            <button class="primary" onclick="GRPG.loadAutoSave()">读取</button>
            <button class="danger" onclick="GRPG.deleteAutoSlot();GRPG.showScreen('load',{back:'${back}'})">删除</button>
          </div>
        </div>`
      : '<div class="save-slot"><div class="slot-info"><b>🔄 自动存档</b><br><span class="slot-time dim">暂无自动存档</span></div></div>';

    app.innerHTML = `
    <div class="screen">
      ${inGame ? topNav("GRPG.showScreen('menu')", '📂 读档') + hudHtml() : ''}
      <div class="panel">
        <div class="panel-title">载入存档</div>
        ${autoHtml}
        ${Array.from({ length: SLOT_COUNT }, (_, i) => {
          const info = slotInfo(i);
          return `
          <div class="save-slot">
            <div class="slot-info"><b>存档位 ${i + 1}</b><br><span class="slot-time">${slotLabel(i)}</span></div>
            ${info ? `<button class="primary" onclick="GRPG.doLoad(${i})">读取</button>
                      <button class="danger" onclick="GRPG.deleteSlot(${i});GRPG.showScreen('load',{back:'${back}'})">删除</button>` : '<span class="dim">空</span>'}
          </div>`;
        }).join('')}
      </div>
      ${inGame ? '' : backBtn(back)}
    </div>`;
  },

  // ----- 章节开场 -----
  story({ chapter }) {
    const ch = chapter;
    app.innerHTML = `
    <div class="story-screen">
      <div class="chapter-tag">第 ${ch.index} 章 · ${esc(ch.title)}</div>
      <div class="panel story-text" id="story-text"></div>
      <div class="continue-row">
        <button class="primary" id="btn-continue" style="display:none" onclick="GRPG.showScreen('map')">继续 ▸</button>
      </div>
    </div>`;
    typeText(document.getElementById('story-text'), ch.intro, () => {
      const btn = document.getElementById('btn-continue');
      if (btn) btn.style.display = '';
    });
  },

  // ----- 章末过场 -----
  interlude({ chapter }) {
    app.innerHTML = `
    <div class="story-screen">
      <div class="chapter-tag">— 过 场 —</div>
      <div class="panel story-text" id="story-text"></div>
      <div class="continue-row">
        <button class="primary" id="btn-continue" style="display:none">继续 ▸</button>
      </div>
    </div>`;
    typeText(document.getElementById('story-text'), chapter.interlude, () => {
      const btn = document.getElementById('btn-continue');
      if (btn) btn.style.display = '';
    });
    document.getElementById('btn-continue').onclick = () => {
      if (uiState.pendingNext) {
        const next = uiState.pendingNext;
        uiState.pendingNext = null;
        game.story.startChapter(game, next); // 触发 chapter:start → 下一章开场
      } else {
        showScreen('map');
      }
    };
  },

  // ----- 世界地图 -----
  map() {
    const ch = game.story.currentChapter(game);
    app.innerHTML = `
    <div class="screen map-screen">
      ${topNav(null, '🗺️ 世界地图')}
      ${hudHtml()}
      <div class="panel">
        <div class="row spread">
          <div>
            <div class="panel-title" style="border:none;margin:0">${ch ? `第${ch.index}章 · ${esc(ch.title)}` : '世界地图'}</div>
          </div>
          <button onclick="GRPG.showScreen('quests',{back:'map'})">📋 任务</button>
        </div>
      </div>
      <div class="region-grid">
        ${CONTENT.regions.map((r) => {
          const unlocked = !r.unlockFlag || game.state.flags[r.unlockFlag];
          return `
          <div class="region-card ${unlocked ? '' : 'locked'} chapter-${r.chapter}" ${unlocked ? `onclick="GRPG.enterRegion('${r.id}')"` : ''}>
            <div class="emoji">${r.emoji}</div>
            <div class="rname">${esc(r.name)}</div>
            <div class="small dim">${unlocked ? `第${r.chapter}章 · ${r.locations.length} 处地点` : '🔒 尚未解锁'}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="panel log-panel">
        <div class="panel-title">冒险日志</div>
        <div class="log-line dim">讨伐魔物 ${game.state.battlesWon} 场 · 已探索 ${game.state.visitedLocations.length} 处地点</div>
      </div>
      ${bottomBar()}
    </div>`;
  },

  // ----- 区域地点列表 -----
  region({ region }) {
    const r = region;
    app.innerHTML = `
    <div class="screen">
      ${topNav("GRPG.showScreen('map')", esc(r.name))}
      ${hudHtml()}
      <div class="panel">
        <div class="loc-header">
          <div class="emoji">${r.emoji}</div>
          <div>
            <h2>${esc(r.name)}</h2>
            <div class="dim">${esc(r.desc)}</div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">可探索地点</div>
        <ul class="list">
          ${r.locations.map((lid) => {
            const loc = locById(lid);
            const lock = locLockReason(loc);
            const visited = game.state.visitedLocations.includes(loc.id);
            return `
            <li class="${lock ? 'locked' : ''} ${visited ? 'done' : ''}" ${lock ? '' : `onclick="GRPG.enterLocation('${loc.id}')"`}>
              <div class="row">
                <span class="emoji" style="font-size:1.6rem">${loc.emoji}</span>
                <div class="grow">
                  <div>${esc(loc.name)}${visited ? ' <span class="dim small">✓</span>' : ''}</div>
                  <div class="small dim">${esc(loc.desc)}</div>
                  ${lock ? `<div class="small" style="color:#ff9b9b">🔒 ${esc(lock)}</div>` : ''}
                </div>
              </div>
            </li>`;
          }).join('')}
        </ul>
      </div>
      ${bottomBar()}
    </div>`;
  },

  // ----- 地点探索 -----
  location({ loc }) {
    const nodes = explore.buildLocationNodes(game, loc);
    app.innerHTML = `
    <div class="screen">
      ${topNav("GRPG.leaveLocation()", esc(loc.name))}
      ${hudHtml()}
      <div class="panel">
        <div class="loc-header">
          <div class="emoji">${loc.emoji}</div>
          <div>
            <h2>${esc(loc.name)}</h2>
            <div class="dim">${esc(loc.desc)}</div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">探索</div>
        <ul class="list node-list">
          ${nodes.map((n, i) => {
            if (n.kind === 'exit') {
              return `<li onclick="GRPG.leaveLocation()"><div class="node-item">
                <div class="ni-emoji">${n.emoji}</div>
                <div class="ni-body"><div class="ni-title">${n.title}</div><div class="ni-desc">${esc(n.desc)}</div></div>
                <span class="dim">▸</span></div></li>`;
            }
            if (n.kind === 'battle') {
              return `<li onclick="GRPG.startBattle()"><div class="node-item">
                <div class="ni-emoji">${n.emoji}</div>
                <div class="ni-body"><div class="ni-title">${n.title}</div><div class="ni-desc">${esc(n.desc)}</div></div>
                <span class="dim">▸</span></div></li>`;
            }
            if (n.kind === 'npc') {
              return `<li onclick="GRPG.talk('${n.npc.id}')"><div class="node-item">
                <div class="ni-emoji">${n.emoji}</div>
                <div class="ni-body"><div class="ni-title">${esc(n.title)}</div>${n.desc ? `<div class="ni-desc">${esc(n.desc)}</div>` : ''}</div>
                <span class="dim">▸</span></div></li>`;
            }
            if (n.kind === 'chest') {
              return `<li onclick="GRPG.openChest('${loc.id}','${n.chest.id}')"><div class="node-item">
                <div class="ni-emoji">${n.emoji}</div>
                <div class="ni-body"><div class="ni-title">${esc(n.title)}</div><div class="ni-desc">${esc(n.desc)}</div></div>
                <span class="dim">▸</span></div></li>`;
            }
            if (n.kind === 'event') {
              return `<li onclick="GRPG.triggerEvent('${loc.id}','${n.event.id}')"><div class="node-item">
                <div class="ni-emoji">${n.emoji}</div>
                <div class="ni-body"><div class="ni-title">${esc(n.title)}</div><div class="ni-desc">${esc(n.desc)}</div></div>
                <span class="dim">▸</span></div></li>`;
            }
            return '';
          }).join('')}
        </ul>
      </div>
      ${bottomBar()}
    </div>`;
  },

  // ----- 对话 -----
  dialogue({ npcId }) {
    const npcD = npc.getNpc(CONTENT, npcId);
    const dlg = dialogue.getDialogue(CONTENT, npcD.dialogue);
    if (!dlg) { showScreen('location', { loc: locById(game.state.location) }); return; }
    const { session, view } = dialogue.startDialogue(game, dlg, {
      npc: npcD.id,
      speakerName: npcD.name,
      npcEmoji: npcD.emoji,
    });
    // 记住当前对话会话（供选项跳转）
    game.dlgSession = session;
    // 开场节点即开商店（如铁匠）→ 商店已接管屏幕，不再渲染对话
    if (uiState.currentScreen === 'shop') return;
    renderDlgView(npcD, view);
  },

  // ----- 菜单 -----
  menu({ returnTo } = {}) {
    app.innerHTML = `
    <div class="screen">
      ${topNav("GRPG.backFromMenu()", '☰ 菜单', false)}
      ${hudHtml()}
      ${autoSaveStatusHtml()}
      <div class="panel">
        <div class="panel-title">☰ 菜单</div>
        <div class="list">
          <li onclick="GRPG.showScreen('inventory')"><b>🎒 背包</b></li>
          <li onclick="GRPG.showScreen('quests')"><b>📋 任务</b></li>
          <li onclick="GRPG.showScreen('status')"><b>🧙 状态</b></li>
          <li onclick="GRPG.showScreen('save')"><b>💾 存档</b></li>
          <li onclick="GRPG.showScreen('load',{back:'menu'})"><b>📂 读档</b></li>
          <li onclick="GRPG.goToMap()"><b>🗺️ 世界地图</b></li>
          <li onclick="GRPG.showScreen('about',{back:'menu'})"><b>❓ 关于</b></li>
          <li onclick="GRPG.confirmBackToTitle()" style="color:#ff6b6b"><b>🚪 回到标题</b></li>
        </div>
      </div>
    </div>`;
  },

  // ----- 背包 -----
  inventory({ tab = 'bag', back = 'menu' } = {}) {
    uiState.inventoryTab = tab;
    const items = game.state.inventory;
    const eq = game.state.player.equipped;
    const itemDefs = items.map((s) => ({ slot: s, def: itemById(s.id) })).filter((x) => x.def);
    const bagItems = itemDefs.filter((x) => x.def.type !== 'weapon' && x.def.type !== 'armor' && x.def.type !== 'accessory');
    const eqItems = itemDefs.filter((x) => x.def.type === 'weapon' || x.def.type === 'armor' || x.def.type === 'accessory');

    const slotsHtml = equipment.SLOTS.map((slot) => {
      const id = eq[slot];
      const def = id ? itemById(id) : null;
      const label = { weapon: '武器', armor: '防具', accessory: '饰品', accessory2: '饰品2' }[slot];
      return `
      <div class="equip-slot">
        <div class="slot-label">${label}</div>
        <div class="slot-item">${def ? `${def.emoji} ${esc(def.name)} <span class="small dim">${itemStatsText(def)}</span>` : '<span class="dim">空</span>'}</div>
        ${def ? `<button class="unequip" onclick="GRPG.unequip('${slot}')">卸下</button>` : ''}
      </div>`;
    }).join('');

    const gridHtml = (tab === 'equip' ? eqItems : bagItems).map(({ slot, def }) => {
      const click = def.usable ? `onclick="GRPG.useItem('${def.id}')"` : (def.slot ? `onclick="GRPG.equipItem('${def.id}')"` : '');
      const clickDesc = def.usable ? '点击使用' : (def.slot ? '点击装备' : '');
      const stats = itemStatsText(def); // 装备属性加成 / 消耗品恢复效果
      return `
      <div class="item-card rarity-${def.rarity}" ${click}>
        <div class="i-emoji">${def.emoji}</div>
        <div class="i-name">${esc(def.name)}</div>
        <div class="i-qty">×${slot.qty}${clickDesc ? ` · ${clickDesc}` : ''}</div>
        ${stats ? `<div class="i-stats">${esc(stats)}</div>` : ''}
      </div>`;
    }).join('');

    app.innerHTML = `
    <div class="screen">
      ${topNav(back === 'quick' ? "GRPG.quickBack()" : "GRPG.showScreen('menu')", '🎒 背包')}
      ${hudHtml()}
      <div class="tabs">
        <button class="${tab === 'bag' ? 'active' : ''}" onclick="GRPG.showScreen('inventory',{tab:'bag'})">道具 (${bagItems.length})</button>
        <button class="${tab === 'equip' ? 'active' : ''}" onclick="GRPG.showScreen('inventory',{tab:'equip'})">装备 (${eqItems.length})</button>
      </div>
      <div class="panel">
        <div class="panel-title">装备栏</div>
        <div class="equip-list">${slotsHtml}</div>
      </div>
      <div class="panel">
        <div class="panel-title">${tab === 'equip' ? '可装备物品' : '持有物品'}</div>
        <div class="item-grid">${gridHtml || '<div class="dim">（空）</div>'}</div>
      </div>
    </div>`;
  },

  // ----- 任务日志 -----
  quests({ back = 'menu' } = {}) {
    const active = [];
    const done = [];
    for (const q of CONTENT.quests) {
      const qs = game.state.quests[q.id];
      if (!qs || qs.status === 'completed') continue;
      active.push({ q, qs });
    }
    for (const q of CONTENT.quests) {
      const qs = game.state.quests[q.id];
      if (qs?.status === 'completed') done.push(q);
    }

    const stageText = (q, qs) => {
      const stage = q.stages[qs.stage];
      if (!stage) return '';
      return stage.objectives.map((ob, oi) => {
        const key = `${qs.stage}:${oi}`;
        const cur = qs.counts[key] || 0;
        const need = ob.n || 1;
        const done = cur >= need;
        const targetName = { talk: npcById(ob.target)?.name || ob.target, kill: CONTENT.enemies.find((e) => e.id === ob.target)?.name || ob.target, explore: locById(ob.target)?.name || ob.target, collect: itemById(ob.target)?.name || ob.target }[ob.type];
        const label = { talk: '与', kill: '击败 ', explore: '探索 ', collect: '收集 ' }[ob.type];
        return `<div class="objective ${done ? 'done' : ''}">${label}${targetName} ${cur}/${need}</div>`;
      }).join('');
    };

    const backAction = back === 'map' ? "GRPG.showScreen('map')" : back === 'quick' ? "GRPG.quickBack()" : "GRPG.showScreen('menu')";
    app.innerHTML = `
    <div class="screen">
      ${topNav(backAction, '📋 任务')}
      ${hudHtml()}
      <div class="panel">
        <div class="panel-title">进行中的任务</div>
        ${active.length ? active.map(({ q, qs }) => `
          <div class="quest-item">
            <h4>${q.name}<span class="quest-tag ${q.type}">${q.type === 'main' ? '主线' : '支线'}</span></h4>
            <div class="small dim">${esc(q.desc)}</div>
            ${qs.status === 'done' ? '<div class="objective" style="color:#f4d47a">✓ 已完成，请向委托人交付</div>' : stageText(q, qs)}
          </div>`).join('') : '<div class="dim">暂无进行中的任务</div>'}
      </div>
      <div class="panel">
        <div class="panel-title">已完成</div>
        ${done.length ? done.map((q) => `<div class="quest-item"><h4><span class="dim">✓</span> ${esc(q.name)}</h4></div>`).join('') : '<div class="dim">（无）</div>'}
      </div>
    </div>`;
  },

  // ----- 状态 -----
  status({ back = 'menu' } = {}) {
    const s = player.getStats(game.state, CONTENT.items);
    const skList = skills.usableSkills(game);
    const learned = skList.filter((sk) => !sk.id.startsWith('E_'));
    app.innerHTML = `
    <div class="screen">
      ${topNav(back === 'quick' ? "GRPG.quickBack()" : "GRPG.showScreen('menu')", '🧙 状态')}
      ${hudHtml()}
      <div class="panel">
        <div class="panel-title">🧙 ${esc(game.state.player.name)}</div>
        <div class="stat-grid">
          <div class="stat-cell"><div class="label">攻击</div><div class="value">${s.atk}</div></div>
          <div class="stat-cell"><div class="label">防御</div><div class="value">${s.def}</div></div>
          <div class="stat-cell"><div class="label">速度</div><div class="value">${s.spd}</div></div>
          <div class="stat-cell"><div class="label">暴击</div><div class="value">${Math.round(s.crit * 100)}%</div></div>
          <div class="stat-cell"><div class="label">等级</div><div class="value">Lv.${game.state.player.level}</div></div>
          <div class="stat-cell"><div class="label">金币</div><div class="value" style="color:#f4d47a">${game.state.player.gold}</div></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">技能</div>
        <div class="list">
          ${learned.length ? learned.map((sk) => `
            <li><div class="row">
              <span class="emoji">${sk.emoji}</span>
              <div class="grow"><b>${esc(sk.name)}</b> <span class="small dim">${sk.mpCost}MP</span><br><span class="small dim">${esc(sk.desc)}</span></div>
            </div></li>`).join('') : '<div class="dim">尚未学会任何技能</div>'}
        </div>
      </div>
    </div>`;
  },

  // ----- 存档 -----
  save() {
    const autoInfo = autoSlotInfo();
    const autoHtml = autoInfo
      ? `<div class="save-slot auto">
          <div class="slot-info"><b>🔄 自动存档</b><span class="auto-save-badge">（独立槽位）</span><br><span class="slot-time">${formatAutoSaveTime(autoInfo)}</span></div>
          <div class="save-actions">
            <button class="gold" onclick="GRPG.downloadSave('auto')">📥 导出</button>
            <button class="danger" onclick="GRPG.deleteAutoSlot();GRPG.showScreen('save')">删除</button>
          </div>
        </div>`
      : '<div class="save-slot"><div class="slot-info"><b>🔄 自动存档</b><br><span class="slot-time dim">暂无自动存档（新开档或读档后自动开启）</span></div></div>';

    app.innerHTML = `
    <div class="screen">
      ${topNav("GRPG.showScreen('menu')", '💾 存档')}
      ${hudHtml()}
      <div class="panel">
        <div class="panel-title">🔄 自动存档</div>
        ${autoHtml}
      </div>
      <div class="panel">
        <div class="panel-title">💾 手动存档</div>
        ${Array.from({ length: SLOT_COUNT }, (_, i) => {
          const info = slotInfo(i);
          return `
          <div class="save-slot">
            <div class="slot-info"><b>存档位 ${i + 1}</b><br><span class="slot-time">${slotLabel(i)}</span></div>
            <div class="save-actions">
              <button class="primary" onclick="GRPG.doSave(${i})">保存</button>
              ${info ? `<button class="gold" onclick="GRPG.downloadSave(${i})">📥 导出</button>` : ''}
              ${info ? `<button class="danger" onclick="GRPG.deleteSlot(${i});GRPG.showScreen('save')">删除</button>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="panel">
        <div class="panel-title">📥 导入存档</div>
        <div class="save-slot">
          <div class="slot-info"><span class="dim">从文件中导入存档（JSON 格式）</span></div>
          <button class="primary" onclick="GRPG.importSave()">📂 选择文件</button>
        </div>
      </div>
    </div>`;
  },

  // ----- 商店 -----
  shop({ shopId, returnTo }) {
    const shopD = shop.getShop(CONTENT, shopId);
    if (!shopD) { showScreen('map'); return; }
    const stock = shop.stockView(game, shopD);
    const gold = game.state.player.gold;
    const state2 = game.state;
    const sellable = state2.inventory.map((s) => ({ s, def: itemById(s.id) })).filter((x) => x.def && !x.def.quest);
    app.innerHTML = `
    <div class="screen">
      ${topNav("GRPG.closeShop()", '🏪 ' + esc(shopD.name))}
      ${hudHtml()}
      <div class="panel">
        <div class="panel-title">🏪 ${esc(shopD.name)}</div>
        <div class="shop-row"><div class="s-info"><b>你的金币</b></div><div class="s-price">💰 ${gold}</div></div>
      </div>
      <div class="panel">
        <div class="panel-title">买入</div>
        ${stock.map((st) => {
          const def = itemById(st.item);
          const soldOut = st.remaining != null && st.remaining <= 0;
          return `
          <div class="shop-row">
            <span class="emoji" style="font-size:1.6rem">${def.emoji}</span>
            <div class="s-info">
              <div class="s-name">${esc(def.name)}</div>
              <div class="small dim">${itemStatsText(def)}${st.remaining != null ? ` · 剩 ${st.remaining}` : ''}</div>
            </div>
            <div class="s-price">💰 ${st.cost}</div>
            <button ${soldOut || gold < st.cost ? 'disabled' : ''} onclick="GRPG.buy('${shopId}','${st.item}')">购买</button>
          </div>`;
        }).join('')}
      </div>
      <div class="panel">
        <div class="panel-title">出售</div>
        ${sellable.length ? sellable.map(({ s, def }) => {
          const price = def.sellPrice ?? Math.floor((def.price || 0) * (shopD.sellRate ?? 0.5));
          return `
          <div class="shop-row">
            <span class="emoji" style="font-size:1.6rem">${def.emoji}</span>
            <div class="s-info"><div class="s-name">${esc(def.name)} ×${s.qty}</div></div>
            <div class="s-price">💰 ${price}/个</div>
            <button onclick="GRPG.sell('${shopId}','${def.id}')">出售</button>
          </div>`;
        }).join('') : '<div class="dim">没有可出售的物品</div>'}
      </div>
    </div>`;
  },

  // ----- 团灭 -----
  gameover() {
    app.innerHTML = `
    <div class="gameover">
      <h1>☠️ 你倒下了</h1>
      <div class="sub">黑暗吞没了你的视线……</div>
      <div class="menu" style="width:280px;display:flex;flex-direction:column;gap:10px">
        <button onclick="GRPG.respawn()">💔 在最近的城镇醒来（体力减半）</button>
        <button onclick="GRPG.showScreen('load',{back:'gameover'})">📂 读取存档</button>
        <button onclick="GRPG.backToTitle()">🚪 回到标题</button>
      </div>
    </div>`;
  },
};

// ===== 对话渲染 =====
function renderDlgView(npcD, view) {
  app.innerHTML = `
  <div class="screen" style="justify-content:flex-end">
    <div class="dlg-box">
      <div class="dlg-npc">
        <div class="portrait">${view.emoji}</div>
        <div class="grow">
          <div class="speaker">${esc(view.speaker)}</div>
          <div class="text" id="dlg-text"></div>
        </div>
      </div>
      <div class="dlg-options" id="dlg-options"></div>
    </div>
  </div>`;

  let lineIdx = 0;
  const printLine = () => {
    const el = document.getElementById('dlg-text');
    if (!el) return;
    if (lineIdx >= view.text.length) {
      renderOptions(view);
      return;
    }
    typeText(el, view.text[lineIdx], () => {
      lineIdx += 1;
      // 屏幕可能已被切换（对话结束/跳转/开商店），防止对已卸载节点写入
      const opts = document.getElementById('dlg-options');
      if (opts) opts.innerHTML = `<button disabled>…</button>`;
      setTimeout(printLine, 250);
    });
  };
  printLine();
}

function renderOptions(view) {
  const box = document.getElementById('dlg-options');
  if (!box) return;
  if (view.end || view.options.length === 0) {
    box.innerHTML = `<button class="primary" onclick="GRPG.closeDialogue()">结束对话</button>`;
    return;
  }
  box.innerHTML = view.options.map((op, i) => `
    <button onclick="GRPG.chooseDlg(${i})">${esc(op.text)}</button>`).join('');
}

// ===== 事件弹出文本（story/sign）=====
function showStoryModal(text, onClose) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:50;padding:20px;';
  overlay.innerHTML = `
    <div class="panel" style="max-width:640px;width:100%">
      <div class="story-text" id="modal-text" style="white-space:pre-wrap;min-height:120px"></div>
      <div class="row" style="justify-content:flex-end;margin-top:16px">
        <button class="primary" id="modal-btn" style="display:none">继续</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const modalText = overlay.querySelector('#modal-text');
  const modalBtn = overlay.querySelector('#modal-btn');
  typeText(modalText, text, () => {
    if (modalBtn.isConnected) modalBtn.style.display = '';
  });
  modalBtn.onclick = () => { overlay.remove(); onClose && onClose(); };
}

// ===== 通用确认弹窗 =====
function showConfirm(title, text, buttons) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:60;padding:20px;';
  overlay.innerHTML = `
    <div class="panel" style="max-width:420px;width:100%">
      <div class="panel-title">${esc(title)}</div>
      <div style="margin:12px 0 18px;line-height:1.7">${text}</div>
      <div class="row" style="justify-content:flex-end;gap:10px;flex-wrap:wrap">
        ${buttons.map((b, i) => `<button class="${b.cls || ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelectorAll('button').forEach((el) => {
    el.onclick = () => { overlay.remove(); buttons[el.dataset.i]?.onClick && buttons[el.dataset.i].onClick(); };
  });
}

// 回到标题前确认：提示未保存的进度
export function confirmBackToTitle() {
  const g = getGame();
  if (!g) { backToTitle(); return; }
  showConfirm('回到标题', '⚠️ 回到标题将<b style="color:#ff6b6b">丢弃未保存的进度</b>。要先去存档吗？', [
    { label: '💾 先去存档', cls: 'primary', onClick: () => showScreen('save') },
    { label: '直接回去', cls: 'danger', onClick: () => backToTitle() },
    { label: '取消', onClick: () => {} },
  ]);
}

// ===== 快捷导航（底部栏 → 子页面 → 直接返回游戏）=====
function openQuick(screenName) {
  const g = getGame();
  if (g?.state.location) {
    uiState.quickReturn = { screen: 'location', ctx: { loc: locById(g.state.location) } };
  } else if (g?.state.region) {
    uiState.quickReturn = { screen: 'region', ctx: { region: regionById(g.state.region) } };
  } else {
    uiState.quickReturn = { screen: 'map', ctx: {} };
  }
  showScreen(screenName, { back: 'quick' });
}

export function openQuests() { openQuick('quests'); }
export function openInventory() { openQuick('inventory'); }
export function openStatus() { openQuick('status'); }

export function quickBack() {
  const r = uiState.quickReturn || { screen: 'map', ctx: {} };
  uiState.quickReturn = null;
  showScreen(r.screen, r.ctx || {});
}

// ===== 全局动作（由 main.js 统一挂到 GRPG）=====
export function continueLast() {
  // 优先尝试自动存档（最新进度），无自动存档时取最晚手动存档
  const auto = autoSlotInfo();
  if (auto) { loadAutoSave(); return; }
  const slots = listSlots().sort((a, b) => b.savedAt - a.savedAt);
  if (slots.length) doLoad(slots[0].slot);
}

export function enterRegion(rid) {
  showScreen('region', { region: regionById(rid) });
}

export function enterLocation(lid) {
  const loc = locById(lid);
  const lock = locLockReason(loc);
  if (lock) { toast('🔒 ' + lock); return; }
  explore.enterLocation(game, loc);
  showScreen('location', { loc });
}

export function leaveLocation() {
  const loc = game.state.location ? locById(game.state.location) : null;
  explore.leaveLocation(game, loc);
  const reg = regionById(game.state.region);
  showScreen('region', { region: reg });
}

export function startBattle() {
  const loc = locById(game.state.location);
  const combat = encounter.startLocationBattle(game, loc);
  if (combat) showScreen('combat');
}

export function openChest(lid, chestId) {
  const loc = locById(lid);
  const chest = loc.chests.find((c) => c.id === chestId);
  const res = explore.openLocationChest(game, loc, chest);
  if (res.ok) {
    let txt = res.text;
    if (res.gold) txt += `（金币 +${res.gold}）`;
    toast(txt, 'gold');
  } else {
    toast(res.msg);
  }
  showScreen('location', { loc });
}

export function triggerEvent(lid, evId) {
  const loc = locById(lid);
  const ev = explore.getEvent(CONTENT, evId);
  const desc = explore.triggerEvent(game, ev);
  if (!desc || desc.consumed) { showScreen('location', { loc }); return; }
  if (desc.kind === 'story') {
    showStoryModal(desc.text, () => showScreen('location', { loc }));
  } else if (desc.kind === 'collect') {
    let t = desc.text;
    if (desc.items.length) t += `（获得 ${desc.items.map((i) => itemById(i.id)?.name).join('、')}）`;
    if (desc.gold) t += `（金币 +${desc.gold}）`;
    toast(t, 'gold');
    showScreen('location', { loc });
  } else if (desc.kind === 'dialogue') {
    const dlg = dialogue.getDialogue(CONTENT, desc.dialogueId);
    if (dlg) {
      const { session, view } = dialogue.startDialogue(game, dlg, { speakerName: dlg.id, npcEmoji: '❗' });
      game.dlgSession = session;
      if (uiState.currentScreen === 'shop') return;
      renderDlgView({ name: dlg.id }, view);
    } else showScreen('location', { loc });
  } else if (desc.kind === 'battle') {
    const combat = game.combatSys.startCombat(game, desc.enemyIds, desc.context);
    if (combat) showScreen('combat');
  }
}

export function talk(npcId) {
  showScreen('dialogue', { npcId });
}

export function chooseDlg(i) {
  const res = dialogue.chooseOption(game, game.dlgSession, i);
  // 选项跳转触发了开商店 → 商店已接管屏幕，不再渲染对话
  if (uiState.currentScreen === 'shop') return;
  if (res.view.end) {
    afterDialogueEnd();
    return;
  }
  renderDlgView({ name: res.view.speaker }, res.view);
}

export function closeDialogue() {
  afterDialogueEnd();
}

function afterDialogueEnd() {
  if (uiState.pendingInterlude) {
    const ch = uiState.pendingInterlude;
    uiState.pendingInterlude = null;
    showScreen('interlude', { chapter: ch });
  } else if (game.state.location) {
    showScreen('location', { loc: locById(game.state.location) });
  } else {
    showScreen('map');
  }
}

export function goToMap() {
  if (uiState.pendingInterlude) {
    const ch = uiState.pendingInterlude;
    uiState.pendingInterlude = null;
    showScreen('interlude', { chapter: ch });
    return;
  }
  showScreen('map');
}

export function useItem(id) {
  const res = inventory.useItem(game, id);
  toast(res.ok ? res.msg : res.msg);
  showScreen('inventory', { tab: uiState.inventoryTab || 'bag' });
}
export function equipItem(id) {
  equipment.equipItem(game, id);
  toast('已装备');
  showScreen('inventory', { tab: 'equip' });
}

export function unequip(slot) {
  equipment.unequip(game, slot);
  showScreen('inventory', { tab: 'equip' });
}

export function buy(shopId, itemId) {
  const shopD = shop.getShop(CONTENT, shopId);
  const res = shop.buy(game, shopD, itemId, 1);
  toast(res.ok ? '✅ ' + res.msg : '❌ ' + res.msg);
  showScreen('shop', { shopId, returnTo: 'location' });
}

export function sell(shopId, itemId) {
  const shopD = shop.getShop(CONTENT, shopId);
  const res = shop.sell(game, itemId, 1);
  toast(res.ok ? '✅ ' + res.msg : '❌ ' + res.msg);
  showScreen('shop', { shopId, returnTo: 'location' });
}

// 菜单“返回游戏”：回到打开菜单前所在的屏幕
export function backFromMenu() {
  const r = uiState.menuReturn || { screen: 'map', ctx: {} };
  uiState.menuReturn = null;
  showScreen(r.screen, r.ctx || {});
}

// 商店返回：回到当前地点（商店总是从地点内的对话打开）
export function closeShop() {
  const g = getGame();
  if (g?.state.location) showScreen('location', { loc: locById(g.state.location) });
  else showScreen('map');
}

export function respawn() {
  const ch = game.story.currentChapter(game);
  const reg = regionById(ch.startingMap);
  game.state.region = reg.id;
  game.state.location = reg.locations[0];
  const s = player.getStats(game.state, CONTENT.items);
  game.state.player.cur.hp = Math.max(1, Math.round(s.maxHp / 2));
  game.state.player.cur.mp = Math.round(s.maxMp / 2);
  showScreen('location', { loc: locById(game.state.location) });
}

// ===== 存档导出/导入 =====
export function downloadSave(slot) {
  const result = exportSaveData(slot);
  if (!result) { toast('⚠️ 存档为空，无法导出'); return; }
  try {
    const blob = new Blob([result.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('✅ 存档已导出：' + result.filename, 'gold');
  } catch (e) {
    toast('⚠️ 导出失败');
    console.error('导出失败', e);
  }
}

export function importSave() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.style.display = 'none';
  document.body.appendChild(input);
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) { document.body.removeChild(input); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = importSaveData(reader.result);
      if (!result.ok) {
        toast('⚠️ ' + result.error);
        document.body.removeChild(input);
        return;
      }
      // 查找空闲槽位
      let targetSlot = -1;
      for (let i = 0; i < SLOT_COUNT; i++) {
        if (!slotInfo(i)) { targetSlot = i; break; }
      }
      if (targetSlot < 0) {
        toast('⚠️ 所有存档位已满，请先删除一个存档');
        document.body.removeChild(input);
        return;
      }
      if (importSaveToSlot(result.state, result.savedAt, targetSlot)) {
        toast(`✅ 已导入到存档位 ${targetSlot + 1}`, 'gold');
        showScreen('load', { back: 'menu' });
      } else {
        toast('⚠️ 导入失败：写入出错');
      }
      document.body.removeChild(input);
    };
    reader.readAsText(file);
  };
  input.click();
}

export const ACTIONS = {
  continueLast, enterRegion, enterLocation, leaveLocation, startBattle, openChest,
  triggerEvent, talk, chooseDlg, closeDialogue, goToMap, useItem, equipItem, unequip,
  buy, sell, respawn, backFromMenu, closeShop, confirmBackToTitle,
  openQuests, openInventory, openStatus, quickBack,
  downloadSave, importSave, loadAutoSave,
};
