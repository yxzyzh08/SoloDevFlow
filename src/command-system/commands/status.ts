/**
 * 命令体系模块 - /status 命令
 *
 * 显示项目当前状态
 *
 * @module command-system/commands/status
 */

import type { CommandDefinition, CommandContext, CommandResult } from '../types.js';

/**
 * /status 命令定义
 */
export const statusCommand: CommandDefinition = {
  name: 'status',
  description: '显示项目当前状态和进度',
  parameters: [],
  preconditions: [
    {
      type: 'state_exists',
      errorMessage: 'state.json 不存在，请先运行 /init 初始化项目',
      severity: 'error'
    }
  ],
  approvalRequired: false,
  handler: async (context: CommandContext): Promise<CommandResult> => {
    const { state } = context;

    try {
      const iteration = state.iterations[state.currentIteration];
      const phaseState = iteration.phases[iteration.currentPhase];

      // 构建状态报告
      const report = {
        projectName: state.metadata.projectName,
        version: state.metadata.version,
        currentIteration: state.currentIteration,
        currentPhase: iteration.currentPhase,
        phaseStatus: phaseState.status,
        totalModules: Object.keys(phaseState.modules || {}).length,
        completedModules: Object.values(phaseState.modules || {}).filter(
          m => m.status === 'completed' || m.status === 'approved'
        ).length
      };

      let message = `
项目状态报告
====================
项目: ${report.projectName}
版本: ${report.version}
当前迭代: ${report.currentIteration}
当前阶段: ${report.currentPhase}
阶段状态: ${report.phaseStatus}
模块进度: ${report.completedModules}/${report.totalModules}
`;

      // 显示当前模块信息（如果有）
      if (phaseState.modules && Object.keys(phaseState.modules).length > 0) {
        message += '\n模块详情:\n';
        for (const [moduleName, moduleState] of Object.entries(phaseState.modules)) {
          message += `  - ${moduleName}: ${moduleState.status}\n`;
        }
      }

      return {
        success: true,
        message: message.trim(),
        details: report,
        nextAction: getNextActionSuggestion(state)
      };
    } catch (error) {
      return {
        success: false,
        message: `获取状态失败: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
};

/**
 * 根据当前状态给出下一步建议
 */
function getNextActionSuggestion(state: any): string {
  const iteration = state.iterations[state.currentIteration];
  const phaseState = iteration.phases[iteration.currentPhase];

  if (phaseState.status === 'pending') {
    return `使用 /start-${iteration.currentPhase} 开始当前阶段`;
  }

  if (phaseState.status === 'in_progress') {
    // 检查是否有待审批的模块
    const modules = phaseState.modules || {};
    const hasUnapprovedModules = Object.values(modules).some(
      (m: any) => m.status === 'completed'
    );

    if (hasUnapprovedModules) {
      return '有已完成的模块等待审批，使用 /approve <模块名> 进行审批';
    }

    return '继续完成当前阶段的任务';
  }

  if (phaseState.status === 'completed') {
    return '阶段已完成，等待审批';
  }

  if (phaseState.status === 'approved') {
    // 找到下一个阶段
    const phases = ['requirements', 'architecture', 'implementation', 'testing', 'deployment'];
    const currentIndex = phases.indexOf(iteration.currentPhase);

    if (currentIndex < phases.length - 1) {
      const nextPhase = phases[currentIndex + 1];
      return `使用 /start-${nextPhase} 进入下一阶段`;
    }

    return '所有阶段已完成';
  }

  return '继续当前工作';
}
