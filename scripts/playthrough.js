// 端到端回放验证：node scripts/playthrough.js
// 无 DOM 驱动三章主线走通，断言章节门禁、任务链、结局 flag。

import { CONTENT } from '../js/content/index.js';
import { createGame } from '../js/core/game.js';
import { createInitialState, migrate } from '../js/core/state.js';
import * as player from '../js/systems/player.js';
import * as quests from '../js/systems/quests.js';
import * as explore from '../js/systems/explore.js';
import * as inventory from '../js/systems/inventory.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

// 上帝模式：调高属性保证战斗必胜（验证逻辑而非平衡）
function godMode(game) {
  const b = game.state.player.base;
  game.state.player.level = 25;
  b.maxHp = 2000; b.maxMp = 500; b.atk = 120; b.def = 80; b.spd = 40; b.crit = 0.2;
  game.state.player.cur.hp = 2000; game.state.player.cur.mp = 500;
  game.state.player.gold = 5000;
  player.learnLevelSkills(game);
}

// 必胜战斗：攻击直到胜利
function winBattle(game, enemyIds) {
  const c = game.combatSys.startCombat(game, enemyIds, {});
  let guard = 0;
  while (c.phase === 'player' && guard < 300) {
    const t = c.enemies.find((e) => e.alive);
    game.combatSys.doPlayerAction(game, c, { type: 'attack', target: t.ref });
    guard += 1;
  }
  if (c.phase !== 'victory') throw new Error(`战斗未能取胜: ${enemyIds.join(',')}`);
  return c;
}

// 驱动一个任务到完成
function completeQuest(game, quest) {
  if (game.state.quests[quest.id]?.status === 'completed') return;
  quests.acceptQuest(game, quest);
  let guard = 0;
  while (game.state.quests[quest.id]?.status !== 'completed' && guard < 60) {
    const qs = game.state.quests[quest.id];
    const stage = quest.stages[qs.stage];
    for (const ob of stage.objectives) {
      if (ob.type === 'talk') {
        quests.progressObjective(game, { type: 'talk', target: ob.target });
      } else if (ob.type === 'kill') {
        winBattle(game, [ob.target]);
      } else if (ob.type === 'explore') {
        const loc = CONTENT.locations.find((l) => l.id === ob.target);
        explore.enterLocation(game, loc);
      } else if (ob.type === 'collect') {
        inventory.addItem(game, ob.target, ob.n || 1);
      }
    }
    if (game.state.quests[quest.id]?.status === 'done') {
      quests.turnIn(game, quest);
    }
    guard += 1;
  }
  if (game.state.quests[quest.id]?.status !== 'completed') {
    throw new Error(`任务无法完成: ${quest.id}`);
  }
}

// 打完整一章主线
function playChapter(game, index) {
  const ch = CONTENT.chapters.find((c) => c.index === index);
  if (!game.state.chapterStarted || game.state.chapter !== index) {
    game.story.startChapter(game, ch);
  }
  for (const qid of ch.objectives) {
    const q = CONTENT.quests.find((x) => x.id === qid);
    completeQuest(game, q);
  }
  if (!game.state.flags[ch.gate.flag]) throw new Error(`第${index}章 gate 未置位: ${ch.gate.flag}`);
  console.log(`\n✔ 第${index}章「${ch.title}」主线全部完成`);
}

console.log('=== 战斗公式回归 ===');
{
  const g = createGame({ seed: 7 });
  godMode(g);
  const enemy = g.CONTENT.enemies.find((e) => e.id === 'SLIME');
  const unit = g.combatSys.spawnEnemy(g, enemy);
  const pu = g.skills.playerUnit(g);
  const r1 = g.stats.rollDamage(pu, unit, null, g.rng);
  assert(r1.damage >= 1, `普攻伤害>=1（实际 ${r1.damage}）`);
  const heal = g.stats.rollHeal(pu, 2, g.rng);
  assert(heal >= 1, `治疗量>=1（实际 ${heal}）`);
  const need = player.xpNeeded(1);
  assert(need > 30, `一级所需经验>30（实际 ${need}）`);
}

console.log('\n=== 第一章走通 ===');
{
  const g = createGame({ seed: 11 });
  godMode(g);
  g.story.startChapter(g, CONTENT.chapters.find((c) => c.index === 1));
  assert(!!g.state.flags.FLAG_CH1_START, 'ch1 introFlag 置位');
  assert(!!g.state.quests.Q1_CH1_VILLAGE_DESTROYED, 'ch1 第一主线自动接取');
  playChapter(g, 1);
  assert(!!g.state.flags.FLAG_CH1_CLEAR, 'FLAG_CH1_CLEAR 置位');
  assert(g.state.inventory.some((s) => s.id === 'QI_LETTER'), '获得徵召令');
}

console.log('\n=== 第二章走通 ===');
{
  const g = createGame({ seed: 23 });
  godMode(g);
  playChapter(g, 1);
  playChapter(g, 2);
  assert(!!g.state.flags.FLAG_CH2_CLEAR, 'FLAG_CH2_CLEAR 置位');
  assert(!!g.state.flags.FLAG_BECAME_DEMON_KING, '变身魔王 flag 置位');
  assert(!!g.state.flags.FLAG_LEFT_ARMY, '退出军队 flag 置位');
}

console.log('\n=== 第三章走通 ===');
{
  const g = createGame({ seed: 37 });
  godMode(g);
  playChapter(g, 1);
  playChapter(g, 2);
  playChapter(g, 3);
  assert(!!g.state.flags.FLAG_CH3_CLEAR, 'FLAG_CH3_CLEAR 置位');
  assert(!!g.state.flags.FLAG_PEACE, '和平结局 flag 置位');
  assert(g.state.inventory.some((s) => s.id === 'QI_PEACE_TREATY'), '获得和平条约');
  const openEnding = !CONTENT.chapters.find((c) => c.index === 3).next;
  assert(openEnding, '第三章无下一章（开放结局）');
}

console.log('\n=== 存档/读档/迁移 ===');
{
  const g = createGame({ seed: 41 });
  godMode(g);
  playChapter(g, 1);
  const stateBefore = JSON.stringify(g.state);
  // 模拟 localStorage（node 无 localStorage，直接用保存逻辑）
  const saved = JSON.parse(JSON.stringify({ version: 1, data: g.state }));
  const reloaded = createGame({ savedState: JSON.parse(JSON.stringify(saved.data)) });
  assert(JSON.stringify(reloaded.state) === stateBefore, '存档-读档深等');
  assert(reloaded.state.flags.FLAG_CH1_CLEAR, '读档后 flag 保留');
  // 老版本迁移：缺失字段由迁移补齐
  const old = createInitialState();
  delete old.player.cur;
  delete old.player.equipped;
  const migrated = migrate(JSON.parse(JSON.stringify(old)));
  assert(migrated.version === 1, '迁移后版本号为最新');
  assert(migrated.player.cur.hp != null, '缺失的 cur 字段被补齐');
  assert(migrated.player.equipped.weapon === null, '缺失的 equipped 字段被补齐');
}

console.log('\n=== 扩展机制验证（零硬编码）===');
{
  // 往内容里追加一条新道具+新支线任务，运行时应能正常处理
  const g = createGame({ seed: 53 });
  godMode(g);
  const fakeQuest = {
    id: 'QT_TEST_EXT', name: '扩展验证任务', chapter: 1, type: 'side', giver: null, turnIn: null,
    stages: [{ id: 's1', desc: '击败一只史莱姆。', objectives: [{ type: 'kill', target: 'SLIME', n: 1 }] }],
    rewards: { gold: 10, items: ['POTION_S'], xp: 10 },
    onComplete: { flags: ['FLAG_EXT_DONE'] },
  };
  g.CONTENT.quests.push(fakeQuest);
  quests.acceptQuest(g, fakeQuest);
  winBattle(g, ['SLIME']);
  assert(g.state.quests.QT_TEST_EXT?.status === 'completed', '追加的支线任务可正常完成');
  assert(!!g.state.flags.FLAG_EXT_DONE, '追加任务的 onComplete flag 生效');
}

console.log('\n====================================');
console.log(`通过 ${passed} 项，失败 ${failed} 项`);
if (failed > 0) process.exit(1);
else console.log('✓ 全部端到端验证通过');
