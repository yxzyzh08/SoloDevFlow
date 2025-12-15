#!/usr/bin/env node
/**
 * Validators CLI
 *
 * 命令行验证工具
 *
 * 用法:
 *   npx tsx src/validators/cli.ts state    # 验证 state.json
 *   npx tsx src/validators/cli.ts refs     # 验证文档引用
 *   npx tsx src/validators/cli.ts all      # 全部验证
 *
 * @module validators/cli
 */

import {
  validateStateFile,
  formatValidationResult,
  validateDocumentReferences,
  formatReferenceValidationResult
} from './index.js';

// 获取命令行参数
const args = process.argv.slice(2);
const command = args[0] || 'all';

console.log('━'.repeat(60));
console.log('🔍 SoloDevFlow 验证器');
console.log('━'.repeat(60));
console.log('');

let hasErrors = false;

// 验证 state.json
if (command === 'state' || command === 'all') {
  console.log('📁 验证 state.json...');
  console.log('');

  const stateResult = validateStateFile();
  console.log(formatValidationResult(stateResult));

  if (!stateResult.valid) {
    hasErrors = true;
  }

  console.log('');
}

// 验证文档引用
if (command === 'refs' || command === 'all') {
  console.log('📄 验证文档引用...');
  console.log('');

  const refsResult = validateDocumentReferences();
  console.log(formatReferenceValidationResult(refsResult));

  if (!refsResult.valid) {
    hasErrors = true;
  }

  console.log('');
}

// 显示帮助
if (command === 'help' || command === '--help' || command === '-h') {
  console.log('用法: npx tsx src/validators/cli.ts <command>');
  console.log('');
  console.log('命令:');
  console.log('  state    验证 state.json 格式和字段');
  console.log('  refs     验证文档间引用关系');
  console.log('  all      执行所有验证 (默认)');
  console.log('  help     显示帮助信息');
  console.log('');
  process.exit(0);
}

// 总结
console.log('━'.repeat(60));
if (hasErrors) {
  console.log('❌ 验证完成，存在错误');
  process.exit(1);
} else {
  console.log('✅ 验证完成，所有检查通过');
  process.exit(0);
}
