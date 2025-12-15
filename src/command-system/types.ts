/**
 * 命令体系模块 - 类型定义
 *
 * 定义命令解析、执行、验证等相关的类型
 *
 * @module command-system/types
 */

// @integration 状态管理模块.State
import type { State, PhaseName } from '../state-management/types.js';

// ============================================================================
// 命令定义相关类型
// ============================================================================

/**
 * 命令名称
 */
export type CommandName =
  | 'init'
  | 'start-requirements'
  | 'start-architecture'
  | 'start-implementation'
  | 'start-testing'
  | 'start-deployment'
  | 'approve'
  | 'rollback'
  | 'status';

/**
 * 参数类型
 */
export type ParameterType = 'string' | 'boolean' | 'string[]';

/**
 * 参数定义
 */
export interface ParameterDefinition {
  /** 参数名称 */
  name: string;

  /** 参数类型 */
  type: ParameterType;

  /** 是否必需 */
  required: boolean;

  /** 默认值 */
  defaultValue?: string | boolean | string[];

  /** 参数描述 */
  description: string;

  /** 参数格式（正则表达式） */
  pattern?: string;

  /** 可选值列表 */
  enum?: string[];
}

/**
 * 前置条件类型
 */
export type PreconditionType =
  | 'state_not_exists'      // state.json不存在（用于/init命令）
  | 'state_exists'          // state.json存在
  | 'phase_completed'       // 指定阶段已完成
  | 'phase_approved'        // 指定阶段已审批
  | 'phase_in_progress'     // 指定阶段进行中
  | 'modules_approved'      // 指定模块已审批
  | 'iteration_not_started' // 迭代未开始
  | 'custom';               // 自定义条件

/**
 * 前置条件定义
 */
export interface PreconditionDefinition {
  /** 条件类型 */
  type: PreconditionType;

  /** 相关阶段（部分类型需要） */
  phase?: PhaseName;

  /** 相关模块（部分类型需要） */
  modules?: string[];

  /** 自定义检查函数（type=custom时使用） */
  customCheck?: (state: State) => Promise<boolean>;

  /** 失败时的错误消息 */
  errorMessage: string;

  /** 严重程度 */
  severity: 'error' | 'warning';
}

/**
 * 命令定义
 */
export interface CommandDefinition {
  /** 命令名称（不含/前缀） */
  name: CommandName;

  /** 命令描述 */
  description: string;

  /** 参数定义 */
  parameters: ParameterDefinition[];

  /** 前置条件列表 */
  preconditions: PreconditionDefinition[];

  /** 是否需要审批 */
  approvalRequired: boolean;

  /** 命令处理函数 */
  handler: CommandHandler;
}

// ============================================================================
// 命令执行相关类型
// ============================================================================

/**
 * 解析后的命令
 */
export interface ParsedCommand {
  /** 命令名称 */
  name: CommandName;

  /** 解析后的参数 */
  params: Record<string, string | boolean | string[]>;

  /** 原始输入 */
  rawInput: string;
}

/**
 * 前置条件检查结果
 */
export interface PreconditionResult {
  /** 是否通过 */
  passed: boolean;

  /** 失败的条件列表 */
  failedConditions: Array<{
    condition: PreconditionDefinition;
    reason: string;
  }>;

  /** 警告列表 */
  warnings: string[];
}

/**
 * 命令执行上下文
 */
export interface CommandContext {
  /** 当前状态 */
  state: State;

  /** 解析后的命令 */
  command: ParsedCommand;

  /** 命令定义 */
  definition: CommandDefinition;

  /** 前置条件检查结果 */
  preconditionResult: PreconditionResult;
}

/**
 * 命令执行结果
 */
export interface CommandResult {
  /** 是否成功 */
  success: boolean;

  /** 结果消息 */
  message: string;

  /** 详细信息 */
  details?: Record<string, unknown>;

  /** 错误信息 */
  error?: Error;

  /** 下一步建议 */
  nextAction?: string;
}

/**
 * 命令处理函数类型
 */
export type CommandHandler = (
  context: CommandContext
) => Promise<CommandResult>;

// ============================================================================
// 错误相关类型
// ============================================================================

/**
 * 命令错误基类
 */
export class CommandError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CommandError';
  }
}

/**
 * 命令解析错误
 */
export class CommandParseError extends CommandError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PARSE_ERROR', details);
    this.name = 'CommandParseError';
  }
}

/**
 * 前置条件检查失败错误
 */
export class PreconditionFailedError extends CommandError {
  constructor(
    message: string,
    public failedConditions: PreconditionResult['failedConditions']
  ) {
    super(message, 'PRECONDITION_FAILED', { failedConditions });
    this.name = 'PreconditionFailedError';
  }
}

/**
 * 命令执行错误
 */
export class CommandExecutionError extends CommandError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'EXECUTION_ERROR', details);
    this.name = 'CommandExecutionError';
  }
}
