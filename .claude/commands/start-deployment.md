---
description: 开始部署阶段（Deployment Phase）
allowed-tools: Bash(npm run solodev:*), Bash(npm run context:*)
argument-hint: [--force]
---

# 开始部署阶段

## 前置检查

!`npm run solodev status`

## 执行阶段切换

!`npm run solodev /start-deployment $ARGUMENTS`

## 加载阶段上下文

!`npm run context:phase deployment`

---

## AI工作指令

部署阶段的核心任务：

### 1. 部署计划
- 生成"部署计划.md"
- 包含：环境准备、部署步骤、回滚方案
- 请求用户审批

### 2. 发布检查清单
- 生成"发布检查清单.md"
- 逐项检查并确认
- 记录检查结果

### 3. 执行部署
- 按部署计划执行
- 记录部署过程
- 验证部署结果

### 4. 部署验证
- 执行冒烟测试
- 验证核心功能
- 确认系统状态正常

### 5. 状态更新
- 部署成功后：`/approve deployment`
- 迭代完成，准备下一个迭代或项目结束

---

## 工作流约束

- 前置条件：testing阶段已审批
- 部署计划必须先审批再执行
- 必须有回滚方案
- 部署后必须验证
- 使用 `/status` 查看当前进度

---

## 部署文档位置

- docs/deployment/iteration-X/部署计划.md
- docs/deployment/iteration-X/发布检查清单.md
- docs/deployment/iteration-X/部署报告.md
