/**
 * 命令体系模块 - 前置条件检查器
 *
 * 负责检查命令执行前的前置条件
 *
 * @module command-system/precondition-checker
 */

// @integration 状态管理模块.State
import type { State, PhaseName } from '../state-management/types.js';
import type { PreconditionDefinition, PreconditionResult } from './types.js';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * 前置条件检查器
 */
export class PreconditionChecker {
  /**
   * 检查所有前置条件
   *
   * @param preconditions - 前置条件列表
   * @param state - 当前状态（可选，部分条件不需要）
   * @returns 检查结果
   */
  async check(
    preconditions: PreconditionDefinition[],
    state?: State
  ): Promise<PreconditionResult> {
    const result: PreconditionResult = {
      passed: true,
      failedConditions: [],
      warnings: []
    };

    for (const condition of preconditions) {
      try {
        const passed = await this.checkSingle(condition, state);

        if (!passed) {
          if (condition.severity === 'error') {
            result.passed = false;
            result.failedConditions.push({
              condition,
              reason: condition.errorMessage
            });
          } else {
            result.warnings.push(condition.errorMessage);
          }
        }
      } catch (error) {
        result.passed = false;
        result.failedConditions.push({
          condition,
          reason: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return result;
  }

  /**
   * 检查单个前置条件
   */
  private async checkSingle(
    condition: PreconditionDefinition,
    state?: State
  ): Promise<boolean> {
    switch (condition.type) {
      case 'state_not_exists':
        return this.checkStateNotExists();

      case 'state_exists':
        return this.checkStateExists();

      case 'phase_completed':
        return this.checkPhaseCompleted(condition, state);

      case 'phase_approved':
        return this.checkPhaseApproved(condition, state);

      case 'phase_in_progress':
        return this.checkPhaseInProgress(condition, state);

      case 'modules_approved':
        return this.checkModulesApproved(condition, state);

      case 'iteration_not_started':
        return this.checkIterationNotStarted(state);

      case 'custom':
        return this.checkCustom(condition, state);

      default:
        throw new Error(`未知的前置条件类型: ${condition.type}`);
    }
  }

  /**
   * 检查state.json不存在
   */
  private checkStateNotExists(): boolean {
    const statePath = join(process.cwd(), '.solodev', 'state.json');
    return !existsSync(statePath);
  }

  /**
   * 检查state.json存在
   */
  private checkStateExists(): boolean {
    const statePath = join(process.cwd(), '.solodev', 'state.json');
    return existsSync(statePath);
  }

  /**
   * 检查阶段已完成
   */
  private checkPhaseCompleted(
    condition: PreconditionDefinition,
    state?: State
  ): boolean {
    if (!state || !condition.phase) {
      return false;
    }

    const iteration = state.iterations[state.currentIteration];
    const phaseState = iteration.phases[condition.phase];

    return phaseState.status === 'completed' || phaseState.status === 'approved';
  }

  /**
   * 检查阶段已审批
   */
  private checkPhaseApproved(
    condition: PreconditionDefinition,
    state?: State
  ): boolean {
    if (!state || !condition.phase) {
      return false;
    }

    const iteration = state.iterations[state.currentIteration];
    const phaseState = iteration.phases[condition.phase];

    return phaseState.status === 'approved';
  }

  /**
   * 检查阶段进行中
   */
  private checkPhaseInProgress(
    condition: PreconditionDefinition,
    state?: State
  ): boolean {
    if (!state || !condition.phase) {
      return false;
    }

    const iteration = state.iterations[state.currentIteration];
    return iteration.currentPhase === condition.phase;
  }

  /**
   * 检查模块已审批
   */
  private checkModulesApproved(
    condition: PreconditionDefinition,
    state?: State
  ): boolean {
    if (!state || !condition.modules || condition.modules.length === 0) {
      return false;
    }

    const iteration = state.iterations[state.currentIteration];
    const currentPhase = iteration.currentPhase;

    if (!currentPhase) {
      return false;
    }

    const phaseState = iteration.phases[currentPhase];

    for (const moduleName of condition.modules) {
      const moduleState = phaseState.modules?.[moduleName];
      if (!moduleState || moduleState.status !== 'approved') {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查迭代未开始
   */
  private checkIterationNotStarted(state?: State): boolean {
    if (!state) {
      return true;
    }

    const iteration = state.iterations[state.currentIteration];
    return !iteration || iteration.status === 'pending';
  }

  /**
   * 检查自定义条件
   */
  private async checkCustom(
    condition: PreconditionDefinition,
    state?: State
  ): Promise<boolean> {
    if (!condition.customCheck) {
      throw new Error('自定义条件缺少customCheck函数');
    }

    if (!state) {
      throw new Error('自定义条件需要state参数');
    }

    return await condition.customCheck(state);
  }
}

/**
 * 创建前置条件检查器实例
 */
export function createPreconditionChecker(): PreconditionChecker {
  return new PreconditionChecker();
}
