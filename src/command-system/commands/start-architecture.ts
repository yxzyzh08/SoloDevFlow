/**
 * 命令体系模块 - /start-architecture 命令
 *
 * 开始架构设计阶段
 *
 * @module command-system/commands/start-architecture
 */

// @integration 状态管理模块.StateManager
import { StateManager } from '../../state-management/api/state-manager.js';
import type { CommandDefinition, CommandContext, CommandResult } from '../types.js';

/**
 * /start-architecture 命令定义
 */
export const startArchitectureCommand: CommandDefinition = {
  name: 'start-architecture',
  description: '开始架构设计阶段',
  parameters: [],
  preconditions: [
    {
      type: 'state_exists',
      errorMessage: 'state.json 不存在，请先运行 /init 初始化项目',
      severity: 'error'
    },
    {
      type: 'phase_approved',
      phase: 'requirements',
      errorMessage: '需求阶段尚未审批通过，无法开始架构阶段',
      severity: 'error'
    }
  ],
  approvalRequired: false,
  handler: async (context: CommandContext): Promise<CommandResult> => {
    const { state } = context;

    try {
      const stateManager = new StateManager();
      await stateManager.load();

      await stateManager.startPhase('architecture');

      return {
        success: true,
        message: '架构设计阶段已开始',
        details: {
          iteration: state.currentIteration,
          phase: 'architecture',
          status: 'in_progress'
        },
        nextAction: '开始编写架构设计文档，完成后使用 /approve architecture 进行审批'
      };
    } catch (error) {
      return {
        success: false,
        message: `开始架构阶段失败: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
};
