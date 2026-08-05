// 内容校验脚本：node scripts/check.js
// 检查 id 唯一性、外键引用完整性、枚举合法性。扩展内容后务必运行。

import { CONTENT } from '../js/content/index.js';
import { validateContent } from '../js/core/validate.js';

const { errors } = validateContent(CONTENT);

const counts = {};
for (const [k, list] of Object.entries(CONTENT)) counts[k] = list.length;

console.log('内容统计:', Object.entries(counts).map(([k, n]) => `${k}=${n}`).join('  '));

if (errors.length) {
  console.error(`\n✗ 校验失败，共 ${errors.length} 处问题：`);
  errors.forEach((e) => console.error('  ' + e));
  process.exit(1);
} else {
  console.log('\n✓ 内容校验通过，所有引用完整。');
}
