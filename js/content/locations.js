// 地点（可探索节点）。type: town|field|dungeon|boss_arena|story_stage
// 追加新地点 = 末尾加一条记录。

export const LOCATIONS = [
  // ===== 第一章 · 海风之域 =====
  { id: 'LOC_VILLAGE', name: '海风渔村', emoji: '🏘️', desc: '你生活了多年的渔村。海风依旧，却再也听不见往日的欢笑声。', type: 'town', region: 'REGION_FISHING', npcs: ['NPC_ELDER', 'NPC_SMITH', 'NPC_INN', 'NPC_ALIN', 'NPC_SAGE', 'NPC_BOATMAN', 'NPC_CAPTAIN'], events: ['EV_SIGN_VILLAGE'] },
  { id: 'LOC_SEASHORE', name: '染血滩涂', emoji: '🏖️', desc: '魔潮登岸之地，滩涂上残留着战斗的痕迹。', type: 'field', region: 'REGION_FISHING', enemies: [['SLIME', 3], ['SEA_CRAB', 2]], events: ['EV_SHIPWRECK'], chests: [{ id: 'CHEST_SHORE_1', item: 'QI_LOCKET', text: '沙子里埋着一枚贝壳护身符，被海藻缠住。' }] },
  { id: 'LOC_CAVE', name: '海蚀洞穴', emoji: '🕳️', desc: '潮水冲刷出的洞穴，据说通向魔物聚集的海底。', type: 'dungeon', region: 'REGION_FISHING', reqLevel: 2, enemies: [['BAT', 3], ['GOBLIN', 2], ['MURLOC', 1]], chests: [{ id: 'CHEST_CAVE_1', item: 'POTION_S', gold: 30, text: '墙角躺着一个旧箱子，里面放着药水和几枚金币。' }, { id: 'CHEST_CAVE_2', item: 'MAT_IRON_ORE', text: '矿脉中嵌着一块铁矿石。' }], events: ['EV_BAT_SWARM'] },
  { id: 'LOC_BOSS_COVE', name: '黑鳞崖·魔巢', emoji: '🌋', desc: '魔潮头目盘踞的巢穴，妖风阵阵，腥气扑鼻。', type: 'boss_arena', region: 'REGION_FISHING', reqQuest: 'Q4_CH1_BOSS', reqLevel: 4, enemies: [['BOSS_RAIDER', 1]] },

  // ===== 第二章 · 王城与军营 =====
  { id: 'LOC_CAMP', name: '王国军营', emoji: '⛺', desc: '讨伐魔王的军营大帐，旗号猎猎，人来人往。', type: 'town', region: 'REGION_ARMY', npcs: ['NPC_QMG', 'NPC_COMRADE', 'NPC_GENERAL', 'NPC_MERCHANT_CAMP'], events: ['EV_CAMP_BULLETIN'] },
  { id: 'LOC_BARRACKS', name: '校场与演武场', emoji: '🏋️', desc: '军士操练之地，近期魔气渗入，常有亡骸作祟。', type: 'field', region: 'REGION_ARMY', enemies: [['SKELETON', 3], ['WAR_BEAST', 1]] },
  { id: 'LOC_RUIN_CITY', name: '沦陷之城·旧王都', emoji: '🏚️', desc: '被深渊魔气吞噬的旧都废墟，怨灵游荡。', type: 'dungeon', region: 'REGION_ARMY', reqLevel: 9, enemies: [['WRAITH', 2], ['CULTIST', 2], ['SKELETON', 1]], chests: [{ id: 'CHEST_RUIN_1', item: 'ETHER_M', text: '残垣下的箱子里放着魔力药水。' }], events: ['EV_RUIN_EVIDENCE'] },
  { id: 'LOC_DEMON_PALACE', name: '深渊王座', emoji: '😈', desc: '魔王盘踞的深渊之巅，魔焰滔天。', type: 'boss_arena', region: 'REGION_ARMY', reqQuest: 'Q2_CH2_FINAL', reqLevel: 14, enemies: [['BOSS_DEMON_KING', 1]] },
  { id: 'LOC_AMBUSH', name: '军营·暗夜', emoji: '🌙', desc: '军营北门外的夜路，入夜后四下无人，杀气隐现。', type: 'boss_arena', region: 'REGION_ARMY', reqFlag: 'FLAG_LEARNED_CORRUPT', reqLevel: 12, enemies: [['BOSS_WARLORD', 1]] },

  // ===== 第二章 · 边关与荒原 =====
  { id: 'LOC_OUTPOST', name: '北境哨所', emoji: '🏯', desc: '帝国北疆的哨所，独自矗立在风雪之中。', type: 'field', region: 'REGION_OUTPOST', reqFlag: 'FLAG_LEFT_ARMY', npcs: ['NPC_GUARD'], enemies: [['DEMON_SOLDIER', 3], ['WAR_BEAST', 1]] },
  { id: 'LOC_WASTELAND_FIELD', name: '荒原', emoji: '🜨', desc: '寸草不生的魔渊荒原，风中带着硫磺的气息。', type: 'field', region: 'REGION_WASTELAND', reqFlag: 'FLAG_LEFT_ARMY', npcs: ['NPC_MENTOR'], enemies: [['CULTIST', 2], ['DEMON_SOLDIER', 2]] },
  { id: 'LOC_PASS', name: '天裂隘口', emoji: '⛰️', desc: '大陆尽头的隘口，翻过去便是无尽之海。', type: 'story_stage', region: 'REGION_WASTELAND', reqFlag: 'FLAG_LEFT_ARMY', events: ['EV_TIANLIE'] },

  // ===== 第三章 · 新家园与战争 =====
  { id: 'LOC_NEW_CAPITAL', name: '魔都·幽都', emoji: '🏙️', desc: '你与魔物们在大陆之外建立的新家园，魔物与人相安无事。', type: 'town', region: 'REGION_ISLAND', npcs: ['NPC_EMISSARY'] },
  { id: 'LOC_HUMAN_CAPITAL', name: '王都·圣奥古斯都', emoji: '🏰', desc: '人类最后的王都，城墙上满是战火的焦痕。', type: 'town', region: 'REGION_MAINLAND', npcs: ['NPC_KING', 'NPC_CHANCELLOR'] },
  { id: 'LOC_BATTLEFIELD', name: '崩坏战场', emoji: '💥', desc: '人类与精灵反复争夺的绞肉机战场，尸横遍野。', type: 'field', region: 'REGION_MAINLAND', enemies: [['WAR_MACHINE', 2], ['DARK_KNIGHT', 2], ['CHIMERA', 1]], events: ['EV_WAR_CRY'] },
  { id: 'LOC_ELF_FOREST', name: '精灵圣林', emoji: '🌲', desc: '精灵族的圣林边缘，树木高大得遮天蔽日。', type: 'field', region: 'REGION_MAINLAND', npcs: ['NPC_ELF_SENTINEL'], enemies: [['CHIMERA', 2], ['DARK_KNIGHT', 1]], events: ['EV_ELF_ALTAR'] },
  { id: 'LOC_ELF_CAPITAL', name: '圣树之都', emoji: '🌳', desc: '精灵族围绕世界之树建立的城市，静谧而美丽。', type: 'town', region: 'REGION_ELF', npcs: ['NPC_ELF_LORD', 'NPC_ELF_MERCHANT'] },
  { id: 'LOC_WAR_TEMPLE', name: '战争之主神殿', emoji: '🗿', desc: '隐藏在山腹中的神殿，战争之主的阴谋在此酝酿。', type: 'boss_arena', region: 'REGION_ELF', reqQuest: 'Q3_CH3_FINAL', reqLevel: 19, enemies: [['BOSS_WARMASTER', 1]] },
];
