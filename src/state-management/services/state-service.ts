/**
 * StateService - 状态服务层
 *
 * 职责：
 * - 核心业务逻辑实现
 * - 状态读取和更新
 * - 阶段流转验证
 * - 模块状态管理
 * - 变更历史记录
 * - 进度摘要生成
 *
 * @module state-management/services/state-service
 */

import type {
  State,
  Iteration,
  PhaseState,
  ModuleState,
  ModuleStatus,
  PhaseStatus,
  Change,
  ChangeDetail,
  ChangeType,
  UpdateResult,
  TransitionResult,
  ApproveResult,
  ProgressSummary,
  FileSizeCheck,
  PhaseName
} from '../types';
import { PHASE_NAMES, PHASE_ORDER } from '../types';
import type { IStateRepository } from '../repositories/state-repository';
import { StateRepository } from '../repositories/state-repository';

// ============================================================================
// 错误类型
// ============================================================================

/**
 * 状态验证错误
 */
export class StateValidationError extends Error {
  readonly code = 'STATE_VALIDATION_ERROR';
  readonly errors: string[];

  constructor(errors: string[]) {
    super(`状态验证失败: ${errors.join(', ')}`);
    this.name = 'StateValidationError';
    this.errors = errors;
  }
}

/**
 * 阶段流转错误
 */
export class PhaseTransitionError extends Error {
  readonly code = 'PHASE_TRANSITION_ERROR';
  readonly fromPhase: string;
  readonly toPhase: string;

  constructor(fromPhase: string, toPhase: string, reason: string) {
    super(`无法从 ${fromPhase} 流转到 ${toPhase}: ${reason}`);
    this.name = 'PhaseTransitionError';
    this.fromPhase = fromPhase;
    this.toPhase = toPhase;
  }
}

/**
 * 模块状态错误
 */
export class ModuleStatusError extends Error {
  readonly code = 'MODULE_STATUS_ERROR';
  readonly moduleName: string;

  constructor(moduleName: string, reason: string) {
    super(`模块 ${moduleName} 状态错误: ${reason}`);
    this.name = 'ModuleStatusError';
    this.moduleName = moduleName;
  }
}

// ============================================================================
// StateService 接口
// ============================================================================

export interface IStateService {
  // 读取操作
  getState(): Promise<State>;
  getCurrentIteration(): Promise<Iteration>;
  getCurrentPhase(): Promise<PhaseState>;
  getModule(phaseName: string, moduleName: string): Promise<ModuleState | null>;
  getProgressSummary(): Promise<ProgressSummary>;
  checkFileSize(): Promise<FileSizeCheck>;

  // 写入操作
  updateModuleStatus(
    phaseName: string,
    moduleName: string,
    status: ModuleStatus,
    artifacts?: string[]
  ): Promise<UpdateResult>;

  approveModule(
    phaseName: string,
    moduleName: string,
    approvedBy: string,
    artifacts: string[]
  ): Promise<ApproveResult>;

  transitionPhase(targetPhase: string): Promise<TransitionResult>;

  approvePhase(phaseName: string, approvedBy: string): Promise<ApproveResult>;

  // 元数据更新
  updateGitMetadata(commit: string, message: string): Promise<void>;

  // 缓存管理
  invalidateCache(): void;
}

// ============================================================================
// StateService 实现
// ============================================================================

/**
 * StateService - 状态服务实现
 */
export class StateService implements IStateService {
  private readonly repository: IStateRepository;

  constructor(repository?: IStateRepository) {
    this.repository = repository ?? new StateRepository();
  }

  // =========================================================================
  // 读取操作
  // =========================================================================

  /**
   * 获取完整状态
   */
  async getState(): Promise<State> {
    return this.repository.read();
  }

  /**
   * 获取当前迭代
   */
  async getCurrentIteration(): Promise<Iteration> {
    const state = await this.getState();
    const iteration = state.iterations[state.currentIteration];

    if (!iteration) {
      throw new StateValidationError([
        `当前迭代 ${state.currentIteration} 不存在`
      ]);
    }

    return iteration;
  }

  /**
   * 获取当前阶段
   */
  async getCurrentPhase(): Promise<PhaseState> {
    const iteration = await this.getCurrentIteration();
    const phaseName = iteration.currentPhase as PhaseName;

    if (!PHASE_NAMES.includes(phaseName)) {
      throw new StateValidationError([
        `无效的阶段名称: ${phaseName}`
      ]);
    }

    return iteration.phases[phaseName];
  }

  /**
   * 获取模块状态
   */
  async getModule(phaseName: string, moduleName: string): Promise<ModuleState | null> {
    const iteration = await this.getCurrentIteration();
    const phase = iteration.phases[phaseName as PhaseName];

    if (!phase) {
      return null;
    }

    return phase.modules[moduleName] ?? null;
  }

  /**
   * 获取进度摘要
   */
  async getProgressSummary(): Promise<ProgressSummary> {
    const state = await this.getState();
    const iteration = state.iterations[state.currentIteration];
    const phaseName = iteration.currentPhase as PhaseName;
    const phase = iteration.phases[phaseName];

    // 统计模块完成情况
    const modules = Object.entries(phase.modules);
    const completedModules = modules.filter(
      ([, m]) => m.status === 'completed' || m.status === 'approved' || m.status === 'not_applicable'
    );
    const remainingModules = modules.filter(
      ([, m]) => m.status !== 'completed' && m.status !== 'approved' && m.status !== 'not_applicable'
    );

    // 获取当前模块
    const currentModule = phase.currentProcess?.currentModule ?? null;

    // 获取上次操作
    const lastChange = state.changeHistory[state.changeHistory.length - 1];
    const lastAction = lastChange?.description ?? '无';
    const lastActionTime = lastChange?.timestamp ?? state.metadata.lastGitCommitAt;

    // 生成下一步建议
    const suggestedNextStep = this.generateNextStepSuggestion(
      phaseName,
      phase,
      remainingModules.map(([name]) => name)
    );

    return {
      currentIteration: state.currentIteration,
      currentPhase: phaseName,
      currentModule,
      completedModules: completedModules.length,
      remainingModules: remainingModules.length,
      lastAction,
      lastActionTime,
      suggestedNextStep
    };
  }

  /**
   * 检查文件大小
   */
  async checkFileSize(): Promise<FileSizeCheck> {
    return this.repository.checkFileSize();
  }

  // =========================================================================
  // 写入操作
  // =========================================================================

  /**
   * 更新模块状态
   */
  async updateModuleStatus(
    phaseName: string,
    moduleName: string,
    status: ModuleStatus,
    artifacts?: string[]
  ): Promise<UpdateResult> {
    const state = await this.getState();
    const iteration = state.iterations[state.currentIteration];
    const phase = iteration.phases[phaseName as PhaseName];

    if (!phase) {
      return {
        success: false,
        errors: [`阶段 ${phaseName} 不存在`]
      };
    }

    const module = phase.modules[moduleName];
    if (!module) {
      return {
        success: false,
        errors: [`模块 ${moduleName} 在阶段 ${phaseName} 中不存在`]
      };
    }

    // 记录原状态
    const oldStatus = module.status;

    // 更新状态
    module.status = status;

    // 更新时间戳
    const now = new Date().toISOString();
    if (status === 'in_progress' && !module.startedAt) {
      module.startedAt = now;
    }
    if (status === 'completed') {
      module.completedAt = now;
    }

    // 更新产物
    if (artifacts) {
      module.artifacts = [...module.artifacts, ...artifacts];
    }

    // 记录变更
    this.recordChange(state, {
      type: 'module_status_change',
      description: `模块 ${moduleName} 状态从 ${oldStatus} 变更为 ${status}`,
      changes: [
        { field: `phases.${phaseName}.modules.${moduleName}.status`, from: oldStatus, to: status }
      ]
    });

    // 写入
    await this.repository.write(state);

    return { success: true };
  }

  /**
   * 审批模块
   */
  async approveModule(
    phaseName: string,
    moduleName: string,
    approvedBy: string,
    artifacts: string[]
  ): Promise<ApproveResult> {
    const state = await this.getState();
    const iteration = state.iterations[state.currentIteration];
    const phase = iteration.phases[phaseName as PhaseName];

    if (!phase) {
      return {
        success: false,
        errors: [`阶段 ${phaseName} 不存在`]
      };
    }

    const module = phase.modules[moduleName];
    if (!module) {
      return {
        success: false,
        errors: [`模块 ${moduleName} 在阶段 ${phaseName} 中不存在`]
      };
    }

    const now = new Date().toISOString();
    const oldStatus = module.status;

    // 更新状态
    module.status = 'approved';
    module.approvedAt = now;
    module.approvedBy = approvedBy;
    module.artifacts = [...module.artifacts, ...artifacts];

    // 记录变更
    this.recordChange(state, {
      type: 'approval',
      description: `模块 ${moduleName} 已审批通过`,
      changes: [
        { field: `phases.${phaseName}.modules.${moduleName}.status`, from: oldStatus, to: 'approved' },
        { field: `phases.${phaseName}.modules.${moduleName}.approvedAt`, from: null, to: now }
      ]
    });

    // 写入
    await this.repository.write(state);

    return {
      success: true,
      approvedAt: now
    };
  }

  /**
   * 阶段流转
   */
  async transitionPhase(targetPhase: string): Promise<TransitionResult> {
    const state = await this.getState();
    const iteration = state.iterations[state.currentIteration];
    const currentPhase = iteration.currentPhase;

    // 验证流转
    const validationResult = this.validatePhaseTransition(currentPhase, targetPhase, iteration);
    if (!validationResult.valid) {
      return {
        success: false,
        errors: validationResult.errors
      };
    }

    const now = new Date().toISOString();

    // 完成当前阶段
    const currentPhaseState = iteration.phases[currentPhase as PhaseName];
    currentPhaseState.completedAt = now;
    currentPhaseState.status = 'completed';

    // 开始新阶段
    iteration.currentPhase = targetPhase;
    const targetPhaseState = iteration.phases[targetPhase as PhaseName];
    targetPhaseState.startedAt = now;
    targetPhaseState.status = 'in_progress';

    // 记录变更
    this.recordChange(state, {
      type: 'phase_transition',
      description: `阶段从 ${currentPhase} 流转到 ${targetPhase}`,
      changes: [
        { field: 'currentPhase', from: currentPhase, to: targetPhase },
        { field: `phases.${currentPhase}.status`, from: 'in_progress', to: 'completed' },
        { field: `phases.${targetPhase}.status`, from: 'pending', to: 'in_progress' }
      ]
    });

    // 写入
    await this.repository.write(state);

    return {
      success: true,
      newPhase: targetPhase
    };
  }

  /**
   * 审批阶段
   */
  async approvePhase(phaseName: string, approvedBy: string): Promise<ApproveResult> {
    const state = await this.getState();
    const iteration = state.iterations[state.currentIteration];
    const phase = iteration.phases[phaseName as PhaseName];

    if (!phase) {
      return {
        success: false,
        errors: [`阶段 ${phaseName} 不存在`]
      };
    }

    const now = new Date().toISOString();

    // 更新阶段状态
    phase.status = 'approved';
    phase.approvedAt = now;
    phase.approvedBy = approvedBy;

    // 记录变更
    this.recordChange(state, {
      type: 'approval',
      description: `阶段 ${phaseName} 已审批通过`,
      changes: [
        { field: `phases.${phaseName}.status`, from: 'in_progress', to: 'approved' },
        { field: `phases.${phaseName}.approvedAt`, from: null, to: now }
      ]
    });

    // 写入
    await this.repository.write(state);

    return {
      success: true,
      approvedAt: now
    };
  }

  /**
   * 更新Git元数据
   */
  async updateGitMetadata(commit: string, message: string): Promise<void> {
    const state = await this.getState();
    const now = new Date().toISOString();

    state.metadata.lastGitCommit = commit;
    state.metadata.lastGitCommitMessage = message;
    state.metadata.lastGitCommitAt = now;
    state.metadata.stateFileVersion++;
    state.metadata.totalStateChanges++;
    state.metadata.lastUpdatedAt = now;
    state.metadata.lastUpdatedBy = 'ai';

    await this.repository.write(state);
  }

  /**
   * 使缓存失效
   */
  invalidateCache(): void {
    this.repository.invalidateCache();
  }

  // =========================================================================
  // 私有方法
  // =========================================================================

  /**
   * 验证阶段流转
   */
  private validatePhaseTransition(
    fromPhase: string,
    toPhase: string,
    iteration: Iteration
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查阶段是否有效
    if (!PHASE_NAMES.includes(fromPhase as PhaseName)) {
      errors.push(`无效的源阶段: ${fromPhase}`);
    }
    if (!PHASE_NAMES.includes(toPhase as PhaseName)) {
      errors.push(`无效的目标阶段: ${toPhase}`);
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // 检查阶段顺序
    const fromOrder = PHASE_ORDER[fromPhase as PhaseName];
    const toOrder = PHASE_ORDER[toPhase as PhaseName];

    if (toOrder !== fromOrder + 1) {
      errors.push(`只能流转到下一个阶段，当前: ${fromPhase}, 目标: ${toPhase}`);
    }

    // 检查当前阶段是否已审批
    const currentPhaseState = iteration.phases[fromPhase as PhaseName];
    if (currentPhaseState.status !== 'approved') {
      errors.push(`阶段 ${fromPhase} 尚未审批，无法流转`);
    }

    // 检查所有模块是否已完成或审批
    const modules = Object.entries(currentPhaseState.modules);
    const incompleteModules = modules.filter(
      ([, m]) => m.status !== 'completed' && m.status !== 'approved' && m.status !== 'not_applicable'
    );

    if (incompleteModules.length > 0) {
      const moduleNames = incompleteModules.map(([name]) => name).join(', ');
      errors.push(`以下模块尚未完成: ${moduleNames}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 记录变更
   */
  private recordChange(
    state: State,
    changeInfo: {
      type: ChangeType;
      description: string;
      changes: ChangeDetail[];
      decision?: string;
      notes?: string;
    }
  ): void {
    const change: Change = {
      timestamp: new Date().toISOString(),
      type: changeInfo.type,
      description: changeInfo.description,
      changedBy: 'ai',
      changes: changeInfo.changes,
      decision: changeInfo.decision,
      notes: changeInfo.notes
    };

    state.changeHistory.push(change);

    // 更新元数据
    state.metadata.totalStateChanges++;
    state.metadata.lastUpdatedAt = change.timestamp;
    state.metadata.lastUpdatedBy = 'ai';
  }

  /**
   * 生成下一步建议
   */
  private generateNextStepSuggestion(
    phaseName: string,
    phase: PhaseState,
    remainingModules: string[]
  ): string {
    // 如果有剩余模块
    if (remainingModules.length > 0) {
      const nextModule = remainingModules[0];
      return `继续处理模块: ${nextModule}`;
    }

    // 如果所有模块都完成，但阶段未审批
    if (phase.status !== 'approved') {
      return `所有模块已完成，请审批 ${phaseName} 阶段`;
    }

    // 如果阶段已审批，建议流转
    const phaseIndex = PHASE_NAMES.indexOf(phaseName as PhaseName);
    if (phaseIndex < PHASE_NAMES.length - 1) {
      const nextPhase = PHASE_NAMES[phaseIndex + 1];
      return `阶段已审批，可流转到 ${nextPhase} 阶段`;
    }

    // 最后一个阶段
    return '所有阶段已完成，迭代可以结束';
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建StateService实例
 */
export function createStateService(repository?: IStateRepository): IStateService {
  return new StateService(repository);
}
