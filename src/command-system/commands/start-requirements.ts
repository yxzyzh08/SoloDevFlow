/**
 * 命令体系模块 - /start-requirements 命令
 *
 * 开始需求分析阶段
 *
 * @module command-system/commands/start-requirements
 */

// @integration 状态管理模块.StateManager
import { StateManager } from '../../state-management/api/state-manager.js';
import type { CommandDefinition, CommandContext, CommandResult } from '../types.js';

/**
 * /start-requirements 命令定义
 */
export const startRequirementsCommand: CommandDefinition = {
  name: 'start-requirements',
  description: '开始需求分析阶段',
  parameters: [],
  preconditions: [
    {
      type: 'state_exists',
      errorMessage: 'state.json 不存在，请先运行 /init 初始化项目',
      severity: 'error'
    },
    {
      type: 'iteration_not_started',
      errorMessage: '当前迭代已经开始，无法重复开始',
      severity: 'error'
    }
  ],
  approvalRequired: false,
  handler: async (context: CommandContext): Promise<CommandResult> => {
    const { state } = context;

    try {
      // 开始需求阶段
      const stateManager = new StateManager();
      await stateManager.startPhase('requirements');

      return {
        success: true,
        message: '需求分析阶段已开始',
        details: {
          iteration: state.currentIteration,
          phase: 'requirements',
          status: 'in_progress'
        },
        nextAction: '开始编写 PRD 文档，完成后使用 /approve requirements 进行审批'
      };
    } catch (error) {
      return {
        success: false,
        message: `开始需求阶段失败: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
};
