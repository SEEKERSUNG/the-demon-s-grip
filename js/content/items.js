// 道具数据（含装备）。追加新道具 = 在此数组末尾加一条记录，引擎零改动。
// type: weapon|armor|accessory|consumable|material|quest
// 装备字段: slot/atk/def/spd/maxHp/maxMp/crit/levelReq/skillUnlocks
// 消耗品字段: usable/effect{hp,mp}/learnSkill

export const ITEMS = [
  // ===== 消耗品 =====
  { id: 'HERB', name: '草药', emoji: '🌿', desc: '采集自山野的药草，恢复60点HP。', type: 'consumable', rarity: 'common', price: 8, usable: true, effect: { hp: 60 } },
  { id: 'POTION_S', name: '生命药水·小', emoji: '🧪', desc: '装在小瓶里的红色药水，恢复120点HP。', type: 'consumable', rarity: 'common', price: 20, usable: true, effect: { hp: 120 } },
  { id: 'POTION_M', name: '生命药水·中', emoji: '🧪', desc: '恢复350点HP。', type: 'consumable', rarity: 'common', price: 50, usable: true, effect: { hp: 350 } },
  { id: 'POTION_L', name: '生命药水·大', emoji: '🧪', desc: '恢复999点HP。', type: 'consumable', rarity: 'rare', price: 120, usable: true, effect: { hp: 999 } },
  { id: 'ETHER_S', name: '魔力药水·小', emoji: '🔮', desc: '恢复60点MP。', type: 'consumable', rarity: 'common', price: 40, usable: true, effect: { mp: 60 } },
  { id: 'ETHER_M', name: '魔力药水·中', emoji: '🔮', desc: '恢复160点MP。', type: 'consumable', rarity: 'rare', price: 100, usable: true, effect: { mp: 160 } },
  { id: 'ELIXIR', name: '秘药·愈', emoji: '✨', desc: '恢复全部HP和MP。', type: 'consumable', rarity: 'epic', price: 300, usable: true, effect: { hp: 99999, mp: 9999 } },

  // ===== 武器 =====
  { id: 'WPN_RUSTY', name: '生锈短剑', emoji: '🗡️', desc: '从废墟里捡到的旧剑，聊胜于无。', type: 'weapon', slot: 'weapon', rarity: 'common', price: 12, atk: 2, levelReq: 1 },
  { id: 'WPN_IRON', name: '铁剑', emoji: '⚔️', desc: '铁匠铺的标准出品，锐利耐用。', type: 'weapon', slot: 'weapon', rarity: 'common', price: 70, atk: 6, levelReq: 2 },
  { id: 'WPN_STEEL', name: '精钢剑', emoji: '🗡️', desc: '精钢锻打，手感沉稳。', type: 'weapon', slot: 'weapon', rarity: 'common', price: 220, atk: 12, levelReq: 6 },
  { id: 'WPN_MYTHRIL', name: '秘银剑', emoji: '🔱', desc: '以秘银铸造，剑身流转银光。', type: 'weapon', slot: 'weapon', rarity: 'rare', price: 650, atk: 18, levelReq: 10 },
  { id: 'WPN_DRAGON', name: '龙牙剑', emoji: '🐉', desc: '以龙牙磨制的利刃，传说曾屠过龙。', type: 'weapon', slot: 'weapon', rarity: 'epic', price: 1400, atk: 26, levelReq: 14 },
  { id: 'WPN_DEMON', name: '深渊之刃', emoji: '🌑', desc: '缠绕着邪气的魔刃，力量与诅咒并存。', type: 'weapon', slot: 'weapon', rarity: 'epic', price: 2400, atk: 34, levelReq: 18 },
  { id: 'WPN_LEGEND', name: '斩魔圣剑', emoji: '🌟', desc: '人类与精灵合力铸就的圣剑，专克邪魔。', type: 'weapon', slot: 'weapon', rarity: 'legendary', price: 5000, atk: 44, levelReq: 22 },

  // ===== 防具 =====
  { id: 'ARM_CLOTH', name: '粗布衣', emoji: '👕', desc: '渔民常穿的旧布衣。', type: 'armor', slot: 'armor', rarity: 'common', price: 10, def: 1, levelReq: 1 },
  { id: 'ARM_LEATHER', name: '皮甲', emoji: '🦺', desc: '硝制过的皮甲，轻便又耐用。', type: 'armor', slot: 'armor', rarity: 'common', price: 80, def: 4, levelReq: 3 },
  { id: 'ARM_CHAIN', name: '锁子甲', emoji: '⛓️', desc: '铁环串成的护甲，防御出色。', type: 'armor', slot: 'armor', rarity: 'common', price: 260, def: 8, levelReq: 7 },
  { id: 'ARM_PLATE', name: '骑士板甲', emoji: '🛡️', desc: '王军制式重甲，坚不可摧。', type: 'armor', slot: 'armor', rarity: 'rare', price: 800, def: 13, levelReq: 11 },
  { id: 'ARM_DRAGON', name: '龙鳞甲', emoji: '🐲', desc: '以龙鳞镶制的战甲，附魔抗性。', type: 'armor', slot: 'armor', rarity: 'epic', price: 2200, def: 20, levelReq: 17 },

  // ===== 饰品 =====
  { id: 'ACC_RING_GOLD', name: '金戒指', emoji: '💍', desc: '黄澄澄的金戒指，戴上更灵活。', type: 'accessory', slot: 'accessory', rarity: 'rare', price: 180, spd: 2, levelReq: 4 },
  { id: 'ACC_AMULET', name: '生命护符', emoji: '📿', desc: '蕴含生命之力的护符，提升体力上限。', type: 'accessory', slot: 'accessory', rarity: 'rare', price: 220, maxHp: 40, levelReq: 4 },
  { id: 'ACC_RING_MAGIC', name: '魔力戒指', emoji: '💍', desc: '缠绕魔力的戒指，提升魔力上限。', type: 'accessory', slot: 'accessory', rarity: 'rare', price: 200, maxMp: 50, levelReq: 5 },
  { id: 'ACC_BROOCH', name: '勇者徽章', emoji: '🎖️', desc: '象征着勇者身份的徽章，提升攻击。', type: 'accessory', slot: 'accessory', rarity: 'epic', price: 500, atk: 5, levelReq: 8 },
  { id: 'ACC_MANTLE', name: '影之披风', emoji: '🧣', desc: '黑暗织就的披风，大幅提升敏捷。', type: 'accessory', slot: 'accessory2', rarity: 'epic', price: 900, spd: 5, levelReq: 12 },

  // ===== 材料 =====
  { id: 'MAT_SLIME_CORE', name: '史莱姆核心', emoji: '🟢', desc: '史莱姆的核心，是炼金的基础材料。', type: 'material', rarity: 'common', price: 10 },
  { id: 'MAT_BAT_WING', name: '蝙蝠翼', emoji: '🦇', desc: '洞穴蝙蝠的翼膜，可用于制作药剂。', type: 'material', rarity: 'common', price: 8 },
  { id: 'MAT_IRON_ORE', name: '铁矿石', emoji: '🪨', desc: '含有铁质的矿石，锻造的原料。', type: 'material', rarity: 'common', price: 15 },
  { id: 'MAT_MONSTER_FANG', name: '魔物獠牙', emoji: '🦷', desc: '魔物锋利的獠牙。', type: 'material', rarity: 'common', price: 20 },
  { id: 'MAT_DEMON_HORN', name: '恶魔之角', emoji: '👹', desc: '恶魔头顶的弯角，蕴含邪气。', type: 'material', rarity: 'rare', price: 120 },
  { id: 'MAT_DRAGON_SCALE', name: '龙鳞', emoji: '🟩', desc: '传说生物龙的鳞片，价值连城。', type: 'material', rarity: 'epic', price: 400 },

  // ===== 任务道具 =====
  { id: 'QI_LETTER', name: '王军徵召令', emoji: '📜', desc: '盖有王印的徵召令，可凭此加入国王军队。', type: 'quest', rarity: 'common', price: 0, quest: true },
  { id: 'QI_ARMY_ORDER', name: '军令文书', emoji: '📜', desc: '军务文书，记录了发兵讨伐的指令。', type: 'quest', rarity: 'common', price: 0, quest: true },
  { id: 'QI_CORRUPT', name: '腐败证据', emoji: '📄', desc: '记录了军饷被克扣的证据，字字惊心。', type: 'quest', rarity: 'common', price: 0, quest: true },
  { id: 'QI_MEDALLION', name: '同袍的勋章', emoji: '🎖️', desc: '战友阿岩的勋章，染着血，沉甸甸的。', type: 'quest', rarity: 'common', price: 0, quest: true },
  { id: 'QI_ELF_LETTER', name: '精灵使节信物', emoji: '🍃', desc: '精灵长老的信物，蕴含自然气息。', type: 'quest', rarity: 'common', price: 0, quest: true },
  { id: 'QI_PEACE_TREATY', name: '三族和平条约', emoji: '🤝', desc: '人类、精灵与魔物三方缔结的和平条约。', type: 'quest', rarity: 'legendary', price: 0, quest: true },
  { id: 'QI_LOCKET', name: '阿琳的贝壳护身符', emoji: '🐚', desc: '渔娘阿琳丢失的护身符，贝壳打磨而成。', type: 'quest', rarity: 'common', price: 0, quest: true },
  { id: 'QI_RATIONS', name: '受潮的军粮', emoji: '🍚', desc: '发霉变质的军粮，与军需账目严重不符。', type: 'quest', rarity: 'common', price: 0, quest: true },
];
