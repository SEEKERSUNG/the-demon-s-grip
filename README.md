# 执魔 · 浏览器单机 RPG

> **v1.1.0** · 零构建 · 完全数据驱动 · 原生 HTML/CSS/JS + ES Modules

魔幻传奇题材的浏览器单机游戏。你从异世穿越而来，在东海渔村生活多年，直到魔潮一夜踏碎故乡——从此踏上讨伐魔王、成为新魔王、再以百万魔军调停三族战争的三章旅程。

所有道具、NPC、任务、地图、章节**都是数据条目**，可无限扩展，核心引擎零硬编码。

## 特性

- **节点式探索地图**：区域 → 地点 → 交互节点（战斗/宝箱/NPC/事件），纯数据驱动
- **回合制战斗**：攻击/技能/道具/防御/逃跑，技能表驱动，掉落与经验升级
- **任务系统**：多阶段主线 + 支线，talk/kill/explore/collect 四类目标，链式解锁 + 前置门禁
- **对话树**：分支选择、条件分支、领任务/交任务/开商店/恢复
- **章节引擎**：主线 endQuest 完成 → 自动章节过渡 + 过场演出
- **背包直售**：物品卡片直接卖出；商店买/卖、旅店恢复
- **存档**：localStorage 4 槽位，SCHEMA_VERSION 版本化迁移
- **可复现**：seeded RNG + 无 DOM 回放，四套 Node 验证脚本

## 快速开始

```bash
cd game
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

> 零构建，无任何依赖。也可直接双击 `index.html`，但个别浏览器对 `file://` 下的 ES Module 有限制，推荐用静态服务器。

## 三章主线

| 章 | 标题 | 剧情 |
|---|---|---|
| 1 | 渔村夜袭 | 穿越者在渔村生活多年，魔潮夜袭灭村 → 立誓讨伐 → 历练升级 → 讨伐魔潮头目 → 加入王国军 |
| 2 | 讨伐魔王之路 | 军中腐败与背叛 → 退出军队成独行侠 → 历练 → 决战魔王 → 被邪修魔法侵蚀成新魔王 → 率魔物渡海 |
| 3 | 百年之约 | 百年来人族精灵开战 → 率百万魔军回大陆调停 → 查明幕后黑手战争之主 → 三族和平，开放结局 |

第四章起剧情待设计——只需追加内容数据即可，引擎零改动（详见 [扩展指南](doc/extension-guide.md)）。

## 开局指南

新档自带**生锈短剑（已装备）**与**5 草药 + 3 药水**。

1. 与**村长福伯**对话接主线「渔村之殇」
2. 到**铁匠阿伟（商店）**买铁剑（70 金，开局 80 金够用）
3. **旅店老板娘（旅店）**可完全恢复体力
4. 再去**染血滩涂**清史莱姆，稳扎稳打升到 2 级
5. 2 级后进**海蚀洞穴**，逐步推进主线

打不过就退守史莱姆刷经验、去商店补给；背包里物品可直接点「💰 卖」换金币。

## 系统一览

- **探索**：进入地点 → 生成节点 → 点击分发（战斗/宝箱/NPC/事件/离开）
- **战斗**：按速度决定先手，玩家先手/后手两条流程；敌我共用技能表与伤害公式
- **任务**：事件驱动目标进度，counts 按「阶段:目标」隔离；对话接取/交还
- **剧情门禁**：统一走 `state.flags`（`FLAG_*`），引擎不硬编码剧情
- **章节**：数据条目，`endQuest` 完成自动 `finishChapter`

## 目录结构

```
index.html               入口（挂载 #app + toast 层）
css/                     base（主题/基础）/ screen（屏幕）/ combat（战斗）
js/
  core/                  引擎：state/save/rng/observer/events/validate/game/version
  systems/               游戏系统：combat/quests/dialogue/explore/shop/equipment/…
  content/               ★ 全部游戏内容（数据），改这里即可扩展
  ui/                    界面：main（启动/路由）/ screens（屏幕）/ combatScreen
scripts/                 check / playthrough / uiSmoke / balance 四套验证
doc/                     技术文档（架构 / 数据Schema / 系统 / 扩展 / 测试）
```

## 验证

```bash
npm run check         # 内容引用完整性校验（改内容后必跑）
npm run playthrough   # 无DOM回放：三章主线端到端断言（21项）
npm run uiSmoke       # UI冒烟：最小DOM mock 驱动关键交互（38项）
npm run balance       # 数值平衡：正常玩家+商店补给通关第一章
```

## 技术文档

见 [`doc/`](doc/)：

- [架构总览](doc/architecture.md) — 目录职责、数据流、事件驱动、状态/存档
- [内容数据 Schema](doc/data-schemas.md) — 道具/技能/敌人/NPC/地图/任务/对话/商店/章节全字段
- [核心系统](doc/systems.md) — 战斗/任务/对话/探索/商店/章节引擎的实现细节
- [扩展指南](doc/extension-guide.md) — 加道具/敌人/任务/地图/章节/新BOSS 的完整步骤
- [测试与验证](doc/testing.md) — 四套脚本的断言、原理与何时运行

## 数据引用约定

- 每条记录 `id` 唯一（英文大写蛇形），显示用中文 `name`/`desc`
- 外键一律存 id 字符串（`drops.item`、`objectives.target`、`npcs.dialogue`…）
- 任务目标类型：`talk`(NPC) / `kill`(敌人) / `explore`(地点) / `collect`(道具)
- 剧情门禁统一走 `state.flags`（`FLAG_*`）
