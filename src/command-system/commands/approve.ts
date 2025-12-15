/**
 * 命令体系模块 - /approve 命令
 *
 * 审批阶段或模块
 *
 * @module command-system/commands/approve
 */

// @integration 状态管理模块.StateManager
import { StateManager } from '../../state-management/api/state-manager.js';
import type { PhaseName } from '../../state-management/types.js';
import type { CommandDefinition, CommandContext, CommandResult } from '../types.js';

/**
 * /approve 命令定义
 */
export const approveCommand: CommandDefinition = {
  name: 'approve',
  description: '审批当前阶段或指定模块',
  parameters: [
    {
      name: 'target',
      type: 'string',
      required: false,
      description: '审批目标（阶段名或模块名），如果不指定则审批当前阶段'
    }
  ],
  preconditions: [
    {
      type: 'state_exists',
      errorMessage: 'state.json 不存在，请先运行 /init 初始化项目',
      severity: 'error'
    }
  ],
  approvalRequired: false,
  handler: async (context: CommandContext): Promise<CommandResult> => {
    const { state, command } = context;
    const target = command.params['target'] as string | undefined;

    try {
      // 创建状态管理器
      const stateManager = new StateManager();
      await stateManager.load();

      const iteration = state.iterations[state.currentIteration];
      const currentPhase = iteration.currentPhase;

      // 判断是审批阶段还是模块
      if (!target) {
        // 审批当前阶段
        await stateManager.approvePhase(currentPhase);

        return {
          success: true,
          message: `阶段 "${currentPhase}" 审批通过`,
          details: {
            phase: currentPhase,
            iteration: state.currentIteration
          },
          nextAction: getNextPhaseAction(currentPhase)
        };
      } else {
        // 检查是否是阶段名
        const phases: PhaseName[] = ['requirements', 'architecture', 'implementation', 'testing', 'deployment'];
        if (phases.includes(target as PhaseName)) {
          await stateManager.approvePhase(target as PhaseName);

          return {
            success: true,
            message: `阶段 "${target}" 审批通过`,
            details: {
              phase: target,
              iteration: state.currentIteration
            },
            nextAction: getNextPhaseAction(target as PhaseName)
          };
        } else {
          // 审批模块
          await stateManager.approveModule(currentPhase, target);

          return {
            success: true,
            message: `模块 "${target}" 审批通过`,
            details: {
              module: target,
              phase: currentPhase,
              iteration: state.currentIteration
            },
            nextAction: '继续完成其他模块或使用 /approve 审批整个阶段'
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `审批失败: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
};

/**
 * 获取下一阶段建议
 */
function getNextPhaseAction(currentPhase: PhaseName): string {
  const phaseMap: Record<PhaseName, string> = {
    requirements: '使用 /start-architecture 开始架构设计阶段',
    architecture: '使用 /start-implementation 开始代码实现阶段',
    implementation: '使用 /start-testing 开始测试阶段',
    testing: '使用 /start-deployment 开始部署阶段',
    deployment: '迭代完成，可以开始新的迭代'
  };

  return phaseMap[currentPhase] || '继续当前工作';
}
