// 技能数据。type: attack|heal|buff|debuff|special
// learn: { level } 升级自动学 / { item } 使用道具学

export const SKILLS = [
  // ===== 玩家技能 =====
  { id: 'STRIKE', name: '猛击', emoji: '💢', desc: '凝聚力量的沉重一击。', type: 'attack', target: 'single_enemy', mpCost: 6, power: 1.6, hit: 0.95, learn: { level: 3 } },
  { id: 'HEAL', name: '治愈术', emoji: '💚', desc: '初级治愈魔法，恢复自身HP。', type: 'heal', target: 'self', mpCost: 8, power: 2.0, hit: 1, learn: { level: 4 } },
  { id: 'FIREBALL', name: '火球术', emoji: '🔥', desc: '掷出灼热的火球，造成火属性伤害。', type: 'attack', target: 'single_enemy', mpCost: 10, power: 2.3, hit: 0.92, learn: { level: 6 } },
  { id: 'POWER_ATTACK', name: '重斩', emoji: '💥', desc: '蓄力重斩，造成可观伤害。', type: 'attack', target: 'single_enemy', mpCost: 12, power: 2.6, hit: 0.9, learn: { level: 8 } },
  { id: 'ICE_SHARD', name: '冰锥术', emoji: '❄️', desc: '凝聚寒气成锥，贯穿敌人。', type: 'attack', target: 'single_enemy', mpCost: 14, power: 3.0, hit: 0.95, learn: { level: 10 } },
  { id: 'HEAL_PLUS', name: '强效治愈', emoji: '💖', desc: '更强的治愈魔法。', type: 'heal', target: 'self', mpCost: 16, power: 3.4, hit: 1, learn: { level: 12 } },
  { id: 'BERSERK', name: '狂暴', emoji: '😡', desc: '燃烧战意，3回合内攻击力大幅提升。', type: 'buff', target: 'self', mpCost: 12, power: 0, hit: 1, buff: { amt: 1.4, turns: 3 }, learn: { level: 15 } },
  { id: 'FLAME_STORM', name: '烈焰风暴', emoji: '🌋', desc: '召唤烈焰席卷所有敌人。', type: 'attack', target: 'all_enemies', mpCost: 20, power: 1.8, hit: 0.9, learn: { level: 18 } },
  { id: 'DEMON_POWER', name: '魔王的馈赠', emoji: '🌑', desc: '拥抱魔性之力，攻击力暴涨。', type: 'buff', target: 'self', mpCost: 20, power: 0, hit: 1, buff: { amt: 1.5, turns: 4 }, learn: { level: 20 } },
  { id: 'HOLY_LIGHT', name: '圣光斩', emoji: '🌟', desc: '汇聚圣光的斩击，对邪恶有奇效。', type: 'attack', target: 'single_enemy', mpCost: 22, power: 3.6, hit: 0.95, learn: { level: 22 } },

  // ===== 敌方技能 =====
  { id: 'E_TACKLE', name: '冲撞', emoji: '💨', desc: '', type: 'attack', target: 'single_enemy', mpCost: 0, power: 1.2, hit: 0.95 },
  { id: 'E_BITE', name: '撕咬', emoji: '😬', desc: '', type: 'attack', target: 'single_enemy', mpCost: 0, power: 1.5, hit: 0.92 },
  { id: 'E_CLAW', name: '利爪横扫', emoji: '🐾', desc: '', type: 'attack', target: 'single_enemy', mpCost: 0, power: 1.7, hit: 0.9 },
  { id: 'E_BLIGHT', name: '疫病吐息', emoji: '💀', desc: '', type: 'attack', target: 'single_enemy', mpCost: 0, power: 1.9, hit: 0.88 },
  { id: 'E_ROAR', name: '战吼', emoji: '📢', desc: '', type: 'buff', target: 'self', mpCost: 0, power: 0, hit: 1, buff: { amt: 1.3, turns: 3 } },
  { id: 'E_DARK_SPEAR', name: '暗影矛', emoji: '🌚', desc: '', type: 'attack', target: 'single_enemy', mpCost: 0, power: 2.3, hit: 0.88 },
  { id: 'E_FLAME', name: '龙息', emoji: '🔥', desc: '', type: 'attack', target: 'single_enemy', mpCost: 0, power: 2.6, hit: 0.9 },
  { id: 'E_BLOOD_DRINK', name: '嗜血汲取', emoji: '🩸', desc: '', type: 'special', target: 'single_enemy', mpCost: 0, power: 1.6, hit: 0.9 },
];
