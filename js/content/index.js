// 内容聚合入口。所有游戏内容在此汇总，验证与运行都从这取数。

import { ITEMS } from './items.js';
import { SKILLS } from './skills.js';
import { ENEMIES } from './enemies.js';
import { NPCS } from './npcs.js';
import { REGIONS } from './regions.js';
import { LOCATIONS } from './locations.js';
import { EVENTS } from './events.js';
import { QUESTS } from './quests.js';
import { DIALOGUES } from './dialogue.js';
import { SHOPS } from './shops.js';
import { CHAPTERS } from './chapters.js';

export const CONTENT = {
  items: ITEMS,
  skills: SKILLS,
  enemies: ENEMIES,
  npcs: NPCS,
  regions: REGIONS,
  locations: LOCATIONS,
  events: EVENTS,
  quests: QUESTS,
  dialogues: DIALOGUES,
  shops: SHOPS,
  chapters: CHAPTERS,
};
