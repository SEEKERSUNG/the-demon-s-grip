// UI 入口：启动、屏幕路由、HUD、菜单、全局事件接线。

import { CONTENT } from '../content/index.js';
import { validateContent } from '../core/validate.js';
import { createGame } from '../core/game.js';
import { saveToSlot, loadFromSlot, listSlots, slotInfo, SLOT_COUNT, deleteSlot, saveAutoSlot, loadAutoSlot, autoSlotInfo, deleteAutoSlot, exportSaveData, importSaveData, importSaveToSlot } from '../core/save.js';
import * as player from '../systems/player.js';
import { SCREENS, showScreen, setGame, getGame, uiState, ACTIONS } from './screens.js';
import { renderCombatScreen, ACTIONS as COMBAT_ACTIONS } from './combatScreen.js';

// 供其他 UI 模块经 main 统一再导出
export { showScreen, uiState, getGame, setGame } from './screens.js';

// 注册战斗屏幕
SCREENS.combat = (ctx) => renderCombatScreen(getGame(), ctx);

const app = document.getElementById('app');
const toastLayer = document.getElementById('toast-layer');

// ===== 工具 =====
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function itemById(id) {
  return CONTENT.items.find((x) => x.id === id);
}
export function skillById(id) {
  return CONTENT.skills.find((x) => x.id === id);
}
export function enemyById(id) {
  return CONTENT.enemies.find((x) => x.id === id);
}
export function locById(id) {
  return CONTENT.locations.find((x) => x.id === id);
}
export function regionById(id) {
  return CONTENT.regions.find((x) => x.id === id);
}
export function questById(id) {
  return CONTENT.quests.find((x) => x.id === id);
}
export function npcById(id) {
  return CONTENT.npcs.find((x) => x.id === id);
}

export function pct(cur, max) {
  return Math.max(0, Math.min(100, Math.round((cur / Math.max(1, max)) * 100)));
}

export function toast(text, cls = '') {
  const el = document.createElement('div');
  el.className = `toast ${cls}`;
  el.textContent = text;
  toastLayer.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

// 稀有度文字
export function rarityText(r) {
  const map = { common: '', rare: '（稀有）', epic: '（史诗）', legendary: '（传说）' };
  return map[r] || '';
}

// 装备数值文本
export function itemStatsText(item) {
  const parts = [];
  if (item.atk) parts.push(`攻+${item.atk}`);
  if (item.def) parts.push(`防+${item.def}`);
  if (item.spd) parts.push(`速+${item.spd}`);
  if (item.maxHp) parts.push(`HP+${item.maxHp}`);
  if (item.maxMp) parts.push(`MP+${item.maxMp}`);
  if (item.crit) parts.push(`暴击+${Math.round(item.crit * 100)}%`);
  if (item.effect?.hp) parts.push(`恢复${item.effect.hp}HP`);
  if (item.effect?.mp) parts.push(`恢复${item.effect.mp}MP`);
  return parts.join(' ');
}

// ===== 存档操作 =====
export function slotLabel(slot) {
  const info = slotInfo(slot);
  if (!info) return '空存档位';
  const d = new Date(info.savedAt);
  const t = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const ch = ['', '第一章·渔村夜袭', '第二章·讨伐魔王之路', '第三章·百年之约'][info.chapter] || `第${info.chapter}章`;
  return `Lv.${info.level} ${info.name} · ${ch} · ${t}`;
}

export function doSave(slot) {
  const game = getGame();
  if (!game) return;
  uiState.activeSlot = slot; // 手动保存也设为当前存档位
  const ok = saveToSlot(game.state, slot);
  toast(ok ? `已保存到存档位 ${slot + 1}` : '⚠️ 存档失败：浏览器存储不可用', ok ? 'gold' : '');
}

// 自动保存：写入独立自动存档槽位（不覆盖玩家手动存档）。静默失败，无游戏/未开始章节时跳过。
export function autoSave() {
  const game = getGame();
  if (!game) return false;
  if (!game.state.chapter) return false;
  return saveAutoSlot(game.state);
}

// 读取自动存档（供标题"继续"按钮和读档界面使用）
export function loadAutoSave() {
  const saved = loadAutoSlot();
  if (!saved) return null;
  const g = createGame({ savedState: saved });
  setGame(g);
  wireAutoSave(g);
  uiState.quickReturn = null;
  const loc = g.state.location ? locById(g.state.location) : null;
  if (loc) showScreen('location', { loc });
  else showScreen('map');
  return g;
}

// 给新 game 挂「章节完成 → 立即自动保存」里程碑
function wireAutoSave(g) {
  g.events.on('chapter:end', () => {
    if (autoSave()) toast('📌 章节里程碑已自动保存', 'gold');
  });
}

export function doLoad(slot) {
  const saved = loadFromSlot(slot);
  if (!saved) { toast('读取失败'); return; }
  const g = createGame({ savedState: saved });
  setGame(g);
  uiState.activeSlot = slot; // 读档后自动保存写回该档位
  wireAutoSave(g);
  // 若无进行中的章节开始过场，直接进地图
  uiState.pendingInterlude = null;
  uiState.pendingNext = null;
  uiState.menuReturn = null;
  const loc = g.state.location ? locById(g.state.location) : null;
  if (loc) showScreen('location', { loc });
  else showScreen('map');
}

export function startNewGame(slot) {
  const g = createGame();
  setGame(g);
  uiState.activeSlot = slot; // 新档自动保存写回所选档位
  wireAutoSave(g);
  uiState.pendingInterlude = null;
  uiState.pendingNext = null;
  uiState.menuReturn = null;
  const ch = g.story.chapterByIndex(CONTENT, 1);
  g.story.startChapter(g, ch); // 触发 chapter:start → 显示章节开场
}

export function backToTitle() {
  setGame(null);
  uiState.activeSlot = -1; // 回到标题清除当前档位
  uiState.pendingInterlude = null;
  uiState.pendingNext = null;
  uiState.menuReturn = null;
  showScreen('title');
}

// ===== 菜单 =====
export function openMenu() {
  const g = getGame();
  const cur = uiState.currentScreen;
  let returnTo;
  if ((cur === 'location' || cur === 'shop') && g?.state.location) {
    returnTo = { screen: 'location', ctx: { loc: locById(g.state.location) } };
  } else if (cur === 'region' && g?.state.region) {
    returnTo = { screen: 'region', ctx: { region: regionById(g.state.region) } };
  } else if (cur === 'map') {
    returnTo = { screen: 'map', ctx: {} };
  } else {
    // 菜单链上的屏幕（背包/任务/状态/存档…）：沿用之前的返回目标，避免点“返回”丢位置
    returnTo = uiState.menuReturn || { screen: 'map', ctx: {} };
  }
  uiState.menuReturn = returnTo;
  uiState.quickReturn = null; // 从菜单进入子页面时不走快捷返回路径
  showScreen('menu');
}

// ===== 游戏状态到屏幕的桥 =====
export function afterCombatReturn() {
  // 战斗结束回地点/地图，若章节结束则先播过场
  if (uiState.pendingInterlude) {
    const ch = uiState.pendingInterlude;
    uiState.pendingInterlude = null;
    showScreen('interlude', { chapter: ch });
  } else {
    const g = getGame();
    if (g && g.state.location) showScreen('location', { loc: locById(g.state.location) });
    else showScreen('map');
  }
}

// ===== 启动 =====
export function boot() {
  const { errors } = validateContent(CONTENT);
  if (errors.length) {
    app.innerHTML = `<div class="panel" style="margin:40px;color:#ff6b6b">
      <h2>内容校验失败</h2><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>`;
    return;
  }

  // 全局事件接线
  const gameOf = () => getGame();
  const g = gameOf;

  // 章节开始 → 显示开场（经 story.startChapter 触发）
  // （screens 模块在 showScreen('story') 中处理）

  // 对话要求开商店
  // 由 screens 模块内监听

  // 定时自动保存（60 秒），无进行中游戏时静默跳过
  setInterval(() => autoSave(), 60_000);

  showScreen('title');
}

// 把桥函数挂到全局，供各屏幕/按钮调用
window.GRPG = Object.assign({}, ACTIONS, COMBAT_ACTIONS, {
  boot,
  showScreen,
  esc,
  toast,
  pct,
  itemById,
  skillById,
  enemyById,
  locById,
  regionById,
  questById,
  npcById,
  rarityText,
  itemStatsText,
  slotLabel,
  doSave,
  autoSave,
  doLoad,
  startNewGame,
  backToTitle,
  openMenu,
  afterCombatReturn,
  saveToSlot,
  loadFromSlot,
  listSlots,
  deleteSlot,
  deleteAutoSlot,
  loadAutoSave,
  SLOT_COUNT,
  getGame,
  setGame,
});

// 启动游戏（index.html 直接以 module 方式加载，需在此主动初始化）
boot();
