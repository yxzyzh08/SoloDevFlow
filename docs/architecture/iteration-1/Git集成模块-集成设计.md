# Git集成模块 - 集成设计

<!--
章节ID规范说明：
- 格式：{#arch-Git集成-int-[章节标识]}
- 必须标注ID的章节：集成点定义、接口契约
- 示例：{#arch-Git集成-int-状态管理} 表示Git集成模块与状态管理模块的集成设计
-->

> **项目**: AI超级个体开发助手
> **版本**: v1.0.0
> **迭代**: Iteration 1
> **模块**: Git集成模块
> **日期**: 2025-12-15

---

## 一、集成概览

### 1.1 模块依赖关系

```
┌─────────────────────────────────────────────────────────────────┐
│                         调用方向图                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                           │
│  │   命令体系模块   │ ─────────────┐                            │
│  │                 │              │                            │
│  │ · 执行命令后触发 │              │ 触发Git操作                │
│  │ · 热修复命令    │              │ (autoCommit, createTag...)│
│  └─────────────────┘              │                            │
│                                   ▼                            │
│                        ┌─────────────────┐                     │
│                        │  Git集成模块     │                     │
│                        │                 │                     │
│                        │ · 自动commit    │                     │
│                        │ · 创建Tag       │                     │
│                        │ · 版本回滚      │                     │
│                        │ · 热修复处理    │                     │
│                        └────────┬────────┘                     │
│                                 │                              │
│             ┌───────────────────┼───────────────────┐          │
│             │                   │                   │          │
│             ▼                   ▼                   ▼          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│  │  状态管理模块    │ │  核心流程模型    │ │    Git CLI      │  │
│  │                 │ │                 │ │                 │  │
│  │ · 读取version   │ │ · 验证迭代状态  │ │ · git status   │  │
│  │ · 更新metadata  │ │                 │ │ · git commit   │  │
│  │ · 记录history   │ │                 │ │ · git tag      │  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 集成点汇总 {#arch-Git集成-int-集成点汇总}

| 集成对象 | 方向 | 接口数量 | 集成类型 |
|---------|------|---------|---------|
| 状态管理模块 | 依赖 | 4 | 数据读写 |
| 命令体系模块 | 被依赖 | 4 | 服务调用 |
| 核心流程模型 | 依赖 | 1 | 验证规则 |
| Git CLI | 依赖 | 7 | 命令执行 |

---

## 二、与状态管理模块集成 {#arch-Git集成-int-状态管理}

### 2.1 集成关系

```
Git集成模块 ──依赖──> 状态管理模块

目的：
  · 读取当前版本号（iterations[].version）
  · 更新Git元数据（metadata.lastGitCommit等）
  · 记录变更历史（changeHistory）
  · 更新迭代Git信息（iterations[].gitTag等）
```

### 2.2 依赖的接口 {#arch-Git集成-int-状态管理接口}

#### 接口1：读取状态

```typescript
/**
 * 读取当前状态
 * @returns Promise<State> 完整的state.json内容
 */
interface StateManager {
  readState(): Promise<State>;
}

// Git集成模块调用示例
class VersionManager {
  async getCurrentVersion(): Promise<string> {
    const state = await this.stateManager.readState();
    const currentIteration = state.iterations[state.currentIteration];
    return currentIteration.version;
  }
}
```

#### 接口2：更新Git元数据

```typescript
/**
 * 更新Git元数据
 * @param metadata Git元数据
 * @returns Promise<void>
 */
interface StateManager {
  updateGitMetadata(metadata: {
    lastGitCommit: string;
    lastGitCommitMessage: string;
    lastGitCommitAt: string;
  }): Promise<void>;
}

// Git集成模块调用示例
class GitOperator {
  async afterCommit(hash: string, message: string): Promise<void> {
    await this.stateManager.updateGitMetadata({
      lastGitCommit: hash.substring(0, 7),
      lastGitCommitMessage: message,
      lastGitCommitAt: new Date().toISOString()
    });
  }
}
```

#### 接口3：添加变更历史

```typescript
/**
 * 添加变更历史条目
 * @param entry 变更历史条目
 * @returns Promise<string> 新条目的ID
 */
interface StateManager {
  addChangeHistory(entry: Omit<ChangeHistoryEntry, 'id'>): Promise<string>;
}

// Git集成模块调用示例
class HotfixHandler {
  async recordHotfix(hotfix: HotfixInfo): Promise<void> {
    await this.stateManager.addChangeHistory({
      timestamp: new Date().toISOString(),
      type: 'hotfix',
      description: hotfix.description,
      iteration: hotfix.iteration,
      changedBy: 'ai',
      changes: [],
      extra: {
        gitCommit: hotfix.commitHash,
        gitTag: hotfix.tagName
      }
    });
  }
}
```

#### 接口4：更新迭代Git信息

```typescript
/**
 * 更新迭代的Git信息
 * @param iterationId 迭代ID
 * @param gitInfo Git信息
 * @returns Promise<void>
 */
interface StateManager {
  updateIterationGitInfo(
    iterationId: string,
    gitInfo: {
      gitTag?: string;
      deployedCommit?: string;
      deployedAt?: string;
    }
  ): Promise<void>;
}

// Git集成模块调用示例
class VersionManager {
  async afterCreateTag(version: string): Promise<void> {
    const state = await this.stateManager.readState();
    await this.stateManager.updateIterationGitInfo(
      state.currentIteration,
      { gitTag: version }
    );
  }
}
```

### 2.3 数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                    Git操作后的数据流                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Git Commit完成                                                 │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. 更新metadata                                          │   │
│  │    · lastGitCommit = "abc1234"                          │   │
│  │    · lastGitCommitMessage = "feat(requirements): ..."   │   │
│  │    · lastGitCommitAt = "2025-12-15T11:00:00Z"          │   │
│  │    · stateFileVersion += 1                              │   │
│  │    · totalStateChanges += 1                             │   │
│  └────────────────────────────┬────────────────────────────┘   │
│                               │                                 │
│                               ▼                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 2. 触发Git Commit (metadata更新)                         │   │
│  │    git add .solodev/state.json                          │   │
│  │    git commit -m "chore(state): 更新Git元数据"          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Git Tag创建完成（迭代完成时）                                   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 3. 更新迭代Git信息                                       │   │
│  │    · iterations[currentIteration].gitTag = "v1.0.0"     │   │
│  │    · iterations[currentIteration].deployedCommit = ...  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  热修复完成                                                     │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 4. 添加changeHistory条目                                 │   │
│  │    {                                                    │   │
│  │      type: "hotfix",                                    │   │
│  │      description: "[HOTFIX] 修复...",                   │   │
│  │      gitCommit: "def5678",                              │   │
│  │      gitTag: "v1.0.1"                                   │   │
│  │    }                                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、与命令体系模块集成 {#arch-Git集成-int-命令体系}

### 3.1 集成关系

```
命令体系模块 ──依赖──> Git集成模块

目的：
  · 命令执行后触发自动commit
  · 热修复命令调用热修复流程
  · 部署命令后创建版本Tag
  · 回滚命令调用版本回滚
```

### 3.2 提供的接口 {#arch-Git集成-int-命令体系接口}

#### 接口1：自动Commit

```typescript
/**
 * 自动Commit（根据触发条件）
 * @param context 自动Commit上下文
 * @returns Promise<CommitResult> Commit结果
 */
interface GitIntegration {
  autoCommit(context: AutoCommitContext): Promise<CommitResult>;
}

// 命令体系模块调用示例
class CommandExecutor {
  async afterModuleApproved(module: string): Promise<void> {
    const changes = await this.gitIntegration.detectChanges();

    await this.gitIntegration.autoCommit({
      trigger: 'module_status_change',
      changedFiles: changes,
      module: module,
      phase: 'requirements'
    });
  }
}
```

#### 接口2：创建版本Tag

```typescript
/**
 * 创建版本Tag
 * @param options Tag选项
 * @returns Promise<TagResult> Tag结果
 */
interface GitIntegration {
  createTag(options: TagOptions): Promise<TagResult>;
}

// 命令体系模块调用示例
class DeploymentCommand {
  async afterDeployment(version: string): Promise<void> {
    await this.gitIntegration.createTag({
      version: version,
      message: `Release ${version}\n\n迭代完成并部署`,
      push: true,
      iterationId: this.state.currentIteration
    });
  }
}
```

#### 接口3：热修复处理

```typescript
/**
 * 创建热修复
 * @param options 热修复选项
 * @returns Promise<HotfixResult> 热修复结果
 */
interface GitIntegration {
  createHotfix(options: HotfixOptions): Promise<HotfixResult>;
}

// 命令体系模块调用示例（如有热修复命令）
class HotfixCommand {
  async execute(description: string, files: string[]): Promise<void> {
    const result = await this.gitIntegration.createHotfix({
      description: description,
      affectedModules: this.inferAffectedModules(files),
      fixDetails: description,
      files: files,
      deployImmediately: false
    });

    if (result.success) {
      console.log(`热修复完成: ${result.newVersion}`);
    }
  }
}
```

#### 接口4：版本回滚

```typescript
/**
 * 回滚到指定版本
 * @param version 目标版本号
 * @returns Promise<RollbackResult> 回滚结果
 */
interface GitIntegration {
  rollbackToTag(version: string): Promise<RollbackResult>;
}

// 命令体系模块调用示例（如有回滚命令）
class RollbackCommand {
  async execute(targetVersion: string): Promise<void> {
    // 1. 列出可用版本
    const tags = await this.gitIntegration.listTags();
    if (!tags.includes(targetVersion)) {
      throw new Error(`版本 ${targetVersion} 不存在`);
    }

    // 2. 执行回滚
    const result = await this.gitIntegration.rollbackToTag(targetVersion);

    if (result.success) {
      console.log(`已回滚到 ${targetVersion}`);
      console.log('下一步操作:');
      result.nextSteps?.forEach(step => console.log(`  · ${step}`));
    }
  }
}
```

### 3.3 触发时机

```
┌─────────────────────────────────────────────────────────────────┐
│                    命令执行与Git操作触发关系                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  命令                        触发的Git操作                       │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  /approve-requirements ────> autoCommit(module_status_change)   │
│  /approve-architecture ────> autoCommit(module_status_change)   │
│  /start-implementation ────> autoCommit(phase_transition)       │
│  /start-testing ───────────> autoCommit(phase_transition)       │
│  /start-deployment ────────> autoCommit(phase_transition)       │
│                              + createTag (迭代完成时)            │
│                                                                 │
│  文档更新 ─────────────────> autoCommit(document_update)         │
│  state.json更新 ───────────> autoCommit (chore类型)              │
│  热修复命令 ───────────────> createHotfix()                      │
│  回滚命令 ─────────────────> rollbackToTag()                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、与核心流程模型集成 {#arch-Git集成-int-核心流程}

### 4.1 集成关系

```
Git集成模块 ──依赖──> 核心流程模型

目的：
  · 验证迭代状态（创建Tag前）
  · 获取阶段定义（推断Commit scope）
```

### 4.2 依赖的接口 {#arch-Git集成-int-核心流程接口}

#### 接口1：验证迭代可发布

```typescript
/**
 * 验证迭代是否可以发布（创建Tag）
 * @param iterationId 迭代ID
 * @returns Promise<ValidationResult> 验证结果
 */
interface CoreProcessModel {
  validateIterationReleasable(iterationId: string): Promise<ValidationResult>;
}

// Git集成模块调用示例
class VersionManager {
  async createReleaseTag(version: string): Promise<TagResult> {
    const state = await this.stateManager.readState();

    // 验证迭代状态
    const validation = await this.coreProcess.validateIterationReleasable(
      state.currentIteration
    );

    if (!validation.valid) {
      return {
        success: false,
        pushed: false,
        error: {
          code: GitErrorCode.TAG_FORMAT_INVALID,
          message: '迭代尚未完成，无法创建发布Tag',
          suggestions: validation.errors,
          retryable: false
        }
      };
    }

    // 创建Tag
    return this.gitOperator.createTag(version, `Release ${version}`);
  }
}
```

---

## 五、与Git CLI集成 {#arch-Git集成-int-GitCLI}

### 5.1 集成关系

```
Git集成模块 ──调用──> Git CLI

目的：
  · 执行所有Git命令
  · 获取仓库状态
  · 管理版本和Tag
```

### 5.2 封装的Git命令 {#arch-Git集成-int-Git命令}

#### 命令1：检测变更

```typescript
/**
 * 检测工作区变更
 * 对应Git命令: git status --porcelain
 */
class GitOperator {
  async detectChanges(): Promise<FileChange[]> {
    const output = await this.exec('git status --porcelain');
    return this.parseStatusOutput(output);
  }

  private parseStatusOutput(output: string): FileChange[] {
    const lines = output.trim().split('\n').filter(Boolean);
    return lines.map(line => {
      const status = line.substring(0, 2).trim();
      const path = line.substring(3);

      return {
        path,
        status: this.parseStatus(status),
        category: this.categorizeFile(path)
      };
    });
  }

  private parseStatus(code: string): FileChangeStatus {
    const statusMap: Record<string, FileChangeStatus> = {
      'M': 'modified',
      'A': 'added',
      'D': 'deleted',
      'R': 'renamed',
      'C': 'copied',
      '??': 'added'  // 未跟踪文件视为新增
    };
    return statusMap[code] || 'modified';
  }
}
```

#### 命令2：添加文件

```typescript
/**
 * 添加文件到暂存区
 * 对应Git命令: git add [files]
 */
class GitOperator {
  async add(files: string[]): Promise<void> {
    if (files.length === 0) {
      throw new GitIntegrationError(
        GitErrorCode.COMMIT_EMPTY,
        '没有文件可添加'
      );
    }

    const quotedFiles = files.map(f => `"${f}"`).join(' ');
    await this.exec(`git add ${quotedFiles}`);
  }
}
```

#### 命令3：提交变更

```typescript
/**
 * 提交变更
 * 对应Git命令: git commit -m "[message]"
 */
class GitOperator {
  async commit(message: string): Promise<CommitResult> {
    const startTime = Date.now();

    try {
      // 使用HEREDOC格式保证message正确
      const output = await this.exec(`git commit -m "$(cat <<'EOF'
${message}
EOF
)"`);

      // 获取commit hash
      const hash = await this.exec('git rev-parse --short HEAD');

      return {
        success: true,
        hash: hash.trim(),
        message: message,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: GitErrorCode.COMMIT_FAILED,
          message: `Commit失败: ${error.message}`,
          gitOutput: error.stderr,
          suggestions: ['检查文件是否有冲突', '确认有权限写入仓库'],
          retryable: true
        },
        duration: Date.now() - startTime
      };
    }
  }
}
```

#### 命令4：创建Tag

```typescript
/**
 * 创建Tag
 * 对应Git命令: git tag [version] -m "[message]"
 */
class GitOperator {
  async createTag(version: string, message: string): Promise<TagResult> {
    try {
      // 检查Tag是否已存在
      const exists = await this.tagExists(version);
      if (exists) {
        return {
          success: false,
          pushed: false,
          error: {
            code: GitErrorCode.TAG_EXISTS,
            message: `Tag ${version} 已存在`,
            suggestions: ['使用不同的版本号', '或先删除已存在的Tag'],
            retryable: false
          }
        };
      }

      // 创建Tag
      await this.exec(`git tag ${version} -m "${message}"`);

      // 获取关联的commit hash
      const hash = await this.exec(`git rev-parse ${version}`);

      return {
        success: true,
        tagName: version,
        commitHash: hash.trim(),
        pushed: false
      };
    } catch (error) {
      return {
        success: false,
        pushed: false,
        error: {
          code: GitErrorCode.TAG_NOT_FOUND,
          message: `创建Tag失败: ${error.message}`,
          suggestions: ['检查版本号格式'],
          retryable: true
        }
      };
    }
  }

  private async tagExists(version: string): Promise<boolean> {
    try {
      await this.exec(`git rev-parse ${version}`);
      return true;
    } catch {
      return false;
    }
  }
}
```

#### 命令5：推送Tag

```typescript
/**
 * 推送Tag到远程
 * 对应Git命令: git push origin [version]
 */
class GitOperator {
  async pushTag(version: string, retryCount: number = 3): Promise<PushResult> {
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        await this.exec(`git push origin ${version}`);
        return { success: true };
      } catch (error) {
        if (attempt === retryCount) {
          return {
            success: false,
            error: {
              code: GitErrorCode.PUSH_FAILED,
              message: `Push失败 (尝试${retryCount}次): ${error.message}`,
              suggestions: [
                '检查网络连接',
                '验证远程仓库权限',
                `稍后手动执行: git push origin ${version}`
              ],
              retryable: true
            }
          };
        }
        // 等待后重试
        await this.delay(this.config.pushRetryDelay);
      }
    }
  }
}
```

#### 命令6：列出Tag

```typescript
/**
 * 列出所有Tag
 * 对应Git命令: git tag
 */
class GitOperator {
  async listTags(): Promise<string[]> {
    const output = await this.exec('git tag');
    return output.trim().split('\n').filter(Boolean);
  }
}
```

#### 命令7：切换到Tag（回滚）

```typescript
/**
 * 切换到指定Tag
 * 对应Git命令: git checkout [version]
 */
class GitOperator {
  async checkoutTag(version: string): Promise<RollbackResult> {
    try {
      // 检查是否有未提交变更
      const changes = await this.detectChanges();
      if (changes.length > 0) {
        return {
          success: false,
          error: {
            code: GitErrorCode.UNCOMMITTED_CHANGES,
            message: '存在未提交的变更，无法回滚',
            suggestions: [
              '先提交当前变更',
              '或使用 git stash 暂存变更'
            ],
            retryable: false
          }
        };
      }

      // 获取当前版本
      const currentTag = await this.getCurrentTag();

      // 执行checkout
      await this.exec(`git checkout ${version}`);

      return {
        success: true,
        fromVersion: currentTag,
        toVersion: version,
        commitHash: await this.exec(`git rev-parse --short HEAD`),
        nextSteps: [
          `已回滚到 ${version}`,
          '请执行部署命令恢复服务',
          '如需返回最新版本，执行 git checkout main'
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: GitErrorCode.ROLLBACK_FAILED,
          message: `回滚失败: ${error.message}`,
          suggestions: ['确认目标版本存在', '检查工作目录状态'],
          retryable: true
        }
      };
    }
  }
}
```

---

## 六、接口契约 {#arch-Git集成-int-接口契约}

### 6.1 对外提供的完整接口

```typescript
/**
 * Git集成模块公共接口
 */
interface GitIntegration {
  // ========== 变更检测 ==========

  /**
   * 检测工作区变更
   */
  detectChanges(): Promise<FileChange[]>;

  /**
   * 是否有未提交变更
   */
  hasUncommittedChanges(): Promise<boolean>;

  // ========== Commit操作 ==========

  /**
   * 手动Commit（指定完整选项）
   */
  commit(options: CommitOptions): Promise<CommitResult>;

  /**
   * 自动Commit（根据触发条件自动推断）
   */
  autoCommit(context: AutoCommitContext): Promise<CommitResult>;

  // ========== Tag操作 ==========

  /**
   * 创建版本Tag
   */
  createTag(options: TagOptions): Promise<TagResult>;

  /**
   * 推送Tag到远程
   */
  pushTag(version: string): Promise<PushResult>;

  /**
   * 列出所有Tag
   */
  listTags(): Promise<string[]>;

  // ========== 版本管理 ==========

  /**
   * 获取当前版本号
   */
  getCurrentVersion(): Promise<string>;

  /**
   * 递增版本号
   */
  incrementVersion(type: VersionIncrementType): Promise<string>;

  /**
   * 解析版本号
   */
  parseVersion(version: string): VersionInfo;

  // ========== 回滚操作 ==========

  /**
   * 回滚到指定Tag
   */
  rollbackToTag(version: string): Promise<RollbackResult>;

  // ========== 热修复 ==========

  /**
   * 创建热修复
   */
  createHotfix(options: HotfixOptions): Promise<HotfixResult>;
}
```

### 6.2 依赖的外部接口

```typescript
/**
 * 依赖的状态管理模块接口
 */
interface StateManagerDependency {
  readState(): Promise<State>;
  updateGitMetadata(metadata: GitMetadataUpdate): Promise<void>;
  addChangeHistory(entry: Omit<ChangeHistoryEntry, 'id'>): Promise<string>;
  updateIterationGitInfo(iterationId: string, gitInfo: IterationGitUpdate): Promise<void>;
}

/**
 * 依赖的核心流程模型接口
 */
interface CoreProcessModelDependency {
  validateIterationReleasable(iterationId: string): Promise<ValidationResult>;
}
```

---

## 七、错误处理与重试 {#arch-Git集成-int-错误处理}

### 7.1 错误处理策略

```typescript
/**
 * 错误处理策略矩阵
 */
const ERROR_HANDLING_STRATEGIES: Record<string, ErrorStrategy> = {
  // 阻断性错误：直接返回错误，不重试
  blocking: {
    retry: false,
    propagate: true,
    logging: 'error'
  },

  // 可重试错误：重试指定次数
  retryable: {
    retry: true,
    maxRetries: 3,
    retryDelay: 2000,
    propagate: true,
    logging: 'warn'
  },

  // 警告性错误：记录日志但继续执行
  warning: {
    retry: false,
    propagate: false,
    logging: 'warn'
  }
};

/**
 * 错误码到策略的映射
 */
const ERROR_STRATEGY_MAP: Record<GitErrorCode, string> = {
  [GitErrorCode.GIT_NOT_INITIALIZED]: 'blocking',
  [GitErrorCode.GIT_USER_NOT_CONFIGURED]: 'blocking',
  [GitErrorCode.COMMIT_FAILED]: 'retryable',
  [GitErrorCode.COMMIT_EMPTY]: 'warning',
  [GitErrorCode.TAG_EXISTS]: 'blocking',
  [GitErrorCode.PUSH_FAILED]: 'retryable',
  [GitErrorCode.VERSION_FORMAT_INVALID]: 'blocking',
  [GitErrorCode.UNCOMMITTED_CHANGES]: 'blocking'
};
```

### 7.2 重试机制

```typescript
/**
 * 带重试的命令执行
 */
class GitOperator {
  private async execWithRetry(
    command: string,
    options: RetryOptions = {}
  ): Promise<string> {
    const {
      maxRetries = this.config.pushRetryCount,
      retryDelay = this.config.pushRetryDelay,
      shouldRetry = () => true
    } = options;

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.exec(command);
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries && shouldRetry(error)) {
          this.logger.warn(`命令执行失败，${retryDelay}ms后重试 (${attempt}/${maxRetries})`);
          await this.delay(retryDelay);
        }
      }
    }

    throw lastError;
  }
}

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  shouldRetry?: (error: Error) => boolean;
}
```

---

## 八、日志与监控 {#arch-Git集成-int-日志监控}

### 8.1 日志记录

```typescript
/**
 * Git操作日志记录器
 */
class GitLogger {
  private logs: GitOperationLog[] = [];

  /**
   * 记录Git操作
   */
  log(operation: GitOperation, command: string, result: 'success' | 'failure', details?: Partial<GitOperationLog>): void {
    this.logs.push({
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      operation,
      command,
      result,
      duration: details?.duration || 0,
      output: details?.output,
      error: details?.error,
      trigger: details?.trigger
    });
  }

  /**
   * 获取最近的日志
   */
  getRecentLogs(count: number = 10): GitOperationLog[] {
    return this.logs.slice(-count);
  }

  /**
   * 获取失败的操作
   */
  getFailedOperations(): GitOperationLog[] {
    return this.logs.filter(log => log.result === 'failure');
  }
}
```

### 8.2 监控指标

```typescript
/**
 * Git操作监控指标
 */
interface GitMetrics {
  // Commit指标
  totalCommits: number;
  successfulCommits: number;
  failedCommits: number;
  averageCommitTime: number;

  // Push指标
  totalPushes: number;
  successfulPushes: number;
  failedPushes: number;
  pushRetryCount: number;

  // Tag指标
  totalTags: number;
  latestTag: string;

  // 错误指标
  errorsByCode: Record<GitErrorCode, number>;
}
```

---

## 九、配置与初始化 {#arch-Git集成-int-配置}

### 9.1 模块初始化

```typescript
/**
 * Git集成模块初始化
 */
class GitIntegrationModule {
  private stateManager: StateManager;
  private coreProcess: CoreProcessModel;
  private config: GitConfig;
  private logger: GitLogger;

  /**
   * 初始化模块
   */
  async initialize(dependencies: GitDependencies): Promise<void> {
    // 1. 注入依赖
    this.stateManager = dependencies.stateManager;
    this.coreProcess = dependencies.coreProcess;

    // 2. 加载配置
    this.config = {
      ...DEFAULT_GIT_CONFIG,
      ...dependencies.config
    };

    // 3. 初始化日志器
    this.logger = new GitLogger();

    // 4. 验证Git环境
    await this.validateGitEnvironment();
  }

  /**
   * 验证Git环境
   */
  private async validateGitEnvironment(): Promise<void> {
    // 检查Git是否初始化
    const isGitRepo = await this.gitOperator.isGitRepository();
    if (!isGitRepo) {
      throw new GitIntegrationError(
        GitErrorCode.GIT_NOT_INITIALIZED,
        'Git仓库未初始化',
        ['执行 git init 初始化仓库']
      );
    }

    // 检查用户信息配置
    const hasUserConfig = await this.gitOperator.hasUserConfig();
    if (!hasUserConfig) {
      throw new GitIntegrationError(
        GitErrorCode.GIT_USER_NOT_CONFIGURED,
        '未配置Git用户信息',
        ['执行 git config user.name "Your Name"',
         '执行 git config user.email "your@email.com"']
      );
    }
  }
}

interface GitDependencies {
  stateManager: StateManager;
  coreProcess: CoreProcessModel;
  config?: Partial<GitConfig>;
}
```

---

## 十、测试策略

### 10.1 单元测试

```typescript
/**
 * Git集成模块单元测试要点
 */
const UNIT_TEST_CASES = {
  // ChangeDetector测试
  changeDetector: [
    '解析git status输出',
    '正确分类文件类型',
    '处理重命名文件',
    '处理空输出'
  ],

  // CommitGenerator测试
  commitGenerator: [
    '根据触发条件推断type',
    '根据变更文件推断scope',
    '生成符合规范的subject',
    '热修复包含[HOTFIX]前缀'
  ],

  // VersionManager测试
  versionManager: [
    '解析版本号',
    'major递增',
    'minor递增',
    'patch递增',
    '版本号格式验证'
  ],

  // GitOperator测试
  gitOperator: [
    '检测变更文件',
    '执行commit',
    '创建Tag',
    '重复Tag检测'
  ]
};
```

### 10.2 集成测试

```typescript
/**
 * Git集成模块集成测试要点
 */
const INTEGRATION_TEST_CASES = {
  // 与状态管理模块集成
  stateManagement: [
    'commit后更新metadata',
    '热修复记录到changeHistory',
    'Tag创建后更新迭代信息'
  ],

  // 与命令体系模块集成
  commandSystem: [
    '命令执行触发自动commit',
    '迭代完成触发Tag创建'
  ],

  // 端到端流程
  e2e: [
    '完整的自动commit流程',
    '完整的热修复流程',
    '完整的版本回滚流程'
  ]
};
```

---

**文档版本历史**

| 版本 | 日期 | 修改内容 | 修改人 |
|-----|------|---------|-------|
| v1.0 | 2025-12-15 | 初始版本 | Claude AI |
