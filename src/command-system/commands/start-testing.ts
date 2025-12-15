/**
 * 命令体系模块 - /start-testing 命令
 *
 * 开始测试阶段
 *
 * @module command-system/commands/start-testing
 */

// @integration 状态管理模块.StateManager
import { StateManager } from '../../state-management/api/state-manager.js';
import type { CommandDefinition, CommandContext, CommandResult } from '../types.js';

/**
 * /start-testing 命令定义
 */
export const startTestingCommand: CommandDefinition = {
  name: 'start-testing',
  description: '开始测试阶段',
  parameters: [],
  preconditions: [
    {
      type: 'state_exists',
      errorMessage: 'state.json 不存在，请先运行 /init 初始化项目',
      severity: 'error'
    },
    {
      type: 'phase_approved',
      phase: 'implementation',
      errorMessage: '实现阶段尚未审批通过，无法开始测试阶段',
      severity: 'error'
    }
  ],
  approvalRequired: false,
  handler: async (context: CommandContext): Promise<CommandResult> => {
    const { state } = context;

    try {
      const stateManager = new StateManager();
      await stateManager.load();

      await stateManager.startPhase('testing');

      return {
        success: true,
        message: '测试阶段已开始',
        details: {
          iteration: state.currentIteration,
          phase: 'testing',
          status: 'in_progress'
        },
        nextAction: '执行E2E测试、性能测试和混沌测试，完成后使用 /approve testing 进行审批'
      };
    } catch (error) {
      return {
        success: false,
        message: `开始测试阶段失败: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
};
