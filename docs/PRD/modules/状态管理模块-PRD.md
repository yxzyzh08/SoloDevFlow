# 状态管理模块 - 产品需求文档

> **模块**: 状态管理模块
> **版本**: v1.0
> **迭代**: Iteration 1
> **日期**: 2025-12-14

---

<!--
章节ID规范说明：
- 格式：{#prd-状态管理-[章节编号]}
- 必须标注ID的章节：详细功能点、数据模型、用户故事与验收标准
-->

## 一、模块愿景

提供**轻量级、可扩展**的项目状态管理系统，通过state.json（当前迭代）+ state_his.json（历史迭代）的拆分机制，实现高效的状态追踪和历史数据归档。

---

## 二、模块职责

1. **状态文件管理**：管理state.json（当前迭代）和state_his.json（历史迭代）
2. **状态读写**：提供统一的状态读取和更新接口
3. **历史数据迁移**：迭代完成后自动迁移数据到历史文件
4. **历史数据访问**：智能判断何时读取历史数据
5. **状态验证**：检测state.json格式错误，提供修复建议
6. **上下文加载**：根据阶段和模块，自动加载精确的任务上下文（代码实现，强制性）

---

## 三、详细功能点

### 3.1 文件拆分方案 {#prd-状态管理-3.1}

#### state.json（当前迭代）

**设计目标**：保持轻量级，控制在100KB以内

**保留内容**：
```json
{
  "schema_version": "1.0.0",
  "project": {
    "name": "项目名称",
    "description": "项目描述",
    "createdAt": "...",
    "updatedAt": "..."
  },

  "currentIteration": "iteration-1",

  "iterations": {
    "iteration-1": {
      // 当前迭代的完整信息
      "id": "iteration-1",
      "version": "v1.0",
      "status": "in_progress",
      "currentPhase": "requirements",
      "phases": { ... }
    }
  },

  "moduleDependencies": {
    // 模块依赖关系（所有迭代共享）
  },

  "globalTasks": {
    "pending": [...],
    "in_progress": [...],
    "completed": [...]  // 保留当前迭代的completed任务
  },

  "changeHistory": [
    // 保留当前迭代的changeHistory
  ],

  "settings": {
    "autoReadHistory": true
  },

  "metadata": { ... }
}
```

**不保留内容**（已迁移到state_his.json）：
- 已完成的迭代（iteration-0, iteration-1-completed等）
- 已完成迭代的completed任务
- 已完成迭代的changeHistory

#### state_his.json（历史迭代）

**文件路径**：`.solodev/state_his.json`

**设计目标**：按迭代组织历史数据，便于查询

**结构**：
```json
{
  "schema_version": "1.0.0",

  "completedIterations": {
    "iteration-0": {
      "id": "iteration-0",
      "version": "v0.1",
      "goal": "项目初始化",
      "status": "completed",
      "completedAt": "2025-12-01T00:00:00Z",
      "deployedAt": "2025-12-01T10:00:00Z",
      "gitTag": "v0.1",

      "phases": {
        "requirements": { ... },
        "architecture": { ... },
        "implementation": { ... },
        "testing": { ... },
        "deployment": { ... }
      },

      "tasks": [
        {
          "id": "task-000",
          "phase": "requirements",
          "module": "核心流程模型",
          "completedAt": "2025-11-20T14:00:00Z"
        }
        // iteration-0的所有任务
      ],

      "changeHistory": [
        {
          "id": "change-001",
          "timestamp": "2025-11-20T16:30:00Z",
          "type": "state_initialization"
        }
        // iteration-0的所有变更
      ],

      "summary": "完成项目初始化和基础框架搭建"
    },

    "iteration-1": {
      // iteration-1完成后的完整数据
    }
  }
}
```

### 3.2 迁移机制 {#prd-状态管理-3.2}

#### 迁移触发条件

```javascript
iterations[currentIteration].status === 'completed'
  && iterations[currentIteration].deployedAt !== null
```

#### 迁移流程

```
迭代完成并部署
  ↓
【步骤1】读取state.json和state_his.json
  ↓
【步骤2】提取当前迭代的完整数据
  - iterations[currentIteration]（包含phases信息）
  - globalTasks.completed（属于当前迭代的任务）
  - changeHistory（属于当前迭代的变更）
  ↓
【步骤3】构造完整的迭代对象
  {
    "id": "iteration-1",
    "version": "v1.0",
    "completedAt": "...",
    "deployedAt": "...",
    "gitTag": "v1.0",
    "phases": { ... },
    "tasks": [ ... ],
    "changeHistory": [ ... ],
    "summary": "迭代总结"
  }
  ↓
【步骤4】写入state_his.json
  stateHis.completedIterations["iteration-1"] = 迭代对象
  ↓
【步骤5】更新state.json
  - 删除 iterations["iteration-1"]
  - 清空或准备新迭代 "iteration-2"
  - 清空 globalTasks.completed
  - 清空 changeHistory
  ↓
【步骤6】Git commit
  git add .solodev/state.json .solodev/state_his.json
  git commit -m "state: 完成iteration-1并归档"
```

#### 迁移代码示例（伪代码）

```javascript
const state = readJSON('.solodev/state.json');
const stateHis = readJSON('.solodev/state_his.json') || { completedIterations: {} };

const currentIterationId = state.currentIteration;
const currentIteration = state.iterations[currentIterationId];

// 检查是否可以迁移
if (currentIteration.status === 'completed' && currentIteration.deployedAt) {
  // 构造完整迭代对象
  const completedIteration = {
    ...currentIteration,
    tasks: state.globalTasks.completed.filter(t => t.iteration === currentIterationId),
    changeHistory: state.changeHistory.filter(c => c.iteration === currentIterationId)
  };

  // 写入历史文件
  stateHis.completedIterations[currentIterationId] = completedIteration;
  writeJSON('.solodev/state_his.json', stateHis);

  // 清理当前文件
  delete state.iterations[currentIterationId];
  state.globalTasks.completed = [];
  state.changeHistory = [];
  state.currentIteration = 'iteration-2'; // 或null
  writeJSON('.solodev/state.json', state);
}
```

### 3.3 历史数据访问规则 {#prd-状态管理-3.3}

#### 场景分类

**场景1：当前迭代内的分析（90%）**

```
用户："修改用户模块会影响哪些模块？"
  ↓
AI只读取 state.json
  - moduleDependencies
  - iterations[currentIteration].phases
  - 当前迭代的changeHistory
  ↓
完成分析（无需读取state_his.json）
```

**场景2：跨迭代对比分析（8%）**

```
用户："对比iteration-1和iteration-2中用户模块的设计"
  ↓
AI判断：需要历史数据
  ↓
自动读取 state.json + state_his.json
  - state.json: iteration-2的数据
  - state_his.json: iteration-1的数据
  ↓
完成对比分析
```

**场景3：长期趋势分析（2%）**

```
用户："哪个模块最容易出问题？"
  ↓
AI判断：需要历史数据
  ↓
自动读取 state_his.json
  - 遍历所有completedIterations
  - 统计每个模块的变更频率
  ↓
完成趋势分析
```

#### 自动读取历史数据的触发条件

1. **用户明确提到历史对比关键词**：
   - "对比"、"历史"、"iteration-X"（非当前迭代）
   - 例如："对比iteration-1和iteration-2"
   - 例如："这个模块在iteration-1中是怎么设计的？"

2. **用户要求长期趋势分析**：
   - "趋势"、"统计"、"过去X个迭代"
   - 例如："哪个模块变更最频繁？"
   - 例如："过去5个迭代的测试通过率"

3. **影响分析需要历史上下文**（AI判断）：
   - 当前迭代修改了某个在历史迭代中频繁变更的模块
   - AI需要参考历史变更记录以评估风险
   - 但AI必须先给出基于当前数据的初步分析，然后说明"需要历史数据以提供更准确的风险评估"

#### 默认只读state.json的场景

1. **分析范围仅限当前迭代**：
   - 用户未提及历史、对比、趋势
   - 例如："修改用户模块会影响哪些模块？"
   - 例如："生成当前迭代的影响分析报告"

#### 不确定时的处理

1. AI先基于state.json给出初步分析
2. 如果AI判断历史数据可能有帮助，提示：
   ```
   "基于当前迭代的分析已完成。如需对比历史迭代或查看长期趋势，
    我可以访问历史数据（state_his.json）。是否需要？"
   ```
3. 等待用户确认

#### 可配置行为

通过state.json中的settings.autoReadHistory控制：
- `true`：符合触发条件时自动读取，无需用户确认
- `false`：总是先提示用户，等待确认

### 3.4 状态验证 {#prd-状态管理-3.4}

#### 格式错误检测

```javascript
try {
  const state = JSON.parse(fs.readFileSync('.solodev/state.json', 'utf-8'));
} catch (error) {
  // JSON解析错误
  throw new StateFileError('state.json 格式错误，无法解析');
}
```

#### 修复建议

当检测到state.json格式错误时，AI提供以下建议：

**方案1**：手动检查 JSON 格式
- 提供 JSON 验证工具链接：https://jsonlint.com/
- 提示常见错误：缺少逗号、多余逗号、引号不匹配

**方案2**：从 Git 历史恢复上一个版本
```bash
git log .solodev/state.json
git checkout <commit-hash> .solodev/state.json
```

### 3.5 上下文加载能力（Context Loading） {#prd-状态管理-3.5}

> **新增功能**：根据当前阶段和任务，自动加载精确的上下文，避免AI处理无关信息，确保任务质量。

#### 功能定义

| 维度 | 说明 |
|------|------|
| **性质** | 产品能力（代码实现） |
| **实现方式** | 脚本/代码自动加载上下文 |
| **可靠性** | 强制性，代码控制 |
| **调用方** | 命令体系模块 |

**核心目标**：确保AI在执行任务时专注于当前任务上下文，避免注意力分散导致任务质量下降。

#### 接口定义

```typescript
// 获取阶段级上下文
getContextForPhase(phase: Phase): ContextResult

// 获取模块级上下文（更精确）
getContextForModule(module: string, phase: Phase): ContextResult

// 返回类型
interface ContextResult {
  files: string[];           // 需要加载的文件路径列表
  templates: string[];       // 需要加载的模板
  stateFields: string[];     // 需要读取的state.json字段
  description: string;       // 上下文描述（供AI理解）
}
```

#### 上下文加载规则

| 阶段 | 自动加载的上下文 |
|------|------------------|
| **requirements** | state.json, PRD模板, 用户输入历史 |
| **architecture** | state.json, 已审批PRD, 架构模板, 已完成架构文档 |
| **implementation** | state.json, 已审批架构, 代码模板, 相关代码文件 |
| **testing** | state.json, PRD验收标准, 架构文档, 实现代码 |
| **deployment** | state.json, 架构文档, 部署模板 |

#### 模块级加载示例

```typescript
// 示例：获取"状态管理模块"在"architecture"阶段的上下文
getContextForModule("状态管理模块", "architecture")

// 返回：
{
  files: [
    "docs/PRD/modules/状态管理模块-PRD.md",
    "docs/architecture/iteration-1/核心流程模型-*.md"  // 依赖模块的架构
  ],
  templates: [
    ".solodev/templates/architecture-系统架构总览.md",
    ".solodev/templates/architecture-数据模型设计.md",
    ".solodev/templates/architecture-集成设计.md"
  ],
  stateFields: [
    "currentIteration",
    "moduleDependencies.状态管理模块",
    "phases.architecture.modules.状态管理模块"
  ],
  description: "状态管理模块架构设计上下文：包含该模块PRD、依赖模块架构、架构模板"
}
```

#### 执行时机

命令执行时自动调用，无需用户干预：

```
用户执行命令 /start-architecture
        ↓
命令体系模块解析命令
        ↓
调用 getContextForModule(currentModule, "architecture")
        ↓
状态管理模块返回上下文列表
        ↓
命令体系模块将上下文注入AI会话
        ↓
AI基于精确上下文执行任务
```

---

## 四、数据模型 {#prd-状态管理-数据模型}

### 4.1 state.json完整Schema

```typescript
interface StateJSON {
  schema_version: string;  // "1.0.0"

  project: {
    name: string;
    description: string;
    createdAt: string;  // ISO 8601
    updatedAt: string;  // ISO 8601
  };

  currentIteration: string;  // "iteration-1"

  iterations: {
    [iterationId: string]: {
      id: string;
      version: string;  // "v1.0"
      goal: string;
      status: 'in_progress' | 'completed';
      startedAt: string;
      completedAt: string | null;
      deployedAt: string | null;
      gitTag: string | null;
      changeType: {
        newModules: string[];
        updatedModules: string[];
        deletedModules: string[];
      };
      currentPhase: 'requirements' | 'architecture' | 'implementation' | 'testing' | 'deployment';
      phases: {
        [phaseName: string]: {
          status: 'pending' | 'in_progress' | 'approved' | 'blocked' | 'completed';
          startedAt: string;
          completedAt: string | null;
          modules: {
            [moduleName: string]: {
              status: 'pending' | 'in_progress' | 'approved' | 'blocked' | 'completed';
              approvedAt: string | null;
              artifacts: string[];
              reviewer: 'human' | 'auto';
              reviewNotes: string;
            };
          };
        };
      };
    };
  };

  moduleDependencies: {
    [moduleName: string]: {
      dependsOn: string[];
      isFoundation: boolean;
      integrationPoints?: {
        targetModule: string;
        interface: string;
        purpose: string;
      }[];
    };
  };

  globalTasks: {
    pending: Task[];
    in_progress: Task[];
    completed: Task[];  // 仅当前迭代
  };

  changeHistory: Change[];  // 仅当前迭代

  settings: {
    autoReadHistory: boolean;
  };

  metadata: {
    lastGitCommit: string;
    lastGitCommitMessage: string;
    lastGitCommitAt: string;
    stateFileVersion: number;
    totalStateChanges: number;
  };
}
```

### 4.2 state_his.json完整Schema

```typescript
interface StateHisJSON {
  schema_version: string;  // "1.0.0"

  completedIterations: {
    [iterationId: string]: {
      id: string;
      version: string;
      goal: string;
      status: 'completed';
      completedAt: string;
      deployedAt: string;
      gitTag: string;

      phases: {
        [phaseName: string]: {
          status: 'completed';
          completedAt: string;
          modules: { ... };
        };
      };

      tasks: Task[];
      changeHistory: Change[];
      summary: string;
    };
  };
}
```

---

## 五、用户故事与验收标准 {#prd-状态管理-验收标准}

### 故事1：迭代完成后数据归档

```
作为系统，我需要在迭代完成后自动将数据迁移到历史文件，以便保持 state.json 轻量级。

验收标准：
  - [ ] 迭代完成并部署后，检测触发条件：status=completed && deployedAt != null
  - [ ] 从 state.json 提取当前迭代的完整数据（包含 phases, tasks, changeHistory）
  - [ ] 写入 state_his.json 的 completedIterations[iteration-id]
  - [ ] 清理 state.json：删除已完成迭代、清空 completed tasks、清空 changeHistory
  - [ ] Git commit 记录迭代归档操作
  - [ ] state.json 文件大小 < 100KB
```

### 故事2：智能历史数据访问

```
作为系统，我需要智能判断何时读取历史数据，以便优化性能。

验收标准：
  - [ ] 默认只读 state.json（90% 场景）
  - [ ] 用户明确要求对比历史迭代时，自动读取 state_his.json
  - [ ] 用户要求长期趋势分析时，自动读取 state_his.json
  - [ ] 不确定时，先基于 state.json 分析，然后提示："需要访问历史数据以提供更全面分析吗？"
  - [ ] 可通过 settings.autoReadHistory 配置默认行为（true=自动，false=总是提示）
```

### 故事3：状态文件损坏处理

```
作为系统，我需要检测并提示state.json格式错误，以便用户修复。

验收标准：
  - [ ] AI 读取 state.json 时捕获 JSON 解析错误
  - [ ] AI 明确提示："state.json 格式错误，无法解析"
  - [ ] AI 建议修复方案：
      - 方案1：手动检查 JSON 格式（提供 JSON 验证工具链接）
      - 方案2：从 Git 历史恢复上一个版本
  - [ ] 等待用户修复后再继续
```

### 故事4：跨会话状态恢复

```
作为超级个体开发者，我想在新会话中快速恢复上次进度，以便无缝继续工作。

验收标准：
  - [ ] 每次会话开始时，AI 自动读取 state.json
  - [ ] AI 主动提示上次进度（如："上次您完成了用户模块需求澄清，待澄清模块还有：..."）
  - [ ] AI 建议下一步行动（如："是否继续澄清订单模块？"）
  - [ ] 用户可以选择继续上次任务，或切换到其他任务
```

---

## 六、依赖关系

**依赖模块**：
- Git集成模块（迁移时需要Git commit）

**被依赖模块**：
- 所有模块（都依赖状态管理）
- 核心流程模型（读取/更新阶段状态）
- 影响分析模块（读取模块依赖关系、变更历史）
- 命令体系模块（读取/更新任务状态）

---

## 七、非功能需求

### 性能要求

- state.json读取时间 < 50ms
- state.json写入时间 < 100ms
- state.json文件大小 < 100KB

### 可靠性要求

- 迁移操作必须原子性（要么全部成功，要么全部回滚）
- 迁移失败时，不删除原state.json数据
- 提供数据备份机制（Git历史）

### 可扩展性要求

- 支持future版本的Schema迁移
- schema_version字段用于版本管理
- 新增字段向后兼容（旧版本忽略新字段）
