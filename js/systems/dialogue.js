// 对话树执行器。节点含 text/options/actions；选项含 cond/effect/to。

import * as flags from './flags.js';
import * as inventory from './inventory.js';
import * as player from './player.js';
import * as quests from './quests.js';

export function getDialogue(CONTENT, id) {
  return CONTENT.dialogues.find((d) => d.id === id);
}

// ctx: { npc, speakerName }
export function startDialogue(game, dlg, ctx = {}) {
  // 进入对话即推进 talk 目标（先推进，nodeView 的 action 才能看到 done 状态并交还）
  if (ctx.npc) quests.progressObjective(game, { type: 'talk', target: ctx.npc });
  const session = { dlg, ctx, nodeId: dlg.start };
  const view = nodeView(game, session);
  return { session, view };
}

// 生成当前节点视图（执行节点 actions + 过滤选项）
export function nodeView(game, session) {
  const node = session.dlg.nodes[session.nodeId];
  if (!node) return { end: true };
  runActions(game, session, node.actions);
  const options = (node.options || []).filter((op) => flags.evaluate(game, op.cond));
  const lines = Array.isArray(node.text) ? node.text : [node.text];
  return {
    speaker: node.speaker || session.ctx.speakerName || '???',
    emoji: node.emoji || session.ctx.npcEmoji || '🗣️',
    text: lines,
    options,
    end: node.end === true,
  };
}

// 选择选项 → 执行 effect → 跳转下一节点
export function chooseOption(game, session, optionIndex) {
  const node = session.dlg.nodes[session.nodeId];
  const op = (node.options || [])[optionIndex];
  if (!op) return { session, view: { end: true } };
  if (op.effect) applyEffect(game, op.effect);
  if (op.to === 'end' || !op.to) return { session, view: { end: true } };
  session.nodeId = op.to;
  return { session, view: nodeView(game, session) };
}

// 节点进入时执行的动作（领任务/交任务/开商店等）
function runActions(game, session, actions) {
  for (const a of actions || []) {
    if (typeof a === 'string' && a.startsWith('quest:')) {
      const qid = a.slice(6);
      const q = quests.getQuest(game.CONTENT, qid);
      if (q) {
        const qs = game.state.quests[qid];
        if (!qs) {
          // 仅当前置满足时通过对话接取（避免跳链）
          if (quests.questUnlockable(game, q)) {
            quests.acceptQuest(game, q);
            // 同一次对话也算"与NPC交谈"，立即推进 talk 目标
            if (session.ctx.npc) quests.progressObjective(game, { type: 'talk', target: session.ctx.npc });
          }
        } else if (qs.status === 'done') {
          quests.turnIn(game, q);
        }
      }
    } else if (typeof a === 'string' && a.startsWith('flag:')) {
      flags.setFlag(game, a.slice(5));
    } else if (typeof a === 'string' && a === 'heal') {
      player.fullRestore(game);
      game.events.emit('toast', { text: '体力完全恢复！' });
    }
  }
  // 需要 UI 跳转的动作（如开商店）通过事件广播
  const uiAction = (actions || []).find((a) => typeof a === 'string' && a.startsWith('shop:'));
  if (uiAction) game.events.emit('dialogue:openShop', { shopId: uiAction.slice(5) });
}

function applyEffect(game, effect) {
  if (effect.setFlag) flags.setFlag(game, effect.setFlag);
  if (effect.giveItem) inventory.addItem(game, effect.giveItem, effect.qty || 1);
  if (effect.removeItem) inventory.removeItem(game, effect.removeItem, effect.qty || 1);
  if (effect.gold) player.addGold(game, effect.gold);
  if (effect.hp || effect.mp) player.heal(game, effect.hp || 0, effect.mp || 0);
  if (effect.quest) {
    const q = quests.getQuest(game.CONTENT, effect.quest);
    if (q) quests.acceptQuest(game, q);
  }
}
