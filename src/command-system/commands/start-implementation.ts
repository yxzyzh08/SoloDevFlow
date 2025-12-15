/**
 * 命令体系模块 - /start-implementation 命令
 *
 * 开始代码实现阶段
 *
 * @module command-system/commands/start-implementation
 */

// @integration 状态管理模块.StateManager
import { StateManager } from '../../state-management/api/state-manager.js';
import type { CommandDefinition, CommandContext, CommandResult } from '../types.js';

/**
 * /start-implementation 命令定义
 */
export const startImplementationCommand: CommandDefinition = {
  name: 'start-implementation',
  description: '开始代码实现阶段',
  parameters: [],
  preconditions: [
    {
      type: 'state_exists',
      errorMessage: 'state.json 不存在，请先运行 /init 初始化项目',
      severity: 'error'
    },
    {
      type: 'phase_approved',
      phase: 'architecture',
      errorMessage: '架构阶段尚未审批通过，无法开始实现阶段',
      severity: 'error'
    }
  ],
  approvalRequired: false,
  handler: async (context: CommandContext): Promise<CommandResult> => {
    const { state } = context;

    try {
      const stateManager = new StateManager();
      await stateManager.load();

      await stateManager.startPhase('implementation');

      return {
        success: true,
        message: '代码实现阶段已开始',
        details: {
          iteration: state.currentIteration,
          phase: 'implementation',
          status: 'in_progress'
        },
        nextAction: '开始按模块实现代码，每个模块完成后使用 /approve <模块名> 进行审批'
      };
    } catch (error) {
      return {
        success: false,
        message: `开始实现阶段失败: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
};
