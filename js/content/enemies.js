// 敌人数据。stats: hp/atk/def/spd/mp；ai: ['ATTACK'|'skillId'|{skill,cond}]；skillPool 兜底。
// 追加新敌人 = 末尾加一条记录。

export const ENEMIES = [
  // ===== 第一章 · 渔村周边 =====
  { id: 'SLIME', name: '史莱姆', emoji: '🟢', level: 1, stats: { hp: 40, atk: 8, def: 3, spd: 4, mp: 5 }, xp: 12, gold: 5, drops: [{ item: 'MAT_SLIME_CORE', rate: 0.25 }], skillPool: ['E_TACKLE'], ai: ['ATTACK'], lore: '渔村草地里常见的软体魔物，怕火。' },
  { id: 'BAT', name: '洞穴蝙蝠', emoji: '🦇', level: 2, stats: { hp: 45, atk: 10, def: 2, spd: 9, mp: 5 }, xp: 16, gold: 6, drops: [{ item: 'MAT_BAT_WING', rate: 0.3 }], skillPool: ['E_BITE'], ai: ['ATTACK'], lore: '被魔气侵蚀的蝙蝠，性情暴躁。' },
  { id: 'SEA_CRAB', name: '滩涂魔蟹', emoji: '🦀', level: 2, stats: { hp: 55, atk: 10, def: 5, spd: 3, mp: 5 }, xp: 18, gold: 8, drops: [{ item: 'MAT_MONSTER_FANG', rate: 0.15 }], skillPool: ['E_CLAW'], ai: ['ATTACK'], lore: '巨型化的海蟹，螯足足以夹断桅杆。' },
  { id: 'GOBLIN', name: '哥布林掠夺者', emoji: '👺', level: 3, stats: { hp: 64, atk: 12, def: 4, spd: 7, mp: 5 }, xp: 24, gold: 12, drops: [{ item: 'POTION_S', rate: 0.12 }, { item: 'MAT_MONSTER_FANG', rate: 0.2 }], skillPool: ['E_TACKLE', 'E_CLAW'], ai: ['ATTACK'], lore: '趁魔潮劫掠村庄的哥布林，贪婪而怯懦。' },
  { id: 'MURLOC', name: '鱼人战士', emoji: '🧜', level: 4, stats: { hp: 92, atk: 17, def: 5, spd: 8, mp: 5 }, xp: 32, gold: 15, drops: [{ item: 'MAT_MONSTER_FANG', rate: 0.25 }, { item: 'HERB', rate: 0.15 }], skillPool: ['E_TACKLE', 'E_BITE'], ai: ['ATTACK'], lore: '受魔潮驱使的鱼人，成群结队向陆地进犯。' },
  { id: 'BOSS_RAIDER', name: '魔潮头目·鳞甲', emoji: '🐙', level: 6, boss: true, stats: { hp: 460, atk: 26, def: 10, spd: 8, mp: 30 }, xp: 180, gold: 150, drops: [{ item: 'ACC_BROOCH', rate: 1 }], skillPool: ['E_CLAW', 'E_ROAR'], ai: [{ skill: 'E_ROAR', cond: { hpPct: { lt: 0.5 } } }, 'ATTACK'], lore: '从深海爬上来的魔物统领，正是夜袭渔村的元凶。' },

  // ===== 第二章 · 战场与魔渊 =====
  { id: 'SKELETON', name: '骷髅兵', emoji: '💀', level: 8, stats: { hp: 115, atk: 22, def: 10, spd: 6, mp: 5 }, xp: 46, gold: 20, drops: [{ item: 'MAT_MONSTER_FANG', rate: 0.2 }], skillPool: ['E_TACKLE', 'E_CLAW'], ai: ['ATTACK'], lore: '战场残骸被邪气唤醒的骸骨战士。' },
  { id: 'WRAITH', name: '怨灵', emoji: '👻', level: 9, stats: { hp: 98, atk: 27, def: 6, spd: 13, mp: 20 }, xp: 58, gold: 24, drops: [{ item: 'ETHER_S', rate: 0.12 }], skillPool: ['E_DARK_SPEAR'], ai: ['E_DARK_SPEAR'], lore: '死者的怨念凝结成的亡灵，触之蚀骨。' },
  { id: 'WAR_BEAST', name: '战场凶兽', emoji: '🐺', level: 10, stats: { hp: 160, atk: 32, def: 12, spd: 6, mp: 5 }, xp: 68, gold: 28, drops: [{ item: 'MAT_MONSTER_FANG', rate: 0.3 }], skillPool: ['E_BITE', 'E_CLAW'], ai: ['ATTACK'], lore: '被战争喂养大的魔兽，闻到血腥便发狂。' },
  { id: 'CULTIST', name: '邪修教徒', emoji: '🧙‍♂️', level: 11, stats: { hp: 128, atk: 30, def: 9, spd: 9, mp: 40 }, xp: 78, gold: 32, drops: [{ item: 'ETHER_M', rate: 0.1 }], skillPool: ['E_BLIGHT', 'E_DARK_SPEAR'], ai: ['E_BLIGHT'], lore: '痴迷邪修魔法的狂徒，以血肉祭炼魔能。' },
  { id: 'DEMON_SOLDIER', name: '恶魔士兵', emoji: '👹', level: 12, stats: { hp: 180, atk: 36, def: 14, spd: 8, mp: 10 }, xp: 90, gold: 38, drops: [{ item: 'MAT_DEMON_HORN', rate: 0.15 }], skillPool: ['E_CLAW', 'E_DARK_SPEAR'], ai: ['ATTACK'], lore: '深渊魔王的爪牙，披甲执锐。' },
  { id: 'BOSS_WARLORD', name: '叛乱将领·赫里安', emoji: '🪖', level: 13, boss: true, stats: { hp: 520, atk: 40, def: 15, spd: 10, mp: 30 }, xp: 240, gold: 200, drops: [{ item: 'WPN_STEEL', rate: 1 }], skillPool: ['E_CLAW', 'E_ROAR'], ai: [{ skill: 'E_ROAR', cond: { hpPct: { lt: 0.5 } } }, 'ATTACK'], lore: '腐败的王国将领，为私利出卖了整支军团。' },
  { id: 'BOSS_DEMON_KING', name: '魔王·深渊', emoji: '😈', level: 16, boss: true, stats: { hp: 1000, atk: 50, def: 16, spd: 12, mp: 80 }, xp: 550, gold: 500, drops: [{ item: 'MAT_DEMON_HORN', rate: 1 }, { item: 'WPN_DEMON', rate: 1 }], skillPool: ['E_DARK_SPEAR', 'E_BLIGHT', 'E_ROAR'], ai: [{ skill: 'E_ROAR', cond: { hpPct: { lt: 0.4 } } }, 'E_DARK_SPEAR'], lore: '盘踞深渊千年的魔王，将大陆拖入黑暗的元凶。' },

  // ===== 第三章 · 三族战争 =====
  { id: 'WAR_MACHINE', name: '战争傀儡', emoji: '🤖', level: 15, stats: { hp: 280, atk: 44, def: 20, spd: 4, mp: 5 }, xp: 130, gold: 55, drops: [{ item: 'MAT_IRON_ORE', rate: 0.4 }], skillPool: ['E_TACKLE', 'E_CLAW'], ai: ['ATTACK'], lore: '钢铁与邪术铸造的战争兵器。' },
  { id: 'DARK_KNIGHT', name: '黑暗骑士', emoji: '💂', level: 16, stats: { hp: 250, atk: 48, def: 17, spd: 10, mp: 30 }, xp: 150, gold: 65, drops: [{ item: 'ETHER_M', rate: 0.15 }], skillPool: ['E_DARK_SPEAR', 'E_CLAW'], ai: ['E_DARK_SPEAR'], lore: '被战争之主腐化的堕落骑士。' },
  { id: 'CHIMERA', name: '合成兽', emoji: '🦁', level: 17, stats: { hp: 320, atk: 52, def: 14, spd: 9, mp: 20 }, xp: 170, gold: 75, drops: [{ item: 'MAT_DRAGON_SCALE', rate: 0.1 }], skillPool: ['E_BITE', 'E_FLAME'], ai: ['ATTACK'], lore: '战争之主以龙血与百兽血肉合成的怪物。' },
  { id: 'BOSS_WARMASTER', name: '战争之主', emoji: '🗿', level: 20, boss: true, stats: { hp: 1700, atk: 60, def: 22, spd: 14, mp: 120 }, xp: 900, gold: 900, drops: [{ item: 'WPN_LEGEND', rate: 1 }], skillPool: ['E_FLAME', 'E_DARK_SPEAR', 'E_BLIGHT', 'E_ROAR'], ai: [{ skill: 'E_ROAR', cond: { hpPct: { lt: 0.5 } } }, 'E_FLAME'], lore: '挑动三族相残的幕后黑手，战争是他的养分。' },
];
