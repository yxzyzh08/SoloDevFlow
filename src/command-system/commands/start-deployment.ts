/**
 * 命令体系模块 - /start-deployment 命令
 *
 * 开始部署阶段
 *
 * @module command-system/commands/start-deployment
 */

// @integration 状态管理模块.StateManager
import { StateManager } from '../../state-management/api/state-manager.js';
import type { CommandDefinition, CommandContext, CommandResult } from '../types.js';

/**
 * /start-deployment 命令定义
 */
export const startDeploymentCommand: CommandDefinition = {
  name: 'start-deployment',
  description: '开始部署阶段',
  parameters: [],
  preconditions: [
    {
      type: 'state_exists',
      errorMessage: 'state.json 不存在，请先运行 /init 初始化项目',
      severity: 'error'
    },
    {
      type: 'phase_approved',
      phase: 'testing',
      errorMessage: '测试阶段尚未审批通过，无法开始部署阶段',
      severity: 'error'
    }
  ],
  approvalRequired: false,
  handler: async (context: CommandContext): Promise<CommandResult> => {
    const { state } = context;

    try {
      const stateManager = new StateManager();
      await stateManager.load();

      await stateManager.startPhase('deployment');

      return {
        success: true,
        message: '部署阶段已开始',
        details: {
          iteration: state.currentIteration,
          phase: 'deployment',
          status: 'in_progress'
        },
        nextAction: '执行部署相关任务，完成后使用 /approve deployment 完成当前迭代'
      };
    } catch (error) {
      return {
        success: false,
        message: `开始部署阶段失败: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
};
