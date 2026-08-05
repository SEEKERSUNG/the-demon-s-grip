# 架构总览

## 技术选型

- **零构建**：原生 HTML/CSS/JS，`<script type="module">` 引入，无打包器、无运行时依赖。
- **运行方式**：`python3 -m http.server 8000`（推荐）。个别浏览器对 `file://` 下的 ES Module 有限制。
- **内容即数据**：全部游戏内容存放在 `js/content/*.js`，导出数组/对象，由 `index.js` 聚合为 `CONTENT`。
- **单一状态根**：所有系统读写同一个 `game.state`；UI 单向渲染（state → HTML）。

## 目录职责

```
js/
  core/      引擎基础
    state.js      createInitialState()、SCHEMA_VERSION、migrate()（存档迁移）
    game.js       createGame()：组装 state/rng/events/CONTENT + 全部系统，接线章节推进
    observer.js   微型事件总线（on/off/emit）
    events.js     领域事件名常量（EVENTS）
    rng.js        mulberry32 seeded RNG（可注入种子，测试可复现）
    save.js       localStorage 多槽位 CRUD + 存档元信息
    validate.js   内容引用完整性 / 枚举 / 数值范围校验
    version.js    GAME_VERSION / GAME_TITLE（单一来源）

  systems/   游戏系统（纯逻辑，node 可测，不依赖 DOM）
    player.js     等级 / 经验 / 成长 / 属性汇总 / 恢复
    inventory.js  背包持有量 / 增删 / 使用消耗品
    equipment.js  装备槽（weapon/armor/accessory/accessory2）/ 装备 / 卸下
    stats.js      伤害 / 治疗公式（唯一权威）
    skills.js     技能查找 / 可用技能集合（学会 + 装备解锁）
    combat.js     回合制战斗状态机（胜利/失败/逃跑结算）
    enemyAction.js 敌方 AI：按权重/条件选技能
    loot.js       掉落掷点 / 宝箱解析
    encounter.js  从地点敌人池抽遭遇，启动战斗
    explore.js    节点生成 / 事件触发 / 宝箱 / 进出地点
    quests.js     任务状态机（接取 / 推进 / 交还 / 奖励 / 解锁）
    dialogue.js   对话树执行器（节点视图 / 选项跳转 / action）
    npc.js        NPC 查找 / 位置解析（支持按 flag 移动/隐藏）
    shop.js       买入 / 卖出 / 库存
    flags.js      FLAG_* 读写 + 条件谓词 evaluate
    story.js      章节推进 / 门禁 / 过场

  ui/        界面层
    main.js       boot() 启动、GRPG 全局桥（action 统一挂载）、存档操作
    screens.js    屏幕路由 SCREENS + 各屏幕渲染 + 全局动作 ACTIONS
    combatScreen.js 战斗屏幕渲染 + 战斗指令动作

  content/   ★ 所有游戏内容（数据）
    items / skills / enemies / npcs / regions / locations /
    events / quests / dialogue / shops / chapters / index.js(聚合)

scripts/    验证脚本（见 testing.md）
doc/        本技术文档
```

## 运行时对象

`createGame(opts)` 返回一个 `game` 对象：

```js
{
  state,          // 存档状态根（唯一被持久化的对象）
  rng,            // seeded RNG
  events,         // 事件总线
  CONTENT,        // 全部内容数据
  combat: null,   // 当前战斗对象
  dlgSession,     // 当前对话会话
  player, inventory, equipment, skills, stats,
  combatSys, enemyAction, loot, explore, encounter,
  quests, flags, dialogue, npc, shop, story,  // 系统 API
}
```

游戏状态 `state`（createInitialState 生成）：

```js
{
  version,              // SCHEMA_VERSION
  player: { name, level, xp, gold,
            base: { maxHp, maxMp, atk, def, spd, crit },
            cur: { hp, mp },
            equipped: { weapon, armor, accessory, accessory2 },
            learnedSkills: [] },
  inventory: [],        // [{ id, qty }]
  quests: {},           // { QID: { stage, status, counts } }
  flags: {},            // 剧情门禁 / 一次性事件
  chapter, chapterStarted,
  region, location,     // 当前所在
  visitedLocations, openedChests, battlesWon, playTime,
}
```

> 开局配装（生锈短剑 + 5 草药 + 3 药水）由 `createInitialState` 提供；`migrate` 只补中性默认值、不注入内容。

## 数据流

```
用户点击 → GRPG.action()（ui 层） → 系统函数（systems 层，改 state + emit 事件）
        → events 总线 → UI 监听 → 重新渲染屏幕（单向）
```

- 屏幕不直接改 state，一律走系统 API。
- 系统间解耦靠事件（observer），UI 监听事件后重渲染或弹 toast。
- 战斗是例外：战斗对象独立于 state（只读引用），胜利/逃跑后 `syncPlayerState` 统一写回。

## 事件驱动

`js/core/events.js` 定义领域事件常量，全部事件：

| 事件 | 触发时机 | 典型监听方 |
|---|---|---|
| `combat:start` / `combat:end` | 战斗开始 / 结束 | 战斗屏幕 / 返回逻辑 |
| `player:changed` | 升级 / 属性变化 | UI 刷新 |
| `inventory:changed` / `gold:changed` | 背包 / 金币变化 | UI 刷新 |
| `flag:set` | FLAG 置位 | 剧情门禁响应 |
| `quest:accepted` / `quest:progress` / `quest:completed` | 任务生命周期 | toast、章节推进（`endQuest` 完成 → `finishChapter`） |
| `location:enter` / `explore:event` | 进入地点 / 探索事件 | UI |
| `chapter:start` / `chapter:end` | 章节开场 / 完成 | 过场、下一章 |
| `dialogue:openShop` | 对话要求开商店 | UI 切换到商店屏幕 |
| `toast` | 系统提示 | toast 层 |

`game.js` 内建两条自动接线：
- `quest:completed` 且该 quest 是当前章节 `endQuest` → 自动 `finishChapter`（章节过渡零硬编码）。
- `chapter:start` → 自动接取该章第一个主线任务。

## 存档

- localStorage key：`grpg_save_{slot}`，`SLOT_COUNT = 4`。
- 存档结构：`{ version, data: <深拷贝的 state>, savedAt }`。
- `SCHEMA_VERSION = 1`；未来 schema 变更在 `MIGRATIONS` 表加迁移函数，`migrate()` 逐版升级并补齐默认字段。
- `slotInfo()` 解析标题页所需元信息（章节/等级/名字/时间）。

## 校验

`validateContent(CONTENT)` 在启动（`boot()`）与 `scripts/check.js` 中运行：
- 全量 id 集合 → 断言外键存在（drops.item、objectives.target、npc.dialogue、dialogue to/flag…）
- id 唯一、枚举合法、数值非负、对话跳转节点存在
- 失败 = 阻断启动 + 列出全部断口

扩展内容后务必跑 `node scripts/check.js`。

## UI 分层

- `main.js`：`boot()`（校验内容 → 渲染标题屏）；把各模块导出的 action 统一 `Object.assign` 到 `window.GRPG`，屏幕内联 `onclick` 全部经 `GRPG.*` 调用。
- `screens.js`：`SCREENS` 对象（每个屏幕 `(ctx) => void` 负责 `app.innerHTML` + 事件绑定）、`showScreen(name, ctx)` 路由、`uiState`（当前屏 / 菜单返回目标 / 待播过场）。
- **循环依赖约定**：screens/combatScreen 不直接写 `window`；action 函数导出后由 main.js 统一挂载到 GRPG。
- **返回导航**：`uiState.menuReturn` 记录菜单来源，菜单「← 返回游戏」回到原地点/区域/地图；`back` 参数决定读档/关于等二级屏返回上一级。

## 版本号

`js/core/version.js` 是版本号唯一来源（`GAME_VERSION`），标题页/关于页展示。发布新版本时同步 `package.json` 的 `version`。
