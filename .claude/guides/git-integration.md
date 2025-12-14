# Git集成规范指南（Git Integration Standards）

> 本指南详细说明Git分支策略、Commit规范、自动提交策略、Hotfix处理（所有阶段必读）

---

## 一、核心理念

本项目采用**高频自动提交**策略，每次有意义的状态变更时自动创建Git commit，无需人工介入。

**设计目标**：
- **精细的历史记录**：每次状态变更都可追溯
- **天然的备份机制**：Git成为实时备份
- **易于回滚**：可以精确回滚到任何状态点
- **适配单人开发**：没有团队协作的commit噪音问题

---

## 二、分支策略

**单分支策略**：仅使用 `main` 分支

**适用场景**：
- 单人开发
- 无需feature branch
- 所有提交直接到main分支

**无需的操作**：
- ❌ 创建feature分支
- ❌ 合并分支
- ❌ Pull Request流程

---

## 三、版本号规范

**语义化版本（Semantic Versioning）**：`vMAJOR.MINOR.PATCH`

| 版本位 | 含义 | 示例场景 |
|--------|------|----------|
| **MAJOR** | 重大不兼容变更 | API接口签名变化、架构重构 |
| **MINOR** | 向后兼容的功能新增 | 新增模块、新增命令 |
| **PATCH** | 向后兼容的Bug修复 | 修复Bug、性能优化、文档更新 |

**版本示例**：
```
v1.0.0  → 首个正式版本（Iteration 1完成）
v1.1.0  → 新增功能（Iteration 2完成）
v1.1.1  → Bug修复
v2.0.0  → 重大变更（不兼容v1.x）
```

**版本号管理**：
- 版本号记录在 `state.json` 的 `iterations[currentIteration].version`
- 迭代完成时创建Git tag：`git tag v1.0.0`
- Tag与迭代状态同步

---

## 四、Commit规范

**格式**：Conventional Commits简化版（中文）

```
<type>(<scope>): <subject>

[optional body]
```

### Type类型定义

| Type | 说明 | 使用场景 |
|------|------|----------|
| **feat** | 新功能 | 新增模块、完成需求澄清 |
| **fix** | Bug修复 | 修复代码缺陷、测试失败 |
| **docs** | 文档变更 | 更新PRD、架构文档 |
| **refactor** | 重构 | 代码重构、架构优化 |
| **test** | 测试 | 添加/修改测试用例 |
| **chore** | 构建/工具变更 | 更新依赖、修改配置 |
| **perf** | 性能优化 | 性能改进 |
| **hotfix** | 紧急修复 | 生产环境紧急Bug修复 |

### Scope范围定义

**按阶段**：
- `requirements`, `architecture`, `implementation`, `testing`, `deployment`

**按模块**：
- `state`, `docs`, 或具体模块名（如 `用户模块`, `订单模块`）

### Subject规范

**规则**：
- 使用中文
- 动词开头，现在时态
- 不超过50个字符
- 不加句号

**示例**：
```
✅ 正确：
feat(requirements): 完成Git集成模块需求澄清
fix(用户模块): 修复getUserInfo返回null的问题
docs(architecture): 更新命令设计文档

❌ 错误：
完成Git集成模块需求澄清（缺少type和scope）
feat(requirements): finished clarification（使用英文）
feat(requirements): 完成需求澄清。（有句号）
```

---

## 五、自动Commit策略

**核心原则**：每次有意义的状态变更时自动commit，无需人工介入

### 自动Commit触发条件

| 触发条件 | 示例场景 | Commit示例 |
|----------|----------|------------|
| **模块状态变更** | 模块从pending→approved | `feat(requirements): 状态管理模块status更新为approved` |
| **澄清内容添加** | clarifiedAspects新增 | `feat(requirements): Git集成模块添加澄清内容` |
| **任务状态变更** | globalTasks状态变化 | `chore(state): 更新任务task-003状态为completed` |
| **阶段转换** | phases状态变更 | `feat(iteration): 需求阶段完成，进入设计阶段` |
| **文档更新** | CLAUDE.md修改 | `docs(guide): 更新CLAUDE.md第9节Git集成规范` |
| **部署操作** | deployedAt更新 | `deploy(prod): 部署v1.0到生产环境` |
| **迭代完成** | 迭代状态→completed | `feat(iteration): 完成iteration-1，创建Git tag v1.0` |
| **热修复** | hotfix类型变更 | `hotfix(prod): 修复生产环境登录失败问题` |

### 批量提交规则

**同一操作涉及多个文件时，合并为1次commit**

```bash
# ✅ 正确：同时修改state.json和CLAUDE.md时，1次commit
git add .solodev/state.json CLAUDE.md
git commit -m "feat(requirements): 完成Git集成模块需求澄清

- 更新state.json（Git集成模块完整设计决策）
- 更新CLAUDE.md（第九节Git集成规范）

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# ❌ 错误：拆分成2次commit
git commit -m "更新state.json"
git commit -m "更新CLAUDE.md"
```

### 连续小改动的处理

**策略**：每次都commit（保持一致性）

即使在5分钟内连续多次修改，也创建独立的commit，便于精确追溯和回滚。

---

## 六、热修复（Hotfix）处理

### 使用场景

**场景A：生产环境紧急Bug修复**
- 安全漏洞、数据丢失、服务崩溃

**场景B：文档/配置紧急修正**
- 部署文档错误导致无法部署

**场景C：依赖项紧急升级**
- 依赖包发现严重安全漏洞

### 热修复流程（简化版）

```
发现生产环境问题
  ↓
【步骤1】直接在当前迭代修复（无需创建hotfix分支）
  ↓
【步骤2】创建hotfix commit（Type: hotfix, 包含[HOTFIX]前缀）
  ↓
【步骤3】更新版本号（v1.0.0 → v1.0.1）
  ↓
【步骤4】立即部署（打Git tag: v1.0.1）
  ↓
【步骤5】更新state.json（deployedAt + changeHistory）
  ↓
【步骤6】Git commit状态变更
```

### Hotfix Commit示例

```bash
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

git tag v1.0.1
git push origin main --tags
```

---

## 七、版本回滚

**支持回滚到历史版本**

### 回滚步骤

```bash
# 步骤1: 查看可用的历史版本
git tag

# 步骤2: 回滚到指定版本
git checkout v1.0.0

# 步骤3: 同步state.json到对应版本
# （state.json会自动回到v1.0.0时的状态）

# 步骤4: 重新部署

# 步骤5: 验证回滚成功
```

---

## 八、AI自动生成Commit Message

**AI职责**：根据变更内容自动推断type、scope和subject

### 推断规则

| 变更内容 | Type | Scope | Subject示例 |
|----------|------|-------|-------------|
| state.json模块状态→approved | feat | requirements | 完成[模块名]需求澄清 |
| CLAUDE.md新增章节 | docs | guide | 更新CLAUDE.md第X节[章节名] |
| 代码实现完成 | feat | 模块名 | 实现[功能名] |
| 测试用例添加 | test | e2e/perf/chaos | 添加[测试类型]测试 |
| 部署操作 | deploy | prod/test | 部署[版本号]到[环境] |
| Bug修复 | fix | 模块名 | 修复[Bug描述] |

---

## 九、Commit后的操作

### 自动更新metadata

**每次commit后，AI自动更新state.json的metadata**：

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

### 迭代完成时创建Tag

**触发条件**：
```javascript
iterations[currentIteration].status === 'completed'
  && iterations[currentIteration].deployedAt !== null
```

**操作**：
```bash
git tag v1.0.0 -m "Iteration 1 完成"
git push origin v1.0.0
```

---

## 十、实践原则

### 1. 高频commit是特性，不是问题

```
✅ 正确认知：
- 单人开发，commit频率高不会造成干扰
- 精细的commit历史便于回滚和追溯
- Git是实时备份机制

❌ 错误认知：
- commit太多会导致历史混乱
- 应该攒多个改动再commit
```

### 2. Commit message必须规范

```
✅ 正确做法：
- 严格遵循 <type>(<scope>): <subject> 格式
- Type和Scope从预定义列表选择
- Subject使用中文、动词开头

❌ 错误做法：
- 随意写commit message："修改"、"更新"
- 不加type和scope
```

### 3. 同一操作的文件一起commit

```
✅ 正确做法：
- state.json + CLAUDE.md 一起commit
- 代码 + 测试代码 一起commit

❌ 错误做法：
- 先commit state.json
- 再commit CLAUDE.md
- 破坏原子性
```

### 4. Hotfix必须标记清楚

```
✅ 正确做法：
- Type使用 hotfix
- Subject包含 [HOTFIX] 前缀
- changeHistory标记type为hotfix
- 立即更新版本号和部署

❌ 错误做法：
- 用普通的fix类型
- 没有明确标识紧急修复
```

### 5. Tag与迭代严格对应

```
✅ 正确做法：
- 迭代完成 → 创建tag → 部署 → 迁移到state_his.json
- Tag命名遵循语义化版本
- Tag与state.json中的version字段一致

❌ 错误做法：
- 随意创建tag
- Tag命名不规范
- Tag与迭代状态不同步
```
