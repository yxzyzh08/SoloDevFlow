/**
 * 状态管理模块 - 类型定义
 *
 * 基于架构文档：状态管理模块-数据模型设计.md
 *
 * @module state-management/types
 */

// ============================================================================
// 基础类型
// ============================================================================

/** 优先级 */
export type Priority = 'P0' | 'P1' | 'P2';

/** 变更人 */
export type ChangedBy = 'ai' | 'human';

/** 项目类型 */
export type ProjectType = 'backend' | 'frontend' | 'fullstack' | 'library' | 'tool';

// ============================================================================
// 状态枚举
// ============================================================================

/** 迭代状态 */
export type IterationStatus = 'planning' | 'in_progress' | 'completed' | 'deployed';

/** 阶段状态 */
export type PhaseStatus = 'pending' | 'in_progress' | 'approved' | 'completed';

/** 模块状态 */
export type ModuleStatus =
  | 'pending'
  | 'in_progress'
  | 'partially_clarified'
  | 'approved'
  | 'completed'
  | 'rolled_back'
  | 'partial'        // 部分实现
  | 'not_applicable'; // 不适用（规范类模块）

/** Testing子阶段状态 */
export type TestSubPhaseStatus =
  | 'pending'
  | 'plan_in_progress'
  | 'plan_approved'
  | 'executing'
  | 'passed'
  | 'failed';

/** 变更类型 */
export type ChangeType =
  | 'init'
  | 'bootstrap'
  | 'phase_transition'
  | 'module_status_change'
  | 'module_completed'
  | 'approval'
  | 'rollback'
  | 'task_completed'
  | 'iteration_completed'
  | 'architecture_supplement'
  | 'hotfix';

// ============================================================================
// 核心数据结构
// ============================================================================

/**
 * State - 完整项目状态
 * 存储位置: .solodev/state.json
 */
export interface State {
  /** Schema版本 */
  schema_version: string;

  /** 项目基本信息 */
  project: ProjectInfo;

  /** 自举信息(仅当前项目需要) */
  bootstrap?: BootstrapInfo;

  /** 当前迭代ID */
  currentIteration: string;

  /** 所有迭代(仅当前活跃迭代) */
  iterations: Record<string, Iteration>;

  /** 模块依赖关系(所有迭代共享) */
  moduleDependencies: ModuleDependencies;

  /** 全局任务 */
  globalTasks: GlobalTasks;

  /** 变更历史(仅当前迭代) */
  changeHistory: Change[];

  /** 设置 */
  settings: Settings;

  /** 元数据 */
  metadata: Metadata;

  /** 模板版本 */
  templateVersions?: TemplateVersions;
}

/**
 * 项目基本信息
 */
export interface ProjectInfo {
  /** 项目名称 */
  name: string;

  /** 项目描述 */
  description: string;

  /** 项目类型 */
  type: ProjectType;

  /** 创建时间 */
  createdAt: string;

  /** 更新时间 */
  updatedAt?: string;
}

/**
 * 自举信息
 */
export interface BootstrapInfo {
  /** 是否正在自举 */
  isBootstrapping: boolean;

  /** 自举阶段 */
  stage: 'stage-1' | 'stage-2' | 'stage-3' | 'completed';

  /** 阶段描述 */
  stageDescription: string;

  /** 阶段开始时间 */
  stageStartedAt: string;
}

/**
 * 迭代
 */
export interface Iteration {
  /** 迭代ID */
  id: string;

  /** 版本号 */
  version: string;

  /** 迭代目标 */
  goal?: string;

  /** 状态 */
  status: IterationStatus;

  /** 开始时间 */
  startedAt: string;

  /** 完成时间 */
  completedAt?: string;

  /** 部署时间 */
  deployedAt?: string;

  /** 当前阶段 */
  currentPhase: string;

  /** 各阶段状态 */
  phases: {
    requirements: PhaseState;
    architecture: PhaseState;
    implementation: PhaseState;
    testing: TestingPhaseState;
    deployment: PhaseState;
  };

  /** Git信息 */
  git?: {
    startCommit: string;
    endCommit?: string;
    tag?: string;
  };
}

/**
 * 阶段状态
 */
export interface PhaseState {
  /** 状态 */
  status: PhaseStatus;

  /** 开始时间 */
  startedAt?: string;

  /** 审批时间 */
  approvedAt?: string;

  /** 审批人 */
  approvedBy?: string;

  /** 完成时间 */
  completedAt?: string;

  /** 模块状态 */
  modules: Record<string, ModuleState>;

  /** 当前处理进度 */
  currentProcess?: CurrentProcess;
}

/**
 * 当前处理进度
 */
export interface CurrentProcess {
  /** 当前模块 */
  currentModule: string | null;

  /** 已完成模块 */
  completedModules: string[];

  /** 剩余模块 */
  remainingModules: string[];

  /** 下一步建议 */
  nextAction: string;
}

/**
 * Testing阶段状态 - 包含子阶段
 */
export interface TestingPhaseState extends PhaseState {
  /** Testing子阶段状态 */
  testPhases?: {
    e2e: TestSubPhaseState;
    performance: TestSubPhaseState;
    chaos: TestSubPhaseState;
  };
}

/**
 * Testing子阶段状态
 */
export interface TestSubPhaseState {
  /** 状态 */
  status: TestSubPhaseStatus;

  /** 计划审批时间 */
  planApprovedAt?: string;

  /** 计划审批人 */
  planApprovedBy?: string;

  /** 执行时间 */
  executedAt?: string;

  /** 通过时间 */
  passedAt?: string;

  /** 失败时间 */
  failedAt?: string;

  /** 失败原因 */
  failureReason?: string;

  /** 产物 */
  artifacts: TestSubPhaseArtifacts;
}

/**
 * Testing子阶段产物
 */
export interface TestSubPhaseArtifacts {
  /** 测试计划 */
  plan: string;

  /** 测试代码 */
  code?: string;

  /** 测试报告 */
  report?: string;
}

/**
 * 模块状态
 */
export interface ModuleState {
  /** 状态 */
  status: ModuleStatus;

  /** 优先级 */
  priority: Priority;

  /** 开始时间 */
  startedAt?: string;

  /** 审批时间 */
  approvedAt?: string;

  /** 审批人 */
  approvedBy?: string;

  /** 完成时间 */
  completedAt?: string;

  /** 产物 */
  artifacts: string[];

  /** 审核人 */
  reviewer?: string;

  /** 待解决问题(仅requirements) */
  pendingQuestions?: string[];

  /** 已澄清方面(仅requirements) */
  clarifiedAspects?: string[];

  /** 之前的审批时间(回滚后保留) */
  previousApprovedAt?: string;

  /** 回滚历史 */
  rollbackHistory?: RollbackHistoryEntry[];

  /** 描述 */
  description?: string;

  /** 已实现的文件列表 */
  implementedFiles?: string[];
}

/**
 * 回滚历史条目
 */
export interface RollbackHistoryEntry {
  /** 回滚时间 */
  rolledBackAt: string;

  /** 回滚原因 */
  reason: string;

  /** 从哪个阶段回滚 */
  fromPhase: string;

  /** 回滚到哪个阶段 */
  toPhase: string;
}

// ============================================================================
// 模块依赖关系
// ============================================================================

/**
 * 模块依赖关系映射
 */
export type ModuleDependencies = Record<string, ModuleDependency>;

/**
 * 模块依赖
 */
export interface ModuleDependency {
  /** 依赖的模块 */
  dependsOn: string[];

  /** 被依赖的模块 */
  dependedBy: string[];

  /** 是否基础模块 */
  isFoundation?: boolean;

  /** 模块描述 */
  description?: string;

  /** 集成点 */
  integrationPoints?: IntegrationPoint[];
}

/**
 * 集成点
 */
export interface IntegrationPoint {
  /** 目标模块 */
  targetModule: string;

  /** 接口 */
  interface: string;

  /** 目的 */
  purpose: string;

  /** 数据流 */
  dataFlow: string;

  /** 错误处理 */
  errorHandling: string;

  /** 复杂度 */
  complexity: 'simple' | 'complex';
}

// ============================================================================
// 任务
// ============================================================================

/**
 * 全局任务
 */
export interface GlobalTasks {
  /** 待处理任务 */
  pending: Task[];

  /** 进行中任务 */
  in_progress?: Task[];

  /** 已完成任务(仅当前迭代) */
  completed: Task[];
}

/**
 * 任务
 */
export interface Task {
  /** 任务ID */
  id: string;

  /** 标题 */
  title: string;

  /** 描述 */
  description?: string;

  /** 优先级 */
  priority: Priority;

  /** 所属迭代 */
  iteration?: string;

  /** 所属阶段 */
  phase?: string;

  /** 所属模块 */
  module?: string;

  /** 创建时间 */
  createdAt: string;

  /** 完成时间 */
  completedAt?: string;

  /** 解决方案 */
  resolution?: string;
}

// ============================================================================
// 变更历史
// ============================================================================

/**
 * 变更记录
 */
export interface Change {
  /** 时间戳 */
  timestamp: string;

  /** 变更类型 */
  type: ChangeType;

  /** 描述 */
  description: string;

  /** 变更人 */
  changedBy: ChangedBy;

  /** 详细变更 */
  changes: ChangeDetail[];

  /** 决策(可选) */
  decision?: string;

  /** 附加说明 */
  notes?: string;

  /** 评审反馈(可选) */
  reviewFeedback?: string[];

  /** 产物(可选) */
  artifacts?: string[];
}

/**
 * 变更详情
 */
export interface ChangeDetail {
  /** 字段路径 */
  field: string;

  /** 原值 */
  from: unknown;

  /** 新值 */
  to: unknown;
}

// ============================================================================
// 设置与元数据
// ============================================================================

/**
 * 设置
 */
export interface Settings {
  /** 自动读取历史数据 */
  autoReadHistory: boolean;

  /** 阶段流转需要审批 */
  requireApprovalForPhaseTransition: boolean;

  /** 其他设置(可扩展) */
  [key: string]: unknown;
}

/**
 * 元数据
 */
export interface Metadata {
  /** 最后Git提交 */
  lastGitCommit: string;

  /** 最后Git提交信息 */
  lastGitCommitMessage: string;

  /** 最后Git提交时间 */
  lastGitCommitAt: string;

  /** state文件版本 */
  stateFileVersion: number;

  /** 总状态变更次数 */
  totalStateChanges: number;

  /** 最后更新时间 */
  lastUpdatedAt?: string;

  /** 最后更新人 */
  lastUpdatedBy?: ChangedBy;
}

/**
 * 模板版本
 */
export interface TemplateVersions {
  [templateName: string]: string;
}

// ============================================================================
// 历史数据模型
// ============================================================================

/**
 * 历史状态
 * 存储位置: .solodev/state_his.json
 */
export interface HistoricalState {
  /** Schema版本 */
  schema_version: string;

  /** 已完成的迭代 */
  completedIterations: Record<string, HistoricalIteration>;
}

/**
 * 历史迭代 - 完整的已归档迭代
 */
export interface HistoricalIteration {
  /** 迭代ID */
  id: string;

  /** 版本号 */
  version: string;

  /** 迭代目标 */
  goal: string;

  /** 状态 */
  status: 'completed';

  /** 开始时间 */
  startedAt: string;

  /** 完成时间 */
  completedAt: string;

  /** 部署时间 */
  deployedAt: string;

  /** Git Tag */
  gitTag: string;

  /** 各阶段状态 */
  phases: {
    requirements: PhaseState;
    architecture: PhaseState;
    implementation: PhaseState;
    testing: TestingPhaseState;
    deployment: PhaseState;
  };

  /** 所有任务 */
  tasks: Task[];

  /** 所有变更 */
  changeHistory: Change[];

  /** 迭代总结 */
  summary: string;

  /** 迭代统计 */
  stats?: IterationStats;
}

/**
 * 迭代统计
 */
export interface IterationStats {
  /** 总模块数 */
  totalModules: number;

  /** 总任务数 */
  totalTasks: number;

  /** 回滚次数 */
  rollbackCount: number;

  /** 总耗时(天) */
  durationDays: number;
}

// ============================================================================
// 操作结果类型
// ============================================================================

/**
 * 更新结果
 */
export interface UpdateResult {
  /** 是否成功 */
  success: boolean;

  /** 错误信息 */
  errors?: string[];

  /** 警告信息 */
  warnings?: string[];
}

/**
 * 阶段流转结果
 */
export interface TransitionResult extends UpdateResult {
  /** 新阶段 */
  newPhase?: string;
}

/**
 * 审批结果
 */
export interface ApproveResult extends UpdateResult {
  /** 审批时间 */
  approvedAt?: string;
}

/**
 * 回滚结果
 */
export interface RollbackResult extends UpdateResult {
  /** 回滚的模块 */
  rolledBackModule?: string;

  /** 目标阶段 */
  targetPhase?: string;

  /** 受影响的模块 */
  affectedModules?: string[];
}

/**
 * 迁移结果
 */
export interface MigrationResult extends UpdateResult {
  /** 迁移的迭代ID */
  migratedIterationId?: string;

  /** 新的当前迭代ID */
  newCurrentIterationId?: string;
}

// ============================================================================
// 辅助类型
// ============================================================================

/**
 * 进度摘要 - 用于会话恢复
 */
export interface ProgressSummary {
  /** 当前迭代 */
  currentIteration: string;

  /** 当前阶段 */
  currentPhase: string;

  /** 当前模块(如果有) */
  currentModule: string | null;

  /** 已完成模块数 */
  completedModules: number;

  /** 剩余模块数 */
  remainingModules: number;

  /** 上次操作描述 */
  lastAction: string;

  /** 上次操作时间 */
  lastActionTime: string;

  /** 建议下一步 */
  suggestedNextStep: string;
}

/**
 * 历史需求分析结果
 */
export interface HistoryNeedAnalysis {
  /** 是否需要历史数据 */
  needHistory: boolean;

  /** 原因 */
  reason: string;

  /** 是否需要用户确认 */
  requireConfirmation: boolean;

  /** 建议读取的迭代 */
  suggestedIterations?: string[];

  /** 匹配详情，供AI层面参考 */
  matchDetails?: KeywordMatchResult;
}

/**
 * 关键词匹配结果
 */
export interface KeywordMatchResult {
  /** 是否匹配到历史对比关键词 */
  hasComparisonKeyword: boolean;

  /** 是否匹配到趋势分析关键词 */
  hasTrendKeyword: boolean;

  /** 匹配到的迭代ID（如果有） */
  matchedIterationIds: string[];

  /** 匹配到的具体关键词 */
  matchedKeywords: string[];

  /** 置信度（0-1），供AI参考 */
  confidence: number;
}

/**
 * 文件大小检查结果
 */
export interface FileSizeCheck {
  /** 当前大小(KB) */
  sizeKB: number;

  /** 是否超过限制 */
  isOverLimit: boolean;

  /** 是否接近限制 */
  isWarning: boolean;

  /** 建议 */
  recommendation: string | null;
}

// ============================================================================
// 批量操作类型
// ============================================================================

/**
 * 批量更新操作类型
 */
export type BatchOperation =
  | { type: 'moduleStatus'; phaseName: string; moduleName: string; status: ModuleStatus; artifacts?: string[] }
  | { type: 'phaseTransition'; targetPhase: string }
  | { type: 'approvePhase'; phaseName: string; approvedBy: string }
  | { type: 'approveModule'; phaseName: string; moduleName: string; approvedBy: string; artifacts: string[] }
  | { type: 'testSubPhaseStatus'; subPhase: 'e2e' | 'performance' | 'chaos'; status: TestSubPhaseStatus; artifacts?: TestSubPhaseArtifacts };

/**
 * 批量更新结果
 */
export interface BatchUpdateResult extends UpdateResult {
  /** 每个操作的结果 */
  operationResults: UpdateResult[];

  /** 成功操作数 */
  successCount: number;

  /** 失败操作数 */
  failureCount: number;
}

// ============================================================================
// 缓存类型
// ============================================================================

/**
 * 状态缓存接口
 */
export interface StateCache {
  /** 缓存的状态 */
  state: State | null;

  /** 缓存时间戳 */
  timestamp: number;

  /** 缓存有效期(ms) */
  ttl: number;

  /** 是否有效 */
  isValid(): boolean;

  /** 获取缓存 */
  get(): State;

  /** 设置缓存 */
  set(state: State): void;

  /** 使缓存失效 */
  invalidate(): void;
}

// ============================================================================
// 迁移事务类型
// ============================================================================

/**
 * 迁移步骤
 */
export type MigrationStep =
  | 'started'
  | 'backup_created'
  | 'history_written'
  | 'state_cleaned'
  | 'completed'
  | 'rolled_back';

/**
 * 迁移事务状态
 */
export interface MigrationTransaction {
  /** 事务ID */
  transactionId: string;

  /** 开始时间 */
  startedAt: string;

  /** 当前步骤 */
  currentStep: MigrationStep;

  /** 备份文件路径 */
  backupPaths: {
    state: string;
    history: string;
  };

  /** 迁移的迭代ID */
  iterationId: string;
}

// ============================================================================
// 阶段名称常量
// ============================================================================

/** 阶段名称 */
export const PHASE_NAMES = [
  'requirements',
  'architecture',
  'implementation',
  'testing',
  'deployment'
] as const;

export type PhaseName = typeof PHASE_NAMES[number];

/** 阶段顺序映射 */
export const PHASE_ORDER: Record<PhaseName, number> = {
  requirements: 1,
  architecture: 2,
  implementation: 3,
  testing: 4,
  deployment: 5
};
