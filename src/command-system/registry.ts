/**
 * 命令体系模块 - 命令注册表
 *
 * 负责注册和管理所有命令定义
 *
 * @module command-system/registry
 */

import type { CommandName, CommandDefinition } from './types.js';

/**
 * 命令注册表
 */
export class CommandRegistry {
  private commands: Map<CommandName, CommandDefinition> = new Map();

  /**
   * 注册命令
   *
   * @param definition - 命令定义
   */
  register(definition: CommandDefinition): void {
    if (this.commands.has(definition.name)) {
      throw new Error(`命令 ${definition.name} 已经注册`);
    }

    this.commands.set(definition.name, definition);
  }

  /**
   * 批量注册命令
   *
   * @param definitions - 命令定义列表
   */
  registerAll(definitions: CommandDefinition[]): void {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  /**
   * 获取命令定义
   *
   * @param name - 命令名称
   * @returns 命令定义，如果不存在则返回undefined
   */
  get(name: CommandName): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  /**
   * 检查命令是否存在
   *
   * @param name - 命令名称
   * @returns 是否存在
   */
  has(name: CommandName): boolean {
    return this.commands.has(name);
  }

  /**
   * 获取所有已注册的命令名称
   *
   * @returns 命令名称列表
   */
  getAllNames(): CommandName[] {
    return Array.from(this.commands.keys());
  }

  /**
   * 获取所有已注册的命令定义
   *
   * @returns 命令定义列表
   */
  getAllDefinitions(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  /**
   * 清空所有已注册的命令
   */
  clear(): void {
    this.commands.clear();
  }
}

/**
 * 全局命令注册表实例
 */
let globalRegistry: CommandRegistry | null = null;

/**
 * 获取全局命令注册表实例
 *
 * @returns 命令注册表实例
 */
export function getGlobalRegistry(): CommandRegistry {
  if (!globalRegistry) {
    globalRegistry = new CommandRegistry();
  }
  return globalRegistry;
}

/**
 * 创建新的命令注册表实例
 *
 * @returns 命令注册表实例
 */
export function createCommandRegistry(): CommandRegistry {
  return new CommandRegistry();
}
