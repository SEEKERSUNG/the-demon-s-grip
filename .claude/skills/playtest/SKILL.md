---
name: playtest
description: 真实玩家浏览器模拟测试。用无头 Edge 驱动游戏页面完整游玩第一章核心循环（对话/商店/战斗/装备/物品百科/自动战斗/任务地图路径与快速前往/存读档），77~86 项断言（正常流程 77，随战斗随机分支波动）+ 全程页面错误监控 + 截图。当用户要求「真实测试」「浏览器实测」「玩家模拟游玩」，或改动 UI/交互逻辑需要真机验证时使用。
---

# 真实玩家浏览器模拟测试

## 原理

四套 Node 测试（check / playthrough / uiSmoke / balance）用 DOM mock 驱动；本 skill 用**真实浏览器**（无头 Edge + playwright-core）点击真实页面元素游玩，捕捉 mock 覆盖不到的问题：渲染崩溃、事件绑定、控制台错误、交互时序。

## 一次性环境准备（已存在则跳过）

游戏仓库保持零依赖，playwright-core 装在**仓库外**的固定 scratch 目录（以游戏仓库在 `D:\code\the-demon-s-grip` 为例，scratch 为同级 `D:\code\grpg-playtest`；换机器时相应调整）：

```powershell
New-Item -ItemType Directory -Force D:\code\grpg-playtest\shots
Set-Location D:\code\grpg-playtest
npm init -y   # 若无 package.json
npm i playwright-core
```

**无 npm 的机器（本机即如此）**：playwright-core 是纯 JS 包（不含浏览器），直接从 registry 下 tgz 手动解包即可：

```powershell
Invoke-WebRequest "https://registry.npmjs.org/playwright-core/-/playwright-core-<ver>.tgz" -OutFile pw.tgz
New-Item -ItemType Directory -Force _pkg, node_modules | Out-Null
tar -xzf pw.tgz -C _pkg
Move-Item _pkg\package node_modules\playwright-core
Set-Content package.json '{"name":"grpg-playtest","private":true,"type":"module"}'
# 验证：node -e "import('playwright-core').then(m=>console.log(typeof m.chromium))"
```

浏览器用系统自带 Edge（`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`，drive.mjs 顶部 `EDGE` 常量，路径不同就改它），无需下载浏览器。

## 运行步骤

1. 起静态服务器（后台运行）并轮询端口，不要 sleep：

```powershell
python -m http.server 8123 --bind 127.0.0.1 --directory D:\code\the-demon-s-grip
# 轮询 http://127.0.0.1:8123/index.html 直到 200
```

无 python 的机器：跑 scratch 目录里现成的 `node serve.mjs`（~30 行 node 内置 http 静态服务器，MIME 覆盖 html/js/css/png/svg/ico；丢了就照抄一个），同样轮询到 200 再继续。

2. 把本 skill 目录的 drive.mjs 复制进 scratch 目录再运行——ESM 的 `import 'playwright-core'` 只从脚本所在目录向上解析，脚本必须和 node_modules 同侧：

```powershell
Copy-Item D:\code\the-demon-s-grip\.claude\skills\playtest\drive.mjs D:\code\grpg-playtest\
Set-Location D:\code\grpg-playtest
node drive.mjs
```

**输出必须字节透传落盘**，否则 PowerShell `>` 转码会把 ✓/✗ 变成乱码（两种符号都显示为 `?`，无法判断成败）：

```powershell
cmd /c "`"$node`" drive.mjs > run_out.txt 2>&1"
```

3. 读输出：`真实玩家模拟：通过 N 项，失败 M 项` 与 `全程无页面错误`。截图在 `shots/`（按序号命名，纯色空白帧只有几 KB，正常内容 20KB+）。失败时先看 `DEBUG-*.png` 与控制台转储。

4. 测完停掉后台服务器进程。

## 已知坑（写断言/选择器时必读）

- **对话占位按钮**：每行打字完成后先渲染 `<button disabled>…</button>`，250ms 后才是真选项。所有选项等待/定位一律用 `#dlg-options button:not([disabled])`。
- **Q1 随章节开场自动接取**（`chapter:start` 接第一条主线），首次找村长**不会**弹接取 toast；支线（如阿琳）才在对话接取时弹 toast。断言任务状态用 `GRPG.getGame().state`（只读）而不是等 toast。
- **对话选项链**：有的选项走到中间节点（如阿琳 `交给我吧 → n2 →「……」→ end`），收尾必须用 drive.mjs 里的 `endDialogue()` 辅助函数，不要假设直接出现「结束对话」按钮。
- **战斗指令页**：用完道具/技能后 tab 停留在原页，攻击按钮只在攻击页——循环攻击前先点 `.command-tabs button:has-text("攻击")`。
- **toast 生存期 2.2s**：断言 toast 要在触发动作后立即 wait，隔屏操作后再查会 miss。
- **读档界面**：自动存档槽排在手动槽位之前且有同名「读取」按钮，定位手动槽位要用 `.save-slot:has-text("存档位 1")` 限定。
- **打字机动画**：章节开场等 `#btn-continue` 变为 visible（约 2-3s），用 waitForSelector 而不是固定 sleep。
- **战斗中会死**：低血量策略（<45% 用草药/药水）已内置；故意战死测试段（团灭→复活→旅店）也在脚本里，别当成失败。
- **故意战死要打很久**：满血（约 90HP）防御态每轮只挨约 2 伤害，需 45-50 轮才死——防御轮次上限给 90，且战死后用兜底（`GRPG.respawn()`）防止超时崩掉整个 run。前面若有回村休整段，更要给足余量。
- **技能日志文案有坑**：命中是 `旅人 施放【猛击】，对 X 造成 N 点伤害`（技能名带全角【】，裸子串 "猛击" 可匹配），**落空是 `旅人 的攻击落空了！` 不含技能名**——95% 命中率意味着 5% 概率断言死等。断言必须同时匹配两种变体。
- **敌方回合日志**：等「造成」会碰上双方全 miss 的死等，改用 `造成 / 落空 / 施放` 任一匹配。
- **战斗2 用道具别写死草药**：草药可能被前面战斗耗尽或卖掉，用 `filter({ hasText: /草药|生命药水/ })` 匹配任意恢复道具；玩家满血（如战斗1团灭后旅店恢复）时先防御挨一轮再用药；仍失败则 dump 背包+网格到 DEBUG 再降级，不许崩。
- **截图与断言矛盾时先怀疑读取工具串图**：两张视觉相近的截图（如连续两帧同回合战斗）可能被错配。用 `Get-FileHash` 对比确认文件不同，再复制成**新文件名单张读取**核实；确认前别急着改游戏代码。

## 断言覆盖

drive.mjs 当前覆盖（静态 86 处 check 调用；其中「战斗 N 结果」循环、团灭复活、撤退成败为条件断言，随战斗随机性增减，正常流程实跑 77 项、实测区间 77–86；计数随 drive.mjs 改动同步更新）：新档/章节开场/地图导航/对话（接取/交还/多级选项）/商店（对话开商店、等级锁置灰、买、卖）/旅店/宝箱/事件/战斗（防御/道具/逃跑/技能选目标/团灭复活）/任务交还与自动接取（含任务日志地图路径、🧭 快速前往按钮点击直达目标地点与现场恢复）/装备换装（含等级反馈回归）/自动战斗（指令栏入口/默认白名单与阈值/节拍执行/胜利续场/手动停止/立即撤退）/状态/物品百科/存读档往返/全程 pageerror+console.error 监控。

## 维护

- 游戏改了按钮文案/节点结构后，同步更新 drive.mjs 里对应选择器。
- 新功能上线后在 drive.mjs 追加游玩段，参考现有小节结构：操作 → `check(name, cond)` 断言 → `shot(name)` 截图。
- skill 内的 drive.mjs 是唯一权威版本，scratch 目录里的只是运行副本（每次运行前重新复制）。
