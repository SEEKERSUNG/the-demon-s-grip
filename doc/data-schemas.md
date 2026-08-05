# 内容数据 Schema

所有游戏内容都是 `js/content/*.js` 数组里的记录，由 `index.js` 聚合为 `CONTENT`。

通用约定：
- `id` 唯一（英文大写蛇形，如 `POTION_S`、`SLIME`、`FLAG_*`），显示文本用中文 `name` / `desc`。
- 外键一律存 id 字符串（跨表引用由 `validate.js` 校验）。
- 枚举值（type/target/rarity/role…）必须在 `validate.js` 的 `ENUMS` 中。

---

## 道具 `items.js`

```js
{
  id: 'POTION_S',            // 唯一 id
  name: '生命药水·小',        // 显示名
  emoji: '🧪',               // 图标
  desc: '装在小瓶里的红色药水，恢复120点HP。',
  type: 'consumable',        // weapon | armor | accessory | consumable | material | quest
  rarity: 'common',          // common | rare | epic | legendary
  price: 20,                 // 基准价（卖出 = price × sellRate）
  // --- 消耗品 ---
  usable: true,
  effect: { hp: 120, mp?: 0 },   // 恢复量；learnSkill 可改为学会技能
  // --- 装备 ---
  slot: 'weapon',            // weapon | armor | accessory | accessory2
  atk/def/spd/maxHp/maxMp/crit,  // 装备加成
  levelReq: 2,               // 等级需求
  skillUnlocks: ['...'],     // 装备解锁的技能 id
  // --- 其它 ---
  quest: true,               // 任务道具（不可出售）
  sellPrice: 60,             // 可选：覆盖 price×sellRate 的卖出价
}
```

## 技能 `skills.js`

```js
{
  id: 'STRIKE',
  name: '猛击', emoji: '💢', desc: '...',
  type: 'attack',            // attack | heal | buff | debuff | special
  target: 'single_enemy',    // single_enemy | all_enemies | self | single_ally | all_allies
  mpCost: 6,
  power: 1.6,                // 伤害/治疗倍率
  hit: 0.95,                 // 命中率
  buff: { amt: 1.4, turns: 3 }, // type=buff/debuff 时生效
  learn: { level: 3 },       // 升级自动学；或 { item: 'ID' } 用道具学
}
```

敌方技能以 `E_` 开头（无 learn，mpCost 0），不显示给玩家。

## 敌人 `enemies.js`

```js
{
  id: 'SLIME', name: '史莱姆', emoji: '🟢',
  level: 1,
  stats: { hp: 40, atk: 8, def: 3, spd: 4, mp: 5 },
  xp: 12, gold: 5,
  drops: [{ item: 'MAT_SLIME_CORE', rate: 0.25, min?: 1, max?: 2 }],
  skillPool: ['E_TACKLE'],   // 兜底技能池
  ai: ['ATTACK'],            // 字符串=固定用该技能（'ATTACK'=普攻）；对象=条件触发
  boss: true,                // BOSS 标记
  lore: '...',
}
// ai 条件对象示例：{ skill: 'E_ROAR', cond: { hpPct: { lt: 0.5 } } }
```

## NPC `npcs.js`

```js
{
  id: 'NPC_SMITH', name: '铁匠阿伟', emoji: '🔨',
  location: 'LOC_VILLAGE',   // 常驻地点
  role: 'blacksmith',        // quest_giver | shop | story | generic | blacksmith | inn
  shop: 'SHOP_SMITH',        // 有商店时：对话 action 'shop:ID' 打开
  dialogue: 'DLG_SMITH',     // 对话树 id
  quests: ['Q1S_SMITH'],     // 该 NPC 提供的任务
  tip: '...',                // 节点副标题
  move: { flagTrue: 'FLAG_X', flagTrueLoc?: 'LOC_Y' }, // 按 flag 移动/隐藏（flagTrueLoc 缺省=隐藏）
}
```

探索节点上带 `shop` 的 NPC 会标注「（商店）」，`role:'inn'` 标注「（旅店）」。

## 区域 `regions.js`

```js
{
  id: 'REGION_FISHING', name: '海风之域', emoji: '🌊', desc: '...',
  chapter: 1,
  unlockFlag: 'FLAG_CH1_START',  // 缺省=默认解锁
  locations: ['LOC_VILLAGE', '...'],
  exits: [{ dest: 'REGION_CAPITAL', unlockFlag: 'FLAG_HAS_LETTER' }],
}
```

## 地点 `locations.js`

```js
{
  id: 'LOC_CAVE', name: '海蚀洞穴', emoji: '🕳️', desc: '...',
  type: 'dungeon',           // town | field | dungeon | boss_arena | story_stage
  region: 'REGION_FISHING',
  reqLevel: 2,               // 等级需求
  reqFlag: 'FLAG_X',         // flag 需求
  reqQuest: 'Q_',            // 需接取的任务
  npcs: ['NPC_...'],
  enemies: [['SLIME', 3], ['SEA_CRAB', 2]],   // [敌人id, 权重] 列表，遭遇随机抽取
  chests: [{ id: 'CHEST_X', item: 'ITEM_ID' | items: ['..'], gold: 30, text: '...' }],
  events: ['EV_...'],
}
```

## 事件 `events.js`

```js
{
  id: 'EV_SHIPWRECK',
  type: 'collect',           // story | sign | collect | battle | dialogue | choice | chest | npc
  emoji: '🚢', title: '...', text: '...',
  once: true,                // 一次性事件
  flag: 'FLAG_EV_X',         // 触发后置 flag，不再出现
  then: {
    items: ['POTION_M'],     // collect / battle
    gold: 40,                // collect
    dialogue: 'DLG_X',       // dialogue
    enemies: ['BAT','BAT'],  // battle
  },
}
```

## 任务 `quests.js`

```js
{
  id: 'Q1_CH1_VILLAGE_DESTROYED', name: '渔村之殇', chapter: 1,
  type: 'main',              // main | side
  giver: 'NPC_ELDER',        // 委托人
  turnIn: 'NPC_ELDER',       // 交还人；缺省=阶段全通自动完成
  desc: '...',
  stages: [                  // 阶段数组，依次推进
    { id: 's1', desc: '...', objectives: [
        { type: 'talk',    target: 'NPC_ELDER', n: 1 },   // 与NPC交谈
        { type: 'kill',    target: 'SLIME',     n: 3 },   // 击败敌人
        { type: 'explore', target: 'LOC_CAVE',  n: 1 },   // 进入地点
        { type: 'collect', target: 'MAT_X',     n: 3 },   // 收集道具
    ] },
    { id: 's2', desc: '...', objectives: [...] },
  ],
  rewards: { gold: 120, xp: 80, items: ['POTION_S'], skills?: ['STRIKE'] },
  unlocks: ['Q2_CH1_CLEAR_CAVE'],   // 完成即自动接取的后续任务
  prereqQuests: ['Q1_CH1_...'],     // 对话接取前置（防跳链）
  prereqFlags: ['FLAG_X'],
  onComplete: { flags: ['FLAG_Q1_DONE'] },
}
```

任务状态机见 [systems.md](systems.md#任务-quests)。

## 对话 `dialogue.js`

```js
{
  id: 'DLG_SMITH', start: 'n1',
  nodes: {
    n1: {
      text: '（叮叮当当）啊，来客了。',   // string 或 string[]
      speaker?: '...', emoji?: '...',    // 覆盖默认说话人
      actions: ['quest:Q1S_SMITH'],      // quest:QID 接取/交还（交还须把该 NPC 的所有可交还任务列全）；heal 恢复；shop:SHOP_ID 开商店；flag:FLAG_X
      options: [
        { text: '看看铺子里的货', to: 'n_shop' },
        { text: '（选这条才出现）', to: 'n2', cond: { flag: 'FLAG_X' } },
        { text: '…', to: 'end', effect: { setFlag: 'FLAG_Y', giveItem: 'ID', gold: 10, hp: 20 } },
      ],
    },
    n_shop: { text: '...', actions: ['shop:SHOP_SMITH'], options: [...] },
    ...
  },
}
```

- `cond` 用 `flags.evaluate`：`{ flag, flagNot, hasItem, level:{gte}, quest:{id,status}, chapter }`。
- `to: 'end'` 结束对话。节点引用必须存在（validate 检查）。
- 含 `shop:` action 的节点会接管屏幕（商店直接展示，不再渲染该节点）。

## 商店 `shops.js`

```js
{
  id: 'SHOP_SMITH', name: '阿伟的铁匠铺',
  sellRate: 0.5,             // 卖出价 = price × sellRate
  stock: [
    { item: 'HERB', cost: 8 },            // 无限库存
    { item: 'WPN_STEEL', cost: 220, qty: 1 }, // 有限库存（售完即止）
  ],
}
```

## 章节 `chapters.js`

```js
{
  id: 'ch1', index: 1, title: '渔村夜袭', subtitle: '...',
  introFlag: 'FLAG_CH1_START',
  intro: '开场剧情…',          // 过场文本（\n 换行）
  startingMap: 'REGION_FISHING',
  objectives: ['Q1_..','Q2_..','Q3_..','Q4_..'],   // 该章主线任务列表
  endQuest: 'Q4_CH1_BOSS',     // 完成后自动 finishChapter
  gate: { flag: 'FLAG_CH1_CLEAR' },  // 完成时置位
  next: 'ch2',                 // 下一章；null=终章（开放结局）
  interlude: '章末过场…',
}
```

> 第四章扩展：`chapters.js` 末尾追加一条（index 4），并把 ch3 的 `next` 改为 `'ch4'`，引擎零改动。
