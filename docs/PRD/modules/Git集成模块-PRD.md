# Git集成模块 - 产品需求文档

<!--
章节ID规范说明：
- 格式：{#prd-Git集成-[章节标识]}
- 必须标注ID的章节：功能清单、数据模型、验收标准
-->

> **项目**: AI超级个体开发助手
> **版本**: v1.0
> **迭代**: Iteration 1
> **日期**: 2025-12-15
> **模块**: Git集成模块
> **状态**: 需求已确认

---

## 一、模块定位

### 1.1 一句话描述

Git集成模块是**AI工作规范**，定义AI何时执行git命令、如何生成commit message。

### 1.2 核心定位

| 维度 | 定义 |
|------|------|
| **模块性质** | 规范约定（非代码实现） |
| **实现方式** | AI直接调用git命令（无封装） |
| **核心价值** | 高频自动提交，规范的commit message |

### 1.3 设计原则

**直接复用Git，不过度封装**：
- ✅ AI直接执行 `git add`、`git commit`、`git tag`
- ✅ 规范定义触发时机和message格式
- ❌ 不需要代码封装Git操作
- ❌ 不需要专用命令（/rollback、/hotfix等）

---

## 二、核心规范

### 2.1 自动Commit触发时机 {#prd-Git集成-功能清单}

AI在以下情况完成后自动执行git commit：

| 触发条件 | 说明 | commit type |
|---------|------|-------------|
| 模块状态变更 | 模块 pending → approved | feat |
| 阶段转换 | 进入新阶段 | feat |
| 文档更新 | PRD/架构文档修改 | docs |
| 代码实现 | 功能代码完成 | feat |
| Bug修复 | 修复已知问题 | fix |
| state.json更新 | 状态变更记录 | chore |
| 迭代完成 | 创建版本Tag | chore |

### 2.2 Commit Message规范

**格式**（Conventional Commits简化版）：

```
<type>(<scope>): <subject>

[body - 可选]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Type定义**：

| Type | 说明 | 使用场景 |
|------|------|---------|
| feat | 新功能 | 模块完成、功能实现 |
| fix | Bug修复 | 修复问题 |
| docs | 文档 | PRD/架构/指南更新 |
| chore | 杂项 | state.json更新、配置变更 |
| test | 测试 | 测试用例 |
| hotfix | 热修复 | 生产环境紧急修复（需[HOTFIX]前缀） |

**Scope定义**：

| Scope | 说明 |
|-------|------|
| requirements | 需求阶段 |
| architecture | 架构阶段 |
| implementation | 实现阶段 |
| testing | 测试阶段 |
| deployment | 部署阶段 |
| state | state.json |
| [模块名] | 具体模块 |

**Subject规则**：
- 中文描述
- 动词开头
- 不超过50字符

### 2.3 版本号规范

**语义化版本**（SemVer 2.0.0）：

```
vMAJOR.MINOR.PATCH

示例：v1.0.0, v1.0.1, v1.1.0
```

| 版本位 | 递增条件 | 示例 |
|--------|---------|------|
| MAJOR | 不兼容的架构变更 | 核心重构 |
| MINOR | 向后兼容的新功能 | 新增模块 |
| PATCH | 向后兼容的Bug修复 | 热修复 |

### 2.4 state.json相关字段 {#prd-Git集成-数据模型}

**metadata字段**（每次commit后更新）：

```json
{
  "metadata": {
    "lastGitCommit": "abc1234",
    "lastGitCommitMessage": "feat(requirements): 完成模块需求澄清",
    "lastGitCommitAt": "2025-12-15T10:00:00Z",
    "stateFileVersion": 10,
    "totalStateChanges": 10
  }
}
```

**迭代Git信息**（迭代完成时更新）：

```json
{
  "iterations": {
    "iteration-1": {
      "version": "v1.0.0",
      "gitTag": "v1.0.0",
      "deployedAt": "2025-12-20T10:00:00Z"
    }
  }
}
```

---

## 三、工作流程

### 3.1 自动Commit流程

```
AI完成一个任务（如模块审批）
    ↓
检测变更：git status
    ↓
生成commit message（按规范）
    ↓
执行：git add [files] && git commit -m "[message]"
    ↓
更新state.json.metadata
    ↓
再次commit：chore(state): 更新Git元数据
```

### 3.2 版本Tag流程

```
迭代完成 + 部署成功
    ↓
创建Tag：git tag v1.0.0 -m "Release v1.0.0"
    ↓
推送Tag：git push origin v1.0.0
    ↓
更新state.json（gitTag字段）
```

### 3.3 热修复流程

```
用户告诉AI需要修复问题
    ↓
AI直接在main分支修复代码
    ↓
commit：hotfix(prod): [HOTFIX] 修复xxx问题
    ↓
版本号+1：v1.0.0 → v1.0.1
    ↓
创建Tag：git tag v1.0.1
```

### 3.4 版本回滚

```
用户告诉AI "回滚到v1.0.0"
    ↓
AI执行：git checkout v1.0.0
    ↓
提示用户重新部署
```

---

## 四、验收标准 {#prd-Git集成-验收标准}

### 4.1 核心验收项

| 验收项 | 标准 |
|--------|------|
| 自动commit | AI在状态变更后自动执行git commit |
| commit message | 符合Conventional Commits格式 |
| 版本Tag | 迭代完成时创建语义化版本Tag |
| metadata同步 | 每次commit后更新state.json.metadata |
| 单分支策略 | 所有操作在main分支，无需创建feature分支 |

### 4.2 边界条件

| 场景 | 处理方式 |
|------|---------|
| Git未初始化 | AI提示用户执行 git init |
| push失败 | AI提示用户手动执行 git push |
| Tag已存在 | AI提示版本冲突，需要新版本号 |

---

## 五、非功能需求

- **单分支策略**：所有操作在main分支，简化单人开发流程
- **高频提交**：每次有意义的状态变更都commit
- **原子性**：同一操作涉及的文件一起commit

---

## 六、与其他模块关系

| 关系 | 说明 |
|------|------|
| 状态管理模块 | 更新metadata字段 |
| 所有模块 | 状态变更触发commit |

**注意**：Git集成模块**不需要代码实现**，AI直接调用git命令即可。规范已整合到CLAUDE.md和专项指南中。

---

**文档版本历史**

| 版本 | 日期 | 修改内容 | 修改人 |
|-----|------|---------|-------|
| v1.0 | 2025-12-14 | 初始版本 | Claude AI |
| v2.0 | 2025-12-15 | 简化为规范约定，删除代码实现暗示 | Claude AI |
