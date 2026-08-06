// 引用完整性/模式校验。启动时运行，失败则阻断并列出全部断口。
// 扩展内容后跑 scripts/check.js 或浏览器启动均会触发。

export const ENUMS = {
  itemType: ['weapon', 'armor', 'accessory', 'consumable', 'material', 'quest'],
  rarity: ['common', 'rare', 'epic', 'legendary'],
  skillType: ['attack', 'heal', 'buff', 'debuff', 'special'],
  skillTarget: ['single_enemy', 'all_enemies', 'self', 'single_ally', 'all_allies'],
  enemySlot: ['weapon', 'armor', 'accessory', 'accessory2'],
  locType: ['town', 'field', 'dungeon', 'boss_arena', 'story_stage'],
  eventType: ['chest', 'battle', 'dialogue', 'npc', 'story', 'sign', 'collect', 'choice'],
  questType: ['main', 'side'],
  questStatus: ['active', 'done', 'completed'],
  objectiveType: ['talk', 'kill', 'explore', 'collect'],
  npcRole: ['quest_giver', 'shop', 'story', 'generic', 'blacksmith', 'inn'],
};

export function validateContent(C) {
  const errors = [];
  const err = (where, msg) => errors.push(`[${where}] ${msg}`);

  // 建立 id 集合
  const sets = {
    item: new Set((C.items || []).map((x) => x.id)),
    skill: new Set((C.skills || []).map((x) => x.id)),
    enemy: new Set((C.enemies || []).map((x) => x.id)),
    npc: new Set((C.npcs || []).map((x) => x.id)),
    region: new Set((C.regions || []).map((x) => x.id)),
    location: new Set((C.locations || []).map((x) => x.id)),
    event: new Set((C.events || []).map((x) => x.id)),
    quest: new Set((C.quests || []).map((x) => x.id)),
    dialogue: new Set((C.dialogues || []).map((x) => x.id)),
    shop: new Set((C.shops || []).map((x) => x.id)),
    chapter: new Set((C.chapters || []).map((x) => x.id)),
  };
  const has = (k, id) => sets[k].has(id);
  const checkRef = (where, k, id) => {
    if (id != null && id !== '' && !has(k, id)) err(where, `引用了不存在的${k}: ${id}`);
  };

  // id 唯一性
  for (const [k, list] of Object.entries(sets)) {
    const seen = new Set();
    for (const id of list) {
      if (seen.has(id)) err(k, `id 重复: ${id}`);
      seen.add(id);
    }
  }

  // ---- items ----
  for (const it of C.items || []) {
    const w = it.id;
    if (!ENUMS.itemType.includes(it.type)) err(w, `非法 type: ${it.type}`);
    if (!ENUMS.rarity.includes(it.rarity)) err(w, `非法 rarity: ${it.rarity}`);
    if (it.price != null && it.price < 0) err(w, 'price 为负');
    if (it.slot && !ENUMS.enemySlot.includes(it.slot)) err(w, `非法 slot: ${it.slot}`);
    if (it.skillUnlocks) it.skillUnlocks.forEach((s) => checkRef(w, 'skill', s));
  }

  // ---- skills ----
  for (const sk of C.skills || []) {
    const w = sk.id;
    if (!ENUMS.skillType.includes(sk.type)) err(w, `非法 type: ${sk.type}`);
    if (!ENUMS.skillTarget.includes(sk.target)) err(w, `非法 target: ${sk.target}`);
    if (sk.mpCost != null && sk.mpCost < 0) err(w, 'mpCost 为负');
    if (sk.power == null) err(w, '缺少 power');
    if (sk.learn?.item) checkRef(w, 'item', sk.learn.item);
  }

  // ---- enemies ----
  for (const e of C.enemies || []) {
    const w = e.id;
    if (!e.stats || typeof e.stats.hp !== 'number') err(w, '缺少 stats.hp');
    for (const k of ['hp', 'atk', 'def', 'spd', 'mp']) {
      if (e.stats?.[k] != null && e.stats[k] < 0) err(w, `stats.${k} 为负`);
    }
    (e.drops || []).forEach((d, i) => { checkRef(w, 'item', d.item); if (d.rate != null && (d.rate < 0 || d.rate > 1)) err(w, `drops[${i}].rate 超出[0,1]`); });
    (e.skillPool || []).forEach((s) => checkRef(w, 'skill', s));
    (e.ai || []).forEach((a) => { if (typeof a === 'string' && a !== 'ATTACK') checkRef(w, 'skill', a); if (typeof a === 'object') checkRef(w, 'skill', a.skill); });
  }

  // ---- npcs ----
  for (const n of C.npcs || []) {
    const w = n.id;
    if (!ENUMS.npcRole.includes(n.role)) err(w, `非法 role: ${n.role}`);
    checkRef(w, 'location', n.location);
    if (n.shop) checkRef(w, 'shop', n.shop);
    if (n.dialogue) checkRef(w, 'dialogue', n.dialogue);
    (n.quests || []).forEach((q) => checkRef(w, 'quest', q));
  }

  // ---- regions ----
  for (const r of C.regions || []) {
    const w = r.id;
    (r.exits || []).forEach((ex) => checkRef(w, 'region', ex.dest));
    (r.locations || []).forEach((l) => checkRef(w, 'location', l));
  }

  // ---- locations ----
  for (const l of C.locations || []) {
    const w = l.id;
    checkRef(w, 'region', l.region);
    if (!ENUMS.locType.includes(l.type)) err(w, `非法 type: ${l.type}`);
    (l.enemies || []).forEach((pair) => { if (Array.isArray(pair)) checkRef(w, 'enemy', pair[0]); });
    (l.events || []).forEach((ev) => checkRef(w, 'event', ev));
    (l.npcs || []).forEach((n) => checkRef(w, 'npc', n));
    (l.chests || []).forEach((c) => { checkRef(w, 'item', c.item); if (c.items) c.items.forEach((i) => checkRef(w, 'item', i)); });
    if (l.boss?.enemy) checkRef(w, 'enemy', l.boss.enemy);
    (l.boss?.drops || []).forEach((d) => checkRef(w, 'item', d.item));
  }

  // ---- events ----
  for (const ev of C.events || []) {
    const w = ev.id;
    if (!ENUMS.eventType.includes(ev.type)) err(w, `非法 type: ${ev.type}`);
    if (ev.then) {
      if (Array.isArray(ev.then.items)) ev.then.items.forEach((it) => checkRef(w, 'item', it));
      if (ev.then.gold != null && ev.then.gold < 0) err(w, 'then.gold 为负');
      if (ev.then.dialogue) checkRef(w, 'dialogue', ev.then.dialogue);
      if (ev.then.quest) checkRef(w, 'quest', ev.then.quest);
      if (ev.then.enemy) checkRef(w, 'enemy', ev.then.enemy);
    }
  }

  // ---- quests ----
  for (const q of C.quests || []) {
    const w = q.id;
    if (!ENUMS.questType.includes(q.type)) err(w, `非法 type: ${q.type}`);
    if (q.giver) checkRef(w, 'npc', q.giver);
    if (q.turnIn) checkRef(w, 'npc', q.turnIn);
    (q.unlocks || []).forEach((u) => checkRef(w, 'quest', u));
    (q.rewards?.items || []).forEach((it) => checkRef(w, 'item', it));
    (q.stages || []).forEach((st, si) => {
      (st.objectives || []).forEach((ob, oi) => {
        if (!ENUMS.objectiveType.includes(ob.type)) err(w, `stages[${si}].objectives[${oi}].type 非法: ${ob.type}`);
        const key = ob.type === 'talk' ? 'npc' : ob.type === 'kill' ? 'enemy' : ob.type === 'explore' ? 'location' : 'item';
        checkRef(w, key, ob.target);
      });
    });
  }

  // ---- dialogues ----
  for (const dg of C.dialogues || []) {
    const w = dg.id;
    if (!dg.start || !dg.nodes[dg.start]) err(w, `start 节点不存在: ${dg.start}`);
    for (const [nid, node] of Object.entries(dg.nodes)) {
      const nodeKey = `${w}.${nid}`;
      (node.options || []).forEach((op, i) => {
        if (op.to && op.to !== 'end' && !dg.nodes[op.to]) err(nodeKey, `选项[${i}] 跳到不存在的节点: ${op.to}`);
        if (op.cond?.flag && !/^FLAG_/.test(op.cond.flag)) {} // flag 名称自由，不强制
      });
      (node.actions || []).forEach((a) => {
        if (typeof a === 'string' && a.startsWith('quest:')) {
          checkRef(w, 'quest', a.slice(6));
        } else if (typeof a === 'string' && a.startsWith('dialogue:')) {
          checkRef(w, 'dialogue', a.slice(9));
        }
      });
    }
  }

  // ---- shops ----
  for (const s of C.shops || []) {
    const w = s.id;
    (s.stock || []).forEach((it) => checkRef(w, 'item', it.item));
  }

  // ---- chapters ----
  for (const ch of C.chapters || []) {
    const w = ch.id;
    checkRef(w, 'region', ch.startingMap);
    (ch.objectives || []).forEach((q) => checkRef(w, 'quest', q));
    if (ch.endQuest) checkRef(w, 'quest', ch.endQuest);
    if (ch.next) checkRef(w, 'chapter', ch.next);
  }

  return { errors, warnings: [] };
}
