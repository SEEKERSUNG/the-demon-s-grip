// 任务状态机：接取 → 阶段推进 → 完成（可选交还）→ 奖励/unlock/flags。
// counts 按 阶段:目标 隔离，避免跨阶段串计数。

import * as player from './player.js';
import * as inventory from './inventory.js';
import { setFlag } from './flags.js';

export function getQuest(CONTENT, id) {
  return CONTENT.quests.find((q) => q.id === id);
}

export function questState(state, id) {
  return state.quests[id];
}

// 接取任务
export function acceptQuest(game, quest) {
  const { state } = game;
  if (state.quests[quest.id]) return;
  const qs = { stage: 0, status: 'active', counts: {} };
  state.quests[quest.id] = qs;
  // 预填首阶段 collect 目标：玩家可能已在接取前通过宝箱/事件获得了任务物品
  const stage0 = quest.stages[0];
  if (stage0) {
    stage0.objectives.forEach((ob, oi) => {
      if (ob.type === 'collect') {
        const owned = inventory.countItem(state, ob.target);
        if (owned > 0) {
          qs.counts[`0:${oi}`] = Math.min(owned, ob.n || 1);
        }
      }
    });
    // 预填后立即检查阶段是否已满足（例如全 collect 目标都已提前获得）
    checkStage(game, quest, qs);
  }
  game.events.emit('quest:accepted', { quest });
}

// 接受任务前提任务
export function unlockChain(game, questIds) {
  for (const id of questIds || []) {
    const q = getQuest(game.CONTENT, id);
    if (q) acceptQuest(game, q);
  }
}

// 任务是否满足接取前提（对话接取时守卫，防跳链）
export function questUnlockable(game, quest) {
  const { state } = game;
  for (const qid of quest.prereqQuests || []) {
    if (state.quests[qid]?.status !== 'completed') return false;
  }
  for (const f of quest.prereqFlags || []) {
    if (!state.flags[f]) return false;
  }
  return true;
}

// 事件驱动的目标进度。obj: { type:'talk'|'kill'|'explore'|'collect', target, n }
export function progressObjective(game, obj) {
  const { state } = game;
  for (const [qid, qs] of Object.entries(state.quests)) {
    if (qs.status !== 'active') continue;
    const quest = getQuest(game.CONTENT, qid);
    if (!quest) continue;
    const stage = quest.stages[qs.stage];
    if (!stage) continue;
    let hit = false;
    stage.objectives.forEach((ob, oi) => {
      if (ob.type !== obj.type || ob.target !== obj.target) return;
      const key = `${qs.stage}:${oi}`;
      qs.counts[key] = (qs.counts[key] || 0) + (obj.n || 1);
      hit = true;
    });
    if (hit) checkStage(game, quest, qs);
  }
}

// 检查当前阶段目标是否达成，达成则推进
// collect 目标同步库存计数：即使物品在接取任务前已通过宝箱/事件等获得，也能正确识别
function checkStage(game, quest, qs) {
  const { state } = game;
  while (qs.status === 'active' && qs.stage < quest.stages.length) {
    const stage = quest.stages[qs.stage];
    let complete = true;
    stage.objectives.forEach((ob, oi) => {
      const key = `${qs.stage}:${oi}`;
      let cur = qs.counts[key] || 0;
      // collect 目标：库存计数同时步进，覆盖「接取前已获得物品」场景
      if (ob.type === 'collect') {
        const owned = inventory.countItem(state, ob.target);
        if (owned > cur) { qs.counts[key] = owned; cur = owned; }
      }
      if (cur < (ob.n || 1)) complete = false;
    });
    if (!complete) break;
    qs.stage += 1;
    game.events.emit('quest:progress', { quest, stage: 'advanced' });
    if (qs.stage >= quest.stages.length) {
      qs.status = quest.turnIn ? 'done' : 'completed';
      if (!quest.turnIn) {
        grantRewards(game, quest);
        afterComplete(game, quest);
      }
      game.events.emit('quest:progress', { quest, stage: 'done' });
      return;
    }
  }
}

// 交还任务（对话 action 调用）
export function turnIn(game, quest) {
  const qs = state(game).quests[quest.id];
  if (!qs || qs.status !== 'done') return { ok: false, msg: '任务尚未完成' };
  grantRewards(game, quest);
  afterComplete(game, quest);
  return { ok: true };
}

// 直接完成任务（战斗 onWin 等场景强制完成）
export function completeQuest(game, quest) {
  const qs = state(game).quests[quest.id];
  if (!qs) return;
  if (qs.status === 'completed') return;
  qs.status = 'completed';
  qs.stage = quest.stages.length;
  grantRewards(game, quest);
  afterComplete(game, quest);
}

function grantRewards(game, quest) {
  const r = quest.rewards || {};
  if (r.xp) player.addXp(game, r.xp);
  if (r.gold) player.addGold(game, r.gold);
  (r.items || []).forEach((id) => inventory.addItem(game, id, 1));
  (r.skills || []).forEach((sk) => player.learnSkill(game, sk));
}

function afterComplete(game, quest) {
  const qs = state(game).quests[quest.id];
  qs.status = 'completed';
  const oc = quest.onComplete || {};
  (oc.flags || []).forEach((f) => setFlag(game, f));
  unlockChain(game, quest.unlocks);
  game.events.emit('quest:completed', { quest });
}

// 玩家在当前 NPC 可交还/可接取的任务
export function questsAtNpc(game, npc) {
  const { state, CONTENT } = game;
  const out = { canAccept: [], canTurnIn: [] };
  for (const qid of npc.quests || []) {
    const quest = getQuest(CONTENT, qid);
    if (!quest) continue;
    const qs = state.quests[qid];
    if (!qs) out.canAccept.push(quest);
    else if (qs.status === 'done') out.canTurnIn.push(quest);
  }
  return out;
}

function state(game) { return game.state; }
