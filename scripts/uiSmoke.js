// UI 冒烟测试：node scripts/uiSmoke.js
// 用最小 DOM mock 在 node 中加载整个 UI 层，驱动关键交互，捕捉模块加载/运行时崩溃。

import { GAME_VERSION } from '../js/core/version.js';

// ===== 最小 DOM mock =====
function fakeEl(tag = 'div') {
  const el = {
    tagName: tag,
    innerHTML: '',
    textContent: '',
    style: {},
    className: '',
    children: [],
    listeners: {},
    dataset: {},
    _id: null,
    set id(v) { el._id = v; },
    get id() { return el._id; },
    appendChild(child) { el.children.push(child); return child; },
    remove() {},
    addEventListener(ev, fn) { (el.listeners[ev] = el.listeners[ev] || []).push(fn); },
    removeEventListener() {},
    querySelector() { return fakeEl(); },
    querySelectorAll() { return []; },
    scrollTop: 0,
    scrollHeight: 0,
    click() { (el.listeners.click || []).forEach((f) => f()); },
    setAttribute() {},
    getAttribute() { return null; },
  };
  return el;
}

const elements = new Map();
const app = fakeEl();
const toastLayer = fakeEl();
elements.set('app', app);
elements.set('toast-layer', toastLayer);

const localStorageMock = {
  store: {},
  getItem(k) { return this.store[k] ?? null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; },
};

global.document = {
  getElementById(id) { return elements.get(id) || fakeEl(); },
  createElement(tag) { return fakeEl(tag); },
  body: fakeEl('body'),
};
global.window = global;
window.scrollTo = () => {};
window.localStorage = localStorageMock;
window.addEventListener = () => {};
window.setTimeout = (fn) => { fn(); return 1; }; // 同步执行
window.setInterval = () => 0; // 打字机不触发，跳过
window.clearInterval = () => {};
window.clearTimeout = () => {};

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; console.error(`  ✗ ${msg}`); }
}

// ===== 加载 UI =====
console.log('=== 加载 UI 模块 ===');
await import('../js/ui/main.js');
const GRPG = global.GRPG;
assert(!!GRPG, 'GRPG 全局挂载成功');
assert(!!GRPG.boot, 'boot 可用');

console.log('\n=== 标题画面 ===');
GRPG.boot();
assert(app.innerHTML.includes('执魔'), '标题渲染');
assert(app.innerHTML.includes(`v${GAME_VERSION}`), '标题显示版本号');

console.log('\n=== 开新局 → 章节开场 ===');
GRPG.startNewGame(0);
assert(app.innerHTML.includes('第 1 章'), '章节开场渲染');

console.log('\n=== 地图 → 区域 → 地点 ===');
GRPG.showScreen('map');
assert(app.innerHTML.includes('世界地图'), '地图渲染');
GRPG.enterRegion('REGION_FISHING');
assert(app.innerHTML.includes('可探索地点'), '区域渲染');
GRPG.enterLocation('LOC_VILLAGE');
assert(app.innerHTML.includes('海风渔村'), '地点渲染');

console.log('\n=== 对话 ===');
GRPG.talk('NPC_ELDER');
assert(app.innerHTML.includes('村长福伯'), '对话渲染');

console.log('\n=== 对话开商店 ===');
GRPG.talk('NPC_SMITH');
assert(app.innerHTML.includes('铁匠阿伟'), '铁匠对话渲染');
GRPG.chooseDlg(0); // 看看铺子里的货 → 应打开商店且不被对话覆盖
assert(app.innerHTML.includes('买入') && app.innerHTML.includes('铁剑'), '对话“看看铺子里的货”→ 商店打开且有货');

console.log('\n=== 战斗 ===');
// 提升属性保证可测
{
  const g = GRPG.getGame();
  g.state.player.base.maxHp = 500; g.state.player.base.atk = 40;
  g.state.player.cur.hp = 500; g.state.player.base.mp = 200;
}
GRPG.showScreen('map');
GRPG.enterRegion('REGION_FISHING');
GRPG.enterLocation('LOC_SEASHORE');
GRPG.startBattle();
assert(app.innerHTML.includes('战斗'), '战斗屏幕渲染');
GRPG.cmdAttack(); // 至少执行一次指令不崩溃
assert(true, '攻击指令执行');

console.log('\n=== 行商（第二章军营）对话开商店 ===');
GRPG.showScreen('map');
GRPG.enterLocation('LOC_CAMP');
GRPG.talk('NPC_MERCHANT_CAMP');
assert(app.innerHTML.includes('老万'), '行商对话渲染');
GRPG.chooseDlg(0); // 看看货 → 打开商店
assert(app.innerHTML.includes('买入') && app.innerHTML.includes('魔力药水'), '行商「看看货」→ 商店打开且有 MP 药');

console.log('\n=== 背包 / 商店 / 任务 / 状态 / 菜单 ===');
GRPG.showScreen('inventory');
assert(app.innerHTML.includes('装备栏'), '背包渲染');
GRPG.showScreen('shop', { shopId: 'SHOP_SMITH', returnTo: 'location' });
assert(app.innerHTML.includes('买入'), '商店渲染');
GRPG.showScreen('quests');
assert(app.innerHTML.includes('进行中的任务'), '任务日志渲染');
GRPG.showScreen('status');
assert(app.innerHTML.includes('攻击'), '状态面板渲染');
GRPG.openMenu();
assert(app.innerHTML.includes('☰ 菜单'), '菜单渲染');

console.log('\n=== 装备槽 / 背包卖出 ===');
{
  const g = GRPG.getGame();
  g.state.player.gold = 2000;
  const smith = g.CONTENT.shops.find((s) => s.id === 'SHOP_SMITH');
  g.shop.buy(g, smith, 'ACC_RING_GOLD', 1);
  GRPG.equipItem('ACC_RING_GOLD');
  g.shop.buy(g, smith, 'ACC_MANTLE', 1);
  GRPG.equipItem('ACC_MANTLE');
  assert(g.state.player.equipped.accessory === 'ACC_RING_GOLD', '换饰品：金戒指仍在饰品槽');
  assert(g.state.player.equipped.accessory2 === 'ACC_MANTLE', '影之披风进入饰品2槽');

  const herbQty = g.state.inventory.find((s) => s.id === 'HERB')?.qty || 0;
  const goldBefore = g.state.player.gold;
  GRPG.sellItem('HERB');
  const herbAfter = g.state.inventory.find((s) => s.id === 'HERB')?.qty || 0;
  assert(herbAfter === herbQty - 1, '背包卖出：草药减一');
  assert(g.state.player.gold === goldBefore + 4, '背包卖出：获得半价金币');
}

console.log('\n=== 回到标题确认 ===');
GRPG.confirmBackToTitle();
assert(document.body.children.some((c) => c.innerHTML.includes('丢弃未保存')), '回到标题弹出存档确认');
document.body.children.forEach((c) => { if (c.innerHTML.includes('丢弃未保存')) c.remove(); });
assert(app.innerHTML.includes('☰ 菜单'), '取消确认 → 仍在菜单');

console.log('\n=== 菜单返回链 ===');
GRPG.enterRegion('REGION_FISHING');
GRPG.enterLocation('LOC_VILLAGE');
assert(app.innerHTML.includes('海风渔村'), '进入地点');
GRPG.openMenu();
assert(app.innerHTML.includes('返回游戏'), '菜单有返回按钮');
GRPG.backFromMenu();
assert(app.innerHTML.includes('海风渔村'), '菜单返回 → 回到原地点');
GRPG.openMenu();
GRPG.showScreen('inventory'); // 模拟二级菜单
assert(app.innerHTML.includes('装备栏'), '进入二级菜单');
GRPG.showScreen('menu'); // 二级菜单点“返回”→ 回菜单
GRPG.backFromMenu();
assert(app.innerHTML.includes('海风渔村'), '二级菜单返回链 → 回到原地点');

console.log('\n=== 存档 ===');
GRPG.doSave(0);
assert(localStorageMock.store['grpg_save_0'] != null, '存档写入 localStorage');
GRPG.doLoad(0);
assert(!!GRPG.getGame(), '读档成功');

console.log('\n=== 自动保存 ===');
GRPG.backToTitle();
GRPG.startNewGame(1);
GRPG.autoSave();
assert(localStorageMock.store['grpg_save_1'] != null, '自动保存写入当前档位');
GRPG.openMenu();
assert(app.innerHTML.includes('自动保存开启') && app.innerHTML.includes('存档位 2'), '菜单显示自动保存状态');

console.log('\n=== 读档/关于 返回上一级 ===');
GRPG.enterRegion('REGION_FISHING');
GRPG.enterLocation('LOC_VILLAGE');
GRPG.openMenu();
GRPG.showScreen('load', { back: 'menu' });
assert(app.innerHTML.includes('载入存档'), '菜单 → 读档');
assert(app.innerHTML.includes("GRPG.showScreen('menu')"), '读档返回按钮指向上一级菜单');
GRPG.showScreen('about', { back: 'menu' });
assert(app.innerHTML.includes('关于本游戏'), '菜单 → 关于');
assert(app.innerHTML.includes("GRPG.showScreen('menu')"), '关于返回按钮指向上一级菜单');
GRPG.showScreen('menu');
GRPG.backFromMenu();
assert(app.innerHTML.includes('海风渔村'), '读档/关于返回链 → 仍能回到原地点');
GRPG.backToTitle();
GRPG.showScreen('load', { back: 'title' });
assert(app.innerHTML.includes("GRPG.showScreen('title')"), '标题 → 读档返回指向标题');
GRPG.showScreen('about', { back: 'title' });
assert(app.innerHTML.includes('关于本游戏'), '标题 → 关于');
assert(app.innerHTML.includes("GRPG.showScreen('title')"), '标题 → 关于返回指向标题');

console.log('\n=== 自动保存复位 ===');
GRPG.backToTitle();
assert(GRPG.autoSave() === false, '回到标题后自动保存跳过（无进行中游戏）');

console.log('\n====================================');
console.log(`通过 ${passed} 项，失败 ${failed} 项`);
if (failed > 0) process.exit(1);
else console.log('✓ UI 冒烟测试通过');
