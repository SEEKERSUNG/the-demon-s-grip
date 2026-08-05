// 领域事件名常量。系统间通信的唯一通道。

export const EVENTS = {
  // 战斗
  COMBAT_START: 'combat:start',
  COMBAT_END: 'combat:end',
  COMBAT_LOG: 'combat:log',
  // 状态
  PLAYER_CHANGED: 'player:changed',
  INVENTORY_CHANGED: 'inventory:changed',
  GOLD_CHANGED: 'gold:changed',
  FLAG_SET: 'flag:set',
  // 任务
  QUEST_ACCEPTED: 'quest:accepted',
  QUEST_PROGRESS: 'quest:progress',
  QUEST_COMPLETED: 'quest:completed',
  // 世界
  LOCATION_ENTER: 'location:enter',
  EXPLORE_EVENT: 'explore:event',
  CHAPTER_START: 'chapter:start',
  CHAPTER_END: 'chapter:end',
  // UI
  SCREEN_CHANGE: 'screen:change',
  TOAST: 'toast',
};
