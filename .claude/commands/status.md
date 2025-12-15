---
description: 查看SoloDevFlow项目当前状态和进度
allowed-tools: Bash(npm run solodev:*)
---

# 项目状态查询

!`npm run solodev status`

---

## AI工作指令

基于以上状态输出：

1. **解读当前进度**
   - 项目处于哪个阶段？
   - 该阶段完成了多少？
   - 有哪些模块需要关注？

2. **识别阻塞点**（如有）
   - 是否有待审批的模块？
   - 是否有失败的验证？
   - 是否需要回滚？

3. **给出下一步建议**
   - 使用具体的slash命令
   - 例如：`/approve 状态管理模块` 或 `/start-testing`

---

## 注意事项

- 此命令只查询状态，不修改任何数据
- 如需详细信息，使用 `npm run context:phase <阶段名>` 加载上下文
