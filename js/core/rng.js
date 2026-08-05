// 可复现的 seeded RNG（mulberry32）。测试/回放可注入种子。

export function createRng(seed = Date.now() >>> 0) {
  let a = seed >>> 0;
  function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const api = {
    seed,
    next,                              // [0,1)
    int(min, max) { return min + Math.floor(next() * (max - min + 1)); },
    chance(p) { return next() < p; },
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    // 按权重数组取下标，如 pickWeighted([['A',2],['B',1]])
    pickWeighted(pairs) {
      const total = pairs.reduce((s, p) => s + p[1], 0);
      let r = next() * total;
      for (const [val, w] of pairs) { r -= w; if (r <= 0) return val; }
      return pairs[pairs.length - 1][0];
    },
    // 从池子里随机抽 n 个（可重复）
    draws(pool, n) { return Array.from({ length: n }, () => api.pick(pool)); },
  };
  return api;
}
