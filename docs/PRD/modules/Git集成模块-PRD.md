# Git集成模块 - 产品需求文档

> **项目**: AI超级个体开发助手
> **版本**: v1.0
> **迭代**: Iteration 1
> **日期**: 2025-12-14
> **模块**: Git集成模块
> **状态**: 需求已确认

---

## 一、产品愿景

### 1.1 一句话描述

自动化Git版本管理，每次状态变更自动提交，确保精细的历史追溯。

### 1.2 核心定位

| 维度         | 定义                                    |
| ------------ | --------------------------------------- |
| **产品类型** | Git自动化工具 + 版本管理规范            |
| **目标平台** | Git（Windows/macOS/Linux）              |
| **用户定位** | 独立开发者（单人开发）                  |
| **核心价值** | 高频自动提交，精细历史记录，易于回滚    |

### 1.3 技术定位

- **部署方式**：Git命令封装（通过Claude AI调用）
- **集成方式**：状态变更触发 → 自动commit → 自动push
- **数据持久化**：Git仓库（commit历史 + tag）

---

## 二、目标用户

### 2.1 用户画像

```yaml
名称: 独立开发者（超级个体）

典型特征:
  - 单人开发，无团队协作
  - 需要精细的版本控制
  - 希望自动化重复性操作
  - 需要快速回滚到历史版本

典型场景:
  - 需求澄清完成，自动commit
  - 架构文档更新，自动commit
  - 代码实现完成，自动commit
  - 测试失败需要回滚到上一个稳定版本
  - 迭代完成，打版本Tag并部署

核心诉求:
  - 无需手动commit，自动化
  - commit message规范、易读
  - 支持版本Tag和回滚
  - 热修复流程简化
  - Git历史清晰可追溯
```

### 2.2 用户痛点

| 痛点          | 描述           | 影响           | 解决方案       |
| ------------- | -------------- | -------------- | -------------- |
| **P1: 手动commit繁琐** | 每次状态变更需要手动commit | 容易忘记提交，历史不完整 | 自动commit策略（8种触发条件） |
| **P2: commit message不规范** | 随意编写commit message | Git历史难以理解 | Conventional Commits规范 + AI自动生成 |
| **P3: 版本回滚复杂** | 不清楚应该回滚到哪个commit | 回滚错误导致更大问题 | 语义化版本Tag + state.json同步 |
| **P4: 热修复流程重** | 传统hotfix需要创建分支、合并 | 紧急修复耗时长 | 简化热修复流程（直接在main分支修复） |

---

## 三、功能架构

### 3.1 系统架构图

```
状态变更触发
  ├─ 模块状态变更（pending → approved）
  ├─ 澄清内容添加（clarifiedAspects新增）
  ├─ 任务状态变更（globalTasks状态变化）
  ├─ 阶段转换（phases状态变更）
  ├─ 文档更新（CLAUDE.md或其他文档修改）
  ├─ 部署操作（deployedAt更新）
  ├─ 迭代完成（迭代状态→completed）
  └─ 热修复（hotfix类型变更）
       ↓
AI检测文件变更（git status）
       ↓
AI生成commit message
  ├─ 自动推断type（feat/fix/docs等）
  ├─ 自动推断scope（requirements/architecture等）
  └─ 自动生成subject（中文描述）
       ↓
Git自动提交
  ├─ git add .
  ├─ git commit -m "message"
  └─ (可选) git push origin main
       ↓
更新state.json.metadata
  ├─ lastGitCommit
  ├─ lastGitCommitMessage
  └─ lastGitCommitAt
       ↓
【如果是迭代完成】
  ├─ 创建Git Tag（git tag vX.Y.Z）
  ├─ 推送Tag（git push origin vX.Y.Z）
  └─ 迁移state.json到state_his.json

完整架构设计详见：docs/architecture/iteration-1/00-系统架构总览.md
```

### 3.2 模块划分

| 模块名        | 职责               | 实现方式           |
| ------------- | ------------------ | ------------------ |
| **变更检测模块** | 检测文件变更，判断是否需要commit | git status |
| **Commit Message生成模块** | 自动推断type/scope/subject | AI推理 + 规则匹配 |
| **Git操作模块** | 执行git命令（add/commit/tag/push） | Claude AI调用Bash工具 |
| **版本号管理模块** | 管理语义化版本号 | state.json.iterations[].version |
| **Hotfix处理模块** | 简化热修复流程 | 直接在main分支修复 + [HOTFIX]标识 |

---

## 四、核心功能设计

### 4.1 功能点清单

**详细功能设计详见**：docs/architecture/iteration-1/02-命令设计.md

| 功能点                      | 描述                           | 触发时机                          |
| --------------------------- | ------------------------------ | --------------------------------- |
| 自动commit                   | 状态变更时自动创建commit       | 8种触发条件之一满足 |
| Commit message自动生成       | AI推断type/scope/subject       | 每次commit前 |
| 版本Tag创建                  | 迭代完成时创建语义化版本Tag    | 迭代completed + deployed |
| 版本回滚                     | 回滚到指定Tag版本              | 用户手动触发 |
| 热修复处理                   | 简化流程，直接在main分支修复   | 生产环境紧急Bug |
| state.json metadata同步      | 每次commit后更新metadata       | 每次commit后 |
| Git历史清理（可选）          | 定期压缩历史（未来功能）       | 手动触发 |

### 4.2 数据模型

#### 核心数据结构（概览）

**state.json - metadata字段** - Git元信息

```json
{
  "metadata": {
    "lastGitCommit": "abc123def456...",
    "lastGitCommitMessage": "feat(requirements): 完成Git集成模块需求澄清",
    "lastGitCommitAt": "2025-12-14T14:00:00Z",
    "stateFileVersion": 6,
    "totalStateChanges": 6
  }
}
```

**state.json - iterations[].version字段** - 版本号

```json
{
  "iterations": {
    "iteration-1": {
      "version": "v1.0.0",
      "gitTag": "v1.0.0",
      "deployedAt": "2025-12-20T10:00:00Z",
      "deployedCommit": "abc123def456..."
    }
  }
}
```

**state.json - changeHistory字段** - 变更历史（含hotfix）

```json
{
  "changeHistory": [
    {
      "id": "change-007",
      "timestamp": "2025-12-15T10:30:00Z",
      "iteration": "iteration-1",
      "type": "hotfix",
      "description": "[HOTFIX] 修复生产环境登录失败问题",
      "affectedModules": ["认证模块"],
      "gitCommit": "abc123",
      "gitTag": "v1.0.1",
      "deployedAt": "2025-12-15T10:45:00Z"
    }
  ]
}
```

**关键字段说明**：

| 字段名      | 类型     | 说明                   | 必填 |
| ----------- | -------- | ---------------------- | ---- |
| `lastGitCommit` | string | 最近一次Git commit哈希 | 是 |
| `lastGitCommitMessage` | string | 最近一次commit message | 是 |
| `version` | string | 迭代版本号（vMAJOR.MINOR.PATCH） | 是 |
| `gitTag` | string | Git Tag名称 | 否（迭代完成后才有） |
| `deployedCommit` | string | 部署时的commit哈希 | 否（部署后才有） |

**完整数据模型详见**：docs/architecture/iteration-1/03-数据模型设计.md

### 4.3 核心工作流

**工作流1：自动commit（状态变更触发）**

```
AI完成需求澄清（模块状态 → approved）
  ↓
【步骤1】AI检测文件变更
  git status

  结果：
  M .solodev/state.json
  M CLAUDE.md
  ↓
【步骤2】AI分析变更内容
  变更类型：模块状态变更
  影响文件：state.json（Git集成模块 → approved）、CLAUDE.md（第九节新增）
  ↓
【步骤3】AI推断commit信息
  type: feat（新功能完成）
  scope: requirements（需求阶段）
  subject: 完成Git集成模块需求澄清
  body:
    - 更新state.json（Git集成模块完整设计决策）
    - 更新CLAUDE.md（第九节Git集成规范）
  ↓
【步骤4】AI生成完整commit message
  feat(requirements): 完成Git集成模块需求澄清

  - 更新state.json（Git集成模块完整设计决策）
  - 更新CLAUDE.md（第九节Git集成规范）

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
  ↓
【步骤5】AI执行Git commit
  git add .solodev/state.json CLAUDE.md
  git commit -m "$(cat <<'EOF'
  [commit message]
  EOF
  )"
  ↓
【步骤6】AI更新state.json.metadata
  {
    "lastGitCommit": "abc123...",
    "lastGitCommitMessage": "feat(requirements): 完成Git集成模块需求澄清",
    "lastGitCommitAt": "2025-12-14T14:00:00Z",
    "stateFileVersion": 7,
    "totalStateChanges": 7
  }
  ↓
【步骤7】AI再次commit（metadata更新）
  git add .solodev/state.json
  git commit -m "chore(state): 更新state.json的git commit元信息"

完整工作流设计详见：CLAUDE.md（第九节 - Git集成规范）
```

**工作流2：迭代完成创建Tag**

```
测试阶段完成 + 部署成功
  ↓
【步骤1】AI检查迭代状态
  iterations[currentIteration].status === "completed"
  iterations[currentIteration].deployedAt !== null
  ↓
【步骤2】AI读取版本号
  version = iterations[currentIteration].version = "v1.0.0"
  ↓
【步骤3】AI创建Git Tag
  git tag v1.0.0 -m "Iteration 1 完成

  - 实现所有需求模块
  - 通过所有测试
  - 部署到生产环境
  "
  ↓
【步骤4】AI推送Tag
  git push origin v1.0.0
  ↓
【步骤5】AI更新state.json
  iterations["iteration-1"].gitTag = "v1.0.0"
  ↓
【步骤6】AI迁移state.json到state_his.json
  （详见状态管理模块）
```

**工作流3：热修复流程**

```
发现生产环境Bug（用户登录失败）
  ↓
【步骤1】AI直接在main分支修复
  修改代码：src/auth/login.ts
  ↓
【步骤2】AI创建hotfix commit
  git add src/auth/login.ts
  git commit -m "$(cat <<'EOF'
  hotfix(prod): [HOTFIX] 修复生产环境登录失败问题

  问题描述：
  - 用户登录时token验证失败
  - 影响范围：所有用户无法登录

  修复内容：
  - 修正token过期时间计算逻辑
  - 从1小时改为24小时

  版本：v1.0.0 → v1.0.1

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
  EOF
  )"
  ↓
【步骤3】AI更新版本号
  iterations["iteration-1"].version = "v1.0.1"
  ↓
【步骤4】AI创建hotfix Tag
  git tag v1.0.1 -m "[HOTFIX] 修复登录失败问题"
  git push origin v1.0.1
  ↓
【步骤5】AI部署hotfix
  （执行部署流程）
  ↓
【步骤6】AI更新state.json
  iterations["iteration-1"].deployedAt = "2025-12-15T10:45:00Z"
  iterations["iteration-1"].deployedCommit = "abc123..."
  ↓
【步骤7】AI记录到changeHistory
  {
    "type": "hotfix",
    "description": "[HOTFIX] 修复生产环境登录失败问题",
    "gitTag": "v1.0.1"
  }
```

**工作流4：版本回滚**

```
新版本v1.1.0部署后发现严重问题
  ↓
【步骤1】用户请求回滚
  "回滚到v1.0.0"
  ↓
【步骤2】AI检查可用的历史版本
  git tag

  结果：v1.0.0, v1.0.1, v1.1.0
  ↓
【步骤3】AI回滚到指定Tag
  git checkout v1.0.0
  ↓
【步骤4】AI同步state.json
  （state.json会自动回到v1.0.0时的状态）
  ↓
【步骤5】AI提示重新部署
  "已回滚到v1.0.0，请执行部署命令恢复服务"
  ↓
【步骤6】AI记录回滚操作
  changeHistory新增条目：
  {
    "type": "rollback",
    "description": "回滚到v1.0.0（从v1.1.0回滚）",
    "gitTag": "v1.0.0"
  }
```

---

## 五、用户故事与验收标准

### 5.1 用户故事清单

#### 用户视角（面向独立开发者）

**故事 1：自动commit（状态变更）**
```
作为独立开发者，我想在完成需求澄清时自动创建Git commit，以便无需手动执行commit命令。

验收标准：
  - [ ] AI检测到state.json变更（模块状态 → approved）
  - [ ] AI自动推断commit type（feat）、scope（requirements）
  - [ ] AI自动生成commit subject（完成[模块名]需求澄清）
  - [ ] AI自动执行git commit
  - [ ] Commit message符合Conventional Commits规范
  - [ ] Commit message包含Co-Authored-By信息
```

**故事 2：迭代完成创建Tag**
```
作为独立开发者，我想在迭代完成并部署后自动创建版本Tag，以便标记里程碑版本。

验收标准：
  - [ ] AI检测到迭代status = "completed" && deployedAt !== null
  - [ ] AI读取版本号（如v1.0.0）
  - [ ] AI创建Git Tag（git tag v1.0.0）
  - [ ] AI推送Tag到远程仓库（git push origin v1.0.0）
  - [ ] state.json记录gitTag字段
  - [ ] AI迁移state.json到state_his.json
```

**故事 3：热修复流程**
```
作为独立开发者，我想在发现生产环境Bug时快速修复并部署，以便最小化用户影响。

验收标准：
  - [ ] AI直接在main分支修复代码（无需创建hotfix分支）
  - [ ] AI创建hotfix commit，type为"hotfix"
  - [ ] Commit subject包含[HOTFIX]前缀
  - [ ] AI自动更新版本号（补丁版本号+1，如v1.0.0 → v1.0.1）
  - [ ] AI创建hotfix Tag并推送
  - [ ] AI记录到changeHistory（type: hotfix）
  - [ ] AI提示立即部署
```

**故事 4：版本回滚**
```
作为独立开发者，我想在新版本出问题时快速回滚到上一个稳定版本，以便恢复服务。

验收标准：
  - [ ] AI列出可用的历史版本Tag（git tag）
  - [ ] AI执行git checkout [tag]
  - [ ] state.json自动回到对应版本的状态
  - [ ] AI提示重新部署
  - [ ] AI记录回滚操作到changeHistory
```

**故事 5：Commit message规范化**
```
作为独立开发者，我想所有commit message都符合统一规范，以便Git历史易读易懂。

验收标准：
  - [ ] Commit message格式：<type>(<scope>): <subject>
  - [ ] Type从预定义列表选择（feat/fix/docs/refactor/test/chore/perf/hotfix）
  - [ ] Scope基于阶段或模块（requirements/architecture/implementation等）
  - [ ] Subject使用中文、动词开头、现在时态、不超过50字符
  - [ ] 重要变更包含Body和Footer（可选）
```

**故事 6：同一操作批量提交**
```
作为独立开发者，我想在一次操作涉及多个文件时，只创建1次commit，以便保持原子性。

验收标准：
  - [ ] 需求澄清时，state.json + CLAUDE.md 一起commit
  - [ ] 代码实现时，业务代码 + 测试代码 一起commit
  - [ ] Commit message的Body列出所有变更文件
  - [ ] Git历史保持简洁（避免碎片化commit）
```

**故事 7：连续小改动处理**
```
作为独立开发者，我想在连续多次小改动时，每次都创建独立commit，以便精细追溯。

验收标准：
  - [ ] 即使在5分钟内连续修改，也创建独立commit
  - [ ] 每次commit都有明确的描述
  - [ ] Git历史可精确追溯到每次变更
  - [ ] 支持回滚到任意变更点
```

**故事 8：手动修改检测**
```
作为独立开发者，我想在手动修改文件后，AI提示我是否需要commit，以便避免遗漏提交。

验收标准：
  - [ ] AI执行git status检测未提交的变更
  - [ ] AI提示："检测到手动修改，是否需要commit？"
  - [ ] 用户确认后，AI执行commit
  - [ ] 用户可以自己编写commit message或让AI生成
```

#### 系统视角（面向功能模块）

**故事 9：自动commit触发条件**
```
作为系统，我需要在8种情况下自动触发commit，以便精细记录项目历史。

验收标准：
  - [ ] 触发条件1：模块状态变更（pending → approved）
  - [ ] 触发条件2：澄清内容添加（clarifiedAspects新增）
  - [ ] 触发条件3：任务状态变更（globalTasks状态变化）
  - [ ] 触发条件4：阶段转换（phases状态变更）
  - [ ] 触发条件5：文档更新（CLAUDE.md或其他文档修改）
  - [ ] 触发条件6：部署操作（deployedAt更新）
  - [ ] 触发条件7：迭代完成（迭代状态→completed）
  - [ ] 触发条件8：热修复（hotfix类型变更）
```

**故事 10：Commit message自动生成规则**
```
作为系统，我需要根据变更内容自动推断commit信息，以便生成准确的commit message。

验收标准：
  - [ ] state.json模块状态→approved → type: feat, scope: requirements
  - [ ] CLAUDE.md新增章节 → type: docs, scope: guide
  - [ ] 代码实现完成 → type: feat, scope: [模块名]
  - [ ] 测试用例添加 → type: test, scope: [e2e/perf/chaos]
  - [ ] 部署操作 → type: deploy, scope: [prod/test]
  - [ ] Bug修复 → type: fix, scope: [模块名]
  - [ ] 热修复 → type: hotfix, scope: prod, subject包含[HOTFIX]
```

**故事 11：版本号自动管理**
```
作为系统，我需要根据变更类型自动更新版本号，以便符合语义化版本规范。

验收标准：
  - [ ] MAJOR变更（不兼容）：vX.0.0（如架构重构）
  - [ ] MINOR变更（新功能）：v1.X.0（如新增模块）
  - [ ] PATCH变更（Bug修复）：v1.0.X（如修复Bug、性能优化）
  - [ ] 版本号记录在state.json.iterations[].version
  - [ ] 迭代完成时版本号与Git Tag同步
```

**故事 12：metadata自动同步**
```
作为系统，我需要在每次commit后自动更新state.json.metadata，以便追踪Git元信息。

验收标准：
  - [ ] 每次commit后更新lastGitCommit（commit哈希）
  - [ ] 更新lastGitCommitMessage（commit message）
  - [ ] 更新lastGitCommitAt（commit时间戳）
  - [ ] 更新stateFileVersion（state.json版本号+1）
  - [ ] 更新totalStateChanges（累计变更次数+1）
```

**故事 13：单分支策略**
```
作为系统，我需要在main分支直接工作，以便简化单人开发的Git流程。

验收标准：
  - [ ] 所有commit都在main分支
  - [ ] 无需创建feature分支
  - [ ] 无需合并分支
  - [ ] 无需Pull Request流程
  - [ ] 热修复也在main分支直接修复
```

### 5.2 边界条件与异常处理

| 场景                 | 期望行为               | 错误处理               |
| -------------------- | ---------------------- | ---------------------- |
| **Git未初始化**      | 拒绝执行，提示初始化Git | 错误码500，提示"请先执行git init" |
| **未配置Git用户信息** | 拒绝执行，提示配置 | 错误码400，提示"请配置git user.name和user.email" |
| **Git push失败**     | 重试3次，失败后提示用户 | 警告"Git push失败，请手动执行" |
| **Tag已存在**        | 拒绝创建，提示Tag冲突 | 错误码409，提示"Tag v1.0.0已存在" |
| **版本号格式错误**   | 拒绝创建Tag，提示检查版本号 | 错误码400，提示"版本号格式错误，应为vX.Y.Z" |

---

## 六、非功能需求

### 6.1 性能要求

| 指标             | 要求                   | 备注               |
| ---------------- | ---------------------- | ------------------ |
| **Git commit时间** | < 2秒 | 包括git add + git commit |
| **Git push时间** | < 10秒 | 取决于网络速度 |
| **Tag创建时间** | < 1秒 | git tag命令 |

### 6.2 可靠性要求

- **容错性**：Git操作失败时不影响state.json状态
- **数据一致性**：state.json变更与Git commit原子性保证
- **可恢复性**：commit失败后可重新执行

### 6.3 可维护性要求

- **日志**：记录所有Git操作（命令、参数、结果）
- **监控**：Git操作失败率监控
- **可测试性**：提供测试模式（不实际执行Git push）

### 6.4 安全性要求

- **权限控制**：仅项目所有者可执行Git操作
- **密钥管理**：不在代码中存储Git密钥（使用SSH/HTTPS认证）
- **敏感信息**：不在commit message中包含密码、token等

---

## 七、技术约束与依赖

### 7.1 技术栈要求

- **版本控制**：Git 2.0+
- **命令执行**：Claude AI调用Bash工具
- **版本号规范**：Semantic Versioning 2.0.0
- **Commit规范**：Conventional Commits 1.0.0

### 7.2 兼容性要求

- **Git版本**：兼容Git 2.0+
- **操作系统**：Windows/macOS/Linux
- **远程仓库**：GitHub/GitLab/Gitee等

### 7.3 依赖关系

| 依赖模块       | 依赖原因                     | 集成方式           |
| -------------- | ---------------------------- | ------------------ |
| **状态管理模块** | 读取/写入state.json.metadata | 直接文件操作 |
| **所有模块** | 所有模块的状态变更都触发commit | 事件驱动 |

**完整依赖关系详见**：docs/architecture/iteration-1/04-模块集成设计.md

---

## 八、迭代规划

### 8.1 Iteration 1 (MVP)

- **目标**：实现自动commit、版本Tag、热修复、版本回滚
- **功能范围**：
  - 8种自动commit触发条件
  - Conventional Commits规范 + AI自动生成
  - 语义化版本Tag
  - 简化热修复流程（直接在main分支）
  - 版本回滚支持
  - metadata自动同步
- **验收标准**：
  - 所有状态变更自动commit
  - Commit message规范化
  - 迭代完成时自动创建Tag
  - 热修复流程顺畅

### 8.2 Iteration 2（未来增强）

- **目标**：增加Git历史清理、多分支支持、自动push
- **功能范围**：
  - Git历史压缩（squash小commit）
  - 多分支策略支持（团队协作）
  - 自动push到远程仓库（可配置）
  - Git hooks集成（pre-commit检查）
  - 可视化Git历史
- **验收标准**：
  - Git历史简洁可读
  - 支持团队协作分支策略
  - 自动push成功率≥95%

---

**文档版本历史**

| 版本  | 日期       | 修改内容               | 修改人 |
| ----- | ---------- | ---------------------- | ------ |
| v1.0  | 2025-12-14 | 初始版本，需求确认完成 | Claude AI |
