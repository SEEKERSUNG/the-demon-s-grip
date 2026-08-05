// 探索/剧情事件。type: story|sign|collect|battle|dialogue|choice
// once+flag：触发一次后不再出现。

export const EVENTS = [
  // ===== 第一章 =====
  { id: 'EV_SIGN_VILLAGE', type: 'sign', emoji: '📜', title: '村口告示', text: '「告示：近日魔潮猖獗，国王军已于北境集结，征召勇士讨伐魔物。凡立志除魔者，可持此告示前往军营报到。」\n\n小字：村中铁匠阿伟有兵器出售，旅店老板娘翠花可歇脚疗伤。除魔之前，先备好家伙与干粮。', once: true, flag: 'FLAG_EV_SIGN', then: {} },
  { id: 'EV_SHIPWRECK', type: 'collect', emoji: '🚢', title: '搁浅的商船', text: '一艘破损的商船搁浅在滩涂上，你从船舱里搜出了一些补给。', once: true, flag: 'FLAG_EV_SHIPWRECK', then: { items: ['POTION_M', 'HERB'], gold: 40 } },
  { id: 'EV_BAT_SWARM', type: 'battle', emoji: '🦇', title: '蝙蝠群袭击', text: '扑簌簌一阵响动，成群的蝙蝠从洞穴深处扑来！', once: true, flag: 'FLAG_EV_BATS', then: { enemies: ['BAT', 'BAT', 'BAT'] } },

  // ===== 第二章 =====
  { id: 'EV_CAMP_BULLETIN', type: 'sign', emoji: '📯', title: '军营布告', text: '「军令：三日后发兵渊薮，讨伐深渊魔王。各营务必整备军械粮草，违者军法处置。——讨魔军统帅 赫里安」', once: true, flag: 'FLAG_EV_CAMP', then: {} },
  { id: 'EV_RUIN_EVIDENCE', type: 'collect', emoji: '📄', title: '暗格中的账本', text: '你在沦陷之城的废墟暗格里，翻出了一本军需账本和几袋发霉的军粮。账目上的数字触目惊心。', once: true, flag: 'FLAG_EV_EVIDENCE', then: { items: ['QI_RATIONS'], gold: 0 } },
  { id: 'EV_TIANLIE', type: 'story', emoji: '⛰️', title: '天裂隘口', text: '你站在大陆尽头的隘口上，身后是千疮百孔的故土，眼前是烟波浩渺的无尽之海。\n\n身后传来魔物们的低吼，它们静静地等待着你——这个杀死魔王、又继承了魔王之力的怪物。\n\n「走吧。」你对自己说，「在那里，我们会有一座新的家园。」', once: true, flag: 'FLAG_EV_TIANLIE', then: {} },

  // ===== 第三章 =====
  { id: 'EV_WAR_CRY', type: 'story', emoji: '💥', title: '战场的呢喃', text: '战场上空弥漫着浓重的血腥味。残破的旌旗、折断的长矛、无声的骸骨……这里曾经是人类与精灵并肩作战的地方，如今却相互厮杀。\n\n「是谁，让鲜血浇灌了这片土地？」你握紧了剑柄。', once: true, flag: 'FLAG_EV_WAR', then: {} },
  { id: 'EV_ELF_ALTAR', type: 'story', emoji: '🌳', title: '圣树祭坛', text: '圣林深处的祭坛上，精灵们正做着战前的祈祷。你敏锐地察觉到——祭坛下方的地脉，被人为地注入了大量邪气。\n\n有人在刻意点燃两族之间的战火。', once: true, flag: 'FLAG_EV_ELF_ALTAR', then: {} },
];
