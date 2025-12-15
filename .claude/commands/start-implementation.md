---
description: 开始实现阶段（Implementation Phase）
allowed-tools: Bash(npm run solodev:*), Bash(npm run context:*)
argument-hint: [--force]
---

# 开始实现阶段

## 前置检查

!`npm run solodev status`

## 执行阶段切换

!`npm run solodev /start-implementation $ARGUMENTS`

## 加载阶段上下文

!`npm run context:phase implementation`

---

## AI工作指令

实现阶段的核心任务：

### 1. 代码实现
- 严格按照架构文档实现
- 遵循代码规范（.claude/guides/code-standards.md）
- 添加 @integration 标注标识模块依赖

### 2. 单元测试
- 每个功能模块必须有单元测试
- 覆盖率目标：100%
- 测试文件放在对应模块目录

### 3. 实现顺序
- 按模块依赖的拓扑顺序实现
- 被依赖的模块优先实现
- 使用 `npm run context:module <模块名> implementation` 获取模块上下文

### 4. 状态更新
- 模块实现完成后：`/approve <模块名>`
- 所有模块完成后：`/approve implementation`

### 5. Git提交规范
- 每个有意义的变更都要commit
- 格式：`<type>(<scope>): <subject>`
- 代码和测试一起提交

---

## 工作流约束

- 前置条件：architecture阶段已审批
- 必须获得用户对每个模块实现的审批
- 所有模块审批后才能进入测试阶段
- 使用 `/status` 查看当前进度

---

## @integration 标注规范

```typescript
// @integration [模块名].[接口名]
import { someFunction } from '../other-module';
```

标注目的：
- 清晰标识模块间依赖
- 便于影响分析
- 支持重构时的依赖追踪
