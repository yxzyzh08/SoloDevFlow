/**
 * 命令体系模块 - 主入口
 *
 * 导出所有命令体系相关的类型和功能
 *
 * @module command-system
 */

// 导出类型定义
export type {
  CommandName,
  ParameterType,
  ParameterDefinition,
  PreconditionType,
  PreconditionDefinition,
  CommandDefinition,
  ParsedCommand,
  PreconditionResult,
  CommandContext,
  CommandResult,
  CommandHandler
} from './types';

// 导出错误类
export {
  CommandError,
  CommandParseError,
  PreconditionFailedError,
  CommandExecutionError
} from './types';

// 导出核心类
export { CommandParser, createCommandParser } from './parser';
export { PreconditionChecker, createPreconditionChecker } from './precondition-checker';
export { CommandRegistry, getGlobalRegistry, createCommandRegistry } from './registry';
export { CommandExecutor, createCommandExecutor } from './executor';
export type { ExecutorOptions } from './executor';

// 导出命令定义
export { registerAllCommands } from './commands';
export {
  initCommand,
  startRequirementsCommand,
  startArchitectureCommand,
  startImplementationCommand,
  startTestingCommand,
  startDeploymentCommand,
  approveCommand,
  rollbackCommand,
  statusCommand
} from './commands';
