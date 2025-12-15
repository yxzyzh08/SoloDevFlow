/**
 * 命令体系模块 - /init 命令
 *
 * 初始化项目，创建 state.json
 *
 * @module command-system/commands/init
 */

// @integration 状态管理模块.StateManager
import { StateManager } from '../../state-management/api/state-manager.js';
import type { CommandDefinition, CommandContext, CommandResult } from '../types.js';

/**
 * /init 命令定义
 */
export const initCommand: CommandDefinition = {
  name: 'init',
  description: '初始化项目，创建 state.json 文件',
  parameters: [
    {
      name: 'project-name',
      type: 'string',
      required: true,
      description: '项目名称'
    },
    {
      name: 'description',
      type: 'string',
      required: false,
      description: '项目描述'
    }
  ],
  preconditions: [
    {
      type: 'state_not_exists',
      errorMessage: 'state.json 已存在，无法重复初始化',
      severity: 'error'
    }
  ],
  approvalRequired: false,
  handler: async (context: CommandContext): Promise<CommandResult> => {
    const { command } = context;
    const projectName = command.params['project-name'] as string;
    const description = (command.params['description'] as string) || '';

    try {
      // 创建状态管理器
      const stateManager = new StateManager();

      // 初始化项目
      await stateManager.initialize({
        projectName,
        description
      });

      return {
        success: true,
        message: `项目 "${projectName}" 初始化成功`,
        details: {
          projectName,
          description,
          stateFile: '.solodev/state.json'
        },
        nextAction: '使用 /start-requirements 开始需求分析阶段'
      };
    } catch (error) {
      return {
        success: false,
        message: `初始化失败: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
};
