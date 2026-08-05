// 数值平衡模拟：node scripts/balance.js
// 模拟正常玩家（使用游戏自带开局配装 + 途中买补给/升装备）自动战斗走完第一章，
// 验证无上帝模式可通关。追加/调整敌人数值、商店或初始配装后运行此脚本检查平衡。

import { CONTENT } from '../js/content/index.js';
import { createGame } from '../js/core/game.js';
import * as quests from '../js/systems/quests.js';
import * as explore from '../js/systems/explore.js';
import * as player from '../js/systems/player.js';
import * as inventory from '../js/systems/inventory.js';
import * as shop from '../js/systems/shop.js';

const g = createGame({ seed: 2024 });
const ch = CONTENT.chapters.find((c) => c.index === 1);
g.story.startChapter(g, ch);
const smith = shop.getShop(CONTENT, 'SHOP_SMITH');

let totalBattles = 0;

function countItem(id) {
  return inventory.countItem(g.state, id);
}

// 像真实玩家一样补给：药水不足就买，金币够了就升武器/防具
function shopRoutine() {
  const gold = g.state.player.gold;
  const lv = g.state.player.level;
  const eq = g.state.player.equipped;
  const healCount = countItem('HERB') + countItem('POTION_S') + countItem('POTION_M');
  if (healCount < 6) {
    if (gold >= 20) shop.buy(g, smith, 'POTION_S', 1);
    else if (gold >= 8) shop.buy(g, smith, 'HERB', 1);
  }
  if (lv >= 2 && eq.weapon !== 'WPN_IRON' && gold >= 70) {
    shop.buy(g, smith, 'WPN_IRON', 1);
    g.equipment.equipItem(g, 'WPN_IRON');
  }
  if (lv >= 6 && eq.weapon !== 'WPN_STEEL' && gold >= 220) {
    shop.buy(g, smith, 'WPN_STEEL', 1);
    g.equipment.equipItem(g, 'WPN_STEEL');
  }
  if (lv >= 3 && !eq.armor && gold >= 80) {
    shop.buy(g, smith, 'ARM_LEATHER', 1);
    g.equipment.equipItem(g, 'ARM_LEATHER');
  }
}

function winBattle(enemyIds) {
  const c = g.combatSys.startCombat(g, enemyIds, {});
  let guard = 0;
  while (c.phase === 'player' && guard < 60) {
    const t = c.enemies.find((e) => e.alive);
    if (!t) break;
    if (c.playerUnit.curHp < c.playerUnit.stats.maxHp * 0.35) {
      const potion = g.state.inventory.find((s) => s.id === 'POTION_S' && s.qty > 0)
        || g.state.inventory.find((s) => s.id === 'HERB' && s.qty > 0);
      if (potion) { g.combatSys.doPlayerAction(g, c, { type: 'item', itemId: potion.id }); guard += 1; continue; }
    }
    const r = g.combatSys.doPlayerAction(g, c, { type: 'attack', target: t.ref });
    if (!r.ok) break;
    guard += 1;
  }
  totalBattles += 1;
  return c;
}

function tryWin(enemyIds, retries) {
  for (let i = 0; i < retries; i++) {
    const c = winBattle(enemyIds);
    if (c.phase === 'victory') return true;
    if (c.phase === 'defeat') g.player.fullRestore(g);
  }
  return false;
}

function completeQuest(q) {
  quests.acceptQuest(g, q);
  let guard = 0;
  while (g.state.quests[q.id]?.status !== 'completed' && guard < 100) {
    shopRoutine();
    const qs = g.state.quests[q.id];
    const stage = qs && q.stages[qs.stage];
    if (!stage) return false;
    for (const ob of stage.objectives) {
      if (ob.type === 'talk') quests.progressObjective(g, { type: 'talk', target: ob.target });
      else if (ob.type === 'kill') { if (!tryWin([ob.target], 5)) return false; }
      else if (ob.type === 'explore') explore.enterLocation(g, CONTENT.locations.find((l) => l.id === ob.target));
      else if (ob.type === 'collect') g.inventory.addItem(g, ob.target, ob.n || 1);
    }
    if (g.state.quests[q.id]?.status === 'done') quests.turnIn(g, q);
    guard += 1;
  }
  return g.state.quests[q.id]?.status === 'completed';
}

console.log('=== 第一章平衡模拟（正常玩家：自带开局配装 + 商店补给）===');
for (const qid of ch.objectives) {
  const q = CONTENT.quests.find((x) => x.id === qid);
  const ok = completeQuest(q);
  const s = player.getStats(g.state, CONTENT.items);
  console.log(`  ${ok ? '✓' : '✗'} ${q.name}  Lv.${g.state.player.level} HP${s.maxHp} 攻${s.atk} 防${s.def} 战斗${totalBattles} 金币${g.state.player.gold} 药${countItem('HERB') + countItem('POTION_S') + countItem('POTION_M')}`);
  if (!ok) break;
}
const s = player.getStats(g.state, CONTENT.items);
const cleared = !!g.state.flags.FLAG_CH1_CLEAR;
console.log(`第一章通关: ${cleared ? '✓ 可正常通关' : '✗ 无法通关'}  (最终 Lv.${g.state.player.level} HP${s.maxHp} 攻${s.atk} 防${s.def} 战斗${totalBattles})`);
process.exit(cleared ? 0 : 1);
