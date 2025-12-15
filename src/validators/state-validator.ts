/**
 * State Validator - state.json 验证器
 *
 * 实现PRD 3.4：状态验证功能
 * - JSON格式验证
 * - 字段完整性检查
 * - 修复建议生成
 *
 * @module validators/state-validator
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ===== 错误类型定义 =====

/**
 * 修复建议
 */
export interface RepairSuggestion {
  method: 'manual_check' | 'git_restore' | 'recreate';
  description: string;
  command?: string;
  link?: string;
}

/**
 * 状态文件错误基类
 */
export class StateError extends Error {
  readonly code: string;
  readonly suggestions: RepairSuggestion[];

  constructor(
    message: string,
    code: string,
    suggestions: RepairSuggestion[] = []
  ) {
    super(message);
    this.name = 'StateError';
    this.code = code;
    this.suggestions = suggestions;
  }
}

/**
 * 状态文件不存在错误
 */
export class StateFileNotFoundError extends StateError {
  constructor(filePath: string) {
    super(
      `state.json 不存在: ${filePath}`,
      'STATE_FILE_NOT_FOUND',
      [
        {
          method: 'recreate',
          description: '创建初始 state.json 文件',
          command: '使用项目初始化命令创建'
        },
        {
          method: 'git_restore',
          description: '从 Git 历史恢复',
          command: 'git checkout HEAD -- .solodev/state.json'
        }
      ]
    );
    this.name = 'StateFileNotFoundError';
  }
}

/**
 * 状态文件格式错误（JSON解析失败）
 *
 * task-003: 包含修复建议
 */
export class StateFileCorruptedError extends StateError {
  readonly parseError: string;
  readonly lineNumber?: number;
  readonly column?: number;

  constructor(filePath: string, parseError: Error) {
    // 尝试从错误消息中提取位置信息
    const positionMatch = parseError.message.match(/position (\d+)/);
    const position = positionMatch ? parseInt(positionMatch[1]) : undefined;

    super(
      `state.json 格式错误，无法解析 JSON: ${parseError.message}`,
      'STATE_FILE_CORRUPTED',
      [
        {
          method: 'manual_check',
          description: '使用 JSON 验证工具检查格式',
          link: 'https://jsonlint.com/'
        },
        {
          method: 'manual_check',
          description: '常见问题检查：缺少逗号、多余逗号、引号不匹配、非法字符',
        },
        {
          method: 'git_restore',
          description: '从 Git 历史恢复上一个版本',
          command: 'git log --oneline -5 .solodev/state.json && git checkout HEAD~1 -- .solodev/state.json'
        }
      ]
    );
    this.name = 'StateFileCorruptedError';
    this.parseError = parseError.message;

    // 如果能获取位置，尝试计算行号
    if (position !== undefined) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.substring(0, position).split('\n');
        this.lineNumber = lines.length;
        this.column = lines[lines.length - 1].length + 1;
      } catch {
        // 忽略读取错误
      }
    }
  }
}

/**
 * 状态文件字段缺失错误
 */
export class StateFieldMissingError extends StateError {
  readonly missingFields: string[];

  constructor(missingFields: string[]) {
    super(
      `state.json 缺少必须字段: ${missingFields.join(', ')}`,
      'STATE_FIELD_MISSING',
      [
        {
          method: 'manual_check',
          description: '手动添加缺失的字段',
        },
        {
          method: 'git_restore',
          description: '从 Git 历史恢复完整版本',
          command: 'git checkout HEAD~1 -- .solodev/state.json'
        }
      ]
    );
    this.name = 'StateFieldMissingError';
    this.missingFields = missingFields;
  }
}

// ===== 验证结果类型 =====

export interface ValidationResult {
  valid: boolean;
  errors: StateError[];
  warnings: string[];
  state?: unknown; // 解析成功后的状态对象
}

// ===== 必须字段定义 =====

const REQUIRED_FIELDS = [
  'schema_version',
  'project',
  'project.name',
  'currentIteration',
  'iterations',
  'moduleDependencies',
  'metadata'
];

// ===== 验证器实现 =====

/**
 * 验证 state.json 文件
 */
export function validateStateFile(
  basePath: string = process.cwd()
): ValidationResult {
  const statePath = path.join(basePath, '.solodev', 'state.json');
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  // 1. 检查文件是否存在
  if (!fs.existsSync(statePath)) {
    result.valid = false;
    result.errors.push(new StateFileNotFoundError(statePath));
    return result;
  }

  // 2. 读取并解析 JSON
  let content: string;
  let state: unknown;

  try {
    content = fs.readFileSync(statePath, 'utf-8');
  } catch (error) {
    result.valid = false;
    result.errors.push(new StateError(
      `无法读取 state.json: ${(error as Error).message}`,
      'STATE_FILE_READ_ERROR'
    ));
    return result;
  }

  try {
    state = JSON.parse(content);
  } catch (error) {
    result.valid = false;
    result.errors.push(new StateFileCorruptedError(statePath, error as Error));
    return result;
  }

  // 3. 检查必须字段
  const missingFields = checkRequiredFields(state, REQUIRED_FIELDS);
  if (missingFields.length > 0) {
    result.valid = false;
    result.errors.push(new StateFieldMissingError(missingFields));
  }

  // 4. 检查文件大小
  const stats = fs.statSync(statePath);
  const sizeKB = stats.size / 1024;

  if (sizeKB > 100) {
    result.warnings.push(
      `state.json 文件大小 (${sizeKB.toFixed(1)}KB) 超过 100KB 限制，建议迁移历史迭代到 state_his.json`
    );
  } else if (sizeKB > 80) {
    result.warnings.push(
      `state.json 文件大小 (${sizeKB.toFixed(1)}KB) 接近 100KB 限制，请注意`
    );
  }

  // 5. 如果验证通过，返回解析后的状态
  if (result.valid) {
    result.state = state;
  }

  return result;
}

/**
 * 检查必须字段
 */
function checkRequiredFields(obj: unknown, fields: string[]): string[] {
  const missing: string[] = [];

  for (const field of fields) {
    const parts = field.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (
        current === null ||
        current === undefined ||
        typeof current !== 'object'
      ) {
        missing.push(field);
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }

    if (current === undefined) {
      missing.push(field);
    }
  }

  return missing;
}

/**
 * 格式化验证结果为可读输出
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push('✅ state.json 验证通过');
  } else {
    lines.push('❌ state.json 验证失败');
  }

  // 输出错误
  for (const error of result.errors) {
    lines.push('');
    lines.push(`错误: ${error.message}`);
    lines.push(`错误码: ${error.code}`);

    if (error.suggestions.length > 0) {
      lines.push('');
      lines.push('修复建议:');
      for (let i = 0; i < error.suggestions.length; i++) {
        const suggestion = error.suggestions[i];
        lines.push(`  ${i + 1}. ${suggestion.description}`);
        if (suggestion.command) {
          lines.push(`     命令: ${suggestion.command}`);
        }
        if (suggestion.link) {
          lines.push(`     链接: ${suggestion.link}`);
        }
      }
    }
  }

  // 输出警告
  for (const warning of result.warnings) {
    lines.push('');
    lines.push(`⚠️ 警告: ${warning}`);
  }

  return lines.join('\n');
}
