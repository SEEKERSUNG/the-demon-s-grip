// 区域（世界地图节点）。unlockFlag 为空则默认解锁。
// 追加新区域 = 末尾加一条记录。

export const REGIONS = [
  // ===== 第一章 =====
  { id: 'REGION_FISHING', name: '海风之域', emoji: '🌊', desc: '濒临东海的渔村群，如今笼罩在魔潮的阴影下。', chapter: 1, unlockFlag: 'FLAG_CH1_START', locations: ['LOC_VILLAGE', 'LOC_SEASHORE', 'LOC_CAVE', 'LOC_BOSS_COVE'] },

  // ===== 第二章 =====
  { id: 'REGION_ARMY', name: '王城与军营', emoji: '🏰', desc: '人类的王都，讨伐魔王的军队在此集结。', chapter: 2, unlockFlag: 'FLAG_CH2_START', locations: ['LOC_CAMP', 'LOC_BARRACKS', 'LOC_RUIN_CITY', 'LOC_AMBUSH', 'LOC_DEMON_PALACE'] },
  { id: 'REGION_OUTPOST', name: '边关哨所', emoji: '🏯', desc: '帝国北疆的边关，是抵御深渊的最前线。', chapter: 2, unlockFlag: 'FLAG_LEFT_ARMY', locations: ['LOC_OUTPOST'] },
  { id: 'REGION_WASTELAND', name: '魔渊荒原', emoji: '🜨', desc: '被深渊魔气侵蚀的荒原，寸草不生。', chapter: 2, unlockFlag: 'FLAG_LEFT_ARMY', locations: ['LOC_WASTELAND_FIELD', 'LOC_PASS'] },

  // ===== 第三章 =====
  { id: 'REGION_ISLAND', name: '无人大陆', emoji: '🏝️', desc: '你带领魔物们建立的新家园，百年来日渐繁荣。', chapter: 3, unlockFlag: 'FLAG_CH3_START', locations: ['LOC_NEW_CAPITAL'] },
  { id: 'REGION_MAINLAND', name: '人类王国', emoji: '🗺️', desc: '战火纷飞的人类故土，王都摇摇欲坠。', chapter: 3, unlockFlag: 'FLAG_CH3_START', locations: ['LOC_HUMAN_CAPITAL', 'LOC_BATTLEFIELD', 'LOC_ELF_FOREST'] },
  { id: 'REGION_ELF', name: '精灵圣域', emoji: '🌳', desc: '精灵族的圣林，自然之力在此汇聚。', chapter: 3, unlockFlag: 'FLAG_ELF_VISITED', locations: ['LOC_ELF_CAPITAL', 'LOC_WAR_TEMPLE'] },
];
