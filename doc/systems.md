# 核心系统实现

## 战斗 combat.js

回合制状态机，战斗对象独立于存档（只读引用 `state`），结束统一写回。

**状态流**：`player` → `victory | defeat | fled`

- `startCombat(game, enemyIds, context)`：构建敌我单位，`game.combat = combat`，广播 `combat:start`。
- `doPlayerAction(game, combat, action)`：`{ type:'attack'|'skill'|'item'|'defend'|'flee', target, skillId, itemId }`。
  - 按速度决定先手：玩家先手则 玩家行动 → 敌人行动；敌人先手反之。
  - **指令校验先于敌方回合**（v1.5.3）：`validatePlayerAction` 无副作用地校验目标/MP/道具满血等条件，失败直接返回、不消耗回合——慢速玩家输入无效指令不再白挨敌方一击。
  - 每回合结束 `tickBuffs` 结算增益持续回合。玩家战斗单位与敌人一样带 `buffs` + `buffTurns`（v1.5.3 修复：此前玩家单位缺 `buffTurns`，「防御」与增益技能写入时抛 TypeError）。
- **技能 MP 扣除**：先校验目标有效再扣 MP，避免目标无效时白扣（v1.5.2 修复）。
- **防御与先手**：玩家先手时防御 `turns=1`（本回合敌攻即消费）；慢速玩家 `turns=2`（本回合敌攻已过，防御持续到下回合敌攻才生效）（v1.5.2 修复）。
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
  - **collect 目标同步库存计数**；**explore 目标同步 `visitedLocations`**（v1.5.3）：即使物品/地点在接取任务前已获得/进入，也能在下一轮推进时正确识别——彻底消除「提前拿物品/先逛地点 → 接取后无法提交」的卡关。
- `turnIn`（对话 `quest:QID` action 调用）：发奖励 + `afterComplete`。
- `completeQuest`：强制完成（战斗 `onWin.quests` 等场景）。
- `afterComplete`：置 `onComplete.flags`、`unlockChain(unlocks)`（自动接取后续）、广播 `quest:completed`。
- **防跳链**：对话接取走 `questUnlockable`，校验 `prereqQuests`（须已完成）与 `prereqFlags`。
- **导航路径（v1.7.0）**：`objectiveNav(CONTENT, ob)` 内容反查目标所在地点/区域（talk → NPC 地点、kill → 含该敌人的全部地点、explore → 地点本身、collect → null），`questTurnInNav` 反查交还 NPC 地点。任务日志为每个目标渲染「📍 世界地图 → 区域 → 地点」，单地点且被锁定时附 🔒 原因（复用 `locLockReason`），collect 目标复用物品百科的获取途径索引——零硬编码，新增内容自动纳入。

> 章节推进自动接线：`quest:completed` 且 quest == 当前章节 `endQuest` → `story.finishChapter`。

## 对话 dialogue.js

- `startDialogue(game, dlg, ctx)`：进入即推进 `talk` 目标（同一拜访内可完成交还）；生成会话，返回 `{ session, view }`。
- `nodeView(game, session)`：执行节点 `actions`，按 `cond` 过滤 `options`，产出视图。
  - actions：`quest:QID`（接取/交还）、`heal`（满恢复）、`flag:FLAG`、`shop:SHOP_ID`（广播 `dialogue:openShop`，UI 切换到商店屏幕）。
- **交还依赖对话 action**：`turnIn` 只由 `quest:QID` action 触发（任务 `status='done'` 时）。含 `turnIn` 的任务，其 giver/turnIn NPC 的对话树**必须**列出对应 `quest:QID`，否则无法交还、主线卡死（曾因村长对话树漏配 Q2/Q3 的 action 导致第一章断链）。
- **交还时自动接取的任务**（v1.6.0）：`unlocks` 链在交还对话中自动接取后续任务时，若新任务首阶段含对**当前 NPC** 的 `talk` 目标，同次对话立即推进——玩家无需为同一 NPC 跑第二趟（`runActions` 交还后检测新接取任务并补一次 talk 进度）。首阶段 talk 目标指向**其他 NPC** 的仍需玩家自行前往。
- `chooseOption(game, session, i)`：执行选项 `effect`（setFlag / giveItem / removeItem / gold / hp/mp / 接任务），跳转 `to` 节点。
- `effect` / `cond` 详见 [data-schemas.md](data-schemas.md#对话-dialoguejs)。
- **打字机回调防御**：`typeText` 的异步回调可能晚于屏幕切换触发（对话结束/跳转/开商店接管屏幕），访问已卸载 DOM 节点会抛错。所有回调内对目标节点做空检查（`if (el)` / `if (btn.isConnected)`），见 `story`/`interlude` 的 `btn-continue`、`renderDlgView` 的 `dlg-options`、`showStoryModal` 的 `modal-btn`。

## 探索 explore.js

- `enterLocation(game, loc)`：置 `state.location` / `state.region`，记录 `visitedLocations`，推进 `explore` 目标，广播 `location:enter`。
- `buildLocationNodes(game, loc)`：生成节点列表——
  - `enemies` 存在 → 「探索寻敌」（战斗节点）
  - NPC（`npcLocation` 解析当前位置，支持 `move.flagTrue` 隐藏/移动；带 `shop` 标注「（商店）」，`role:'inn'` 标注「（旅店）」）
  - 未开宝箱（`openedChests` 排除）
  - 一次性事件未触发（`once + flag` 排除）
  - 「离开此地」出口
- `triggerEvent(game, ev)`：按 `ev.type` 分发 `story/sign`（置 flag）、`collect`（发道具/金币）、`dialogue`、`battle`。
- `leaveLocation(game, loc)`：清理 `state.location`，返回区域。
- 宝箱：`openLocationChest` 置 `openedChests`，`loot.openChest` 支持 `chest.item`（单数）/`chest.items`（数组）/`chest.gold`。

## 遭遇 encounter.js

`pickEncounter(game, loc)`：从 `loc.enemies`（`[敌人id, 权重]`）抽 **1~min(3, 敌种数)** 个敌人，用 `rng.pickWeighted`。

> 地点敌种数决定了遭遇数量上限：2 种 → 最多 2 只；1 种 → 单挑。新手区（如染血滩涂）用 2 种弱怪控制前期难度。

## 商店 shop.js

- `stockView(game, shop)`：合并已售数量，返回 `remaining`（`qty: null`=无限）。
- `buy(game, shop, itemId, qty)`：校验库存/金币/等级需求 → 扣金币 → `addItem` → 记已售。
- `sell(game, shop, itemId, qty)`：任务道具不可卖；价格 = `sellPrice ?? price × shop.sellRate`（默认 0.5）；`removeItem` → 加金币。
- **商店交易**：物品只能通过商店卖出（`shop.sell`），背包不再提供直售按钮；商店买/卖、旅店恢复。
- 商店买入校验库存/金币/等级需求；任务道具不可出售。

## 装备 equipment.js

- 槽位：`SLOTS = ['weapon', 'armor', 'accessory', 'accessory2']`。
- `equipItem(game, itemId)`：按 `slotFor` 确定槽位；校验 `levelReq`（等级不足拒绝）；已装备同款直接返回（不误扣背包）；原装备**退回背包并合并计数**；从背包扣除一件新装备。
  - 返回 `{ ok, msg }`（v1.5.3）：等级不足 → `等级不足，需要 Lv.X（当前 Lv.Y）`；已装备同款 → `已经装备了该物品`；UI 据此 toast，背包卡片/商店在等级不足时显示「🔒 需 Lv.X」。
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
  - **版本上限**：`importSaveData` 拒绝 `version > SCHEMA_VERSION` 的存档（v1.5.2 修复），防止未来版本存档被静默降级损坏。
- `saveToSlot / loadFromSlot / deleteSlot / slotInfo / listSlots`：localStorage `grpg_save_{slot}`。

### 自动保存（独立槽位，v1.5.1）

- 自动存档使用独立 key `grpg_autosave`，**永不覆盖玩家手动存档位**（`grpg_save_{0-3}`）。
- `autoSave()`：有进行中的游戏且章节已开始时写回自动槽位，否则静默跳过；不依赖 `activeSlot`。**战斗中跳过**（`game.combat` 存在时 `state.player.cur` 未同步，v1.5.2 修复）。
- 触发：`boot` 启动**每 60 秒**定时自动保存；**章节完成**（`chapter:end` 事件）立即保存并 toast。
- 菜单顶部显示「自动保存 · 独立槽位 · 上次保存时间」。

### 存档导出/导入（v1.5.1）

- `exportSaveData(slot)`：读取指定槽位，返回 `{ json, filename }`；UI 触发 Blob 下载（`.json` 文件）。
- `importSaveData(jsonStr)`：校验存档 JSON 结构 + 迁移，返回 `{ ok, state }`；UI 写入最前空闲手动槽位。

## 统一顶部导航栏（ui/screens.js）

v1.4.1 起，所有游戏内屏幕（地图/区域/地点/商店/菜单/背包/任务/状态/物品百科/存档/读档/关于）使用统一的 **sticky 顶部导航栏**：

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
| 背包/状态/物品百科/存档 | 菜单 | `showScreen('menu')` |
| 任务日志 | 菜单/地图（根据 `back` 参数） | `showScreen('menu')` / `showScreen('map')` |
| 读档/关于（游戏中） | 菜单 | `showScreen('menu')` |
| 读档/关于/新游戏（标题） | 标题 | 底部 backBtn |

## 战斗 UI 返回链（ui/screens.js）

- `uiState.currentScreen` 记录当前屏幕；`uiState.menuReturn` 记录菜单打开时的来源。
- 菜单「← 返回」（`backFromMenu`）回到原地点/区域/地图；二级屏（读档/关于）按 `back` 参数返回上一级。
- 对话含 `shop:` action 的节点：商店接管屏幕（`chooseDlg`/`dialogue()` 检测 `currentScreen === 'shop'` 后不再渲染对话）。
- `confirmBackToTitle`：从菜单回标题前弹窗，提示未保存进度 → 「先去存档 / 直接回去 / 取消」。

## 底部快捷栏（v1.5.0）

v1.5.0 起，地图/区域/地点三个核心游戏屏幕底部增加 sticky 快捷导航栏：

- **三板钮**：📋 任务 · 🎒 背包 · 🧙 状态，点击直接进入子页面。
- **快捷返回**：从快捷栏进入的子页面，返回按钮直接回到游戏画面（`uiState.quickReturn`），跳过菜单。
- **菜单不受影响**：从菜单进入的子页面仍走「菜单→子页→菜单→游戏」原有路径（`openMenu` 清空 `quickReturn`）。

## 任务物品预填（v1.5.0）

- `acceptQuest` 接取时扫描首阶段 `collect` 目标，预填背包中已有物品的计数，随后立即 `checkStage`。
- `checkStage` 对 `collect` 目标**同步库存计数**——即使物品在接取前通过宝箱/事件获得，或已有存档中任务已 active 但 count 为 0，均能在下一轮 `progressObjective`（或其他目标推进）触发时正确识别并推进阶段。彻底消除「提前拿任务物品 → 接取后无法提交」的卡关问题。

## 物品百科（v1.6.0）

菜单新增「📖 物品百科」屏幕（`SCREENS.codex`），全量道具按类型分组（消耗品/武器/防具/饰品/材料/任务道具）展示：

- 每张卡片：图标、名称+稀有度、持有数量（背包+已装备）、基准价、等级需求、属性加成/恢复效果、描述。
- **获取途径自动汇总**：`buildItemSources()` 从内容数据反向扫描——开局携带（`createInitialState`）、商店库存、敌人掉落、宝箱、事件 `then.items`、任务奖励 `rewards.items`。**零硬编码**：新增任何内容条目，百科自动纳入，无需改引擎。
- 无任何来源的道具显示「— 暂无获取途径 —」（可据此发现内容缺口，如尚未投放的道具）。

## 自动战斗（v1.7.0）

战斗屏指令栏（攻击/技能/道具）第 4 位「🪄 自动战斗」按钮，点击 `GRPG.startAutoBattle()` 即开始接管当前战斗——**无独立设置屏**，白名单与阈值用默认配置（校验撤退线 < 回血线、当前处于玩家回合后 `uiState.auto.enabled = true`，自动期间面板替换指令区）。

**决策层 `systems/autoBattle.js`**（纯逻辑、无 DOM、node 可测）：

- `cfg = { items, healAt, dangerAt }`——`items` 是**允许自动使用的恢复道具白名单**（默认 = 背包内全部恢复道具，首次开始时物化；只认 id，实际持有量决策时查背包）；`healAt`（回血线，默认 0.5）；`dangerAt`（撤退线，默认 0.25，须 < healAt）。
- `chooseAutoAction(game, combat, cfg)` 按优先级产出一条 `doPlayerAction` 认可的指令：
  1. **血量 ≤ 撤退线**：白名单回血药 → 治疗技能（MP 够）→ 都没有则 `{ type:'flee' }` 逃跑退出；
  2. **血量 ≤ 回血线**：治疗技能（省药）→ 回血药 → 都没有继续进攻；
  3. **进攻**：最强可用攻击技能（按 `power` 降序、MP 够）→ MP ≤ 35% 且有白名单魔力药先补给 → 普攻。
  - 攻击/技能目标固定为**血量最低的存活敌人**（快速减员）；`selectedRecovery` 只认「usable + 有 hp/mp 效果 + 背包有货」的白名单道具，按恢复量取最大。
- `autoDangerReason(game, cfg)`：**场间**（上一场胜利后）血量 ≤ 撤退线且无回血药、无 MP 够的治疗技能 → 返回停止原因字符串，否则 `null`。
- `actionLabel(game, combat, cfg)`：自动战斗面板「下一动」预判文案。

**驱动层 `ui/combatScreen.js`**：

- 节拍调度可注入（`setAutoScheduler`）：默认 `setTimeout`（700ms/指令、1100ms/续场）；uiSmoke 的 `setTimeout` 是同步执行的，注入队列调度器手动 drain，避免「渲染→节拍→动作→渲染」递归死循环。
- 每拍执行 `chooseAutoAction` → `doPlayerAction`；指令失效（目标倒下/满血等）回退普攻，再失败才停止。
- **胜利自动续场**：结算后先查 `autoDangerReason` → 有原因/章节过场/地点无敌人 → 停止并提示；否则 `encounter.startLocationBattle` 开下一场（`auto.battles` 计数）。
- **失败/逃跑自动停止**；面板提供「⏹ 停止自动战斗」（转手动）与「💨 立即撤退」（停止 + 逃跑）。
- 状态存 `uiState.auto`（`enabled/items/itemsPicked/healAt/dangerAt/battles`），读档/新游戏/回标题调 `resetAuto()` 复位（含取消未触发节拍）。
