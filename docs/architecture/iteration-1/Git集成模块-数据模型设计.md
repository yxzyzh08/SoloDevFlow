# Git集成模块 - 数据模型设计

<!--
章节ID规范说明：
- 格式：{#arch-Git集成-dm-[章节标识]}
- 必须标注ID的章节：Schema定义、接口定义
- 示例：{#arch-Git集成-dm-CommitInfo} 表示Git集成模块数据模型的CommitInfo定义
-->

> **项目**: AI超级个体开发助手
> **版本**: v1.0.0
> **迭代**: Iteration 1
> **模块**: Git集成模块
> **日期**: 2025-12-15

---

## 一、数据模型概览

### 1.1 模型层次结构

```
Git集成模块数据模型
├── 输入模型（外部传入）
│   ├── CommitOptions        # Commit选项
│   ├── TagOptions           # Tag选项
│   └── HotfixOptions        # 热修复选项
│
├── 内部模型（处理过程）
│   ├── FileChange           # 文件变更信息
│   ├── CommitInfo           # Commit信息
│   └── VersionInfo          # 版本信息
│
├── 输出模型（返回结果）
│   ├── CommitResult         # Commit结果
│   ├── TagResult            # Tag结果
│   ├── RollbackResult       # 回滚结果
│   └── HotfixResult         # 热修复结果
│
└── 配置模型
    └── GitConfig            # Git配置
```

---

## 二、核心数据结构 {#arch-Git集成-dm-核心数据结构}

### 2.1 文件变更信息

```typescript
/**
 * 文件变更信息
 */
interface FileChange {
  /** 文件路径（相对于项目根目录） */
  path: string;

  /** 变更状态 */
  status: FileChangeStatus;

  /** 文件分类 */
  category: FileCategory;

  /** 旧路径（仅当status为renamed时有效） */
  oldPath?: string;
}

/**
 * 文件变更状态
 */
type FileChangeStatus =
  | 'modified'   // 已修改
  | 'added'      // 新增
  | 'deleted'    // 已删除
  | 'renamed'    // 重命名
  | 'copied';    // 复制

/**
 * 文件分类
 */
type FileCategory =
  | 'state'      // 状态文件（state.json等）
  | 'doc'        // 文档文件（docs/**）
  | 'code'       // 代码文件（src/**）
  | 'test'       // 测试文件（tests/**）
  | 'config'     // 配置文件（*.json、*.yml等）
  | 'guide';     // 规范文件（CLAUDE.md等）
```

### 2.2 Commit信息 {#arch-Git集成-dm-CommitInfo}

```typescript
/**
 * Commit信息（完整）
 */
interface CommitInfo {
  /** Commit类型 */
  type: CommitType;

  /** Commit范围 */
  scope: string;

  /** Commit主题（简短描述） */
  subject: string;

  /** Commit正文（详细说明，可选） */
  body?: string;

  /** Commit脚注（可选） */
  footer?: CommitFooter;

  /** 涉及的文件 */
  files: string[];

  /** 是否为热修复 */
  isHotfix: boolean;
}

/**
 * Commit类型
 */
type CommitType =
  | 'feat'      // 新功能
  | 'fix'       // Bug修复
  | 'docs'      // 文档更新
  | 'refactor'  // 重构
  | 'test'      // 测试
  | 'chore'     // 杂项
  | 'perf'      // 性能优化
  | 'hotfix';   // 热修复

/**
 * Commit脚注
 */
interface CommitFooter {
  /** 生成标识 */
  generatedBy: string;

  /** 协作者信息 */
  coAuthoredBy?: CoAuthor;
}

/**
 * 协作者信息
 */
interface CoAuthor {
  name: string;
  email: string;
}
```

### 2.3 版本信息 {#arch-Git集成-dm-VersionInfo}

```typescript
/**
 * 版本信息
 */
interface VersionInfo {
  /** 完整版本号（如"v1.0.0"） */
  full: string;

  /** 主版本号 */
  major: number;

  /** 次版本号 */
  minor: number;

  /** 补丁版本号 */
  patch: number;

  /** 版本前缀（默认"v"） */
  prefix: string;
}

/**
 * 版本递增类型
 */
type VersionIncrementType =
  | 'major'    // 主版本号递增（不兼容变更）
  | 'minor'    // 次版本号递增（新功能）
  | 'patch';   // 补丁版本号递增（Bug修复）
```

---

## 三、输入模型 {#arch-Git集成-dm-输入模型}

### 3.1 Commit选项

```typescript
/**
 * Commit选项
 */
interface CommitOptions {
  /** 指定提交的文件（可选，默认所有变更文件） */
  files?: string[];

  /** Commit类型 */
  type: CommitType;

  /** Commit范围 */
  scope: string;

  /** Commit主题（简短描述，不超过50字符） */
  subject: string;

  /** Commit正文（详细说明，可选） */
  body?: string;

  /** 是否为热修复 */
  isHotfix?: boolean;

  /** 是否自动推送（覆盖全局配置） */
  autoPush?: boolean;
}
```

### 3.2 Tag选项

```typescript
/**
 * Tag选项
 */
interface TagOptions {
  /** 版本号（不含前缀，如"1.0.0"） */
  version: string;

  /** Tag消息 */
  message: string;

  /** 是否推送到远程 */
  push?: boolean;

  /** 关联的迭代ID */
  iterationId?: string;
}
```

### 3.3 热修复选项

```typescript
/**
 * 热修复选项
 */
interface HotfixOptions {
  /** 问题描述 */
  description: string;

  /** 影响范围 */
  affectedModules: string[];

  /** 修复内容说明 */
  fixDetails: string;

  /** 涉及的文件 */
  files: string[];

  /** 是否立即部署 */
  deployImmediately?: boolean;
}
```

### 3.4 自动Commit触发器

```typescript
/**
 * 自动Commit触发条件
 */
type CommitTrigger =
  | 'module_status_change'     // 模块状态变更（pending → approved）
  | 'clarification_added'      // 澄清内容添加（clarifiedAspects新增）
  | 'task_status_change'       // 任务状态变更（globalTasks状态变化）
  | 'phase_transition'         // 阶段转换（phases状态变更）
  | 'document_update'          // 文档更新（CLAUDE.md或其他文档修改）
  | 'deployment'               // 部署操作（deployedAt更新）
  | 'iteration_complete'       // 迭代完成（迭代状态→completed）
  | 'hotfix';                  // 热修复（hotfix类型变更）

/**
 * 自动Commit上下文
 */
interface AutoCommitContext {
  /** 触发条件 */
  trigger: CommitTrigger;

  /** 变更的文件 */
  changedFiles: FileChange[];

  /** 关联的模块（如有） */
  module?: string;

  /** 关联的阶段（如有） */
  phase?: string;

  /** 额外描述（如有） */
  description?: string;
}
```

---

## 四、输出模型 {#arch-Git集成-dm-输出模型}

### 4.1 Commit结果

```typescript
/**
 * Commit执行结果
 */
interface CommitResult {
  /** 是否成功 */
  success: boolean;

  /** Commit哈希（成功时） */
  hash?: string;

  /** 完整的Commit message（成功时） */
  message?: string;

  /** 提交的文件数量 */
  filesCommitted?: number;

  /** 错误信息（失败时） */
  error?: GitError;

  /** 执行时间（毫秒） */
  duration: number;
}
```

### 4.2 Tag结果

```typescript
/**
 * Tag创建结果
 */
interface TagResult {
  /** 是否成功 */
  success: boolean;

  /** Tag名称（如"v1.0.0"） */
  tagName?: string;

  /** 关联的Commit哈希 */
  commitHash?: string;

  /** 是否已推送到远程 */
  pushed: boolean;

  /** 错误信息（失败时） */
  error?: GitError;
}
```

### 4.3 回滚结果

```typescript
/**
 * 回滚执行结果
 */
interface RollbackResult {
  /** 是否成功 */
  success: boolean;

  /** 回滚前的版本 */
  fromVersion?: string;

  /** 回滚后的版本 */
  toVersion?: string;

  /** 回滚后的Commit哈希 */
  commitHash?: string;

  /** 错误信息（失败时） */
  error?: GitError;

  /** 下一步操作提示 */
  nextSteps?: string[];
}
```

### 4.4 热修复结果

```typescript
/**
 * 热修复执行结果
 */
interface HotfixResult {
  /** 是否成功 */
  success: boolean;

  /** Commit信息 */
  commit?: CommitResult;

  /** Tag信息 */
  tag?: TagResult;

  /** 新版本号 */
  newVersion?: string;

  /** 是否已部署 */
  deployed: boolean;

  /** 错误信息（失败时） */
  error?: GitError;

  /** changeHistory条目ID */
  changeHistoryId?: string;
}
```

---

## 五、错误模型 {#arch-Git集成-dm-错误模型}

### 5.1 Git错误

```typescript
/**
 * Git错误
 */
interface GitError {
  /** 错误码 */
  code: GitErrorCode;

  /** 错误消息 */
  message: string;

  /** 原始Git错误输出（如有） */
  gitOutput?: string;

  /** 修复建议 */
  suggestions: string[];

  /** 是否可重试 */
  retryable: boolean;
}

/**
 * Git错误码
 */
enum GitErrorCode {
  // 初始化相关 (GIT_0xx)
  GIT_NOT_INITIALIZED = 'GIT_001',         // Git仓库未初始化
  GIT_USER_NOT_CONFIGURED = 'GIT_002',     // 未配置用户信息

  // Commit相关 (GIT_1xx)
  COMMIT_FAILED = 'GIT_101',               // Commit失败
  COMMIT_EMPTY = 'GIT_102',                // 无内容可提交
  COMMIT_MESSAGE_INVALID = 'GIT_103',      // Commit message格式错误

  // Tag相关 (GIT_2xx)
  TAG_EXISTS = 'GIT_201',                  // Tag已存在
  TAG_NOT_FOUND = 'GIT_202',               // Tag不存在
  TAG_FORMAT_INVALID = 'GIT_203',          // Tag格式错误

  // Push相关 (GIT_3xx)
  PUSH_FAILED = 'GIT_301',                 // Push失败
  PUSH_REJECTED = 'GIT_302',               // Push被拒绝
  REMOTE_NOT_CONFIGURED = 'GIT_303',       // 远程仓库未配置

  // 版本相关 (GIT_4xx)
  VERSION_FORMAT_INVALID = 'GIT_401',      // 版本号格式错误
  VERSION_CONFLICT = 'GIT_402',            // 版本号冲突

  // 回滚相关 (GIT_5xx)
  ROLLBACK_FAILED = 'GIT_501',             // 回滚失败
  UNCOMMITTED_CHANGES = 'GIT_502',         // 存在未提交变更
  WORKING_DIR_DIRTY = 'GIT_503',           // 工作目录不干净

  // 其他 (GIT_9xx)
  UNKNOWN_ERROR = 'GIT_999'                // 未知错误
}
```

### 5.2 错误处理映射

```typescript
/**
 * 错误处理映射表
 */
const ERROR_HANDLING_MAP: Record<GitErrorCode, ErrorHandling> = {
  [GitErrorCode.GIT_NOT_INITIALIZED]: {
    severity: 'blocking',
    suggestions: [
      '执行 git init 初始化仓库',
      '或克隆一个已存在的仓库'
    ],
    retryable: false
  },
  [GitErrorCode.GIT_USER_NOT_CONFIGURED]: {
    severity: 'blocking',
    suggestions: [
      '执行 git config user.name "Your Name"',
      '执行 git config user.email "your@email.com"'
    ],
    retryable: false
  },
  [GitErrorCode.COMMIT_FAILED]: {
    severity: 'error',
    suggestions: [
      '检查文件是否有冲突',
      '确认有权限写入仓库'
    ],
    retryable: true
  },
  [GitErrorCode.TAG_EXISTS]: {
    severity: 'blocking',
    suggestions: [
      '使用不同的版本号',
      '或先删除已存在的Tag: git tag -d [tag]'
    ],
    retryable: false
  },
  [GitErrorCode.PUSH_FAILED]: {
    severity: 'warning',
    suggestions: [
      '检查网络连接',
      '验证远程仓库权限',
      '稍后手动执行 git push'
    ],
    retryable: true
  },
  [GitErrorCode.VERSION_FORMAT_INVALID]: {
    severity: 'blocking',
    suggestions: [
      '版本号格式应为 vMAJOR.MINOR.PATCH',
      '例如: v1.0.0, v2.1.3'
    ],
    retryable: false
  },
  [GitErrorCode.UNCOMMITTED_CHANGES]: {
    severity: 'blocking',
    suggestions: [
      '先提交当前变更',
      '或使用 git stash 暂存变更'
    ],
    retryable: false
  }
};

interface ErrorHandling {
  severity: 'blocking' | 'error' | 'warning';
  suggestions: string[];
  retryable: boolean;
}
```

---

## 六、配置模型 {#arch-Git集成-dm-配置模型}

### 6.1 Git配置

```typescript
/**
 * Git集成模块配置
 */
interface GitConfig {
  // === 推送配置 ===

  /** 是否自动推送（默认false） */
  autoPush: boolean;

  /** Push重试次数（默认3） */
  pushRetryCount: number;

  /** Push重试间隔（毫秒，默认2000） */
  pushRetryDelay: number;

  // === Commit配置 ===

  /** 是否包含Co-Author信息（默认true） */
  includeCoAuthor: boolean;

  /** Co-Author名称 */
  coAuthorName: string;

  /** Co-Author邮箱 */
  coAuthorEmail: string;

  /** 是否包含生成标识（默认true） */
  includeGeneratedBy: boolean;

  // === 版本配置 ===

  /** 版本号前缀（默认"v"） */
  versionPrefix: string;

  /** 初始版本号（默认"1.0.0"） */
  initialVersion: string;

  // === 热修复配置 ===

  /** 热修复commit前缀（默认"[HOTFIX]"） */
  hotfixPrefix: string;

  /** 热修复默认递增类型（默认"patch"） */
  hotfixVersionIncrement: VersionIncrementType;

  // === 日志配置 ===

  /** 是否启用详细日志（默认false） */
  verboseLogging: boolean;

  /** 日志保留天数（默认30） */
  logRetentionDays: number;
}
```

### 6.2 默认配置值

```typescript
/**
 * 默认Git配置
 */
const DEFAULT_GIT_CONFIG: GitConfig = {
  // 推送配置
  autoPush: false,
  pushRetryCount: 3,
  pushRetryDelay: 2000,

  // Commit配置
  includeCoAuthor: true,
  coAuthorName: 'Claude Opus 4.5',
  coAuthorEmail: 'noreply@anthropic.com',
  includeGeneratedBy: true,

  // 版本配置
  versionPrefix: 'v',
  initialVersion: '1.0.0',

  // 热修复配置
  hotfixPrefix: '[HOTFIX]',
  hotfixVersionIncrement: 'patch',

  // 日志配置
  verboseLogging: false,
  logRetentionDays: 30
};
```

---

## 七、Commit推断规则 {#arch-Git集成-dm-推断规则}

### 7.1 Type推断规则

```typescript
/**
 * Commit Type推断规则
 */
const COMMIT_TYPE_RULES: CommitTypeRule[] = [
  // 规则1：热修复标记 → hotfix
  {
    condition: (ctx) => ctx.isHotfix === true,
    type: 'hotfix',
    priority: 100
  },

  // 规则2：state.json模块状态approved → feat
  {
    condition: (ctx) => ctx.trigger === 'module_status_change'
      && ctx.changes.some(c => c.path.includes('state.json')),
    type: 'feat',
    priority: 90
  },

  // 规则3：阶段转换 → feat
  {
    condition: (ctx) => ctx.trigger === 'phase_transition',
    type: 'feat',
    priority: 85
  },

  // 规则4：PRD或架构文档变更 → docs
  {
    condition: (ctx) => ctx.changes.some(c =>
      c.path.startsWith('docs/') &&
      (c.path.includes('PRD') || c.path.includes('architecture'))
    ),
    type: 'docs',
    priority: 80
  },

  // 规则5：测试文件变更 → test
  {
    condition: (ctx) => ctx.changes.some(c =>
      c.path.includes('test') || c.path.includes('spec')
    ),
    type: 'test',
    priority: 70
  },

  // 规则6：CLAUDE.md或指南变更 → docs
  {
    condition: (ctx) => ctx.changes.some(c =>
      c.path.includes('CLAUDE.md') || c.path.includes('.claude/')
    ),
    type: 'docs',
    priority: 60
  },

  // 规则7：仅state.json变更 → chore
  {
    condition: (ctx) => ctx.changes.every(c =>
      c.path.includes('state.json')
    ),
    type: 'chore',
    priority: 50
  },

  // 规则8：代码文件变更 → feat
  {
    condition: (ctx) => ctx.changes.some(c =>
      c.path.startsWith('src/')
    ),
    type: 'feat',
    priority: 40
  },

  // 默认规则 → chore
  {
    condition: () => true,
    type: 'chore',
    priority: 0
  }
];

interface CommitTypeRule {
  condition: (ctx: AutoCommitContext) => boolean;
  type: CommitType;
  priority: number;
}
```

### 7.2 Scope推断规则

```typescript
/**
 * Commit Scope推断规则
 */
const COMMIT_SCOPE_RULES: CommitScopeRule[] = [
  // 规则1：热修复 → prod
  {
    condition: (ctx) => ctx.isHotfix === true,
    scope: 'prod',
    priority: 100
  },

  // 规则2：有明确阶段 → 阶段名
  {
    condition: (ctx) => ctx.phase !== undefined,
    scope: (ctx) => ctx.phase!,
    priority: 90
  },

  // 规则3：有明确模块 → 模块名
  {
    condition: (ctx) => ctx.module !== undefined,
    scope: (ctx) => ctx.module!,
    priority: 80
  },

  // 规则4：PRD文档 → requirements
  {
    condition: (ctx) => ctx.changes.some(c => c.path.includes('PRD')),
    scope: 'requirements',
    priority: 70
  },

  // 规则5：架构文档 → architecture
  {
    condition: (ctx) => ctx.changes.some(c =>
      c.path.includes('architecture')
    ),
    scope: 'architecture',
    priority: 60
  },

  // 规则6：state.json → state
  {
    condition: (ctx) => ctx.changes.some(c =>
      c.path.includes('state.json')
    ),
    scope: 'state',
    priority: 50
  },

  // 规则7：CLAUDE.md或指南 → guide
  {
    condition: (ctx) => ctx.changes.some(c =>
      c.path.includes('CLAUDE.md') || c.path.includes('.claude/')
    ),
    scope: 'guide',
    priority: 40
  },

  // 默认规则 → general
  {
    condition: () => true,
    scope: 'general',
    priority: 0
  }
];

interface CommitScopeRule {
  condition: (ctx: AutoCommitContext) => boolean;
  scope: string | ((ctx: AutoCommitContext) => string);
  priority: number;
}
```

### 7.3 Subject生成模板

```typescript
/**
 * Commit Subject生成模板
 */
const COMMIT_SUBJECT_TEMPLATES: Record<CommitTrigger, SubjectTemplate> = {
  module_status_change: {
    template: '完成{module}需求澄清',
    variables: ['module']
  },
  clarification_added: {
    template: '补充{module}澄清内容',
    variables: ['module']
  },
  task_status_change: {
    template: '更新任务状态',
    variables: []
  },
  phase_transition: {
    template: '进入{phase}阶段',
    variables: ['phase']
  },
  document_update: {
    template: '更新{document}文档',
    variables: ['document']
  },
  deployment: {
    template: '部署到{environment}',
    variables: ['environment']
  },
  iteration_complete: {
    template: '完成{iteration}迭代',
    variables: ['iteration']
  },
  hotfix: {
    template: '{hotfixPrefix} {description}',
    variables: ['hotfixPrefix', 'description']
  }
};

interface SubjectTemplate {
  template: string;
  variables: string[];
}
```

---

## 八、Metadata同步模型 {#arch-Git集成-dm-Metadata}

### 8.1 Git Metadata结构

```typescript
/**
 * state.json中的Git元数据
 * 位置：state.json.metadata
 */
interface GitMetadata {
  /** 最近一次Commit的哈希值（短哈希，7位） */
  lastGitCommit: string;

  /** 最近一次Commit的消息（完整message） */
  lastGitCommitMessage: string;

  /** 最近一次Commit的时间戳（ISO 8601格式） */
  lastGitCommitAt: string;

  /** state.json文件版本号（每次更新+1） */
  stateFileVersion: number;

  /** 累计状态变更次数 */
  totalStateChanges: number;
}
```

### 8.2 迭代Git信息

```typescript
/**
 * 迭代中的Git信息
 * 位置：state.json.iterations[iterationId]
 */
interface IterationGitInfo {
  /** 迭代版本号（如"v1.0.0"） */
  version: string;

  /** Git Tag名称（迭代完成后才有） */
  gitTag?: string;

  /** 部署时的Commit哈希 */
  deployedCommit?: string;

  /** 部署时间 */
  deployedAt?: string;
}
```

### 8.3 changeHistory中的Git信息

```typescript
/**
 * changeHistory中的Git相关条目
 * 位置：state.json.changeHistory[]
 */
interface GitChangeHistoryEntry {
  /** 唯一标识 */
  id: string;

  /** 变更时间 */
  timestamp: string;

  /** 变更类型 */
  type: 'hotfix' | 'rollback' | 'tag_created';

  /** 变更描述 */
  description: string;

  /** 关联的迭代 */
  iteration: string;

  /** Git Commit哈希 */
  gitCommit: string;

  /** Git Tag（如有） */
  gitTag?: string;

  /** 影响的模块 */
  affectedModules: string[];

  /** 部署时间（如已部署） */
  deployedAt?: string;

  /** 额外信息 */
  extra?: {
    /** 回滚来源版本 */
    fromVersion?: string;
    /** 回滚目标版本 */
    toVersion?: string;
  };
}
```

---

## 九、日志模型

### 9.1 Git操作日志

```typescript
/**
 * Git操作日志
 */
interface GitOperationLog {
  /** 日志ID */
  id: string;

  /** 时间戳 */
  timestamp: string;

  /** 操作类型 */
  operation: GitOperation;

  /** 执行的Git命令 */
  command: string;

  /** 命令参数 */
  args?: string[];

  /** 执行结果 */
  result: 'success' | 'failure';

  /** 执行耗时（毫秒） */
  duration: number;

  /** 输出内容 */
  output?: string;

  /** 错误信息（失败时） */
  error?: string;

  /** 关联的触发器 */
  trigger?: CommitTrigger;
}

/**
 * Git操作类型
 */
type GitOperation =
  | 'status'      // git status
  | 'add'         // git add
  | 'commit'      // git commit
  | 'tag'         // git tag
  | 'push'        // git push
  | 'checkout'    // git checkout（回滚）
  | 'log'         // git log
  | 'rev-parse';  // git rev-parse
```

---

## 十、验证规则

### 10.1 版本号验证

```typescript
/**
 * 版本号验证规则
 */
const VERSION_VALIDATION: ValidationRule<string> = {
  name: 'version_format',
  validate: (version: string): ValidationResult => {
    // 正则：vMAJOR.MINOR.PATCH
    const regex = /^v\d+\.\d+\.\d+$/;

    if (!regex.test(version)) {
      return {
        valid: false,
        error: {
          code: GitErrorCode.VERSION_FORMAT_INVALID,
          message: `版本号格式错误: ${version}`,
          suggestions: [
            '版本号格式应为 vMAJOR.MINOR.PATCH',
            '例如: v1.0.0, v2.1.3'
          ]
        }
      };
    }

    return { valid: true };
  }
};
```

### 10.2 Commit Message验证

```typescript
/**
 * Commit Message验证规则
 */
const COMMIT_MESSAGE_VALIDATION: ValidationRule<CommitInfo> = {
  name: 'commit_message_format',
  validate: (info: CommitInfo): ValidationResult => {
    const errors: string[] = [];

    // 规则1：type必须有效
    const validTypes: CommitType[] = [
      'feat', 'fix', 'docs', 'refactor', 'test', 'chore', 'perf', 'hotfix'
    ];
    if (!validTypes.includes(info.type)) {
      errors.push(`无效的type: ${info.type}`);
    }

    // 规则2：scope不能为空
    if (!info.scope || info.scope.trim() === '') {
      errors.push('scope不能为空');
    }

    // 规则3：subject不能为空且不超过50字符
    if (!info.subject || info.subject.trim() === '') {
      errors.push('subject不能为空');
    } else if (info.subject.length > 50) {
      errors.push(`subject超过50字符: ${info.subject.length}`);
    }

    // 规则4：热修复必须有[HOTFIX]前缀
    if (info.isHotfix && !info.subject.includes('[HOTFIX]')) {
      errors.push('热修复commit必须包含[HOTFIX]前缀');
    }

    if (errors.length > 0) {
      return {
        valid: false,
        error: {
          code: GitErrorCode.COMMIT_MESSAGE_INVALID,
          message: 'Commit message格式错误',
          suggestions: errors
        }
      };
    }

    return { valid: true };
  }
};
```

---

## 十一、常量定义

### 11.1 Commit类型中文映射

```typescript
/**
 * Commit类型中文名称映射
 */
const COMMIT_TYPE_LABELS: Record<CommitType, string> = {
  feat: '新功能',
  fix: 'Bug修复',
  docs: '文档更新',
  refactor: '代码重构',
  test: '测试',
  chore: '杂项',
  perf: '性能优化',
  hotfix: '热修复'
};
```

### 11.2 阶段Scope映射

```typescript
/**
 * 阶段名称到Scope的映射
 */
const PHASE_SCOPE_MAP: Record<string, string> = {
  requirements: 'requirements',
  architecture: 'architecture',
  implementation: 'implementation',
  testing: 'testing',
  deployment: 'deployment'
};
```

### 11.3 文件分类规则

```typescript
/**
 * 文件路径到分类的映射规则
 */
const FILE_CATEGORY_RULES: FileCategoryRule[] = [
  { pattern: /^\.solodev\/state.*\.json$/, category: 'state' },
  { pattern: /^docs\//, category: 'doc' },
  { pattern: /^src\//, category: 'code' },
  { pattern: /^tests?\//, category: 'test' },
  { pattern: /\.(spec|test)\.[jt]sx?$/, category: 'test' },
  { pattern: /^CLAUDE\.md$/, category: 'guide' },
  { pattern: /^\.claude\//, category: 'guide' },
  { pattern: /\.(json|ya?ml|toml)$/, category: 'config' }
];

interface FileCategoryRule {
  pattern: RegExp;
  category: FileCategory;
}
```

---

**文档版本历史**

| 版本 | 日期 | 修改内容 | 修改人 |
|-----|------|---------|-------|
| v1.0 | 2025-12-15 | 初始版本 | Claude AI |
