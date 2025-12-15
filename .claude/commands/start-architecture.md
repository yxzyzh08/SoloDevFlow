---
description: 开始架构阶段（Architecture Phase）
allowed-tools: Bash(npm run solodev:*), Bash(npm run context:*)
argument-hint: [--force]
---

# 开始架构阶段

## 前置检查

!`npm run solodev status`

## 执行阶段切换

!`npm run solodev /start-architecture $ARGUMENTS`

## 加载阶段上下文

!`npm run context:phase architecture`

---

## AI工作指令

架构阶段的核心任务：

### 1. 架构设计
- 基于已审批的PRD进行架构设计
- 每个需要代码实现的模块需要3份架构文档：
  - 系统架构总览（00-系统架构总览.md）
  - 数据模型设计（数据模型设计.md）
  - 集成设计（集成设计.md）

### 2. 使用架构模板
- .solodev/templates/架构-系统总览-template.md
- .solodev/templates/架构-数据模型-template.md
- .solodev/templates/架构-集成设计-template.md

### 3. 模块依赖分析
- 识别模块间的依赖关系
- 更新state.json的moduleDependencies
- 确定实现顺序

### 4. 状态更新
- 模块架构完成后：`/approve <模块名>`
- 所有模块完成后：`/approve architecture`

### 5. 输出产物
- docs/architecture/iteration-X/<模块名>-00-系统架构总览.md
- docs/architecture/iteration-X/<模块名>-数据模型设计.md
- docs/architecture/iteration-X/<模块名>-集成设计.md

---

## 工作流约束

- 前置条件：requirements阶段已审批
- 必须获得用户对每个模块架构的审批
- 所有模块审批后才能进入实现阶段
- 使用 `/status` 查看当前进度
