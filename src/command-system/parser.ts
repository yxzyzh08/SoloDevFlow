/**
 * 命令体系模块 - 命令解析器
 *
 * 负责解析用户输入的命令字符串
 *
 * @module command-system/parser
 */

import type {
  CommandName,
  ParsedCommand,
  CommandDefinition,
  ParameterDefinition
} from './types.js';
import { CommandParseError } from './types.js';

/**
 * 命令解析器
 */
export class CommandParser {
  /**
   * 解析命令字符串
   *
   * @param input - 用户输入（如 "/start-requirements 状态管理模块"）
   * @param definition - 命令定义
   * @returns 解析后的命令
   */
  parse(input: string, definition: CommandDefinition): ParsedCommand {
    const trimmed = input.trim();

    // 验证命令格式
    if (!trimmed.startsWith('/')) {
      throw new CommandParseError('命令必须以 / 开头', { input });
    }

    // 分割命令名和参数
    const parts = trimmed.slice(1).split(/\s+/);
    const commandName = parts[0] as CommandName;
    const args = parts.slice(1);

    // 验证命令名
    if (commandName !== definition.name) {
      throw new CommandParseError(
        `命令名不匹配: 期望 /${definition.name}, 实际 /${commandName}`,
        { expected: definition.name, actual: commandName }
      );
    }

    // 解析参数
    const params = this.parseParameters(args, definition.parameters);

    return {
      name: commandName,
      params,
      rawInput: input
    };
  }

  /**
   * 解析参数
   */
  private parseParameters(
    args: string[],
    paramDefs: ParameterDefinition[]
  ): Record<string, string | boolean | string[]> {
    const params: Record<string, string | boolean | string[]> = {};

    // 处理位置参数（不以--开头的参数）
    const positionalArgs: string[] = [];
    const namedArgs: Map<string, string> = new Map();

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        // 命名参数
        const name = arg.slice(2);
        const value = args[i + 1];

        if (!value || value.startsWith('--')) {
          // 布尔标志
          namedArgs.set(name, 'true');
        } else {
          // 有值的参数
          namedArgs.set(name, value);
          i++; // 跳过值
        }
      } else {
        // 位置参数
        positionalArgs.push(arg);
      }
    }

    // 验证和转换参数
    for (const paramDef of paramDefs) {
      let value: string | boolean | string[] | undefined;

      // 优先使用命名参数
      if (namedArgs.has(paramDef.name)) {
        value = namedArgs.get(paramDef.name);
      } else if (positionalArgs.length > 0) {
        // 使用位置参数
        value = positionalArgs.shift();
      }

      // 使用默认值
      if (value === undefined && paramDef.defaultValue !== undefined) {
        value = paramDef.defaultValue;
      }

      // 验证必需参数
      if (value === undefined && paramDef.required) {
        throw new CommandParseError(
          `缺少必需参数: ${paramDef.name}`,
          { parameter: paramDef.name }
        );
      }

      // 跳过可选参数
      if (value === undefined) {
        continue;
      }

      // 类型转换和验证
      params[paramDef.name] = this.convertParameter(
        value as string,
        paramDef
      );
    }

    return params;
  }

  /**
   * 转换参数类型
   */
  private convertParameter(
    value: string,
    paramDef: ParameterDefinition
  ): string | boolean | string[] {
    switch (paramDef.type) {
      case 'string':
        return this.validateString(value, paramDef);

      case 'boolean':
        return this.convertBoolean(value);

      case 'string[]':
        return value.split(',').map(v => this.validateString(v.trim(), paramDef));

      default:
        throw new CommandParseError(
          `不支持的参数类型: ${paramDef.type}`,
          { parameter: paramDef.name, type: paramDef.type }
        );
    }
  }

  /**
   * 验证字符串参数
   */
  private validateString(value: string, paramDef: ParameterDefinition): string {
    // 验证枚举值
    if (paramDef.enum && !paramDef.enum.includes(value)) {
      throw new CommandParseError(
        `参数 ${paramDef.name} 的值必须是以下之一: ${paramDef.enum.join(', ')}`,
        { parameter: paramDef.name, value, enum: paramDef.enum }
      );
    }

    // 验证格式
    if (paramDef.pattern) {
      const regex = new RegExp(paramDef.pattern);
      if (!regex.test(value)) {
        throw new CommandParseError(
          `参数 ${paramDef.name} 的格式不正确`,
          { parameter: paramDef.name, value, pattern: paramDef.pattern }
        );
      }
    }

    return value;
  }

  /**
   * 转换布尔值
   */
  private convertBoolean(value: string): boolean {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return true;
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return false;
    }
    throw new CommandParseError(
      `无法将 "${value}" 转换为布尔值`,
      { value }
    );
  }
}

/**
 * 创建命令解析器实例
 */
export function createCommandParser(): CommandParser {
  return new CommandParser();
}
