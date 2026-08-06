# 测试与验证

四套 Node 脚本，零依赖（`npm` 仅为脚本别名）。全部可在无浏览器环境运行，因为它们只依赖 **seeded RNG + 无 DOM 回放**。

| 脚本 | 命令 | 验证目标 | 断言数 |
|---|---|---|---|
| 内容校验 | `npm run check` | 内容引用完整性 / 枚举 / 数值 | — |
| 端到端主线 | `npm run playthrough` | 三章主线走通、章节门禁、结局 flag、存档迁移、扩展机制、**对话驱动路径** | 26 |
| UI 冒烟 | `npm run uiSmoke` | UI 屏幕渲染与关键交互（DOM mock）、自动保存、对话开商店、装备换装合并/卸下 | 51 |
| 数值平衡 | `npm run balance` | 正常玩家（开局配装 + 商店补给）通关第一章 | — |

## 何时运行

- **改任何内容**（`js/content/*`）：必跑 `check`，再按需跑 `playthrough` / `uiSmoke` / `balance`。
- **改引擎/系统**（`js/core`、`js/systems`）：跑 `playthrough` + `uiSmoke`（回归）。
- **改数值/商店/装备/敌人**：追加 `balance`。
- **改 UI**：跑 `uiSmoke`。
- **发布前**：四套全跑。

## check.js — 内容校验

直接调用 `validateContent(CONTENT)`（与浏览器启动时同一函数），校验：
- 全部 11 类内容 id **唯一**；
- 外键引用存在：`drops.item`、`skills.learn.item`、`npc.location/shop/dialogue/quests`、`location.region/enemies/events/npcs/chests`、`quest.giver/turnIn/unlocks/rewards/objectives.target`、`dialogue` 的 `to`/`quest:`/`dialogue:`、`shop.stock.item`、`chapter.startingMap/objectives/endQuest/next`；
- 枚举合法（type/target/rarity/role/objectiveType…，见 `validate.js ENUMS`）；
- 数值非负、掉落率 ∈ [0,1]、对话 `start` 与跳转节点存在。

失败即打印全部断口并以非零码退出。

## playthrough.js — 三章主线端到端

**上帝模式**（level 25 / 高属性）驱动，只验证逻辑、不验证平衡：

1. **逐章走通**：`startChapter` → 依次完成 `chapter.objectives` 的主线任务（talk/kill/explore/collect 全类型）→ 断言 `endQuest` 完成后自动 `finishChapter` → 门禁 flag（`FLAG_CH1_CLEAR` / `FLAG_CH2_CLEAR` / `FLAG_BECAME_DEMON_KING` / `FLAG_LEFT_ARMY` / `FLAG_CH3_CLEAR` / `FLAG_PEACE`）置位 → 下一章开场。
2. **开放结局**：ch3 无 `next`，和平 flag 置位，获得和平条约。
3. **存档/读档/迁移**：save→load 深等且 flags 保留；`migrate` 补缺失字段（`cur` / `equipped`），版本号最新。
4. **扩展机制验证（零硬编码）**：动态追加一条支线任务 → 完成 → `onComplete` flag 生效——证明追加数据即可扩展。
5. **对话驱动路径（真实玩家）**：第一章 Q1→Q4 全部通过 `dialogue.startDialogue` 对话接取/交还（**不**直接调 `turnIn`），断言 Q2/Q3 回村**一次**对话即交还、铁臂处可接 Q4、黑鳞崖 `reqQuest` 解锁——堵住「对话树漏配 `quest:` action 导致主线卡死」的回归（曾因村长对话树缺 Q2/Q3 的 action，整个第一章断链）。

## uiSmoke.js — UI 冒烟

最小 DOM mock（`fakeEl` + localStorage stub + 同步 setTimeout）在 Node 中加载整个 UI 层，驱动关键交互，捕捉模块加载/渲染崩溃：

- 标题 → 章节开场 → 世界地图 → 区域 → 地点
- 对话（含**对话开商店**、商店有货不被对话覆盖）
- **行商对话开商店**：第二章军营行商「看看货」→ 商店打开且有 MP 药（防「shop NPC 缺 dialogue 打不开」回归）
- 战斗（战斗屏渲染 + 指令执行）
- 背包 / 商店 / 任务 / 状态 / 菜单
- **装备槽**（换饰品不挤掉旧装备、`accessory2` 归位）
- **商店卖出**（通过商店界面卖出，校验减一和金币到账）
- 菜单返回链（菜单→二级菜单→返回→原地点闭环）
- 读档/关于返回上一级、回到标题存档确认
- 存档写入 localStorage / 读档
- **自动保存**：新开档后 `autoSave` 写入当前档位、菜单显示「自动保存开启 · 存档位 N」、回标题后 `autoSave` 跳过

> mock 的 `querySelectorAll` 返回空数组，因此弹窗按钮回调不在测试内触发，但弹窗本身的渲染与 DOM 挂载会被断言。

## balance.js — 数值平衡

模拟**真实玩家**（不是上帝模式）走完第一章：

- 使用游戏自带**开局配装**（生锈短剑已装备 + 5 草药 + 3 药水）；
- 途中像玩家一样**去商店补给**：药水不足就买（金币够买 `POTION_S` 否则 `HERB`），金币够了升武器（铁剑 Lv2 / 精钢剑 Lv6）、买防具（皮甲 Lv3）；
- 自动战斗：血量 < 35% 用道具，否则普攻；
- 断言第一章通关（`FLAG_CH1_CLEAR`）。

输出每任务后等级/属性/金币/药水，若无法通关以非零码退出。**调敌人数值、初始配装或商店定价后必跑。**

## 可复现性

- 所有脚本注入固定 seed（`createGame({ seed })`），RNG 为 mulberry32，结果确定。
- 战斗回放不依赖 DOM，纯函数驱动 `combatSys.doPlayerAction`。
- 这样 CI / 多人协作时结果一致，避免"我这边能过"。
