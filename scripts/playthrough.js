// 端到端回放验证：node scripts/playthrough.js
// 无 DOM 驱动三章主线走通，断言章节门禁、任务链、结局 flag。

import { CONTENT } from '../js/content/index.js';
import { createGame } from '../js/core/game.js';
import { createInitialState, migrate } from '../js/core/state.js';
import * as player from '../js/systems/player.js';
import * as quests from '../js/systems/quests.js';
import * as explore from '../js/systems/explore.js';
import * as inventory from '../js/systems/inventory.js';
import * as autoBattle from '../js/systems/autoBattle.js';

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

console.log('\n=== 对话驱动·第一章主线（真实玩家路径）===');
{
  // 用对话树驱动接取/交还（而非直接 turnIn），确保每个任务的 quest: action 都在对话里
  const g = createGame({ seed: 61 });
  g.story.startChapter(g, CONTENT.chapters.find((c) => c.index === 1));
  const talk = (npcId) => g.dialogue.startDialogue(g, g.CONTENT.dialogues.find((d) => d.id === 'DLG_' + npcId.slice(4)), { npc: npcId });
  const kill = (target, n) => { for (let i = 0; i < n; i++) quests.progressObjective(g, { type: 'kill', target, n: 1 }); };
  const collect = (target, n) => quests.progressObjective(g, { type: 'collect', target, n });
  const st = (id) => g.state.quests[id]?.status ?? '未接取';

  talk('NPC_ELDER'); kill('SLIME', 3); talk('NPC_ELDER');
  assert(st('Q1_CH1_VILLAGE_DESTROYED') === 'completed', 'Q1 通过村长对话交还');
  kill('BAT', 5); talk('NPC_ELDER');
  assert(st('Q2_CH1_CLEAR_CAVE') === 'completed', 'Q2「洞穴中的阴影」一次回村对话交还');
  kill('MURLOC', 3); collect('MAT_BAT_WING', 3); talk('NPC_ELDER');
  assert(st('Q3_CH1_HUNT') === 'completed', 'Q3「猎手的证明」一次回村对话交还');
  talk('NPC_CAPTAIN');
  assert(st('Q4_CH1_BOSS') === 'active', 'Q4「决战·黑鳞崖」可从铁臂处接取');
  const bossCove = CONTENT.locations.find((l) => l.id === 'LOC_BOSS_COVE');
  assert(!!g.state.quests[bossCove.reqQuest], '黑鳞崖 reqQuest 满足（已接取决战任务）');
}

console.log('\n=== 战斗防御/增益回归（buffTurns 修复）===');
{
  const g = createGame({ seed: 71 });
  godMode(g); // Lv25 → learnLevelSkills 已含狂暴（Lv15）
  // 快速玩家防御：当回合敌攻已消费，回合末过期
  let c = g.combatSys.startCombat(g, ['SLIME'], {});
  const r1 = g.combatSys.doPlayerAction(g, c, { type: 'defend' });
  assert(r1.ok === true, '防御指令正常执行（不抛 TypeError）');
  assert(c.playerUnit.buffs.defMult === 1, '快速玩家防御当回合生效后过期');
  // 玩家增益技能：狂暴攻击倍率生效
  c = g.combatSys.startCombat(g, ['SLIME'], {});
  const r2 = g.combatSys.doPlayerAction(g, c, { type: 'skill', skillId: 'BERSERK' });
  assert(r2.ok === true, '增益技能（狂暴）正常执行（不抛 TypeError）');
  assert(c.playerUnit.buffs.atkMult === 1.4, '狂暴攻击增益 1.4 生效');
  // 慢速玩家防御：持续到下回合敌攻
  g.state.player.base.spd = 1;
  c = g.combatSys.startCombat(g, ['BAT'], {});
  const r3 = g.combatSys.doPlayerAction(g, c, { type: 'defend' });
  assert(r3.ok === true && c.playerUnit.buffs.defMult === 2 && c.playerUnit.buffTurns.defMult === 1,
    '慢速玩家防御 defMult=2 且持续到下回合敌攻');
  // 慢速玩家无效指令（MP 不足）：不触发敌方回合、不白挨一击、回合不推进
  g.state.player.base.spd = 1;
  g.state.player.cur.mp = 0;
  c = g.combatSys.startCombat(g, ['BAT'], {});
  const hpBefore = c.playerUnit.curHp;
  const turnBefore = c.turn;
  const r4 = g.combatSys.doPlayerAction(g, c, { type: 'skill', skillId: 'FIREBALL' });
  assert(r4.ok === false && r4.reason === 'MP 不足', 'MP 不足的技能指令被拒绝');
  assert(c.playerUnit.curHp === hpBefore && c.turn === turnBefore, '无效指令不触发敌方回合（不白挨一击、回合不推进）');
}

console.log('\n=== explore 目标接取前已访问回归（软锁修复）===');
{
  const g = createGame({ seed: 83 });
  godMode(g);
  // 玩家先进入地点，之后才接取含该 explore 目标的任务 → 不应卡死
  const village = CONTENT.locations.find((l) => l.id === 'LOC_VILLAGE');
  explore.enterLocation(g, village);
  const fakeQuest = {
    id: 'QT_TEST_EXPLORE', name: '探索回归验证', chapter: 1, type: 'side',
    stages: [{ id: 's1', desc: '访问渔村。', objectives: [{ type: 'explore', target: 'LOC_VILLAGE', n: 1 }] }],
    rewards: {},
  };
  g.CONTENT.quests.push(fakeQuest);
  quests.acceptQuest(g, fakeQuest);
  assert(g.state.quests.QT_TEST_EXPLORE?.status === 'completed', '接取前已访问的地点 → explore 目标自动达成（不再软锁）');
}

console.log('\n=== 交还自动接取任务的 talk 目标回归（同次对话推进）===');
{
  // 交还「军饷疑云」给阿岩 → 「背叛之夜」自动接取，其首阶段 talk(阿岩) 应同次对话即推进
  const g = createGame({ seed: 97 });
  godMode(g);
  const rations = CONTENT.quests.find((q) => q.id === 'Q2_CH2_RATIONS');
  g.quests.acceptQuest(g, rations);
  g.quests.progressObjective(g, { type: 'talk', target: 'NPC_COMRADE', n: 1 }); // s1 talk
  g.quests.progressObjective(g, { type: 'explore', target: 'LOC_RUIN_CITY', n: 1 });
  g.inventory.addItem(g, 'QI_RATIONS', 1);
  g.quests.progressObjective(g, { type: 'talk', target: 'NPC_COMRADE', n: 1 }); // s2 talk → done
  const dlg = g.CONTENT.dialogues.find((d) => d.id === 'DLG_COMRADE');
  g.dialogue.startDialogue(g, dlg, { npc: 'NPC_COMRADE', speakerName: '阿岩' });
  assert(g.state.quests.Q2_CH2_BETRAYAL?.status === 'active', '交还军饷疑云 → 背叛之夜自动接取');
  assert(g.state.quests.Q2_CH2_BETRAYAL?.counts['0:0'] === 1, '背叛之夜首阶段 talk(阿岩) 同次对话即推进（无需二次对话）');

  // 交还「远方烽火」给国王 → 「幕后黑手」自动接取，其首阶段 talk(国王) 同次对话即推进
  const g2 = createGame({ seed: 98 });
  godMode(g2);
  const distress = CONTENT.quests.find((q) => q.id === 'Q3_CH3_DISTRESS');
  g2.quests.acceptQuest(g2, distress);
  g2.quests.progressObjective(g2, { type: 'talk', target: 'NPC_EMISSARY', n: 1 });
  g2.explore.enterLocation(g2, CONTENT.locations.find((l) => l.id === 'LOC_HUMAN_CAPITAL'));
  g2.quests.progressObjective(g2, { type: 'talk', target: 'NPC_KING', n: 1 }); // s2 talk → done
  const dlgKing = g2.CONTENT.dialogues.find((d) => d.id === 'DLG_KING');
  g2.dialogue.startDialogue(g2, dlgKing, { npc: 'NPC_KING', speakerName: '国王' });
  assert(g2.state.quests.Q3_CH3_FIND_CAUSE?.status === 'active', '交还远方烽火 → 幕后黑手自动接取');
  assert(g2.state.quests.Q3_CH3_FIND_CAUSE?.counts['0:0'] === 1, '幕后黑手首阶段 talk(国王) 同次对话即推进');
}

console.log('\n=== 自动战斗决策回归 ===');
{
  const g = createGame({ seed: 61 });
  godMode(g); // Lv25 → 已学会治愈术/强效治愈及各攻击技能
  const cfg = { items: ['HERB'], healAt: 0.5, dangerAt: 0.25 };
  g.inventory.addItem(g, 'HERB', 3);

  let c = g.combatSys.startCombat(g, ['SLIME'], {});

  // 1) 满血 → 进攻（普攻或最强技能），且指令被战斗引擎接受
  c.playerUnit.curHp = c.playerUnit.stats.maxHp;
  let a = autoBattle.chooseAutoAction(g, c, cfg);
  assert(a.type === 'attack' || a.type === 'skill', `满血 → 进攻指令（实际 ${a.type}）`);
  const r1 = g.combatSys.doPlayerAction(g, c, a);
  assert(r1.ok === true, '决策产出的进攻指令被战斗引擎接受');

  // 2) 血量低于治疗线、MP 充足 → 治疗技能（省药）
  c = g.combatSys.startCombat(g, ['SLIME'], {});
  c.playerUnit.curHp = Math.floor(c.playerUnit.stats.maxHp * 0.4);
  c.playerUnit.curMp = 50;
  a = autoBattle.chooseAutoAction(g, c, cfg);
  assert(a.type === 'skill' && ['HEAL', 'HEAL_PLUS'].includes(a.skillId),
    `治疗线以下且有 MP → 治疗技能（实际 ${a.type}/${a.skillId || '-'}）`);

  // 3) 血量低于治疗线、MP 不足 → 用药（白名单草药）
  c.playerUnit.curMp = 0;
  a = autoBattle.chooseAutoAction(g, c, cfg);
  assert(a.type === 'item' && a.itemId === 'HERB', `无 MP 有药 → 使用道具（实际 ${a.type}/${a.itemId || '-'}）`);
  const r3 = g.combatSys.doPlayerAction(g, c, a);
  assert(r3.ok === true && c.playerUnit.curHp > 0, '决策产出的用药指令被战斗引擎接受');

  // 4) 血量低于危险线、无任何恢复手段 → 逃跑撤退（自动战斗退出）
  c = g.combatSys.startCombat(g, ['SLIME'], {});
  c.playerUnit.curHp = Math.floor(c.playerUnit.stats.maxHp * 0.2);
  c.playerUnit.curMp = 0;
  a = autoBattle.chooseAutoAction(g, c, { ...cfg, items: [] });
  assert(a.type === 'flee', `危险线以下且无恢复手段 → 逃跑（实际 ${a.type}）`);

  // 5) 血量低于危险线但有白名单药 → 先嗑药保命
  a = autoBattle.chooseAutoAction(g, c, cfg);
  assert(a.type === 'item' && a.itemId === 'HERB', `危险线以下有药 → 优先用药（实际 ${a.type}/${a.itemId || '-'}）`);

  // 6) 血量安全 → 继续进攻
  c.playerUnit.curHp = c.playerUnit.stats.maxHp;
  c.playerUnit.curMp = 50;
  a = autoBattle.chooseAutoAction(g, c, cfg);
  assert(a.type !== 'flee' && a.type !== 'item', `血量安全 → 不逃跑不用药（实际 ${a.type}）`);

  // 7) 场间停止判断：危险线以下且无恢复手段 → 返回停止原因
  g.state.player.cur.hp = 1;
  g.state.player.cur.mp = 0;
  const reason = autoBattle.autoDangerReason(g, { items: [] });
  assert(typeof reason === 'string' && reason.includes('自动战斗停止'), '场间：血量危险且无恢复手段 → 停止原因');
  // 有白名单药 → 继续
  assert(autoBattle.autoDangerReason(g, cfg) === null, '场间：还有可用的恢复道具 → 继续自动战斗');
  // 血量恢复 → 继续
  g.state.player.cur.hp = player.getStats(g.state, g.CONTENT.items).maxHp;
  assert(autoBattle.autoDangerReason(g, { items: [] }) === null, '场间：血量安全 → 继续自动战斗');

  // 8) 面板提示文案
  c = g.combatSys.startCombat(g, ['SLIME'], {});
  const label = autoBattle.actionLabel(g, c, cfg);
  assert(typeof label === 'string' && label.length > 0, `actionLabel 返回提示（${label}）`);
}

console.log('\n=== 任务导航路径回归 ===');
{
  // kill → 含该敌人的地点（BOSS 单地点）
  const navBoss = quests.objectiveNav(CONTENT, { type: 'kill', target: 'BOSS_DEMON_KING' });
  assert(!!navBoss && navBoss.text.includes('王城与军营') && navBoss.text.includes('深渊王座')
    && navBoss.locIds.length === 1 && navBoss.locIds[0] === 'LOC_DEMON_PALACE',
  `kill BOSS_DEMON_KING → 世界地图→王城与军营→深渊王座（${navBoss?.text}）`);

  // talk → NPC 所在地点（导师在魔渊荒原）
  const navTalk = quests.objectiveNav(CONTENT, { type: 'talk', target: 'NPC_MENTOR' });
  assert(!!navTalk && navTalk.text.startsWith('世界地图') && navTalk.text.includes('魔渊荒原'),
    `talk NPC_MENTOR → 魔渊荒原（${navTalk?.text}）`);

  // explore → 地点本身
  const navExp = quests.objectiveNav(CONTENT, { type: 'explore', target: 'LOC_CAVE' });
  assert(!!navExp && navExp.locIds[0] === 'LOC_CAVE' && navExp.text.includes('海蚀洞穴'),
    `explore LOC_CAVE → 海蚀洞穴（${navExp?.text}）`);

  // 多地点敌人 → 全部列出（邪修教徒：旧王都 + 荒原）
  const navMulti = quests.objectiveNav(CONTENT, { type: 'kill', target: 'CULTIST' });
  assert(!!navMulti && navMulti.locIds.length === 2 && navMulti.text.includes('｜'),
    `kill CULTIST → 两处地点并列（${navMulti?.text}）`);

  // collect 无固定地点 → null（UI 侧用物品百科获取途径展示）
  assert(quests.objectiveNav(CONTENT, { type: 'collect', target: 'MAT_BAT_WING' }) === null,
    'collect 目标不产出地图路径（由获取途径展示）');

  // 交还路径 → 回找委托人
  const qFinal = quests.getQuest(CONTENT, 'Q2_CH2_FINAL');
  const navTurn = quests.questTurnInNav(CONTENT, qFinal);
  assert(!!navTurn && navTurn.text.includes('神秘老者') && navTurn.text.includes('魔渊荒原'),
    `Q2_CH2_FINAL 交还 → 神秘老者·魔渊荒原（${navTurn?.text}）`);

  // 未知目标 → null 不崩
  assert(quests.objectiveNav(CONTENT, { type: 'talk', target: 'NPC_NOT_EXIST' }) === null
    && quests.objectiveNav(CONTENT, { type: 'kill', target: 'ENEMY_NOT_EXIST' }) === null,
    '未知目标 id → null 不崩溃');
}

console.log('\n====================================');
console.log(`通过 ${passed} 项，失败 ${failed} 项`);
if (failed > 0) process.exit(1);
else console.log('✓ 全部端到端验证通过');
