/**
 * StateManager - 状态管理API层
 *
 * 职责：
 * - 对外提供统一的状态管理接口
 * - 组合Service层能力
 * - 提供便捷方法
 * - 错误处理和日志
 *
 * @module state-management/api/state-manager
 */

import type {
  State,
  Iteration,
  PhaseState,
  ModuleState,
  ModuleStatus,
  UpdateResult,
  TransitionResult,
  ApproveResult,
  ProgressSummary,
  FileSizeCheck,
  HistoricalState,
  HistoricalIteration,
  PhaseName
} from '../types';
import { PHASE_NAMES } from '../types';
import type { IStateService } from '../services/state-service';
import { StateService } from '../services/state-service';
import type { IStateRepository } from '../repositories/state-repository';
import { StateRepository } from '../repositories/state-repository';
import type { IFileIO } from '../io/file-io';
import { FileIO } from '../io/file-io';

// ============================================================================
// StateManager 接口
// ============================================================================

export interface IStateManager {
  // =========================================================================
  // 初始化操作
  // =========================================================================

  /**
   * 初始化项目
   */
  initialize(options: { projectName: string; description?: string }): Promise<void>;

  // =========================================================================
  // 读取操作
  // =========================================================================

  /**
   * 获取完整状态
   */
  getState(): Promise<State>;

  /**
   * 获取当前迭代
   */
  getCurrentIteration(): Promise<Iteration>;

  /**
   * 获取当前阶段
   */
  getCurrentPhase(): Promise<PhaseState>;

  /**
   * 获取指定阶段
   */
  getPhase(phaseName: string): Promise<PhaseState | null>;

  /**
   * 获取模块状态
   */
  getModule(phaseName: string, moduleName: string): Promise<ModuleState | null>;

  /**
   * 获取进度摘要
   */
  getProgressSummary(): Promise<ProgressSummary>;

  /**
   * 检查state.json是否存在
   */
  exists(): Promise<boolean>;

  /**
   * 检查文件大小
   */
  checkFileSize(): Promise<FileSizeCheck>;

  // =========================================================================
  // 写入操作
  // =========================================================================

  /**
   * 更新模块状态
   */
  updateModuleStatus(
    phaseName: string,
    moduleName: string,
    status: ModuleStatus,
    artifacts?: string[]
  ): Promise<UpdateResult>;

  /**
   * 审批模块
   */
  approveModule(
    phaseName: string,
    moduleName: string,
    approvedBy: string,
    artifacts: string[]
  ): Promise<ApproveResult>;

  /**
   * 阶段流转
   */
  transitionPhase(targetPhase: string): Promise<TransitionResult>;

  /**
   * 开始阶段
   */
  startPhase(phase: PhaseName): Promise<TransitionResult>;

  /**
   * 回滚到指定阶段
   */
  rollbackToPhase(phase: PhaseName, reason: string): Promise<TransitionResult>;

  /**
   * 审批阶段
   */
  approvePhase(phaseName: string, approvedBy: string): Promise<ApproveResult>;

  /**
   * 更新Git元数据
   */
  updateGitMetadata(commit: string, message: string): Promise<void>;

  // =========================================================================
  // 历史数据操作
  // =========================================================================

  /**
   * 获取历史数据
   */
  getHistory(): Promise<HistoricalState>;

  /**
   * 获取历史迭代
   */
  getHistoricalIteration(iterationId: string): Promise<HistoricalIteration | null>;

  // =========================================================================
  // 缓存管理
  // =========================================================================

  /**
   * 使缓存失效
   */
  invalidateCache(): void;
}

// ============================================================================
// StateManager 实现
// ============================================================================

/**
 * StateManager - 状态管理器实现
 */
export class StateManager implements IStateManager {
  private readonly service: IStateService;
  private readonly repository: IStateRepository;

  constructor(options?: {
    service?: IStateService;
    repository?: IStateRepository;
    fileIO?: IFileIO;
    basePath?: string;
  }) {
    const fileIO = options?.fileIO ?? new FileIO(options?.basePath);
    this.repository = options?.repository ?? new StateRepository(fileIO);
    this.service = options?.service ?? new StateService(this.repository);
  }

  // =========================================================================
  // 初始化操作
  // =========================================================================

  /**
   * 初始化项目
   */
  async initialize(options: { projectName: string; description?: string }): Promise<void> {
    return this.service.initialize(options);
  }

  // =========================================================================
  // 读取操作
  // =========================================================================

  /**
   * 获取完整状态
   */
  async getState(): Promise<State> {
    return this.service.getState();
  }

  /**
   * 获取当前迭代
   */
  async getCurrentIteration(): Promise<Iteration> {
    return this.service.getCurrentIteration();
  }

  /**
   * 获取当前阶段
   */
  async getCurrentPhase(): Promise<PhaseState> {
    return this.service.getCurrentPhase();
  }

  /**
   * 获取指定阶段
   */
  async getPhase(phaseName: string): Promise<PhaseState | null> {
    if (!PHASE_NAMES.includes(phaseName as PhaseName)) {
      return null;
    }

    const iteration = await this.getCurrentIteration();
    return iteration.phases[phaseName as PhaseName];
  }

  /**
   * 获取模块状态
   */
  async getModule(phaseName: string, moduleName: string): Promise<ModuleState | null> {
    return this.service.getModule(phaseName, moduleName);
  }

  /**
   * 获取进度摘要
   */
  async getProgressSummary(): Promise<ProgressSummary> {
    return this.service.getProgressSummary();
  }

  /**
   * 检查state.json是否存在
   */
  async exists(): Promise<boolean> {
    return this.repository.exists();
  }

  /**
   * 检查文件大小
   */
  async checkFileSize(): Promise<FileSizeCheck> {
    return this.service.checkFileSize();
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
    return this.service.updateModuleStatus(phaseName, moduleName, status, artifacts);
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
    return this.service.approveModule(phaseName, moduleName, approvedBy, artifacts);
  }

  /**
   * 阶段流转
   */
  async transitionPhase(targetPhase: string): Promise<TransitionResult> {
    return this.service.transitionPhase(targetPhase);
  }

  /**
   * 开始阶段
   */
  async startPhase(phase: PhaseName): Promise<TransitionResult> {
    return this.service.startPhase(phase);
  }

  /**
   * 回滚到指定阶段
   */
  async rollbackToPhase(phase: PhaseName, reason: string): Promise<TransitionResult> {
    return this.service.rollbackToPhase(phase, reason);
  }

  /**
   * 审批阶段
   */
  async approvePhase(phaseName: string, approvedBy: string): Promise<ApproveResult> {
    return this.service.approvePhase(phaseName, approvedBy);
  }

  /**
   * 更新Git元数据
   */
  async updateGitMetadata(commit: string, message: string): Promise<void> {
    return this.service.updateGitMetadata(commit, message);
  }

  // =========================================================================
  // 历史数据操作
  // =========================================================================

  /**
   * 获取历史数据
   */
  async getHistory(): Promise<HistoricalState> {
    return this.repository.readHistory();
  }

  /**
   * 获取历史迭代
   */
  async getHistoricalIteration(iterationId: string): Promise<HistoricalIteration | null> {
    const history = await this.getHistory();
    return history.completedIterations[iterationId] ?? null;
  }

  // =========================================================================
  // 缓存管理
  // =========================================================================

  /**
   * 使缓存失效
   */
  invalidateCache(): void {
    this.service.invalidateCache();
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建StateManager实例
 */
export function createStateManager(basePath?: string): IStateManager {
  return new StateManager({ basePath });
}

// ============================================================================
// 单例
// ============================================================================

let defaultInstance: IStateManager | null = null;

/**
 * 获取默认StateManager实例（单例）
 */
export function getStateManager(): IStateManager {
  if (!defaultInstance) {
    defaultInstance = createStateManager();
  }
  return defaultInstance;
}

/**
 * 重置默认实例（主要用于测试）
 */
export function resetStateManager(): void {
  defaultInstance = null;
}
