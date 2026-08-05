// NPC 定义查找 / 位置解析（支持按 flag 移动或隐藏）。

export function getNpc(CONTENT, id) {
  return CONTENT.npcs.find((n) => n.id === id);
}

// 解析 NPC 当前位置。move.flagTrue 置位且无 flagTrueLoc → 隐藏（返回 null）。
export function npcLocation(game, npc) {
  if (npc.move?.flagTrue) {
    if (game.state.flags[npc.move.flagTrue]) return npc.move.flagTrueLoc ?? null;
  }
  if (npc.move?.flagFalse && !game.state.flags[npc.move.flagFalse]) {
    return npc.move.flagFalseLoc ?? null;
  }
  return npc.location;
}
