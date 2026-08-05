// 游戏状态根对象。所有系统读写同一 state；UI 单向渲染。
// 存档带版本号，schema 变更时走 migrate 函数表。

export const SCHEMA_VERSION = 1;

export function createInitialState() {
  return {
    version: SCHEMA_VERSION,
    player: {
      name: '旅人',
      level: 1,
      xp: 0,                       // 当前等级内累计经验
      gold: 80,
      base: { maxHp: 60, maxMp: 20, atk: 8, def: 5, spd: 6, crit: 0.05 },
      cur: { hp: 60, mp: 20 },     // 当前 HP/MP
      // 开局配装：在渔村生活多年，带一把生锈短剑与少量补给
      equipped: { weapon: 'WPN_RUSTY', armor: null, accessory: null, accessory2: null },
      learnedSkills: [],           // 已学会技能 id
    },
    inventory: [
      { id: 'HERB', qty: 5 },
      { id: 'POTION_S', qty: 3 },
    ],                             // [{ id, qty }]
    quests: {},                    // { QID: { stage, status:'active'|'done'|'completed', counts:{} } }
    flags: {},                     // 剧情门禁 / 一次性事件
    chapter: 1,
    chapterStarted: false,
    region: null,                  // 当前区域 id
    location: null,                // 当前地点 id
    visitedLocations: [],          // 已到访地点 id
    openedChests: [],              // 已开的宝箱 id
    battlesWon: 0,
    playTime: 0,
  };
}

// 未来 schema 升级：{ fromVersion: (oldState) => newState }
const MIGRATIONS = {
  // 1 → 2 示例：
  // 2: (s) => ({ ...s, version: 2, player: { ...s.player, newField: 0 } }),
};

export function migrate(state) {
  let s = state;
  let v = s.version ?? 1;
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v + 1];
    if (!step) throw new Error(`缺少存档迁移函数: ${v} → ${v + 1}`);
    s = step(s);
    v = s.version;
  }
  // 补默认字段，保证旧档兼容新字段
  // 注意：迁移只补中性默认值，不注入内容（开局配装仅作用于 createInitialState 的新档）
  s.version = SCHEMA_VERSION;
  s.player = {
    base: { maxHp: 60, maxMp: 20, atk: 8, def: 5, spd: 6, crit: 0.05 },
    equipped: { weapon: null, armor: null, accessory: null, accessory2: null },
    ...s.player,
    base: { ...createInitialState().player.base, ...(s.player?.base || {}) },
    equipped: { weapon: null, armor: null, accessory: null, accessory2: null, ...(s.player?.equipped || {}) },
  };
  // cur 缺失或字段不完整 → 回满
  const hasCur = s.player.cur && typeof s.player.cur.hp === 'number';
  if (!hasCur) {
    s.player.cur = { hp: s.player.base.maxHp, mp: s.player.base.maxMp };
  }
  return s;
}
