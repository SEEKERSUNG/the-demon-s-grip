// NPC 数据。role: quest_giver|shop|story|generic|blacksmith|inn
// 追加新 NPC = 末尾加一条记录。

export const NPCS = [
  // ===== 第一章 · 海风渔村 =====
  { id: 'NPC_ELDER', name: '村长福伯', emoji: '🧓', location: 'LOC_VILLAGE', role: 'quest_giver', dialogue: 'DLG_ELDER', quests: ['Q1_CH1_VILLAGE_DESTROYED'], tip: '渔村的主心骨，经历过那场浩劫。' },
  { id: 'NPC_SMITH', name: '铁匠阿伟', emoji: '🔨', location: 'LOC_VILLAGE', role: 'blacksmith', shop: 'SHOP_SMITH', dialogue: 'DLG_SMITH', quests: ['Q1S_SMITH'], tip: '叮叮当当，锻打不停。' },
  { id: 'NPC_INN', name: '旅店老板娘·翠花', emoji: '👩‍🍳', location: 'LOC_VILLAGE', role: 'inn', dialogue: 'DLG_INN', tip: '提供食宿，可在此完全恢复体力。' },
  { id: 'NPC_ALIN', name: '渔娘阿琳', emoji: '🧜‍♀️', location: 'LOC_VILLAGE', role: 'quest_giver', dialogue: 'DLG_ALIN', quests: ['Q1S_ALIN'], tip: '总是在海边发呆的少女。' },
  { id: 'NPC_SAGE', name: '隐世贤者·墨', emoji: '🧙‍♂️', location: 'LOC_VILLAGE', role: 'story', dialogue: 'DLG_SAGE', tip: '自称从远方而来，知晓许多秘辛。' },
  { id: 'NPC_BOATMAN', name: '船夫老马', emoji: '⛵', location: 'LOC_VILLAGE', role: 'story', dialogue: 'DLG_BOATMAN', tip: '望着海面出神的老船夫。' },
  { id: 'NPC_CAPTAIN', name: '王军将领·铁臂', emoji: '🪖', location: 'LOC_VILLAGE', role: 'quest_giver', dialogue: 'DLG_CAPTAIN', quests: ['Q4_CH1_BOSS'], tip: '率军来清剿魔潮的王国将领，目光锐利。' },

  // ===== 第二章 · 王城军营 =====
  { id: 'NPC_QMG', name: '军需官·崔三', emoji: '🧮', location: 'LOC_CAMP', role: 'quest_giver', dialogue: 'DLG_QMG', quests: ['Q2_CH2_MISSION', 'Q2S_QUARTERMASTER'], tip: '拨打算盘的小个子军官，眼神闪烁。' },
  { id: 'NPC_COMRADE', name: '同袍·阿岩', emoji: '🤝', location: 'LOC_CAMP', role: 'quest_giver', dialogue: 'DLG_COMRADE', quests: ['Q2_CH2_RATIONS'], tip: '与你在剿魔战中出生入死的兄弟。', move: { flagTrue: 'FLAG_LEFT_ARMY' } },
  { id: 'NPC_GENERAL', name: '佯装将军·赫里安', emoji: '🪖', location: 'LOC_CAMP', role: 'story', dialogue: 'DLG_GENERAL', tip: '名义上的讨魔军统帅，笑容背后另有深意。', move: { flagTrue: 'FLAG_LEARNED_CORRUPT' } },
  { id: 'NPC_MERCHANT_CAMP', name: '行商·老万', emoji: '🧑‍🌾', location: 'LOC_CAMP', role: 'shop', shop: 'SHOP_CAMP', tip: '走南闯北的军需行商。' },
  { id: 'NPC_MENTOR', name: '神秘老者', emoji: '🧓', location: 'LOC_WASTELAND_FIELD', role: 'quest_giver', dialogue: 'DLG_MENTOR', quests: ['Q2_CH2_TRAINING'], tip: '在荒原独行的老者，目光如炬。' },
  { id: 'NPC_GUARD', name: '边关哨兵', emoji: '🛡️', location: 'LOC_OUTPOST', role: 'quest_giver', dialogue: 'DLG_GUARD', quests: ['Q2S_OUTPOST'], tip: '驻守边关的年轻哨兵。' },

  // ===== 第三章 · 新大陆与战争 =====
  { id: 'NPC_EMISSARY', name: '魔界使者·影', emoji: '🌑', location: 'LOC_NEW_CAPITAL', role: 'quest_giver', dialogue: 'DLG_EMISSARY', quests: ['Q3_CH3_DISTRESS'], tip: '追随你渡海的魔物亲信。' },
  { id: 'NPC_KING', name: '人类国王·亚瑟三世', emoji: '👑', location: 'LOC_HUMAN_CAPITAL', role: 'story', dialogue: 'DLG_KING', tip: '濒临覆灭的人类国王，面容憔悴。' },
  { id: 'NPC_CHANCELLOR', name: '宰相·克伦威', emoji: '🎩', location: 'LOC_HUMAN_CAPITAL', role: 'story', dialogue: 'DLG_CHANCELLOR', tip: '城府极深的宰相，总在暗中观察。' },
  { id: 'NPC_ELF_LORD', name: '精灵长老·艾露恩', emoji: '🧝‍♀️', location: 'LOC_ELF_CAPITAL', role: 'quest_giver', dialogue: 'DLG_ELF_LORD', quests: ['Q3_CH3_MEDIATE', 'Q3S_ELF', 'Q3_CH3_FINAL'], tip: '精灵族的长老，气质清冷。' },
  { id: 'NPC_ELF_MERCHANT', name: '精灵商人·薇安', emoji: '🧝', location: 'LOC_ELF_CAPITAL', role: 'shop', shop: 'SHOP_ELF', tip: '圣树商会的精灵商人。' },
  { id: 'NPC_ELF_SENTINEL', name: '精灵哨兵·菲奥娜', emoji: '🏹', location: 'LOC_ELF_FOREST', role: 'quest_giver', dialogue: 'DLG_ELF_SENTINEL', quests: ['Q3S_TRUST'], tip: '警惕的精灵哨兵，背着长弓。' },
];
