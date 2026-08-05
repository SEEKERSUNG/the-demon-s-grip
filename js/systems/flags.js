// flags 读写 + 条件谓词 evaluate。剧情门禁/一次性事件的统一机制。

export function getFlag(state, flag) {
  return !!state.flags[flag];
}

export function setFlag(game, flag) {
  game.state.flags[flag] = true;
  game.events.emit('flag:set', { flag });
}

export function unsetFlag(game, flag) {
  delete game.state.flags[flag];
  game.events.emit('flag:set', { flag });
}

// cond: { flag, flagNot, hasItem, level:{gte}, quest:{id, status} }
// 全部条件满足才为 true
export function evaluate(game, cond) {
  if (!cond) return true;
  const { state, CONTENT } = game;
  if (cond.flag && !getFlag(state, cond.flag)) return false;
  if (cond.flagNot && getFlag(state, cond.flagNot)) return false;
  if (cond.hasItem) {
    const slot = state.inventory.find((s) => s.id === cond.hasItem);
    if (!slot || slot.qty < (cond.qty || 1)) return false;
  }
  if (cond.level?.gte && state.player.level < cond.level.gte) return false;
  if (cond.quest) {
    const q = state.quests[cond.quest.id];
    if (cond.quest.status) {
      if (!q || q.status !== cond.quest.status) return false;
    } else if (!q) {
      return false;
    }
  }
  if (cond.chapter != null && state.chapter !== cond.chapter) return false;
  return true;
}
