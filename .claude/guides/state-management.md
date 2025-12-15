# 项目状态管理指南（Project State Management）

> 本指南详细说明如何使用state.json和state_his.json管理项目状态

---

## 一、核心理念

本项目采用 **AI 超级个体开发助手** 的方法论，核心特点：

- **持续性**：需求澄清、架构设计等阶段可跨多次会话进行
- **可中断**：随时中断，下次恢复时 AI 能够知道上次进度
- **可恢复**：基于 state.json 恢复上下文，继续工作

---

## 二、state.json 的作用

**文件路径**：`.solodev/state.json`

**核心职责**：
1. **记录项目状态**：当前迭代、当前阶段、当前模块的状态
2. **记录澄清进度**：哪些模块已完成澄清、哪些模块待澄清
3. **记录待办任务**：需求变更后生成的待办任务列表
4. **记录依赖关系**：模块间的依赖关系和集成点
5. **记录变更历史**：所有状态变更的历史记录

---

## 三、使用方式

### 每次会话开始时

**步骤1**：读取 `.solodev/state.json`

```bash
# 使用 Read 工具读取
Read file_path=".solodev/state.json"
```

**步骤2**：分析当前状态

```
检查以下字段：
- currentIteration：当前迭代
- currentPhase：当前阶段（requirements/architecture/implementation/testing/deployment）
- phases.requirements.currentProcess：需求分析的当前进度
  - currentModule：正在澄清的模块
  - completedModules：已完成的模块
  - remainingModules：待澄清的模块
  - nextAction：建议的下一步行动
```

**步骤3**：主动提示用户

```
示例：
"上次我们完成了 [核心流程模型、状态管理模块、命令体系模块] 的需求澄清。
待澄清模块还有：[文档模板模块、影响分析模块、测试验证模块...]
建议下一步：继续澄清文档模板模块（优先级：P0）

是否继续？或者您想调整优先级？"
```

### 需求澄清过程中

**每完成一个模块的澄清，立即更新 state.json**：

```json
{
  "phases": {
    "requirements": {
      "modules": {
        "文档模板模块": {
          "status": "approved",  // 从 pending 改为 approved
          "approvedAt": "2025-12-13T17:00:00Z",
          "artifacts": ["..."],
          "reviewer": "human"
        }
      },
      "currentProcess": {
        "completedModules": ["核心流程模型", "状态管理模块", "命令体系模块", "文档模块"],
        "remainingModules": ["影响分析模块", "测试验证模块", "Git集成模块", "依赖管理模块"],
        "nextAction": "继续澄清影响分析模块"
      }
    }
  }
}
```

**然后 Git commit**：

```bash
git add .solodev/state.json
git commit -m "state: 完成文档模板模块需求澄清"
```

### 会话结束时

**更新 metadata**：

```json
{
  "metadata": {
    "lastGitCommit": "abc123",
    "lastGitCommitMessage": "state: 完成文档模板模块需求澄清",
    "lastGitCommitAt": "2025-12-13T17:00:00Z",
    "stateFileVersion": 2,
    "totalStateChanges": 2
  }
}
```

---

## 四、关键字段说明

| 字段路径                                  | 说明                                                 |
| ----------------------------------------- | ---------------------------------------------------- |
| `currentIteration`                        | 当前迭代 ID（如 "iteration-1"）                      |
| `currentPhase`                            | 当前阶段（requirements/architecture/...）            |
| `phases.requirements.status`              | 需求分析阶段状态（in_progress/approved/...）         |
| `phases.requirements.modules[name]`       | 模块状态（pending/partially_clarified/approved）     |
| `modules[name].pendingQuestions`          | 该模块待澄清的问题列表                               |
| `currentProcess.currentModule`            | 正在澄清的模块                                       |
| `currentProcess.nextAction`               | 建议的下一步行动                                     |
| `globalTasks.pending`                     | 待办任务列表                                         |
| `moduleDependencies`                      | 模块依赖关系（用于影响分析和并行控制）               |

---

## 五、实践原则

### 1. 每次会话开始必读

```
✅ 正确做法：
用户: "继续需求澄清"
AI: [先读取 state.json] → "上次我们完成了...，继续澄清文档模板模块吗？"

❌ 错误做法：
用户: "继续需求澄清"
AI: "您想澄清哪个模块？" (没有读取上次进度)
```

### 2. 及时更新状态

```
✅ 正确做法：
- 完成一个模块澄清 → 立即更新 state.json → Git commit
- 状态变更具有原子性

❌ 错误做法：
- 完成多个模块后才一次性更新（可能会话中断导致状态丢失）
```

### 3. 提供清晰的上下文

```
✅ 正确做法：
"根据 state.json，您上次澄清到 [具体内容]，
待办任务还有 [列表]，
建议下一步 [具体行动]"

❌ 错误做法：
"继续工作吧"（没有提供上下文）
```

---

## 六、特殊场景处理

### 场景1：state.json 不存在

```
说明：项目刚初始化
行动：提示用户先执行 /init 命令初始化项目
```

### 场景2：state.json 损坏

```
说明：JSON 格式错误
行动：
  1. 提示用户检查 JSON 格式
  2. 提供修复建议
  3. 或者基于 Git 历史恢复上一个版本
```

### 场景3：需求变更导致状态回滚

```
说明：测试阶段发现需求问题，需要回滚到需求分析阶段
行动：
  1. 更新 currentPhase = "requirements"
  2. 更新受影响模块的 status = "in_progress"
  3. 记录回滚原因到 changeHistory
  4. 生成待办任务到 globalTasks.pending
  5. Git commit 记录变更
```

---

## 七、状态文件拆分：state.json + state_his.json

### 拆分目的

为避免state.json随着项目演进内容爆炸，将状态管理拆分为两个文件：

- **state.json**：保留当前迭代的完整信息（轻量级，< 100KB）
- **state_his.json**：保存已完成迭代的历史数据（归档）

### state.json 结构（当前迭代）

**保留内容**：
```json
{
  "schema_version": "1.0.0",
  "project": { "name": "...", "description": "..." },
  "currentIteration": "iteration-1",
  "iterations": {
    "iteration-1": {
      "id": "iteration-1",
      "version": "v1.0",
      "status": "in_progress",
      "phases": { ... }
    }
  },
  "moduleDependencies": { ... },
  "globalTasks": {
    "pending": [...],
    "completed": [...]  // 仅当前迭代
  },
  "changeHistory": [...],  // 仅当前迭代
  "settings": { "autoReadHistory": true },
  "metadata": { ... }
}
```

**不保留内容**（已迁移到state_his.json）：
- 已完成的迭代
- 已完成迭代的tasks和changeHistory

### state_his.json 结构（历史迭代）

**文件路径**：`.solodev/state_his.json`

```json
{
  "schema_version": "1.0.0",
  "completedIterations": {
    "iteration-0": {
      "id": "iteration-0",
      "version": "v0.1",
      "status": "completed",
      "completedAt": "2025-12-01T00:00:00Z",
      "gitTag": "v0.1",
      "phases": { ... },
      "tasks": [ ... ],
      "changeHistory": [ ... ],
      "summary": "完成项目初始化"
    }
  }
}
```

### 数据迁移流程

**迁移时机**：迭代完成并成功部署后

**触发条件**：
```javascript
iterations[currentIteration].status === "completed"
  && iterations[currentIteration].deployedAt !== null
```

**迁移步骤**：
1. 读取state.json和state_his.json
2. 提取当前迭代完整数据（phases + tasks + changeHistory）
3. 构造完整迭代对象写入state_his.json
4. 清空state.json中的当前迭代数据
5. Git commit记录迁移

### 历史数据访问规则

**场景1：当前迭代分析（90%）**
- 只读state.json
- 无需读取state_his.json

**场景2：跨迭代对比（8%）**
- 自动读取state.json + state_his.json
- 触发条件：用户明确提到"对比"、"历史"、"iteration-X"

**场景3：长期趋势分析（2%）**
- 读取state_his.json
- 触发条件：用户要求"趋势"、"统计"、"过去X个迭代"

**可配置行为**：
- `settings.autoReadHistory = true`：自动读取
- `settings.autoReadHistory = false`：总是先提示用户

---

## 八、命令行使用

### 快速查看项目状态

**命令**：
```bash
npm run solodev status
```

**功能**：
- 显示项目名称、版本、当前迭代
- 显示当前阶段和阶段状态
- 显示模块进度（已完成/总数）
- 列出所有模块的详细状态
- 提供下一步行动建议

**使用场景**：

1. **会话开始时**：快速了解项目当前状态
2. **模块切换前**：确认当前模块和进度
3. **不确定状态时**：随时查看最新状态

**示例输出**：
```
✅ 成功

项目状态报告
====================
项目: AI超级个体开发助手
版本: v1.0.0
当前迭代: iteration-1
当前阶段: implementation
阶段状态: in_progress
模块进度: 1/3

模块详情:
  - 状态管理模块: completed
  - 文档模板模块: partial
  - 命令体系模块: pending

💡 下一步建议:
有已完成的模块等待审批，使用 /approve <模块名> 进行审批
```

**与直接读取state.json的区别**：

| 方式 | 优势 | 使用场景 |
|------|------|----------|
| **npm run solodev status** | 快速、格式化输出、下一步建议 | 快速查看概览 |
| **直接读取state.json** | 完整信息、可深入分析 | 需要详细字段或复杂分析 |

**最佳实践**：
- ✅ 会话开始时先用命令查看概览
- ✅ 需要详细分析时再读取state.json
- ✅ 命令和直接读取相互补充，不是替代关系

---

## 九、实践原则总结

### 1. 保持state.json轻量级

✅ 迭代完成后立即迁移到state_his.json
✅ state.json只保留当前迭代信息
✅ 控制在100KB以内

### 2. 历史数据按需访问

✅ 大部分分析只读state.json（90%）
✅ 明确需要时才读state_his.json

### 3. 迁移时机准确

✅ 迭代完成 + 部署成功 → 迁移
✅ 与Git Tag同步

### 4. 查询优化

✅ 直接访问 `completedIterations["iteration-id"]`（O(1)）
❌ 避免遍历所有迭代（O(n)）
