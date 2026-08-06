# 核心系统实现

## 战斗 combat.js

回合制状态机，战斗对象独立于存档（只读引用 `state`），结束统一写回。

**状态流**：`player` → `victory | defeat | fled`

- `startCombat(game, enemyIds, context)`：构建敌我单位，`game.combat = combat`，广播 `combat:start`。
- `doPlayerAction(game, combat, action)`：`{ type:'attack'|'skill'|'item'|'defend'|'flee', target, skillId, itemId }`。
  - 按速度决定先手：玩家先手则 玩家行动 → 敌人行动；敌人先手反之。
  - 每回合结束 `tickBuffs` 结算增益持续回合。
- **技能校验**：使用技能须在 `usableSkills(game)`（已学会 + 装备 `skillUnlocks` 解锁）集合内，否则返回「尚未学会」——装备解锁的技能在战斗中可用。
- 敌方行动：`enemyAction.chooseEnemyAction(enemy)` 从 `ai` 表选技能（`'ATTACK'`=普攻，字符串=指定技能，对象=带 `hpPct` 条件的技能）。
- **道具使用**：战斗单位 HP/MP 未同步到 state，使用前先把单位值覆盖回 state，结算后再读回——避免误判"HP 已满"；消耗品在 HP/MP **均已满**时才拒绝使用，且 `effect.hp` 为 0 的 MP 药不因 HP 已满而误拒（防浪费）。
- **MP 自动回复**：每回合结束时玩家自动回复 MP（仅玩家，敌人不回）。公式 `calcMpRegen(maxMp)` = `2 + floor(maxMp × 0.04)`（至少 1）。低等级 ~2 MP/回合，高等级 ~5 MP/回合，减少对魔力药水的依赖、提高技能使用频率。
- **胜利结算**（`victory()`）：
  1. `syncPlayerState`（战斗损耗写回 state，升级回满逻辑随后）
  2. 掉落（BOSS 额外掉落 `context.bossDrops`）
  3. `addXp`（升级）→ `addGold` → `grantLoot`
  4. 任务击杀进度 `progressObjective({type:'kill'})`
  5. `context.onWin`（flags / 强制完成任务 / 剧情 flag）
  6. 广播 `combat:end`
- **逃跑**：`0.5 + (己方速度 - 平均敌速) × 0.02`，clamp 到 [0.25, 0.9]；失败则受敌人一击。
- **失败**（`defeat()`）：广播 `combat:end`，UI 进入团灭面板。

### 伤害公式 `stats.js`

```js
effAtk = atk × atkMult
effDef = def × defMult
base   = (effAtk - effDef × 0.5) + rng.int(0, max(1, atk×0.1))
base  *= skill.power                 // 普攻 power = 1
命中   = skill.hit × (1 - clamp((敌速-己速)×0.01, 0, 0.2))
暴击   = crit (+skill.critBonus) → 伤害 ×1.5
最终   = max(1, round(base))         // 命中后
```

治疗：`amount = (atk×0.6 + maxHp×0.1) × power + rng.int(0, atk×0.15)`。

### 数值成长 `player.js`

- 升级经验：`xpNeeded(lv) = round(pow(lv, 1.98) × 16 + 30)`
- 每级成长：`HP+10 / MP+4 / ATK+3 / DEF+2 / SPD+1`
- 综合属性 = 基础 + 装备加成（`getStats`）；升级回满 HP/MP。
- 升级自动学会 `learn: { level }` 的技能。

## 任务 quests.js

状态机：`active`（当前阶段）→ 阶段推进 → `done`（需交还）或 `completed`（自动完成）。

- `acceptQuest`：初始化 `{ stage:0, status:'active', counts:{} }`。
- `progressObjective(game, {type, target, n})`：遍历所有 active 任务，匹配当前阶段的同类型目标，counts 累加，命中后 `checkStage`。
  - **counts 按 `阶段:目标` 隔离**（`${stage}:${oi}`），避免跨阶段串计数。
  - 触发方：talk（对话 `startDialogue` 时推进）、kill（战斗胜利）、explore（`enterLocation`）、collect（`addItem`）。
- `checkStage`：当前阶段全部目标达标 → `stage+1`；到达最后阶段后 `turnIn` 存在则 `done`，否则直接发奖励 + `afterComplete`。
- `turnIn`（对话 `quest:QID` action 调用）：发奖励 + `afterComplete`。
- `completeQuest`：强制完成（战斗 `onWin.quests` 等场景）。
- `afterComplete`：置 `onComplete.flags`、`unlockChain(unlocks)`（自动接取后续）、广播 `quest:completed`。
- **防跳链**：对话接取走 `questUnlockable`，校验 `prereqQuests`（须已完成）与 `prereqFlags`。

> 章节推进自动接线：`quest:completed` 且 quest == 当前章节 `endQuest` → `story.finishChapter`。

## 对话 dialogue.js

- `startDialogue(game, dlg, ctx)`：进入即推进 `talk` 目标（同一拜访内可完成交还）；生成会话，返回 `{ session, view }`。
- `nodeView(game, session)`：执行节点 `actions`，按 `cond` 过滤 `options`，产出视图。
  - actions：`quest:QID`（接取/交还）、`heal`（满恢复）、`flag:FLAG`、`shop:SHOP_ID`（广播 `dialogue:openShop`，UI 切换到商店屏幕）。
- **交还依赖对话 action**：`turnIn` 只由 `quest:QID` action 触发（任务 `status='done'` 时）。含 `turnIn` 的任务，其 giver/turnIn NPC 的对话树**必须**列出对应 `quest:QID`，否则无法交还、主线卡死（曾因村长对话树漏配 Q2/Q3 的 action 导致第一章断链）。
- **自动接取的任务首阶段不放 talk**：`unlocks` 链接取的任务没有「对话接取」步骤，接取时不会立即推进 `talk` 目标；若首阶段含 `talk` 目标，玩家回村需**两次**对话才能交还。首阶段应只放 kill/collect/explore 目标。
- `chooseOption(game, session, i)`：执行选项 `effect`（setFlag / giveItem / removeItem / gold / hp/mp / 接任务），跳转 `to` 节点。
- `effect` / `cond` 详见 [data-schemas.md](data-schemas.md#对话-dialoguejs)。

## 探索 explore.js

- `enterLocation(game, loc)`：置 `state.location` / `state.region`，记录 `visitedLocations`，推进 `explore` 目标，广播 `location:enter`。
- `buildLocationNodes(game, loc)`：生成节点列表——
  - `enemies` 存在 → 「探索寻敌」（战斗节点）
  - NPC（`npcLocation` 解析当前位置，支持 `move.flagTrue` 隐藏/移动；带 `shop` 标注「（商店）」，`role:'inn'` 标注「（旅店）」）
  - 未开宝箱（`openedChests` 排除）
  - 一次性事件未触发（`once + flag` 排除）
  - 「离开此地」出口
- `triggerEvent(game, ev)`：按 `ev.type` 分发 `story/sign`（置 flag）、`collect`（发道具/金币）、`dialogue`、`battle`。
- 宝箱：`openLocationChest` 置 `openedChests`，`loot.openChest` 支持 `chest.item`（单数）/`chest.items`（数组）/`chest.gold`。

## 遭遇 encounter.js

`pickEncounter(game, loc)`：从 `loc.enemies`（`[敌人id, 权重]`）抽 **1~min(3, 敌种数)** 个敌人，用 `rng.pickWeighted`。

> 地点敌种数决定了遭遇数量上限：2 种 → 最多 2 只；1 种 → 单挑。新手区（如染血滩涂）用 2 种弱怪控制前期难度。

## 商店 shop.js

- `stockView(game, shop)`：合并已售数量，返回 `remaining`（`qty: null`=无限）。
- `buy(game, shop, itemId, qty)`：校验库存/金币/等级需求 → 扣金币 → `addItem` → 记已售。
- `sell(game, itemId, qty)`：任务道具不可卖；价格 = `sellPrice ?? price × 0.5`；`removeItem` → 加金币。
- **背包直售**：UI 物品卡片「💰 卖」按钮直接调 `shop.sell`（标准半价），无需进商店。

## 装备 equipment.js

- 槽位：`SLOTS = ['weapon', 'armor', 'accessory', 'accessory2']`。
- `equipItem(game, itemId)`：按 `slotFor` 确定槽位；校验 `levelReq`（等级不足拒绝）；已装备同款直接返回（不误扣背包）；原装备**退回背包并合并计数**；从背包扣除一件新装备。
  - 退回旧装备用合并计数而非 push 新条目，避免同物品拆成多个条目（修复过"换装后突然多一个"）。
  - `slotFor` 尊重数据 `slot`：饰品 `accessory`/`accessory2` 各归其位（修复过"新装备挤掉旧装备"的问题）。
- `unequip(game, slot)`：装备回背包（合并计数）。
- `getEquipBonuses`：汇总所有已装备加成 → `player.getStats`。
- **背包卡片显示装备效果**：背包可装备物品卡片直接展示该装备的属性加成（`itemStatsText`，UI 层），装备/卸下后实时刷新——玩家无需进装备栏即可对比属性。

## 旗帜 flags.js

- `setFlag / unsetFlag / getFlag`：读写 `state.flags[flag]`，广播 `flag:set`。
- `evaluate(game, cond)`：`{ flag, flagNot, hasItem(+qty), level:{gte}, quest:{id,status}, chapter }` 全部满足才为 true；无 cond 恒 true。用于对话选项过滤、事件/地点解锁。

## 章节引擎 story.js

- `startChapter(game, chapter)`：置 `state.chapter` / 定位起始地图，置 `introFlag`，广播 `chapter:start`（UI 播开场）。
- `finishChapter(game, chapter)`：置 `gate.flag`，广播 `chapter:end`（UI 播 interlude → 进下一章开场）。
- 由 `game.js` 的 `quest:completed` 监听自动触发，无需 UI 干预。

## 存档迁移 state.js / save.js

- `SCHEMA_VERSION = 1`；`MIGRATIONS` 表 `{ fromVersion: (old) => new }`。
- `migrate(state)`：逐版升级 + 补齐默认字段（base/equipped/cur）。
  - **注意**：迁移只补中性默认值，不注入内容——开局配装只作用于 `createInitialState` 的新档。
- `saveToSlot / loadFromSlot / deleteSlot / slotInfo / listSlots`：localStorage `grpg_save_{slot}`。

### 自动保存（UI 层 main.js）

- `uiState.activeSlot` 记录当前存档位：`startNewGame` / `doLoad` / 手动 `doSave` 时设置，`backToTitle` 复位为 -1。
- `autoSave()`：有进行中的游戏且 `activeSlot ≥ 0` 时写回当前档位，否则静默跳过。
- 触发：`boot` 启动**每 60 秒**定时保存（静默）；**章节完成**（`chapter:end` 事件，`wireAutoSave` 挂在每个新 game 上）立即保存并 toast 提示。
- 菜单顶部显示「自动保存开启 · 存档位 N · 上次保存时间」，让玩家感知保存状态。

## 统一顶部导航栏（ui/screens.js）

v1.4.1 起，所有游戏内屏幕（地图/区域/地点/商店/菜单/背包/任务/状态/存档/读档/关于）使用统一的 **sticky 顶部导航栏**：

- **左侧**「← 返回」按钮：上下文感知，地点→区域、商店→地点、菜单→返回游戏、子屏→菜单。地图页无返回按钮（探索根节点）。
- **中间**：屏幕标题。
- **右侧**「☰ 菜单」按钮：菜单页自身不显示菜单按钮。

`topNav(backAction, title, showMenu)` 生成栏 HTML；`backAction` 为 JS 回调字符串（null=不显示）。HUD 不再 sticky，让位于顶部导航栏。

从标题页进入的子屏（读档/关于/新游戏）仍用底部 `backBtn()`——游戏未开始时无需导航栏。

### 各屏幕返回动作

| 屏幕 | 返回目标 | 动作 |
|---|---|---|
| 地图 | —（无返回按钮） | 探索根节点 |
| 区域 | 世界地图 | `showScreen('map')` |
| 地点 | 所属区域 | `leaveLocation()` |
| 商店 | 当前地点 | `closeShop()` |
| 菜单 | 返回游戏 | `backFromMenu()` |
| 背包/状态/存档 | 菜单 | `showScreen('menu')` |
| 任务日志 | 菜单/地图（根据 `back` 参数） | `showScreen('menu')` / `showScreen('map')` |
| 读档/关于（游戏中） | 菜单 | `showScreen('menu')` |
| 读档/关于/新游戏（标题） | 标题 | 底部 backBtn |

## 战斗 UI 返回链（ui/screens.js）

- `uiState.currentScreen` 记录当前屏幕；`uiState.menuReturn` 记录菜单打开时的来源。
- 菜单「← 返回」（`backFromMenu`）回到原地点/区域/地图；二级屏（读档/关于）按 `back` 参数返回上一级。
- 对话含 `shop:` action 的节点：商店接管屏幕（`chooseDlg`/`dialogue()` 检测 `currentScreen === 'shop'` 后不再渲染对话）。
- `confirmBackToTitle`：从菜单回标题前弹窗，提示未保存进度 → 「先去存档 / 直接回去 / 取消」。
