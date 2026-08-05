// 节点式探索：进入地点 → 生成可交互节点 → 分发到各系统。

import { getNpc, npcLocation } from './npc.js';
import { openChest as grantChest } from './loot.js';
import * as quests from './quests.js';
import * as player from './player.js';
import { setFlag } from './flags.js';
import * as loot from './loot.js';

export function getRegion(CONTENT, id) {
  return CONTENT.regions.find((r) => r.id === id);
}
export function getLocation(CONTENT, id) {
  return CONTENT.locations.find((l) => l.id === id);
}
export function getEvent(CONTENT, id) {
  return CONTENT.events.find((e) => e.id === id);
}

export function regionUnlocked(game, region) {
  return !region.unlockFlag || !!game.state.flags[region.unlockFlag];
}

// 进入地点
export function enterLocation(game, loc) {
  const { state } = game;
  state.location = loc.id;
  state.region = loc.region;
  if (!state.visitedLocations.includes(loc.id)) {
    state.visitedLocations.push(loc.id);
    quests.progressObjective(game, { type: 'explore', target: loc.id });
  }
  game.events.emit('location:enter', { loc });
}

// 离开地点回区域
export function exitLocation(game) {
  const { state } = game;
  state.location = null;
}

// 生成地点内的可交互节点
export function buildLocationNodes(game, loc) {
  const nodes = [];
  if (loc.enemies?.length) {
    nodes.push({ kind: 'battle', title: '探索寻敌', desc: '在区域内巡视，遭遇魔物', emoji: '⚔️' });
  }
  for (const nid of loc.npcs || []) {
    const npc = getNpc(game.CONTENT, nid);
    if (!npc) continue;
    if (npcLocation(game, npc) !== loc.id) continue;
    // 商店/旅店 NPC 在节点上标注功能，方便玩家辨认
    const tag = npc.shop ? '（商店）' : (npc.role === 'inn' ? '（旅店）' : '');
    nodes.push({ kind: 'npc', npc, title: npc.name + tag, desc: npc.tip || '', emoji: npc.emoji });
  }
  for (const chest of loc.chests || []) {
    if (game.state.openedChests.includes(chest.id)) continue;
    nodes.push({ kind: 'chest', chest, title: '宝箱', desc: chest.text || '发现了一个宝箱', emoji: '🎁' });
  }
  for (const evId of loc.events || []) {
    const ev = getEvent(game.CONTENT, evId);
    if (!ev) continue;
    if (ev.once && ev.flag && game.state.flags[ev.flag]) continue;
    nodes.push({ kind: 'event', event: ev, title: ev.title || '发现', desc: ev.text, emoji: ev.emoji || '❗' });
  }
  nodes.push({ kind: 'exit', title: '离开此地', desc: `返回 ${regionName(game, loc.region)}`, emoji: '🚪' });
  return nodes;
}

function regionName(game, regionId) {
  return getRegion(game.CONTENT, regionId)?.name || '区域';
}

// 打开宝箱
export function openLocationChest(game, loc, chest) {
  if (game.state.openedChests.includes(chest.id)) return { ok: false, msg: '宝箱已经打开过了' };
  game.state.openedChests.push(chest.id);
  const res = grantChest(game, chest);
  game.events.emit('explore:event', { kind: 'chest', chest });
  return { ok: true, ...res };
}

// 触发一次探索事件，返回 UI 可解释的描述符
export function triggerEvent(game, ev) {
  if (ev.once && ev.flag && game.state.flags[ev.flag]) return { consumed: true };
  switch (ev.type) {
    case 'story':
    case 'sign':
      if (ev.once && ev.flag) setFlag(game, ev.flag);
      return { kind: 'story', event: ev, text: ev.text, then: ev.then || {} };
    case 'collect': {
      const items = [];
      let gold = 0;
      if (ev.then?.items) ev.then.items.forEach((id) => items.push({ id, qty: 1 }));
      if (ev.then?.gold) gold = ev.then.gold;
      if (items.length) loot.grantLoot(game, items);
      if (gold > 0) player.addGold(game, gold);
      if (ev.once && ev.flag) setFlag(game, ev.flag);
      return { kind: 'collect', event: ev, text: ev.text, items, gold };
    }
    case 'dialogue':
      return { kind: 'dialogue', event: ev, dialogueId: ev.then?.dialogue };
    case 'battle':
      return {
        kind: 'battle',
        event: ev,
        enemyIds: ev.then?.enemies || [],
        context: { type: 'event', eventId: ev.id, onWin: { flags: ev.once && ev.flag ? [ev.flag] : [] } },
      };
    default:
      return { kind: 'story', event: ev, text: ev.text, then: {} };
  }
}

// 地点离开时：若有 onExit 剧情触发
export function leaveLocation(game, loc) {
  exitLocation(game);
  if (loc.onExit) {
    game.events.emit('location:onExit', { loc, onExit: loc.onExit });
  }
}
