/**
 * 命令体系模块 - 命令注册
 *
 * 注册所有可用命令
 *
 * @module command-system/commands
 */

import type { CommandRegistry } from '../registry.js';
import { initCommand } from './init.js';
import { startRequirementsCommand } from './start-requirements.js';
import { startArchitectureCommand } from './start-architecture.js';
import { startImplementationCommand } from './start-implementation.js';
import { startTestingCommand } from './start-testing.js';
import { startDeploymentCommand } from './start-deployment.js';
import { approveCommand } from './approve.js';
import { rollbackCommand } from './rollback.js';
import { statusCommand } from './status.js';

/**
 * 注册所有命令到注册表
 *
 * @param registry - 命令注册表
 */
export function registerAllCommands(registry: CommandRegistry): void {
  registry.registerAll([
    initCommand,
    startRequirementsCommand,
    startArchitectureCommand,
    startImplementationCommand,
    startTestingCommand,
    startDeploymentCommand,
    approveCommand,
    rollbackCommand,
    statusCommand
  ]);
}

/**
 * 导出所有命令定义
 */
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
};
