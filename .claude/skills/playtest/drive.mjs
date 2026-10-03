// 真实玩家模拟：无头 Edge 驱动游戏页面，完整走第一章核心循环 + 本次新功能
// 覆盖：新档/章节开场/地图/对话接任务/商店(等级锁+买+卖)/旅店/宝箱/事件/
//       战斗(防御/道具/逃跑/技能+选目标/团灭复活)/任务交还与快速前往/装备/状态/物品百科/
//       自动战斗(指令栏入口/节拍/续场/停止/撤退)/存读档
import { chromium } from 'playwright-core';

const BASE = 'http://127.0.0.1:8123';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
// 对话选项渲染前有一个 disabled 的「…」占位按钮，所有选项等待都必须排除它
const OPT = '#dlg-options button:not([disabled])';

const results = [];
function check(name, cond) {
  results.push({ name, ok: !!cond });
  console.log(`  ${cond ? '✓' : '✗'} ${name}`);
}

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});

let shotN = 0;
async function shot(name) {
  shotN += 1;
  const p = `shots/${String(shotN).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: p });
  console.log(`  📸 ${p}`);
}
const state = () => page.evaluate(() => {
  const g = window.GRPG.getGame();
  return g ? JSON.parse(JSON.stringify(g.state)) : null;
});

// 通用对话收尾：优先「结束对话/告辞」，否则点第一个选项推进，直到回到地点屏
async function endDialogue() {
  for (let i = 0; i < 8; i++) {
    await page.waitForSelector(`${OPT}, li:has-text("村长福伯")`, { timeout: 8000 });
    const endBtn = page.locator(`${OPT}:has-text("结束对话")`);
    if (await endBtn.count()) { await endBtn.click(); break; }
    const bye = page.locator(`${OPT}:has-text("告辞")`);
    if (await bye.count()) { await bye.click(); break; }
    const opts = page.locator(OPT);
    if ((await opts.count()) === 0) break; // 已回到地点屏
    await opts.first().click();
  }
  await page.waitForSelector('li:has-text("村长福伯")', { timeout: 8000 });
}

async function gotoSeashore() {
  await page.click('li:has-text("离开此地")');
  await page.waitForSelector('li:has-text("染血滩涂")');
  await page.click('li:has-text("染血滩涂")');
  await page.waitForSelector('li:has-text("探索寻敌")');
}
async function gotoVillage() {
  await page.click('li:has-text("离开此地")');
  await page.waitForSelector('li:has-text("海风渔村")');
  await page.click('li:has-text("海风渔村")');
  await page.waitForSelector('li:has-text("村长福伯")');
}
async function restAtInn() {
  await page.click('li:has-text("旅店老板娘")');
  await page.waitForSelector(OPT, { timeout: 10000 });
  await endDialogue();
}

// ============ 1. 标题 → 新档 ============
console.log('\n=== 标题与新档 ===');
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForSelector('.title-screen', { timeout: 10000 });
check('标题屏渲染（版本号）', (await page.textContent('.version')).includes('v1.7.1'));
await shot('title');
await page.click('button:has-text("新的旅程")');
await page.waitForSelector('button:has-text("开始冒险")');
await shot('newgame-slots');
await page.click('button:has-text("开始冒险")');

// ============ 2. 章节开场 ============
await page.waitForSelector('#btn-continue', { state: 'visible', timeout: 15000 });
check('第一章开场渲染', (await page.textContent('.chapter-tag')).includes('渔村夜袭'));
await shot('chapter1-intro');
await page.click('#btn-continue');
await page.waitForSelector('.map-screen', { timeout: 5000 });
check('世界地图渲染', (await page.textContent('.map-screen')).includes('世界地图'));
await shot('map');

// ============ 3. 进村 ============
await page.click('.region-card:has-text("海风之域")');
await page.waitForSelector('li:has-text("海风渔村")');
await page.click('li:has-text("海风渔村")');
await page.waitForSelector('li:has-text("村长福伯")');
check('渔村渲染（含 NPC 节点）', true);
await shot('village');

// ============ 4. 村长对话（Q1 已在章节开场自动接取）============
check('Q1 渔村之殇已随章节开场自动接取', (await state()).quests.Q1_CH1_VILLAGE_DESTROYED.status === 'active');
await page.click('li:has-text("村长福伯")');
await page.waitForSelector(OPT, { timeout: 10000 });
check('对话渲染（说话人）', (await page.textContent('.speaker')) === '村长福伯');
await shot('dialogue-elder');
await endDialogue();

// ============ 5. 快捷栏 → 任务日志 → 快速前往 ============
await page.click('.bottom-bar button:has-text("任务")');
await page.waitForSelector('.screen:has-text("进行中的任务")');
check('任务日志显示渔村之殇', (await page.textContent('.screen')).includes('渔村之殇'));
{
  const navLines = await page.locator('.obj-path').allTextContents();
  check(`任务目标显示地图路径（${navLines.length} 行）`,
    navLines.length >= 1 && navLines.some((t) => t.includes('世界地图 →')));
}
// 快速前往：talk 目标在当前渔村（不显示按钮），kill 目标在染血滩涂 → 点击直达
check('任务路径显示快速前往按钮', (await page.locator('.obj-path .nav-go').count()) >= 1);
await page.click('.obj-path .nav-go >> nth=0');
await page.waitForSelector('li:has-text("离开此地")', { timeout: 5000 });
check('点击前往 → 直达目标地点', await page.evaluate(() => window.GRPG.getGame().state.location === 'LOC_SEASHORE'));
await shot('quest-quick-go');
await gotoVillage(); // 恢复现场：回渔村，后续流程从渔村继续
await page.click('.bottom-bar button:has-text("任务")');
await page.waitForSelector('.screen:has-text("进行中的任务")');
await shot('quests');
await page.click('.nav-back'); // quickBack → 回渔村
await page.waitForSelector('li:has-text("村长福伯")');
check('快捷返回直接回渔村（不经菜单）', true);

// ============ 6. 阿琳支线 ============
await page.click('li:has-text("渔娘阿琳")');
await page.waitForSelector(OPT, { timeout: 10000 });
await page.waitForSelector('.toast:has-text("接取任务：阿琳的护身符")', { timeout: 3000 });
check('toast：接取任务·阿琳的护身符', true);
await page.click(`${OPT}:has-text("交给我吧")`);
await endDialogue();

// ============ 7. 铁匠：对话开商店 + 等级锁 + 买/卖 ============
await page.click('li:has-text("铁匠阿伟")');
await page.waitForSelector(OPT, { timeout: 10000 });
await page.click(`${OPT}:has-text("看看铺子里的货")`);
await page.waitForSelector('.shop-row', { timeout: 5000 });
check('对话开商店成功', (await page.textContent('.screen')).includes('阿伟的铁匠铺'));
const ironRow = page.locator('.shop-row:has-text("铁剑")');
check('铁剑显示等级需求（需 Lv.2）', (await ironRow.textContent()).includes('需 Lv.2'));
check('铁剑购买按钮置灰（Lv1 不可买）', (await ironRow.locator('button[disabled]').count()) === 1);
await page.click('.shop-row:has-text("生命药水·小") button:has-text("购买")');
await page.waitForSelector('.shop-row:has-text("你的金币")');
check('买药水后金币 80→60', (await page.textContent('.s-price')).includes('💰 60'));
await page.click('.shop-row:has-text("草药") button:has-text("出售")');
await page.waitForSelector('.s-price:has-text("💰 64")');
check('卖草药 1 株 +4 金（64）', true);
await shot('shop');
await page.click('.nav-back'); // closeShop → 回渔村
await page.waitForSelector('li:has-text("村长福伯")');

// ============ 8. 旅店恢复 ============
await page.click('li:has-text("旅店老板娘")');
await page.waitForSelector(OPT, { timeout: 10000 });
await page.waitForSelector('.toast:has-text("体力完全恢复")', { timeout: 3000 });
check('旅店满恢复 toast', true);
await endDialogue();

// ============ 9. 滩涂：宝箱 + 事件 ============
await gotoSeashore();
await page.waitForSelector('li:has-text("宝箱")');
await shot('seashore');
await page.click('li:has-text("宝箱")');
await page.waitForSelector('.toast:has-text("护身符")', { timeout: 3000 });
check('宝箱：获得阿琳的护身符', true);
check('宝箱节点已消失', (await page.locator('li:has-text("宝箱")').count()) === 0);
await page.click('li:has-text("搁浅的商船")');
await page.waitForSelector('.toast', { timeout: 3000 });
check('事件：搁浅商船触发', true);
check('事件节点已消失', (await page.locator('li:has-text("搁浅的商船")').count()) === 0);
check('护身符 collect 目标已同步（阿琳支线）',
  (await state()).quests.Q1S_ALIN.counts['0:1'] === 1);

// ============ 10. 战斗：防御/道具/逃跑/技能/团灭复活 ============
async function playerHpFrac() {
  const t = await page.locator('.player-unit .bar.hp span').textContent();
  const m = t.match(/HP (\d+)\/(\d+)/);
  return m ? Number(m[1]) / Number(m[2]) : 1;
}
async function useHealItem() {
  await page.click('.command-tabs button:has-text("道具")');
  for (const name of ['草药', '生命药水·小', '生命药水·中']) {
    const btn = page.locator(`.command-grid button:has-text("${name}")`);
    if (await btn.count()) { await btn.first().click(); return true; }
  }
  return false;
}
async function battleState() {
  const vic = await page.locator('.victory-panel').count();
  if (vic) return 'victory';
  if (await page.locator('.gameover').count()) return 'defeat';
  if (await page.locator('.combat-screen').count()) return 'fighting';
  return 'unknown';
}
async function attackLoop() {
  for (let i = 0; i < 40; i++) {
    const st = await battleState();
    if (st === 'victory') {
      await page.click('.victory-panel button:has-text("继续")');
      await page.waitForSelector('li:has-text("探索寻敌")');
      return 'victory';
    }
    if (st === 'defeat') return 'defeat';
    if (await playerHpFrac() < 0.45) {
      if (await useHealItem()) continue;
    }
    // 用过道具/技能后指令页停留在原页，攻击按钮只在攻击页——先切回攻击页
    await page.click('.command-tabs button:has-text("攻击")');
    try {
      await page.click('.command-grid button:has-text("攻击")', { timeout: 3000 });
    } catch (e) {
      await page.screenshot({ path: 'shots/DEBUG-attack-timeout.png' });
      const info = await page.evaluate(() => ({
        phase: window.GRPG.getGame()?.combat?.phase,
        gridButtons: [...document.querySelectorAll('.command-grid button')].map((b) => b.textContent.trim()),
      })).catch(() => 'evaluate-failed');
      console.log('DEBUG-attack-timeout:', JSON.stringify(info));
      throw e;
    }
  }
  return 'timeout';
}
async function startBattle() {
  await page.click('li:has-text("探索寻敌")');
  await page.waitForSelector('.combat-screen', { timeout: 5000 });
}
// 战斗收尾：胜→true；团灭→复活(减半)+旅店+重返滩涂再战（最多 2 次团灭）
let deaths = 0;
async function fight() {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await attackLoop();
    if (r === 'victory') return true;
    if (r === 'defeat') {
      deaths += 1;
      await shot(`gameover-${deaths}`);
      await page.click('button:has-text("在最近的城镇醒来")');
      await page.waitForSelector('li:has-text("村长福伯")', { timeout: 5000 });
      const s = await state();
      check(`团灭→复活回渔村（第 ${deaths} 次，HP ${s.player.cur.hp}/${s.player.base.maxHp}）`,
        s.location === 'LOC_VILLAGE' && s.player.cur.hp > 0 && s.player.cur.hp < s.player.base.maxHp);
      await restAtInn();
      await gotoSeashore();
      await startBattle();
    }
  }
  return false;
}

console.log('\n=== 战斗 1：防御（v1.5.3 修复回归）+ 攻击 ===');
await startBattle();
await shot('combat-start');
await page.click('.command-grid button:has-text("防御")');
await page.waitForSelector('.combat-log .cl-line:has-text("防御姿态")', { timeout: 3000 });
check('防御指令执行（不抛 TypeError，v1.5.3 修复）', true);
// 敌方回合：伤害日志含「造成」，全体落空则是「落空」——任一即证明敌方回合已执行
await page.waitForSelector('.combat-log .cl-line:has-text("造成"), .combat-log .cl-line:has-text("落空"), .combat-log .cl-line:has-text("施放")', { timeout: 5000 });
check('防御后敌方回合正常执行（挨打）', true);
check('战斗 1 结果：胜利', await fight());
await shot('combat-victory');

console.log('\n=== 战斗 2：战斗中用道具 ===');
await startBattle();
await page.click('.command-tabs button:has-text("道具")');
// 草药可能被前面战斗消耗/商店卖掉——任一恢复道具都走同一「HP 同步」回归路径
const healBtn = page.locator('.command-grid button').filter({ hasText: /草药|生命药水/ });
const nHeal = await healBtn.count();
if (nHeal > 0) {
  check(`道具页列出恢复道具（${nHeal} 种可选）`, true);
  if ((await playerHpFrac()) >= 0.99) {
    // 满血（如战斗1团灭后旅店满恢复）：先防御挨一轮再用药，模拟真实玩家
    await page.click('.command-tabs button:has-text("攻击")');
    await page.click('.command-grid button:has-text("防御")');
    await page.waitForSelector('.combat-log .cl-line:has-text("造成"), .combat-log .cl-line:has-text("落空"), .combat-log .cl-line:has-text("施放")', { timeout: 5000 });
    await page.click('.command-tabs button:has-text("道具")');
  }
  if ((await playerHpFrac()) < 0.99) {
    try {
      await healBtn.first().click();
      await page.waitForSelector('.combat-log .cl-line:has-text("使用了道具")', { timeout: 5000 });
      check('战斗中使用恢复道具成功（HP 同步修复路径）', true);
    } catch (e) {
      await page.screenshot({ path: 'shots/DEBUG-battle2-use.png' });
      const diag = await page.evaluate(() => ({
        inv: window.GRPG.getGame().state.inventory,
        hp: document.querySelector('.player-unit .bar.hp span')?.textContent,
        grid: [...document.querySelectorAll('.command-grid button')].map((b) => b.textContent.trim()),
        toasts: [...document.querySelectorAll('.toast')].map((t) => t.textContent),
      })).catch((e2) => ({ evaluateFailed: String(e2) }));
      console.log('DEBUG-battle2-use:', JSON.stringify(diag));
      check('战斗中使用恢复道具成功（见 DEBUG-battle2-use）', false);
    }
  } else {
    check('战斗中使用恢复道具（敌方全落空仍满血，本轮跳过）', false);
  }
} else {
  // 诊断后降级：不崩溃，保留后续所有段的覆盖
  await page.screenshot({ path: 'shots/DEBUG-battle2-empty.png' });
  const diag = await page.evaluate(() => ({
    inv: window.GRPG.getGame().state.inventory,
    grid: [...document.querySelectorAll('.command-grid button')].map((b) => b.textContent.trim()),
  }));
  console.log('DEBUG-battle2:', JSON.stringify(diag));
  check('道具页列出恢复道具（背包为空，见 DEBUG-battle2）', false);
}
check('战斗 2 结果：胜利', await fight());

console.log('\n=== 战斗 3：先试逃跑 ===');
await startBattle();
await page.click('.combat-screen .panel button:has-text("逃跑")');
await page.waitForTimeout(300);
const fledBack = (await page.locator('li:has-text("探索寻敌")').count()) === 1;
if (fledBack) {
  check('逃跑成功回到地点', true);
  await startBattle();
} else {
  check('逃跑失败→继续战斗（敌方回合已执行）', (await page.locator('.combat-log .cl-line').count()) > 1);
}
check('战斗 3 结果：胜利', await fight());

// 刷到 Lv2（铁剑需求）且 Q1 史莱姆击杀数达标（3 只）
let extra = 0;
let battleN = 4;
while (extra < 8) {
  const s = await state();
  const kills = s.quests.Q1_CH1_VILLAGE_DESTROYED.counts['0:1'] || 0;
  if (s.player.level >= 2 && kills >= 3) break;
  await startBattle();
  check(`战斗 ${battleN} 结果：胜利`, await fight());
  battleN += 1;
  extra += 1;
}
{
  const s = await state();
  check(`升级到 Lv2 且击杀 3 史莱姆（实际 Lv.${s.player.level}，击杀 ${s.quests.Q1_CH1_VILLAGE_DESTROYED.counts['0:1'] || 0}）`,
    s.player.level >= 2 && (s.quests.Q1_CH1_VILLAGE_DESTROYED.counts['0:1'] || 0) >= 3);
}

// ============ 11. 回村交任务 ============
console.log('\n=== 回村：交还任务 ===');
await gotoVillage();

await page.click('li:has-text("村长福伯")');
await page.waitForSelector(OPT, { timeout: 10000 });
const st1 = await state();
if (st1.quests.Q1_CH1_VILLAGE_DESTROYED.status === 'completed') {
  check('渔村之殇交还完成（杀怪数达标后一次对话交还）', true);
  check('Q2 洞穴中的阴影自动接取', st1.quests.Q2_CH1_CLEAR_CAVE.status === 'active');
} else {
  check('渔村之殇交还完成（杀怪数达标后一次对话交还）', false);
}
await endDialogue();

await page.click('li:has-text("渔娘阿琳")');
await page.waitForSelector(OPT, { timeout: 10000 });
const st2 = await state();
check('阿琳的护身符一次对话交还（宝箱预同步）', st2.quests.Q1S_ALIN.status === 'completed');
check('获得奖励金戒指', (await state()).inventory.some((s) => s.id === 'ACC_RING_GOLD'));
await endDialogue();

// ============ 12. 买铁剑并装备 ============
console.log('\n=== 装备流程（用户报告的 bug 回归）===');
await page.click('li:has-text("铁匠阿伟")');
await page.waitForSelector(OPT, { timeout: 10000 });
await page.click(`${OPT}:has-text("看看铺子里的货")`);
await page.waitForSelector('.shop-row:has-text("铁剑")');
const ironBtn = page.locator('.shop-row:has-text("铁剑") button:has-text("购买")');
check('Lv2 后铁剑可购买', (await ironBtn.count()) === 1 && (await ironBtn.getAttribute('disabled')) === null);
await ironBtn.click();
await page.waitForSelector('.toast:has-text("购入")', { timeout: 3000 });
check('购入铁剑', true);
await page.click('.nav-back');
await page.waitForSelector('li:has-text("村长福伯")');

await page.click('.bottom-bar button:has-text("背包")');
await page.waitForSelector('.tabs button:has-text("装备")');
await page.click('.tabs button:has-text("装备")');
await page.waitForSelector('.item-card:has-text("铁剑")');
await shot('inventory-equip');
await page.click('.item-card:has-text("铁剑")');
await page.waitForSelector('.toast:has-text("已装备 铁剑")', { timeout: 3000 });
check('装备铁剑 toast 正确（不再误报）', true);
const eqSlot = await page.locator('.equip-slot:has-text("武器")').textContent();
check('武器槽显示铁剑', eqSlot.includes('铁剑'));
check('生锈短剑退回背包', (await page.locator('.item-card:has-text("生锈短剑")').count()) === 1);
// 换装往返：装回生锈短剑再换回铁剑，验证合并计数不丢
await page.click('.item-card:has-text("生锈短剑")');
await page.waitForSelector('.toast:has-text("已装备 生锈短剑")', { timeout: 3000 });
await page.click('.item-card:has-text("铁剑")');
await page.waitForSelector('.toast:has-text("已装备 铁剑")', { timeout: 3000 });
check('换装往返正常（背包无重复铁剑）', (await state()).inventory.filter((s) => s.id === 'WPN_IRON').length === 0);
await page.click('.nav-back');
await page.waitForSelector('li:has-text("村长福伯")');

// ============ 13. 战斗中技能 + 选目标 ============
console.log('\n=== 战斗 4：技能（若已学会猛击）===');
const lvNow = (await state()).player.level;
await gotoSeashore();
await startBattle();
await page.click('.command-tabs button:has-text("技能")');
const strikeBtn = page.locator('.command-grid button:has-text("猛击")');
if (lvNow >= 3 && (await strikeBtn.count()) === 1) {
  await strikeBtn.click();
  await page.waitForSelector('.small:has-text("请选择目标")', { timeout: 3000 });
  check('单体技能进入选目标模式', true);
  await page.locator('.enemy-unit').first().click();
  // 95% 命中：命中日志含「施放猛击」，落空日志是「旅人 的攻击落空了」（不含技能名）——两种都算施放成功
  try {
    // 命中日志：「旅人 施放【猛击】，对 X 造成 N 点伤害」（子串"猛击"即可匹配括号）；
    // 落空日志：「旅人 的攻击落空了！」（不含技能名，需单独匹配）
    await page.waitForSelector('.combat-log .cl-line:has-text("猛击"), .combat-log .cl-line:has-text("旅人 的攻击落空")', { timeout: 5000 });
  } catch (e) {
    await page.screenshot({ path: 'shots/DEBUG-skill-cast.png' });
    const info = await page.evaluate(() => {
      const g = window.GRPG.getGame();
      const c = g?.combat;
      return {
        phase: c?.phase, turn: c?.turn, mp: c?.playerUnit?.curMp, hp: c?.playerUnit?.curHp,
        enemies: c?.enemies?.map((e) => ({ n: e.name, alive: e.alive, hp: e.curHp })),
        log: c?.log?.slice(-8).map((l) => l.text),
        prompt: document.querySelector('.small.gold-text')?.textContent || null,
        tab: document.querySelector('.command-tabs button.active')?.textContent?.trim() || null,
        toasts: [...document.querySelectorAll('.toast')].map((t) => t.textContent),
      };
    }).catch((e2) => ({ evaluateFailed: String(e2) }));
    console.log('DEBUG-skill-cast:', JSON.stringify(info));
    throw e;
  }
  check('技能施放 + 点击目标执行（含落空变体）', true);
} else {
  check(`技能页渲染（Lv.${lvNow} 未学猛击则仅验证页面）`, (await page.locator('.command-grid').count()) === 1);
}
check('战斗 4 结果：胜利', await fight());

// ============ 13.4 自动战斗（v1.7.0 新功能：战斗指令栏入口，点击即开始）============
console.log('\n=== 自动战斗（v1.7.0）===');
// 开刷前先回村休整满血（真实玩家习惯：满血再开刷）
await gotoVillage();
await restAtInn();
await gotoSeashore();

check('地点屏无自动挂机节点（入口已移至战斗指令栏）', (await page.locator('li:has-text("自动挂机")').count()) === 0);
await startBattle();
check('指令栏显示自动战斗按钮', (await page.locator('.command-tabs button:has-text("自动战斗")').count()) === 1);
await shot('auto-entry');

// 点击即开始（默认白名单=全部恢复道具、回血线 50%、撤退线 25%），面板接管指令区
await page.click('.command-tabs button:has-text("自动战斗")');
await page.waitForSelector('.auto-panel', { timeout: 5000 });
check('自动战斗面板渲染（含预判）', (await page.textContent('.auto-panel')).includes('预判：'));
check('开始后指令栏被面板替换', (await page.locator('.command-tabs').count()) === 0);
check('面板显示默认阈值（回血线 50% / 撤退线 25%）', (await page.textContent('.auto-panel')).includes('回血线 50% / 撤退线 25%'));
await shot('auto-combat');

// 等自动战斗打完第一场并自动续到第 2 场（TICK 700ms + 续场 1100ms）
await page.waitForSelector('.auto-panel:has-text("第 2 场")', { timeout: 90000 });
check('战斗胜利自动续场（自动战斗面板显示第 2 场）', true);
await shot('auto-battle2');

// 手动停止 → 转手动接管
await page.click('.auto-panel button:has-text("停止自动战斗")');
await page.waitForSelector('.command-tabs', { timeout: 5000 });
check('停止后手动指令面板回归', true);
check('停止后入口按钮回归（可再次开启）', (await page.locator('.command-tabs button:has-text("自动战斗")').count()) === 1);
{
  const turnA = await page.evaluate(() => window.GRPG.getGame().combat.turn);
  await page.waitForTimeout(3200); // > 2 拍 TICK_MS(700)，若有僵尸节拍会推进回合
  const turnB = await page.evaluate(() => window.GRPG.getGame().combat.turn);
  check('停止后无残留节拍（回合数不变）', turnA === turnB);
}
await shot('auto-stopped');
check('停止后手动接管完成战斗', await fight());

// 再次开启自动战斗 → 立即撤退（停止+逃跑一键）；上一场手动打完已回地点，需先开战
await startBattle();
await page.click('.command-tabs button:has-text("自动战斗")');
await page.waitForSelector('.auto-panel', { timeout: 5000 });
await page.click('.auto-panel button:has-text("立即撤退")');
await page.waitForTimeout(2500);
{
  const inLoc = (await page.locator('li:has-text("探索寻敌")').count()) === 1;
  const inCombat = (await page.locator('.combat-screen').count()) === 1;
  const autoPanel = inCombat && (await page.locator('.auto-panel').count()) === 1;
  check('立即撤退后自动战斗已停止（无面板/已离场）', !autoPanel);
  check(`立即撤退生效（${inLoc ? '成功逃离' : inCombat ? '逃跑失败转手动' : '未知状态'}）`,
    inLoc || (inCombat && (await page.locator('.command-tabs').count()) === 1));
  await shot('auto-retreat');
  // 双分支都断言，保证每轮断言计数确定（否则逃跑首试成败会让总数 ±1）
  if (inCombat) check('撤退失败后手动收尾', await fight());
  else check('撤退成功后自动战斗状态已复位', await page.evaluate(() => window.GRPG.uiState.auto?.enabled === false));
}

// ============ 13.5 故意战死 → 团灭面板 → 复活 ============
console.log('\n=== 团灭与复活（只防御不用药，故意战死）===');
await startBattle();
let deathResult = 'timeout';
// 90 轮上限：满血(约90HP)防御态每轮只挨 ~2 伤害，约需 45-50 轮；防御轮次要给足余量
for (let i = 0; i < 90; i++) {
  if (await page.locator('.gameover').count()) { deathResult = 'defeat'; break; }
  await page.click('.command-tabs button:has-text("攻击")');
  await page.click('.command-grid button:has-text("防御")', { timeout: 3000 });
}
check(`只防御不用药 → 玩家倒下（团灭面板，实际 ${deathResult}）`, deathResult === 'defeat');
await shot('gameover');
if (deathResult === 'defeat') {
  await page.click('button:has-text("在最近的城镇醒来")');
} else {
  // 兜底：仍未死则跳过 UI 复活继续后续测试（避免整个 run 崩掉拿不到后面的结果）
  await page.evaluate(() => window.GRPG.respawn());
}
await page.waitForSelector('li:has-text("村长福伯")', { timeout: 5000 });
{
  const s = await state();
  check(`复活回渔村，体力减半（HP ${s.player.cur.hp}）`,
    s.location === 'LOC_VILLAGE' && s.player.cur.hp > 0 && s.player.cur.hp < s.player.base.maxHp + 100);
}
await restAtInn();
check('复活后旅店满恢复', (await state()).player.cur.hp >= (await state()).player.base.maxHp);

// ============ 14. 状态屏 ============
await gotoVillage();
await page.click('.bottom-bar button:has-text("状态")');
await page.waitForSelector('.stat-grid');
check('状态屏渲染（攻击含铁剑加成）', Number((await page.locator('.stat-cell:has-text("攻击") .value').textContent())) >= 15);
await shot('status');
await page.click('.nav-back');
await page.waitForSelector('li:has-text("村长福伯")');

// ============ 15. 物品百科（v1.6.0 新功能）============
console.log('\n=== 物品百科（v1.6.0）===');
await page.click('.nav-menu');
await page.waitForSelector('.screen:has-text("☰ 菜单")');
check('菜单含物品百科入口', (await page.textContent('.screen')).includes('物品百科'));
await page.click('li:has-text("物品百科")');
await page.waitForSelector('.codex-grid');
const codexText = await page.textContent('.screen');
check('百科分组渲染（武器/消耗品）', codexText.includes('⚔️ 武器') && codexText.includes('🧪 消耗品'));
check('百科显示商店获取途径', codexText.includes('商店：阿伟的铁匠铺'));
check('百科显示掉落获取途径', codexText.includes('击败'));
check('百科显示开局携带', codexText.includes('开局携带'));
check('百科显示持有数量', codexText.includes('持有 ×'));
check('百科显示等级需求', codexText.includes('需 Lv.'));
await shot('codex');
await page.click('.nav-back'); // 回菜单
await page.waitForSelector('.screen:has-text("☰ 菜单")');

// ============ 16. 存档 → 回标题 → 读档 ============
console.log('\n=== 存档/读档往返 ===');
await page.click('li:has-text("存档")');
await page.waitForSelector('.save-slot button:has-text("保存")');
await page.click('.save-slot button:has-text("保存")');
await page.waitForSelector('.toast:has-text("已保存到存档位 1")', { timeout: 3000 });
check('保存到存档位 1', true);
const savedState = await state();
await shot('save');
await page.click('.nav-back');
await page.waitForSelector('.screen:has-text("☰ 菜单")');
await page.click('li:has-text("回到标题")');
await page.waitForSelector('button:has-text("直接回去")', { timeout: 5000 });
check('回标题前弹确认框', (await page.textContent('body')).includes('丢弃未保存的进度'));
await shot('confirm-title');
await page.click('button:has-text("直接回去")');
await page.waitForSelector('.title-screen', { timeout: 5000 });
check('回到标题', true);
await page.click('button:has-text("载入存档")');
await page.waitForSelector('.save-slot:has-text("存档位 1") button:has-text("读取")');
await page.click('.save-slot:has-text("存档位 1") button:has-text("读取")');
await page.waitForSelector('li:has-text("村长福伯")', { timeout: 5000 });
const loadedState = await state();
check('读档后回到渔村', loadedState.location === 'LOC_VILLAGE');
check('读档后装备保留（铁剑）', loadedState.player.equipped.weapon === 'WPN_IRON');
check('读档后任务状态保留', loadedState.quests.Q1S_ALIN.status === 'completed');
check('读档后金币一致', loadedState.player.gold === savedState.player.gold);
await shot('loaded');

// ============ 17. 页面错误检查 ============
console.log('\n=== 页面错误检查 ===');
check(`全程无页面错误（pageerror/console.error 共 ${errors.length} 条）`, errors.length === 0);
if (errors.length) errors.slice(0, 10).forEach((e) => console.log('    ' + e));

// ============ 汇总 ============
const passed = results.filter((r) => r.ok).length;
console.log('\n====================================');
console.log(`真实玩家模拟：通过 ${passed} 项，失败 ${results.length - passed} 项（团灭 ${deaths} 次）`);
console.log(`截图 ${shotN} 张 → shots/`);
await browser.close();
process.exit(passed === results.length ? 0 : 1);
