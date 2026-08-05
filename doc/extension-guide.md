# 扩展指南

引擎零硬编码：新增任何内容都只需在 `js/content/*.js` 数组末尾**追加数据记录**，跑校验即可。步骤总览：

1. 在对应 `js/content/XX.js` 数组末尾追加记录
2. 本批内新引用的 id 只在本批保证存在
3. 运行 `node scripts/check.js` 校验引用完整
4. 浏览器刷新验证（必要时跑 `playthrough` / `balance`）

> 内容量大的新增（如整章地图），建议按 `content/` 里的现有划分，追加后跑 `check` 看断口清单逐个修复。

---

## 1. 加道具 → `items.js`

```js
{ id: 'POTION_L', name: '生命药水·大', emoji: '🧪', desc: '恢复999点HP。',
  type: 'consumable', rarity: 'rare', price: 120, usable: true, effect: { hp: 999 } },
```
装备类加 `slot` + 数值字段 + `levelReq`；可设置 `skillUnlocks` 让装备解锁技能。

## 2. 加技能 → `skills.js`

```js
{ id: 'FLAME_SHOT', name: '炎弹', emoji: '🔥', desc: '...',
  type: 'attack', target: 'single_enemy', mpCost: 8, power: 2.0, hit: 0.92,
  learn: { level: 5 } },        // 或 { item: 'TECH_SCROLL' } 用道具学
```
敌方技能用 `E_` 前缀，无 `learn`。

## 3. 加敌人 → `enemies.js`

```js
{ id: 'WOLF', name: '荒原野狼', emoji: '🐺', level: 3,
  stats: { hp: 70, atk: 15, def: 4, spd: 9, mp: 5 },
  xp: 25, gold: 10,
  drops: [{ item: 'MAT_MONSTER_FANG', rate: 0.3 }],
  skillPool: ['E_BITE'], ai: ['ATTACK'], lore: '...' },
```
然后把它挂到某个地点（见第 6 步），或用它做任务目标（见第 8 步）。

## 4. 加 NPC / 对话 / 商店

三个文件配套追加：

```js
// npcs.js
{ id: 'NPC_APOTHECARY', name: '药商', emoji: '🧑‍⚕️', location: 'LOC_VILLAGE',
  role: 'shop', shop: 'SHOP_APOTHECARY', dialogue: 'DLG_APOTHECARY', tip: '...' },

// dialogue.js —— actions 里带 'shop:SHOP_APOTHECARY' 的节点会打开商店
{ id: 'DLG_APOTHECARY', start: 'n1', nodes: {
  n1: { text: '要看看药材吗？', actions: ['quest:Q_SIDE'], options: [
    { text: '看看货', to: 'n_shop' }, { text: '（告辞）', to: 'end' } ] },
  n_shop: { text: '请便。', actions: ['shop:SHOP_APOTHECARY'], options: [{ text: '（离开）', to: 'end' }] },
} },

// shops.js
{ id: 'SHOP_APOTHECARY', name: '药铺', sellRate: 0.5,
  stock: [{ item: 'HERB', cost: 8 }, { item: 'POTION_S', cost: 20 }] },
```

## 5. 加区域 → `regions.js`

```js
{ id: 'REGION_SWAMP', name: '腐化沼泽', emoji: '🟩', desc: '...',
  chapter: 1, unlockFlag: 'FLAG_Q2_DONE', locations: ['LOC_SWAMP'] },
```
`unlockFlag` 缺省 = 默认解锁。

## 6. 加地点 → `locations.js`

```js
{ id: 'LOC_SWAMP', name: '腐化沼泽', emoji: '🟩', desc: '...',
  type: 'field', region: 'REGION_SWAMP', reqLevel: 3,
  npcs: ['NPC_APOTHECARY'],
  enemies: [['WOLF', 3], ['SLIME', 2]],
  chests: [{ id: 'CHEST_SWAMP_1', item: 'POTION_M', gold: 20, text: '...' }],
  events: ['EV_SWAMP_MISTS'] },
```
添加到 `regions.js` 对应区域的 `locations` 列表。`reqLevel` / `reqFlag` / `reqQuest` 控制解锁。

## 7. 加事件 → `events.js`

```js
{ id: 'EV_SWAMP_MISTS', type: 'collect', emoji: '🌫️', title: '迷瘴', text: '...',
  once: true, flag: 'FLAG_EV_SWAMP', then: { items: ['HERB'], gold: 10 } },
```
`story`/`sign` 显示文本，`collect` 发奖励，`battle` 触发战斗，`dialogue` 触发对话。

## 8. 加任务 → `quests.js`

**主线**（多阶段，链式解锁）：

```js
{ id: 'Q_CH1_SWAMP', name: '沼泽的污染', chapter: 1, type: 'main',
  giver: 'NPC_ELDER', turnIn: 'NPC_ELDER', desc: '...',
  stages: [
    { id: 's1', desc: '...', objectives: [
        { type: 'talk', target: 'NPC_ELDER', n: 1 },
        { type: 'kill', target: 'WOLF', n: 3 } ] },
    { id: 's2', desc: '返回复命。', objectives: [{ type: 'talk', target: 'NPC_ELDER', n: 1 }] },
  ],
  rewards: { gold: 150, xp: 120, items: ['POTION_M'] },
  unlocks: ['Q_CH1_NEXT'],
  prereqQuests: ['Q2_CH1_CLEAR_CAVE'],   // 防跳链：须先完成
  onComplete: { flags: ['FLAG_Q_SWAMP'] } },
```

**支线**：`type: 'side'`，可单阶段、无 `turnIn`（阶段全通自动完成）。

- 接取/交还：对话节点 `actions: ['quest:QID']`。
- `kill` 目标被任务卡住时，检查敌人是否出现在某地点的 `enemies` 池，或 BOSS 战事件。
- `collect` 目标物品需能通过掉落/宝箱/事件获得。

## 9. 加章节 → `chapters.js`

```js
{ id: 'ch4', index: 4, title: '新的篇章', subtitle: '...',
  introFlag: 'FLAG_CH4_START', intro: '...',
  startingMap: 'REGION_...',
  objectives: ['Q_CH4_1', '...'],
  endQuest: 'Q_CH4_FINAL',
  gate: { flag: 'FLAG_CH4_CLEAR' },
  next: null,
  interlude: '...' },
```

再把上一章的 `next` 指向它：

```js
// ch3 改为
next: 'ch4',
```

> 第四章起：新增该章的 regions/locations/npcs/quests/dialogue 数据 + 一条 chapter，引擎零改动。

## 10. 调整数值平衡

改敌人 `stats`、道具 `price`、任务 `rewards`、商店 `cost` 后运行：

```bash
npm run balance    # 正常玩家+商店补给通关第一章
npm run playthrough # 三章主线端到端
```

## 校验清单（每次扩展后）

```bash
npm run check       # 引用完整性 / 枚举 / 数值（必须通过）
npm run playthrough # 主线不回归
npm run uiSmoke     # UI 不回归
npm run balance     # 数值可通关（涉及战斗/商店/装备时）
```
