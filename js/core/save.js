// localStorage 多存档位 CRUD + 校验。key 前缀 grpg_save_{slot}。

import { SCHEMA_VERSION, migrate } from './state.js';

const PREFIX = 'grpg_save_';
export const SLOT_COUNT = 4;

function key(slot) { return PREFIX + slot; }

export function saveToSlot(state, slot) {
  const data = { version: SCHEMA_VERSION, data: JSON.parse(JSON.stringify(state)), savedAt: Date.now() };
  try {
    localStorage.setItem(key(slot), JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('存档失败', e);
    return false;
  }
}

export function loadFromSlot(slot) {
  const raw = localStorage.getItem(key(slot));
  if (!raw) return null;
  try {
    const { data } = JSON.parse(raw);
    return migrate(data);
  } catch (e) {
    console.error('读档失败', e);
    return null;
  }
}

export function deleteSlot(slot) {
  localStorage.removeItem(key(slot));
}

export function slotInfo(slot) {
  const raw = localStorage.getItem(key(slot));
  if (!raw) return null;
  try {
    const { savedAt, data } = JSON.parse(raw);
    return {
      slot,
      savedAt,
      chapter: data.chapter,
      level: data.player?.level,
      name: data.player?.name,
      location: data.location,
    };
  } catch {
    return null;
  }
}

export function listSlots() {
  return Array.from({ length: SLOT_COUNT }, (_, i) => slotInfo(i)).filter(Boolean);
}
