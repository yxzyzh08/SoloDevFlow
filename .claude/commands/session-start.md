---
description: SoloDevFlow会话开始流程（每次会话必须首先执行）
allowed-tools: Bash(npm run validate:*), Bash(npm run solodev:*), Bash(npm run context:*)
---

# SoloDevFlow 会话初始化

## 第1步：验证state.json格式

!`npm run validate:state`

## 第2步：获取项目状态概览

!`npm run solodev status`

---

## AI工作指令

你是 **SoloDevFlow 严格工作流执行者**。基于以上信息，执行以下流程：

### 1. 状态分析

分析当前项目状态：
- 当前阶段（currentPhase）是什么？
- 阶段状态（in_progress/pending/approved）是什么？
- 有哪些已完成/待完成的模块？
- 有哪些阻塞问题？

### 2. 上下文加载决策

根据当前阶段，决定是否需要加载详细上下文：

| 阶段 | 需要加载的上下文 |
|------|------------------|
| requirements | PRD模板、已有PRD |
| architecture | 已审批PRD、架构模板 |
| implementation | 已审批架构文档、代码规范 |
| testing | PRD验收标准、架构文档、测试模板 |
| deployment | 部署模板、发布检查清单 |

如需加载，使用：
```bash
npm run context:phase <阶段名>
npm run context:module <模块名> <阶段名>
```

### 3. 专项指南加载

根据当前阶段读取对应的专项指南：

| 阶段 | 必读专项指南 |
|------|--------------|
| requirements | state-management.md, template-usage.md |
| architecture | state-management.md, template-usage.md |
| implementation | state-management.md, code-standards.md |
| testing | state-management.md, testing-standards.md |
| deployment | state-management.md |

所有阶段都需要：git-integration.md

### 4. 向用户报告

用简洁的格式向用户报告：

```
## 项目状态
- 项目：[项目名]
- 当前阶段：[阶段名] ([状态])
- 模块进度：[已完成]/[总数]

## 上次进度
[描述上次停留的位置]

## 建议的下一步
[具体的下一步行动，使用对应的slash命令]
```

---

## 重要约束

1. **禁止直接读取state.json** - 使用status命令获取概览（节省50倍token）
2. **按需加载上下文** - 只在需要时才加载详细信息
3. **使用slash命令** - 所有操作通过对应的slash命令执行
4. **严格遵循工作流** - 不跳过阶段，不绕过审批

---

## 可用的Slash命令

| 命令 | 用途 |
|------|------|
| `/status` | 查看项目当前状态 |
| `/approve <目标>` | 审批阶段或模块 |
| `/rollback <目标> <原因>` | 回滚到指定阶段 |
| `/start-requirements` | 开始需求阶段 |
| `/start-architecture` | 开始架构阶段 |
| `/start-implementation` | 开始实现阶段 |
| `/start-testing` | 开始测试阶段 |
| `/start-deployment` | 开始部署阶段 |
