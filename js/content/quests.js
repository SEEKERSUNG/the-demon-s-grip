// 任务数据。type: main|side；turnIn 为空则阶段全通自动完成。
// objective.type: talk(npc)|kill(enemy)|explore(location)|collect(item)
// 追加新任务 = 末尾加一条记录。

export const QUESTS = [
  // ================= 第一章 · 主线 =================
  { id: 'Q1_CH1_VILLAGE_DESTROYED', name: '渔村之殇', chapter: 1, type: 'main', giver: 'NPC_ELDER', turnIn: 'NPC_ELDER',
    desc: '那夜之后，渔村便不再是渔村。为死去的乡亲讨回公道，先从清理肆虐的魔物开始。',
    stages: [
      { id: 's1', desc: '与村长福伯商议后，前往染血滩涂消灭 3 只史莱姆。', objectives: [{ type: 'talk', target: 'NPC_ELDER', n: 1 }, { type: 'kill', target: 'SLIME', n: 3 }] },
      { id: 's2', desc: '返回渔村，向村长复命。', objectives: [{ type: 'talk', target: 'NPC_ELDER', n: 1 }] },
    ],
    rewards: { gold: 120, xp: 80, items: ['POTION_S'] },
    onComplete: { flags: ['FLAG_Q1_DONE'] },
    unlocks: ['Q2_CH1_CLEAR_CAVE'] },

  { id: 'Q2_CH1_CLEAR_CAVE', name: '洞穴中的阴影', chapter: 1, type: 'main', giver: 'NPC_ELDER', turnIn: 'NPC_ELDER',
    desc: '渔村的幸存者说，魔物是从海蚀洞穴里涌出来的。去那里清剿潜藏的蝙蝠，斩断魔物的源头。',
    stages: [
      { id: 's1', desc: '进入海蚀洞穴，消灭 5 只洞穴蝙蝠。', objectives: [{ type: 'talk', target: 'NPC_ELDER', n: 1 }, { type: 'kill', target: 'BAT', n: 5 }] },
      { id: 's2', desc: '返回渔村，向村长复命。', objectives: [{ type: 'talk', target: 'NPC_ELDER', n: 1 }] },
    ],
    rewards: { gold: 200, xp: 160, items: ['WPN_STEEL'] },
    onComplete: { flags: ['FLAG_Q2_DONE'] },
    prereqQuests: ['Q1_CH1_VILLAGE_DESTROYED'],
    unlocks: ['Q3_CH1_HUNT'] },

  { id: 'Q3_CH1_HUNT', name: '猎手的证明', chapter: 1, type: 'main', giver: 'NPC_ELDER', turnIn: 'NPC_ELDER',
    desc: '魔潮头目即将卷土重来。在决战之前，你需要证明自己的实力——猎杀鱼人，收集它们的战利品。',
    stages: [
      { id: 's1', desc: '消灭 3 个鱼人战士，并收集 3 个蝙蝠翼。', objectives: [{ type: 'talk', target: 'NPC_ELDER', n: 1 }, { type: 'kill', target: 'MURLOC', n: 3 }, { type: 'collect', target: 'MAT_BAT_WING', n: 3 }] },
      { id: 's2', desc: '返回渔村，向村长复命。', objectives: [{ type: 'talk', target: 'NPC_ELDER', n: 1 }] },
    ],
    rewards: { gold: 260, xp: 240, items: ['ACC_AMULET', 'POTION_M'] },
    onComplete: { flags: ['FLAG_Q3_DONE'] },
    prereqQuests: ['Q2_CH1_CLEAR_CAVE'],
    unlocks: ['Q4_CH1_BOSS'] },

  { id: 'Q4_CH1_BOSS', name: '决战·黑鳞崖', chapter: 1, type: 'main', giver: 'NPC_CAPTAIN', turnIn: 'NPC_CAPTAIN',
    desc: '魔潮头目·鳞甲藏身于黑鳞崖的巢穴。王国军将领铁臂命你为先锋，去取下它的首级。',
    stages: [
      { id: 's1', desc: '前往黑鳞崖魔巢，击败魔潮头目·鳞甲。', objectives: [{ type: 'kill', target: 'BOSS_RAIDER', n: 1 }] },
      { id: 's2', desc: '回到渔村，向王军将领铁臂复命。', objectives: [{ type: 'talk', target: 'NPC_CAPTAIN', n: 1 }] },
    ],
    rewards: { gold: 400, xp: 350, items: ['QI_LETTER'] },
    prereqQuests: ['Q3_CH1_HUNT'],
    onComplete: { flags: ['FLAG_CH1_CLEAR'] } },

  // ================= 第一章 · 支线 =================
  { id: 'Q1S_ALIN', name: '阿琳的护身符', chapter: 1, type: 'side', giver: 'NPC_ALIN', turnIn: 'NPC_ALIN',
    desc: '渔娘阿琳在袭击中弄丢了母亲留下的贝壳护身符，她恳求你帮忙找回。',
    stages: [
      { id: 's1', desc: '去染血滩涂寻找阿琳丢失的护身符。', objectives: [{ type: 'talk', target: 'NPC_ALIN', n: 1 }, { type: 'collect', target: 'QI_LOCKET', n: 1 }] },
      { id: 's2', desc: '把护身符还给阿琳。', objectives: [{ type: 'talk', target: 'NPC_ALIN', n: 1 }] },
    ],
    rewards: { gold: 80, xp: 60, items: ['ACC_RING_GOLD'] },
    onComplete: { flags: [] } },

  { id: 'Q1S_SMITH', name: '铁匠的委托', chapter: 1, type: 'side', giver: 'NPC_SMITH', turnIn: 'NPC_SMITH',
    desc: '铁匠阿伟的兵器快要用尽了，他需要铁矿石来打造新的兵器。',
    stages: [
      { id: 's1', desc: '收集 3 块铁矿石交给铁匠阿伟。', objectives: [{ type: 'talk', target: 'NPC_SMITH', n: 1 }, { type: 'collect', target: 'MAT_IRON_ORE', n: 3 }] },
      { id: 's2', desc: '把铁矿石交给阿伟。', objectives: [{ type: 'talk', target: 'NPC_SMITH', n: 1 }] },
    ],
    rewards: { gold: 100, xp: 80, items: ['WPN_IRON'] },
    onComplete: { flags: [] } },

  // ================= 第二章 · 主线 =================
  { id: 'Q2_CH2_MISSION', name: '军令如山', chapter: 2, type: 'main', giver: 'NPC_QMG', turnIn: 'NPC_QMG',
    desc: '你持徵召令加入王军。军需官崔三交给你第一个任务——清理校场作祟的骷髅兵。',
    stages: [
      { id: 's1', desc: '前往校场与演武场，消灭 4 个骷髅兵。', objectives: [{ type: 'talk', target: 'NPC_QMG', n: 1 }, { type: 'kill', target: 'SKELETON', n: 4 }] },
      { id: 's2', desc: '回军营向军需官崔三复命。', objectives: [{ type: 'talk', target: 'NPC_QMG', n: 1 }] },
    ],
    rewards: { gold: 300, xp: 300, items: ['ARM_CHAIN', 'QI_ARMY_ORDER'] },
    onComplete: { flags: ['FLAG_MISSION_DONE'] },
    unlocks: ['Q2_CH2_RATIONS'] },

  { id: 'Q2_CH2_RATIONS', name: '军饷疑云', chapter: 2, type: 'main', giver: 'NPC_COMRADE', turnIn: 'NPC_COMRADE',
    desc: '同袍阿岩私下告诉你：发到士兵手里的军粮和军饷，数目对不上。他怀疑有人在克扣。',
    stages: [
      { id: 's1', desc: '前往沦陷之城，在废墟中寻找军需证据。', objectives: [{ type: 'talk', target: 'NPC_COMRADE', n: 1 }, { type: 'explore', target: 'LOC_RUIN_CITY', n: 1 }, { type: 'collect', target: 'QI_RATIONS', n: 1 }] },
      { id: 's2', desc: '带着证据回来见阿岩。', objectives: [{ type: 'talk', target: 'NPC_COMRADE', n: 1 }] },
    ],
    rewards: { gold: 200, xp: 260, items: ['QI_CORRUPT'] },
    onComplete: { flags: ['FLAG_LEARNED_CORRUPT'] },
    prereqQuests: ['Q2_CH2_MISSION'],
    unlocks: ['Q2_CH2_BETRAYAL'] },

  { id: 'Q2_CH2_BETRAYAL', name: '背叛之夜', chapter: 2, type: 'main', giver: 'NPC_COMRADE', turnIn: 'NPC_COMRADE',
    desc: '证据指向统帅赫里安。而赫里安，显然已经察觉了你们的动作。今夜，军营将有变故。',
    stages: [
      { id: 's1', desc: '与阿岩一起对抗前来灭口的赫里安！', objectives: [{ type: 'talk', target: 'NPC_COMRADE', n: 1 }, { type: 'kill', target: 'BOSS_WARLORD', n: 1 }] },
      { id: 's2', desc: '回到阿岩身边。', objectives: [{ type: 'talk', target: 'NPC_COMRADE', n: 1 }] },
    ],
    rewards: { gold: 0, xp: 320, items: ['QI_MEDALLION'] },
    onComplete: { flags: ['FLAG_LEFT_ARMY'] },
    prereqQuests: ['Q2_CH2_RATIONS'],
    unlocks: ['Q2_CH2_TRAINING'] },

  { id: 'Q2_CH2_TRAINING', name: '独行者的修炼', chapter: 2, type: 'main', giver: 'NPC_MENTOR', turnIn: 'NPC_MENTOR',
    desc: '离开军队后，你在荒原遇到的神秘老者说要教你真正的力量。前提是——先证明你的决心。',
    stages: [
      { id: 's1', desc: '在荒原消灭 5 个邪修教徒，向老者证明你的决心。', objectives: [{ type: 'talk', target: 'NPC_MENTOR', n: 1 }, { type: 'kill', target: 'CULTIST', n: 5 }] },
      { id: 's2', desc: '回到老者身边，听他讲述魔王的秘密。', objectives: [{ type: 'talk', target: 'NPC_MENTOR', n: 1 }] },
    ],
    rewards: { gold: 300, xp: 400, items: ['WPN_MYTHRIL', 'ETHER_M'] },
    onComplete: { flags: ['FLAG_TRAINED'] },
    prereqQuests: ['Q2_CH2_BETRAYAL'],
    unlocks: ['Q2_CH2_FINAL'] },

  { id: 'Q2_CH2_FINAL', name: '决战·深渊王座', chapter: 2, type: 'main', giver: 'NPC_MENTOR', turnIn: 'NPC_MENTOR',
    desc: '一切的源头，是盘踞在深渊王座上的魔王。这是你与它之间的最终对决。',
    stages: [
      { id: 's1', desc: '登上深渊王座，击败魔王·深渊！', objectives: [{ type: 'kill', target: 'BOSS_DEMON_KING', n: 1 }] },
      { id: 's2', desc: '回到老者身边。', objectives: [{ type: 'talk', target: 'NPC_MENTOR', n: 1 }] },
    ],
    rewards: { gold: 0, xp: 500, items: [] },
    prereqQuests: ['Q2_CH2_TRAINING'],
    onComplete: { flags: ['FLAG_CH2_CLEAR', 'FLAG_BECAME_DEMON_KING'] } },

  // ================= 第二章 · 支线 =================
  { id: 'Q2S_QUARTERMASTER', name: '军需的缺口', chapter: 2, type: 'side', giver: 'NPC_QMG', turnIn: 'NPC_QMG',
    desc: '军需官崔三面带难色：征调的物资在路上被抢了。他希望你帮忙找回来一些。',
    stages: [
      { id: 's1', desc: '消灭 3 只战场凶兽，并收集 2 块铁矿石。', objectives: [{ type: 'talk', target: 'NPC_QMG', n: 1 }, { type: 'kill', target: 'WAR_BEAST', n: 3 }, { type: 'collect', target: 'MAT_IRON_ORE', n: 2 }] },
      { id: 's2', desc: '把物资带回去交给崔三。', objectives: [{ type: 'talk', target: 'NPC_QMG', n: 1 }] },
    ],
    rewards: { gold: 250, xp: 240, items: ['POTION_M', 'ETHER_M'] },
    onComplete: { flags: [] } },

  { id: 'Q2S_OUTPOST', name: '哨所的隐患', chapter: 2, type: 'side', giver: 'NPC_GUARD', turnIn: 'NPC_GUARD',
    desc: '北境哨所的哨兵报告：深渊的恶魔士兵在哨所附近频繁出没。',
    stages: [
      { id: 's1', desc: '消灭 2 个恶魔士兵。', objectives: [{ type: 'talk', target: 'NPC_GUARD', n: 1 }, { type: 'kill', target: 'DEMON_SOLDIER', n: 2 }] },
      { id: 's2', desc: '向哨兵复命。', objectives: [{ type: 'talk', target: 'NPC_GUARD', n: 1 }] },
    ],
    rewards: { gold: 300, xp: 260, items: ['ARM_PLATE'] },
    onComplete: { flags: [] } },

  // ================= 第三章 · 主线 =================
  { id: 'Q3_CH3_DISTRESS', name: '远方的烽火', chapter: 3, type: 'main', giver: 'NPC_EMISSARY', turnIn: 'NPC_KING',
    desc: '百年弹指而过。故土的烽火传到了幽都——人类与精灵全面开战，人类已濒临覆灭。',
    stages: [
      { id: 's1', desc: '聆听魔界使者的禀报，并动身前往人类王都。', objectives: [{ type: 'talk', target: 'NPC_EMISSARY', n: 1 }, { type: 'explore', target: 'LOC_HUMAN_CAPITAL', n: 1 }] },
      { id: 's2', desc: '与人类国王会面。', objectives: [{ type: 'talk', target: 'NPC_KING', n: 1 }] },
    ],
    rewards: { gold: 500, xp: 400, items: ['WPN_DRAGON'] },
    onComplete: { flags: ['FLAG_DISTRESS_DONE'] },
    unlocks: ['Q3_CH3_FIND_CAUSE'] },

  { id: 'Q3_CH3_FIND_CAUSE', name: '幕后黑手', chapter: 3, type: 'main', giver: 'NPC_KING', turnIn: 'NPC_KING',
    desc: '战争来得太过蹊跷。人类国王恳求你：在精灵圣林与战场上，找到这场战争真正的推手。',
    stages: [
      { id: 's1', desc: '前往崩坏战场与精灵圣林，调查战争的真相，并消灭 3 个黑暗骑士。', objectives: [{ type: 'talk', target: 'NPC_KING', n: 1 }, { type: 'explore', target: 'LOC_ELF_FOREST', n: 1 }, { type: 'kill', target: 'DARK_KNIGHT', n: 3 }] },
      { id: 's2', desc: '带着调查结果回去见国王。', objectives: [{ type: 'talk', target: 'NPC_KING', n: 1 }] },
    ],
    rewards: { gold: 600, xp: 500, items: ['ARM_DRAGON'] },
    onComplete: { flags: ['FLAG_ELF_VISITED'] },
    prereqQuests: ['Q3_CH3_DISTRESS'],
    unlocks: ['Q3_CH3_MEDIATE'] },

  { id: 'Q3_CH3_MEDIATE', name: '三族之盟', chapter: 3, type: 'main', giver: 'NPC_ELF_LORD', turnIn: 'NPC_ELF_LORD',
    desc: '你率百万魔军抵达圣树之都。要让精灵相信「魔物来调停而非征伐」，需要精灵长老的认可。',
    stages: [
      { id: 's1', desc: '与精灵长老会面，并在精灵圣林消灭 2 只合成兽以示诚意。', objectives: [{ type: 'talk', target: 'NPC_ELF_LORD', n: 1 }, { type: 'kill', target: 'CHIMERA', n: 2 }] },
      { id: 's2', desc: '回到精灵长老身边。', objectives: [{ type: 'talk', target: 'NPC_ELF_LORD', n: 1 }] },
    ],
    rewards: { gold: 700, xp: 600, items: ['QI_ELF_LETTER'] },
    onComplete: { flags: ['FLAG_ELF_TRUST'] },
    prereqQuests: ['Q3_CH3_FIND_CAUSE'],
    unlocks: ['Q3_CH3_FINAL'] },

  { id: 'Q3_CH3_FINAL', name: '诛讨·战争之主', chapter: 3, type: 'main', giver: 'NPC_ELF_LORD', turnIn: 'NPC_ELF_LORD',
    desc: '真相水落石出：战争之主，那个以战争为食的远古存在，才是三族相残的根源。它就在神殿深处。',
    stages: [
      { id: 's1', desc: '闯入战争之主神殿，击败战争之主！', objectives: [{ type: 'kill', target: 'BOSS_WARMASTER', n: 1 }] },
      { id: 's2', desc: '带着胜利的见证，回到精灵长老身边。', objectives: [{ type: 'talk', target: 'NPC_ELF_LORD', n: 1 }] },
    ],
    rewards: { gold: 1000, xp: 1200, items: ['QI_PEACE_TREATY', 'WPN_LEGEND'] },
    prereqQuests: ['Q3_CH3_MEDIATE'],
    onComplete: { flags: ['FLAG_CH3_CLEAR', 'FLAG_PEACE'] } },

  // ================= 第三章 · 支线 =================
  { id: 'Q3S_ELF', name: '精灵的信任', chapter: 3, type: 'side', giver: 'NPC_ELF_LORD', turnIn: 'NPC_ELF_LORD',
    desc: '精灵长老想收集一片传说中的龙鳞，用于修复被战争之主破坏的圣树封印。',
    stages: [
      { id: 's1', desc: '收集 1 片龙鳞交给精灵长老。', objectives: [{ type: 'talk', target: 'NPC_ELF_LORD', n: 1 }, { type: 'collect', target: 'MAT_DRAGON_SCALE', n: 1 }] },
      { id: 's2', desc: '把龙鳞交给艾露恩。', objectives: [{ type: 'talk', target: 'NPC_ELF_LORD', n: 1 }] },
    ],
    rewards: { gold: 400, xp: 300, items: ['ACC_RING_MAGIC'] },
    onComplete: { flags: [] } },

  { id: 'Q3S_TRUST', name: '哨兵的疑虑', chapter: 3, type: 'side', giver: 'NPC_ELF_SENTINEL', turnIn: 'NPC_ELF_SENTINEL',
    desc: '精灵哨兵菲奥娜仍不信任魔物。她出了道考题：先去清除圣林外的战争傀儡。',
    stages: [
      { id: 's1', desc: '消灭 2 个战争傀儡。', objectives: [{ type: 'talk', target: 'NPC_ELF_SENTINEL', n: 1 }, { type: 'kill', target: 'WAR_MACHINE', n: 2 }] },
      { id: 's2', desc: '向菲奥娜复命。', objectives: [{ type: 'talk', target: 'NPC_ELF_SENTINEL', n: 1 }] },
    ],
    rewards: { gold: 300, xp: 320, items: ['ETHER_M', 'POTION_L'] },
    onComplete: { flags: [] } },
];
