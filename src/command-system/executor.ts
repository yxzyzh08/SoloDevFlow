/**
 * 命令体系模块 - 命令执行器
 *
 * 负责解析、验证和执行命令
 *
 * @module command-system/executor
 */

// @integration 状态管理模块.StateManager
import type { State } from '../state-management/types.js';
import type {
  CommandName,
  CommandDefinition,
  ParsedCommand,
  CommandContext,
  CommandResult
} from './types.js';
import {
  CommandError,
  CommandParseError,
  PreconditionFailedError,
  CommandExecutionError
} from './types.js';
import { CommandParser } from './parser.js';
import { PreconditionChecker } from './precondition-checker.js';
import { CommandRegistry } from './registry.js';

/**
 * 命令执行器配置
 */
export interface ExecutorOptions {
  /** 命令注册表 */
  registry: CommandRegistry;

  /** 状态加载函数（可选，部分命令不需要） */
  loadState?: () => Promise<State | undefined>;
}

/**
 * 命令执行器
 */
export class CommandExecutor {
  private parser: CommandParser;
  private preconditionChecker: PreconditionChecker;
  private registry: CommandRegistry;
  private loadState?: () => Promise<State | undefined>;

  constructor(options: ExecutorOptions) {
    this.parser = new CommandParser();
    this.preconditionChecker = new PreconditionChecker();
    this.registry = options.registry;
    this.loadState = options.loadState;
  }

  /**
   * 执行命令
   *
   * @param input - 用户输入（如 "/start-requirements 状态管理模块"）
   * @returns 命令执行结果
   */
  async execute(input: string): Promise<CommandResult> {
    try {
      // 1. 提取命令名
      const commandName = this.extractCommandName(input);
      if (!commandName) {
        return {
          success: false,
          message: '无法识别的命令格式',
          error: new CommandParseError('命令必须以 / 开头', { input })
        };
      }

      // 2. 获取命令定义
      const definition = this.registry.get(commandName);
      if (!definition) {
        return {
          success: false,
          message: `未知的命令: ${commandName}`,
          error: new CommandParseError(`命令 ${commandName} 未注册`, { commandName }),
          nextAction: `可用命令: ${this.registry.getAllNames().join(', ')}`
        };
      }

      // 3. 解析命令
      let parsedCommand: ParsedCommand;
      try {
        parsedCommand = this.parser.parse(input, definition);
      } catch (error) {
        if (error instanceof CommandParseError) {
          return {
            success: false,
            message: `命令解析失败: ${error.message}`,
            error,
            details: error.details
          };
        }
        throw error;
      }

      // 4. 加载状态（如果需要）
      let state: State | undefined;
      if (this.needsState(definition)) {
        if (!this.loadState) {
          return {
            success: false,
            message: '命令需要状态信息，但未提供状态加载函数',
            error: new CommandExecutionError('Missing state loader')
          };
        }

        state = await this.loadState();
      }

      // 5. 检查前置条件
      const preconditionResult = await this.preconditionChecker.check(
        definition.preconditions,
        state
      );

      if (!preconditionResult.passed) {
        return {
          success: false,
          message: '前置条件检查失败',
          error: new PreconditionFailedError(
            '前置条件检查失败',
            preconditionResult.failedConditions
          ),
          details: {
            failedConditions: preconditionResult.failedConditions,
            warnings: preconditionResult.warnings
          }
        };
      }

      // 6. 构建执行上下文
      const context: CommandContext = {
        state: state!,
        command: parsedCommand,
        definition,
        preconditionResult
      };

      // 7. 执行命令
      try {
        const result = await definition.handler(context);

        // 附加警告信息（如果有）
        if (preconditionResult.warnings.length > 0) {
          result.details = {
            ...result.details,
            warnings: preconditionResult.warnings
          };
        }

        return result;
      } catch (error) {
        return {
          success: false,
          message: `命令执行失败: ${error instanceof Error ? error.message : String(error)}`,
          error: error instanceof Error ? error : new CommandExecutionError(String(error)),
          details: {
            command: parsedCommand.name,
            params: parsedCommand.params
          }
        };
      }
    } catch (error) {
      // 未预期的错误
      return {
        success: false,
        message: `系统错误: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 提取命令名
   */
  private extractCommandName(input: string): CommandName | null {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) {
      return null;
    }

    const parts = trimmed.slice(1).split(/\s+/);
    return parts[0] as CommandName;
  }

  /**
   * 判断命令是否需要状态
   */
  private needsState(definition: CommandDefinition): boolean {
    // /init 命令不需要状态（因为是初始化命令）
    if (definition.name === 'init') {
      return false;
    }

    // 其他命令都需要状态
    return true;
  }
}

/**
 * 创建命令执行器实例
 */
export function createCommandExecutor(options: ExecutorOptions): CommandExecutor {
  return new CommandExecutor(options);
}
