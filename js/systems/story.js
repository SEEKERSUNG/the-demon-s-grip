// 章节推进 / 门禁 / 过场。章节即数据，第4章扩展=追加一条 chapter。

import { getRegion } from './explore.js';
import { setFlag } from './flags.js';

export function getChapter(CONTENT, id) {
  return CONTENT.chapters.find((c) => c.id === id);
}

export function chapterByIndex(CONTENT, index) {
  return CONTENT.chapters.find((c) => c.index === index);
}

export function currentChapter(game) {
  return chapterByIndex(game.CONTENT, game.state.chapter);
}

// 开始章节：定位到起始地图，置 introFlag，广播
export function startChapter(game, chapter) {
  const { state } = game;
  state.chapter = chapter.index;
  state.chapterStarted = true;
  if (chapter.introFlag) setFlag(game, chapter.introFlag);
  const region = getRegion(game.CONTENT, chapter.startingMap);
  if (region) {
    state.region = region.id;
    state.location = region.locations?.[0] || null;
  }
  game.events.emit('chapter:start', { chapter });
  return chapter;
}

// 完成章节：置 gate flag，广播（由 quest:completed 自动触发）
export function finishChapter(game, chapter) {
  if (chapter.gate?.flag) setFlag(game, chapter.gate.flag);
  const next = chapter.next ? getChapter(game.CONTENT, chapter.next) : null;
  game.events.emit('chapter:end', { chapter, next });
  return next;
}

// 该章节主线是否全部完成（供世界地图显示章节进度）
export function chapterObjectivesDone(game, chapter) {
  return (chapter.objectives || []).every((qid) => game.state.quests[qid]?.status === 'completed');
}

export function chapterByRegion(game, regionId) {
  const r = getRegion(game.CONTENT, regionId);
  return r ? chapterByIndex(game.CONTENT, r.chapter) : null;
}
