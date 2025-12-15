---
description: 回滚到指定阶段
allowed-tools: Bash(npm run solodev:*)
argument-hint: <目标阶段> <原因>
---

# 执行回滚

!`npm run solodev /rollback $ARGUMENTS`

## 回滚后状态

!`npm run solodev status`

---

## AI工作指令

### 回滚场景

1. **需求变更**：回滚到 requirements
   - 发现需求遗漏或变更
   - 需要重新进行需求澄清

2. **架构问题**：回滚到 architecture
   - 实现过程中发现架构设计问题
   - 需要调整模块依赖或接口设计

3. **测试失败**：回滚到 implementation
   - 测试发现严重bug
   - 需要重新实现某些功能

### 回滚影响

回滚会重置：
- 目标阶段的状态变为 in_progress
- 目标阶段之后的所有阶段状态重置为 pending
- 记录回滚原因和时间

### 回滚后动作

回滚成功后：
1. 分析回滚原因
2. 制定修复计划
3. 从目标阶段重新开始工作

---

## 使用示例

```bash
# 回滚到需求阶段
/rollback requirements "发现需求遗漏，需要补充用户认证功能"

# 回滚到架构阶段
/rollback architecture "模块依赖设计有问题，需要重构"

# 回滚到实现阶段
/rollback implementation "E2E测试发现核心流程bug"
```

---

## 注意事项

- 回滚是破坏性操作，请确认必要性
- 回滚原因会被记录，便于后续追溯
- 回滚后需要重新完成后续阶段的工作
