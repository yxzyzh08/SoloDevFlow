---
description: 审批阶段或模块
allowed-tools: Bash(npm run solodev:*)
argument-hint: <目标> (阶段名或模块名)
---

# 执行审批

!`npm run solodev /approve $ARGUMENTS`

## 审批后状态

!`npm run solodev status`

---

## AI工作指令

### 审批类型

1. **模块审批**：`/approve <模块名>`
   - 审批指定模块（如：状态管理模块）
   - 模块必须已完成当前阶段的工作

2. **阶段审批**：`/approve <阶段名>`
   - 审批整个阶段（如：requirements、architecture）
   - 该阶段所有模块必须已审批
   - 阶段审批后可以进入下一阶段

3. **当前阶段审批**：`/approve`
   - 审批当前阶段
   - 等同于 `/approve <currentPhase>`

### 审批检查

审批前AI应确认：
- [ ] 所有产物已生成（文档/代码）
- [ ] 用户已确认审批
- [ ] 无阻断性错误

### 审批后动作

审批成功后：
1. 状态已更新，查看最新状态
2. 如果是阶段审批，提示用户可以开始下一阶段
3. 给出具体的下一步建议

---

## 使用示例

```bash
# 审批模块
/approve 状态管理模块
/approve 命令体系模块

# 审批阶段
/approve requirements
/approve architecture
/approve implementation

# 审批当前阶段
/approve
```
