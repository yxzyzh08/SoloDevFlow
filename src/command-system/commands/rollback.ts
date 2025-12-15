/**
 * 命令体系模块 - /rollback 命令
 *
 * 回滚到指定阶段
 *
 * @module command-system/commands/rollback
 */

// @integration 状态管理模块.StateManager
import { StateManager } from '../../state-management/api/state-manager.js';
import type { PhaseName } from '../../state-management/types.js';
import type { CommandDefinition, CommandContext, CommandResult } from '../types.js';

/**
 * /rollback 命令定义
 */
export const rollbackCommand: CommandDefinition = {
  name: 'rollback',
  description: '回滚到指定阶段，用于修复问题',
  parameters: [
    {
      name: 'target-phase',
      type: 'string',
      required: true,
      enum: ['requirements', 'architecture', 'implementation'],
      description: '回滚目标阶段（requirements, architecture, implementation）'
    },
    {
      name: 'reason',
      type: 'string',
      required: true,
      description: '回滚原因'
    }
  ],
  preconditions: [
    {
      type: 'state_exists',
      errorMessage: 'state.json 不存在，请先运行 /init 初始化项目',
      severity: 'error'
    }
  ],
  approvalRequired: true,
  handler: async (context: CommandContext): Promise<CommandResult> => {
    const { state, command } = context;
    const targetPhase = command.params['target-phase'] as PhaseName;
    const reason = command.params['reason'] as string;

    try {
      const stateManager = new StateManager();
      await stateManager.load();

      const iteration = state.iterations[state.currentIteration];
      const currentPhase = iteration.currentPhase;

      // 验证回滚有效性
      const phases: PhaseName[] = ['requirements', 'architecture', 'implementation', 'testing', 'deployment'];
      const currentIndex = phases.indexOf(currentPhase);
      const targetIndex = phases.indexOf(targetPhase);

      if (targetIndex >= currentIndex) {
        return {
          success: false,
          message: `无法回滚：目标阶段 "${targetPhase}" 不在当前阶段 "${currentPhase}" 之前`,
          error: new Error('Invalid rollback target')
        };
      }

      // 执行回滚
      await stateManager.rollbackToPhase(targetPhase, reason);

      return {
        success: true,
        message: `已回滚到 "${targetPhase}" 阶段`,
        details: {
          fromPhase: currentPhase,
          toPhase: targetPhase,
          reason,
          iteration: state.currentIteration
        },
        nextAction: `重新开始 "${targetPhase}" 阶段的工作，修复问题后继续`
      };
    } catch (error) {
      return {
        success: false,
        message: `回滚失败: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
};
