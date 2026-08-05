// Game 根对象：组装 state/rng/events/content/系统，并接线章节推进。

import { createInitialState } from './state.js';
import { createRng } from './rng.js';
import { createObserver } from './observer.js';
import { CONTENT } from '../content/index.js';
import * as player from '../systems/player.js';
import * as inventory from '../systems/inventory.js';
import * as equipment from '../systems/equipment.js';
import * as skills from '../systems/skills.js';
import * as stats from '../systems/stats.js';
import * as combat from '../systems/combat.js';
import * as enemyAction from '../systems/enemyAction.js';
import * as loot from '../systems/loot.js';
import * as explore from '../systems/explore.js';
import * as encounter from '../systems/encounter.js';
import * as quests from '../systems/quests.js';
import * as flags from '../systems/flags.js';
import * as dialogue from '../systems/dialogue.js';
import * as npc from '../systems/npc.js';
import * as shop from '../systems/shop.js';
import * as story from '../systems/story.js';

export function createGame(opts = {}) {
  const state = opts.savedState || createInitialState();
  const rng = createRng(opts.seed);
  const events = createObserver();
  const game = {
    state,
    rng,
    events,
    CONTENT,
    combat: null,          // 当前战斗对象
    dlgSession: null,      // 当前对话会话
    // 系统 API
    player,
    inventory,
    equipment,
    skills,
    stats,
    combatSys: combat,
    enemyAction,
    loot,
    explore,
    encounter,
    quests,
    flags,
    dialogue,
    npc,
    shop,
    story,
  };

  // 章节推进：主线 endQuest 完成 → 自动 finishChapter
  events.on('quest:completed', ({ quest }) => {
    const ch = CONTENT.chapters.find((c) => c.endQuest === quest.id);
    if (ch && state.chapter === ch.index) {
      game.story.finishChapter(game, ch);
    }
  });

  // 章节开始：自动接取该章第一主线任务
  events.on('chapter:start', ({ chapter }) => {
    if (chapter.objectives?.[0]) {
      const q = quests.getQuest(CONTENT, chapter.objectives[0]);
      if (q) quests.acceptQuest(game, q);
    }
  });

  return game;
}
