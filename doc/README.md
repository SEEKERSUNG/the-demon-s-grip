# 《执魔》技术文档

本项目是一款**零构建、完全数据驱动**的浏览器单机 RPG（原生 HTML/CSS/JS + ES Modules）。本目录为开发与扩展的技术说明。

## 文档列表

| 文档 | 内容 |
|---|---|
| [architecture.md](architecture.md) | 整体架构：目录职责、运行时对象、数据流、事件驱动、状态与存档、RNG、校验、UI 分层 |
| [data-schemas.md](data-schemas.md) | 所有内容数据类型的完整 Schema 与示例（道具/技能/敌人/NPC/地图/事件/任务/对话/商店/章节） |
| [systems.md](systems.md) | 核心系统实现细节：战斗、任务、对话、探索、商店、装备、旗帜、章节引擎、存档迁移 |
| [extension-guide.md](extension-guide.md) | 扩展指南：追加道具/技能/敌人/NPC/对话/商店/地图/事件/任务/章节的完整步骤 |
| [testing.md](testing.md) | 四套验证脚本的断言、原理与运行时机 |

## 核心原则

1. **引擎零硬编码**：所有内容都是 `js/content/*.js` 里的数据记录，引擎只提供通用机制。
2. **外键一律用 id 字符串**：跨表引用靠 `validate.js` 在启动时全量校验。
3. **剧情门禁统一走 `state.flags`**（`FLAG_*`），系统不感知具体剧情。
4. **事件驱动解耦**：系统之间通过领域事件通信（`combat:end`、`quest:completed` 等）。
5. **可复现**：seeded RNG + 无 DOM 回放，保证测试确定性。

## 快速地图

- 引擎：`js/core/`（state、save、rng、observer、events、validate、game、version）
- 系统：`js/systems/`（纯逻辑、可 node 测试，不依赖 DOM）
- 界面：`js/ui/`（屏幕渲染 + GRPG 全局桥，action 函数由 main.js 统一挂载）
- 内容：`js/content/`（★ 全部游戏内容，扩展只需改这里）
- 验证：`scripts/`（check / playthrough / uiSmoke / balance）
