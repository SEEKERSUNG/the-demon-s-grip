// localStorage 多存档位 CRUD + 校验。key 前缀 grpg_save_{slot}。
// v1.5.1: 自动存档独立槽位 + 存档导出/导入。

import { SCHEMA_VERSION, migrate } from './state.js';

const PREFIX = 'grpg_save_';
const AUTO_KEY = 'grpg_autosave';
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

// ===== 自动存档独立槽位 =====

export function saveAutoSlot(state) {
  const data = { version: SCHEMA_VERSION, data: JSON.parse(JSON.stringify(state)), savedAt: Date.now() };
  try {
    localStorage.setItem(AUTO_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('自动存档失败', e);
    return false;
  }
}

export function loadAutoSlot() {
  const raw = localStorage.getItem(AUTO_KEY);
  if (!raw) return null;
  try {
    const { data } = JSON.parse(raw);
    return migrate(data);
  } catch (e) {
    console.error('自动读档失败', e);
    return null;
  }
}

export function autoSlotInfo() {
  const raw = localStorage.getItem(AUTO_KEY);
  if (!raw) return null;
  try {
    const { savedAt, data } = JSON.parse(raw);
    return { slot: 'auto', savedAt, chapter: data.chapter, level: data.player?.level, name: data.player?.name, location: data.location };
  } catch {
    return null;
  }
}

export function deleteAutoSlot() {
  localStorage.removeItem(AUTO_KEY);
}

// ===== 存档导出/导入 =====

export function exportSaveData(slot) {
  const raw = slot === 'auto' ? localStorage.getItem(AUTO_KEY) : localStorage.getItem(key(slot));
  if (!raw) return null;
  const info = slot === 'auto' ? autoSlotInfo() : slotInfo(slot);
  if (!info) return null;
  const d = new Date(info.savedAt);
  const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const slotLabel = slot === 'auto' ? 'auto' : `slot${Number(slot)+1}`;
  return { json: raw, filename: `grpg_${slotLabel}_lv${info.level}_${dateStr}.json` };
}

export function importSaveData(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !parsed.data || typeof parsed.data.chapter !== 'number') {
      return { ok: false, error: '无效的存档文件：数据结构不完整' };
    }
    if (!parsed.data.player || !parsed.data.player.name) {
      return { ok: false, error: '无效的存档文件：缺少玩家数据' };
    }
    // 校验并迁移数据
    const migrated = migrate(parsed.data);
    if (!migrated) return { ok: false, error: '存档迁移失败' };
    return { ok: true, state: migrated, savedAt: parsed.savedAt, version: parsed.version };
  } catch (e) {
    return { ok: false, error: '无法解析存档文件：JSON 格式错误' };
  }
}

export function importSaveToSlot(state, savedAt, slot) {
  const data = { version: SCHEMA_VERSION, data: JSON.parse(JSON.stringify(state)), savedAt: savedAt || Date.now() };
  try {
    localStorage.setItem(key(slot), JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('导入存档失败', e);
    return false;
  }
}
