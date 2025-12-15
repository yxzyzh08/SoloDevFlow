/**
 * 状态管理模块
 *
 * 提供项目状态的读取、更新、验证等能力。
 *
 * 架构分层：
 * - API层 (StateManager): 对外统一接口
 * - Service层 (StateService): 核心业务逻辑
 * - Repository层 (StateRepository): 数据访问封装
 * - IO层 (FileIO): 文件操作封装
 *
 * @module state-management
 */

// ============================================================================
// 类型导出
// ============================================================================

export type {
  // 基础类型
  Priority,
  ChangedBy,
  ProjectType,

  // 状态枚举
  IterationStatus,
  PhaseStatus,
  ModuleStatus,
  TestSubPhaseStatus,
  ChangeType,

  // 核心数据结构
  State,
  ProjectInfo,
  BootstrapInfo,
  Iteration,
  PhaseState,
  CurrentProcess,
  TestingPhaseState,
  TestSubPhaseState,
  TestSubPhaseArtifacts,
  ModuleState,
  RollbackHistoryEntry,

  // 模块依赖
  ModuleDependencies,
  ModuleDependency,
  IntegrationPoint,

  // 任务
  GlobalTasks,
  Task,

  // 变更历史
  Change,
  ChangeDetail,

  // 设置与元数据
  Settings,
  Metadata,
  TemplateVersions,

  // 历史数据
  HistoricalState,
  HistoricalIteration,
  IterationStats,

  // 操作结果
  UpdateResult,
  TransitionResult,
  ApproveResult,
  RollbackResult,
  MigrationResult,

  // 辅助类型
  ProgressSummary,
  HistoryNeedAnalysis,
  KeywordMatchResult,
  FileSizeCheck,

  // 批量操作
  BatchOperation,
  BatchUpdateResult,

  // 缓存
  StateCache,

  // 迁移
  MigrationStep,
  MigrationTransaction,

  // 阶段
  PhaseName
} from './types';

// 常量导出
export { PHASE_NAMES, PHASE_ORDER } from './types';

// ============================================================================
// API层导出
// ============================================================================

export type { IStateManager } from './api/state-manager';
export {
  StateManager,
  createStateManager,
  getStateManager,
  resetStateManager
} from './api/state-manager';

// ============================================================================
// Service层导出
// ============================================================================

export type { IStateService } from './services/state-service';
export {
  StateService,
  createStateService,
  StateValidationError,
  PhaseTransitionError,
  ModuleStatusError
} from './services/state-service';

// ============================================================================
// Repository层导出
// ============================================================================

export type { IStateRepository } from './repositories/state-repository';
export {
  StateRepository,
  createStateRepository
  // StateFileNotFoundError 和 StateFileCorruptedError 从 validators 模块导出
} from './repositories/state-repository';

// ============================================================================
// IO层导出
// ============================================================================

export type { IFileIO } from './io/file-io';
export {
  FileIO,
  createFileIO,
  FileIOError,
  FileReadError,
  FileWriteError,
  JSONParseError
} from './io/file-io';
