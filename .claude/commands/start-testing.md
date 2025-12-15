---
description: 开始测试阶段（Testing Phase）
allowed-tools: Bash(npm run solodev:*), Bash(npm run context:*)
argument-hint: [--force]
---

# 开始测试阶段

## 前置检查

!`npm run solodev status`

## 执行阶段切换

!`npm run solodev /start-testing $ARGUMENTS`

## 加载阶段上下文

!`npm run context:phase testing`

---

## AI工作指令

测试阶段的核心任务：

### 1. E2E测试
- 基于PRD验收标准设计测试用例
- 生成"E2E测试计划.md"
- 请求用户审批测试计划
- 审批后生成测试代码并执行

### 2. 性能测试
- 基于PRD性能要求设计测试方案
- 生成"性能测试方案.md"
- 请求用户审批测试方案
- 审批后执行性能测试

### 3. 混沌测试（可选）
- 基于测试经验库设计混沌测试
- 生成"混沌测试方案.md"
- 模拟异常情况验证系统稳定性

### 4. 测试失败处理
- 失败测试必须进行根因分析
- 记录失败原因和修复方案
- 修复后重新执行测试

### 5. 状态更新
- E2E测试通过后：更新状态
- 性能测试通过后：更新状态
- 所有测试通过后：`/approve testing`

---

## 工作流约束

- 前置条件：implementation阶段已审批
- 测试计划必须先审批再执行
- 测试失败必须找到根因
- 所有测试通过后才能进入部署阶段
- 使用 `/status` 查看当前进度

---

## 测试文档位置

- docs/testing/iteration-X/E2E测试计划.md
- docs/testing/iteration-X/性能测试方案.md
- docs/testing/iteration-X/混沌测试方案.md
- docs/testing/iteration-X/测试报告.md
