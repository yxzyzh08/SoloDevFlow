---
description: 开始需求阶段（Requirements Phase）
allowed-tools: Bash(npm run solodev:*), Bash(npm run context:*)
argument-hint: [--force]
---

# 开始需求阶段

## 执行阶段切换

!`npm run solodev /start-requirements $ARGUMENTS`

## 加载阶段上下文

!`npm run context:phase requirements`

---

## AI工作指令

需求阶段的核心任务：

### 1. 需求澄清
- 与用户进行需求对话
- 记录功能点、非功能需求、约束条件
- 识别模块边界和依赖关系

### 2. PRD编写
- 使用PRD模板（.solodev/templates/PRD-*.md）
- 先写项目级PRD，再写模块级PRD
- 每个模块PRD完成后请求用户审批

### 3. 状态更新
- 模块完成后：`/approve <模块名>`
- 所有模块完成后：`/approve requirements`

### 4. 输出产物
- docs/PRD/PRD.md（项目级）
- docs/PRD/modules/<模块名>-PRD.md（模块级）

---

## 工作流约束

- 必须获得用户对每个模块PRD的审批
- 所有模块审批后才能进入架构阶段
- 使用 `/status` 查看当前进度
