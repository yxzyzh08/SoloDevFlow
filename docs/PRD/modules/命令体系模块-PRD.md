# 命令体系模块 - 产品需求文档

> **项目**: AI超级个体开发助手
> **版本**: v1.0
> **迭代**: Iteration 1
> **日期**: 2025-12-14
> **模块**: 命令体系模块
> **状态**: 需求已确认

---

## 一、产品愿景

### 1.1 一句话描述

通过粗粒度Slash Commands提供直观的人机协作开发界面。

### 1.2 核心定位

| 维度         | 定义                                    |
| ------------ | --------------------------------------- |
| **产品类型** | CLI命令体系（Claude CLI Slash Commands） |
| **目标平台** | Claude CLI 环境                         |
| **用户定位** | 独立开发者、超级个体                     |
| **核心价值** | 简化工作流触发，提供清晰的阶段划分界面   |

### 1.3 技术定位

- **部署方式**：Claude CLI 命令定义文件
- **集成方式**：Slash Commands (`/command-name`)
- **数据持久化**：命令定义存储在 `.claude/commands/` 目录

---

## 二、目标用户

### 2.1 用户画像

```yaml
名称: 独立开发者（超级个体）

典型特征:
  - 使用Claude CLI进行AI辅助开发
  - 需要清晰的开发阶段划分
  - 希望一条命令触发完整流程
  - 重视开发效率和质量控制

典型场景:
  - 启动新迭代的需求分析
  - 需求确认后进入架构设计
  - 代码实现完成后启动测试
  - 全流程完成后部署上线

核心诉求:
  - 命令简洁易记
  - 一条命令触发一个完整阶段
  - 关键节点有审批暂停机制
  - 避免手动管理复杂的工作流状态
```

### 2.2 用户痛点

| 痛点          | 描述           | 影响           | 解决方案       |
| ------------- | -------------- | -------------- | -------------- |
| **P1: 工作流不清晰** | 传统AI对话没有明确的阶段划分 | 容易跳过关键步骤，质量无保障 | 设计7个核心命令对应5个阶段+2个辅助 |
| **P2: 无法暂停审批** | AI执行过程无法在关键点暂停 | 错误决策无法及时纠正 | 5大审批点机制（需求、架构、测试计划等） |
| **P3: 命令记忆负担** | 命令过多或过细导致难以记忆 | 降低使用效率 | 粗粒度命令设计（一个阶段一条命令） |

---

## 三、功能架构

### 3.1 系统架构图

```
用户输入命令
     ↓
命令解析与验证
     ↓
状态检查（读取state.json）
     ↓
执行阶段流程
     ↓
审批点暂停（如适用）
     ↓
更新状态（写入state.json）
     ↓
Git自动提交（如适用）

完整架构设计详见：docs/architecture/iteration-1/00-系统架构总览.md
```

### 3.2 模块划分

| 模块名        | 职责               | 实现方式           |
| ------------- | ------------------ | ------------------ |
| **命令定义模块**   | 定义7个核心命令的名称、参数、描述 | `.claude/commands/*.md` 文件 |
| **命令解析模块**   | 解析用户输入，验证参数合法性 | Claude AI读取命令文件并解析 |
| **状态检查模块**   | 检查当前项目状态，判断是否可执行命令 | 读取 `state.json` |
| **审批点控制模块** | 在关键节点暂停，等待人工审批 | 生成审批文档，等待用户确认 |

---

## 四、核心功能设计

### 4.1 命令清单

**CLI 工具项目** - 命令清单

| 命令                      | 描述                           | 详细设计文档                          |
| ------------------------- | ------------------------------ | ------------------------------------- |
| `/start-requirements`     | 启动需求分析阶段               | docs/architecture/iteration-1/02-命令设计.md |
| `/approve-requirements`   | 审批需求文档                   | docs/architecture/iteration-1/02-命令设计.md |
| `/start-architecture`     | 启动架构设计阶段               | docs/architecture/iteration-1/02-命令设计.md |
| `/approve-architecture`   | 审批架构文档                   | docs/architecture/iteration-1/02-命令设计.md |
| `/start-implementation`   | 启动实现阶段（生成代码）       | docs/architecture/iteration-1/02-命令设计.md |
| `/start-testing`          | 启动测试阶段                   | docs/architecture/iteration-1/02-命令设计.md |
| `/start-deployment`       | 启动部署阶段                   | docs/architecture/iteration-1/02-命令设计.md |
| `/custom-task`            | 创建自定义任务（逃逸机制）     | docs/architecture/iteration-1/02-命令设计.md |
| `/expand-context`         | 临时扩展任务上下文（逃逸机制） | docs/architecture/iteration-1/02-命令设计.md |

**完整命令清单详见**：docs/architecture/iteration-1/02-命令设计.md

### 4.2 上下文加载集成

> **说明**：上下文加载能力由**状态管理模块**提供（详见 PRD.md 4.2节）。命令体系模块作为调用方，在命令执行时调用上下文加载接口。

**集成方式**：

```
用户执行命令（如 /start-architecture）
        ↓
命令体系模块解析命令
        ↓
调用状态管理模块：getContextForModule(currentModule, "architecture")
        ↓
状态管理模块返回精确上下文列表
        ↓
命令体系模块将上下文注入AI会话
        ↓
AI基于精确上下文执行任务
```

**逃逸命令**：

| 命令 | 用途 | 使用场景 |
|------|------|----------|
| `/custom-task` | 创建自定义任务 | 预定义命令无法覆盖的新场景 |
| `/expand-context` | 临时扩展上下文 | 当前任务需要读取默认上下文外的内容 |

### 4.3 数据模型

#### 核心数据结构（概览）

**state.json - currentPhase字段** - 记录当前阶段

```json
{
  "currentPhase": "requirements | architecture | implementation | testing | deployment"
}
```

**state.json - phases字段** - 记录各阶段状态

```json
{
  "phases": {
    "requirements": {
      "status": "pending | in_progress | completed",
      "startedAt": "ISO 8601时间戳",
      "completedAt": "ISO 8601时间戳",
      "modules": { /* 模块级详细状态 */ }
    }
  }
}
```

**关键字段说明**：

| 字段名      | 类型     | 说明                   | 必填 |
| ----------- | -------- | ---------------------- | ---- |
| `currentPhase` | string | 当前所处阶段 | 是 |
| `phases[].status` | string | 阶段状态（pending/in_progress/completed） | 是 |
| `phases[].startedAt` | string | 阶段开始时间戳 | 否 |
| `phases[].completedAt` | string | 阶段完成时间戳 | 否 |

**完整数据模型详见**：docs/architecture/iteration-1/03-数据模型设计.md

### 4.4 核心工作流

```
用户输入：/start-requirements
  ↓
【步骤1】AI检查state.json：currentPhase是否为null或上一迭代已完成
  ├─ 合法 → 继续
  └─ 不合法 → 提示错误："当前迭代尚未完成，无法启动新需求分析"
  ↓
【步骤2】AI更新state.json：
  - currentPhase = "requirements"
  - phases.requirements.status = "in_progress"
  - phases.requirements.startedAt = 当前时间戳
  ↓
【步骤3】AI执行需求分析流程：
  - 读取PRD模板
  - 逐模块澄清需求
  - 生成PRD文档
  ↓
【步骤4】AI生成审批文档，暂停等待人工审批
  - 提示："需求分析完成，请审批 PRD.md"
  ↓
用户输入：/approve-requirements
  ↓
【步骤5】AI更新state.json：
  - phases.requirements.status = "completed"
  - phases.requirements.completedAt = 当前时间戳
  ↓
【步骤6】Git自动提交状态变更

完整工作流设计详见：docs/architecture/iteration-1/00-系统架构总览.md（第四节）
```

---

## 五、用户故事与验收标准

### 5.1 用户故事清单

#### 用户视角（面向最终用户）

**故事 1：启动需求分析**
```
作为独立开发者，我想通过一条命令启动需求分析阶段，以便AI帮我逐步澄清所有模块需求。

验收标准：
  - [ ] 输入 /start-requirements 命令后，AI开始需求分析流程
  - [ ] AI读取PRD模板，逐模块询问需求细节
  - [ ] AI生成完整的PRD文档（docs/PRD/PRD.md）
  - [ ] AI自动更新state.json的currentPhase和phases.requirements状态
  - [ ] AI提示用户审批PRD文档
```

**故事 2：审批需求文档**
```
作为独立开发者，我想审批AI生成的PRD文档，以便确认需求无误后进入下一阶段。

验收标准：
  - [ ] 输入 /approve-requirements 命令后，AI标记需求阶段为已完成
  - [ ] state.json中phases.requirements.status更新为"completed"
  - [ ] state.json中phases.requirements.completedAt记录完成时间
  - [ ] Git自动提交状态变更（commit message包含"需求阶段完成"）
  - [ ] AI提示下一步行动："可以执行 /start-architecture 启动架构设计"
```

**故事 3：启动架构设计**
```
作为独立开发者，我想通过一条命令启动架构设计阶段，以便AI根据PRD生成架构文档。

验收标准：
  - [ ] 输入 /start-architecture 命令后，AI检查需求阶段是否已完成
  - [ ] 如需求未完成，AI拒绝执行并提示："请先完成需求阶段"
  - [ ] 如需求已完成，AI开始架构设计流程
  - [ ] AI读取架构文档模板，生成技术选型、命令设计、数据模型等文档
  - [ ] AI自动更新state.json的currentPhase和phases.architecture状态
  - [ ] AI提示用户审批架构文档
```

**故事 4：启动实现阶段**
```
作为独立开发者，我想通过一条命令启动实现阶段，以便AI根据架构文档生成代码。

验收标准：
  - [ ] 输入 /start-implementation 命令后，AI检查架构阶段是否已完成
  - [ ] AI读取架构文档（命令设计、数据模型设计）
  - [ ] AI逐模块生成代码（包括业务代码、单元测试、集成测试）
  - [ ] AI自动添加@integration标注（基于state.json的integrationPoints）
  - [ ] AI执行单元测试，验证覆盖率是否达到100%
  - [ ] AI自动更新state.json的currentPhase和phases.implementation状态
```

**故事 5：启动测试阶段**
```
作为独立开发者，我想通过一条命令启动测试阶段，以便执行E2E、性能、混沌测试。

验收标准：
  - [ ] 输入 /start-testing 命令后，AI检查实现阶段是否已完成
  - [ ] AI生成E2E测试计划（基于PRD验收标准）→ 人工审批
  - [ ] AI生成性能测试方案（基于PRD性能要求）→ 人工审批
  - [ ] AI生成混沌测试方案（基于通用测试经验库）→ 人工审批
  - [ ] 每个测试方案审批通过后，AI生成测试代码并执行测试
  - [ ] AI自动更新state.json的currentPhase和phases.testing状态
```

**故事 6：启动部署阶段**
```
作为独立开发者，我想通过一条命令启动部署阶段，以便生成部署文档和配置。

验收标准：
  - [ ] 输入 /start-deployment 命令后，AI检查测试阶段是否已完成
  - [ ] AI读取部署文档模板，生成部署手册、运维手册、CI/CD配置说明
  - [ ] AI生成部署配置文件（如适用）
  - [ ] AI自动更新state.json的currentPhase和phases.deployment状态
  - [ ] AI提示用户审批部署文档
```

**故事 7：命令参数支持（可选参数）**
```
作为独立开发者，我想在启动命令时指定可选参数，以便跳过某些步骤或定制流程。

验收标准：
  - [ ] 支持 /start-requirements [模块名] 启动单个模块的需求分析
  - [ ] 支持 /start-testing --skip-approval 跳过测试方案审批（高级用户）
  - [ ] 参数验证：不合法的参数会被拒绝，并提示正确用法
  - [ ] 命令帮助：输入 /command-name --help 显示命令用法
```

#### 系统视角（面向功能模块）

**故事 8：命令合法性检查**
```
作为系统，我需要在执行命令前检查项目状态，以便避免阶段顺序错乱。

验收标准：
  - [ ] 执行 /start-architecture 前，检查 phases.requirements.status === "completed"
  - [ ] 如检查失败，返回错误提示："无法启动架构设计，需求阶段未完成"
  - [ ] 检查逻辑基于state.json的currentPhase和phases状态
  - [ ] 检查结果记录到日志（用于调试和审计）
```

**故事 9：状态自动同步**
```
作为系统，我需要在命令执行时自动更新state.json，以便状态与实际进度同步。

验收标准：
  - [ ] 命令开始执行时，更新 currentPhase 和 phases[].status = "in_progress"
  - [ ] 命令执行完成时，更新 phases[].status = "completed" 和 completedAt 时间戳
  - [ ] 每次状态变更后，触发Git自动提交
  - [ ] Git commit message自动生成，格式符合Conventional Commits规范
```

**故事 10：审批点暂停机制**
```
作为系统，我需要在关键节点暂停并等待人工审批，以便确保质量控制。

验收标准：
  - [ ] 5大审批点：需求文档、架构文档、E2E测试计划、性能测试方案、混沌测试方案
  - [ ] 审批点暂停时，AI生成审批提示："请审批[文档名]，审批命令：/approve-[阶段]"
  - [ ] 用户执行审批命令前，AI不继续执行后续流程
  - [ ] 审批拒绝时，AI根据用户意见重新生成文档
```

**故事 11：自定义任务（逃逸机制）**
```
作为独立开发者，我想创建自定义任务来处理预定义命令无法覆盖的新场景。

验收标准：
  - [ ] 输入 /custom-task "分析两个模块的集成点" 后，AI自动推断关注范围
  - [ ] AI生成任务上下文（任务目标、关注范围、注意力边界、期望产出）供用户确认
  - [ ] 用户确认后，AI按照任务上下文执行任务
  - [ ] 自定义任务不影响state.json的阶段状态（仅为临时任务）
  - [ ] 任务完成后，AI提示"任务已完成"并总结产出
```

**故事 12：临时扩展上下文（逃逸机制）**
```
作为独立开发者，我想在执行任务时临时扩展上下文，以便读取注意力边界外的内容。

验收标准：
  - [ ] 在执行某个命令时，输入 /expand-context "读取历史迭代的架构设计"
  - [ ] AI确认扩展内容并添加到当前任务的关注范围
  - [ ] AI提示"上下文已扩展，本次任务将额外关注：xxx"
  - [ ] 扩展仅对当前任务有效，任务完成后自动失效
  - [ ] 不影响命令文件中定义的原始任务聚焦规则
```

### 5.2 边界条件与异常处理

| 场景                 | 期望行为               | 错误处理               |
| -------------------- | ---------------------- | ---------------------- |
| **命令参数错误**     | 拒绝执行，提示正确用法 | 错误码400，提示"用法：/command-name [args]" |
| **阶段顺序错误**     | 拒绝执行，提示当前阶段 | 错误码409，提示"当前阶段为[phase]，无法跳转" |
| **state.json损坏**   | 拒绝执行，提示检查文件 | 错误码500，提示"state.json格式错误，请检查" |
| **审批超时**         | 保持暂停状态，可随时恢复 | 无超时限制，用户可随时执行审批命令 |
| **命令执行中断**     | 保存当前进度到state.json | 下次执行命令时从中断点恢复 |

---

## 六、非功能需求

### 6.1 性能要求

| 指标             | 要求                   | 备注               |
| ---------------- | ---------------------- | ------------------ |
| **命令响应时间** | < 2秒（命令解析和状态检查） | AI生成文档的时间不计入 |
| **状态读取**     | < 100ms                | 读取state.json     |
| **状态写入**     | < 200ms                | 写入state.json并Git提交 |

### 6.2 可靠性要求

- **容错性**：命令执行失败时，state.json回滚到执行前状态
- **数据一致性**：state.json更新与Git提交原子性保证
- **可恢复性**：命令中断后，下次执行可从中断点恢复

### 6.3 可维护性要求

- **日志**：记录所有命令执行历史（命令名、参数、执行时间、结果）
- **监控**：state.json变更历史记录在changeHistory字段
- **可测试性**：每个命令提供测试用例（模拟命令输入，验证state.json变更）

### 6.4 安全性要求

- **权限控制**：仅项目所有者可执行命令（基于Claude CLI会话）
- **数据完整性**：state.json采用JSON Schema验证，防止非法写入

---

## 七、技术约束与依赖

### 7.1 技术栈要求

- **命令平台**：Claude CLI（Slash Commands机制）
- **命令定义**：Markdown格式（`.claude/commands/*.md`）
- **状态管理**：JSON格式（`.solodev/state.json`）
- **版本控制**：Git（自动提交状态变更）

### 7.2 兼容性要求

- **Claude CLI版本**：兼容当前最新版本（2025年12月）
- **Slash Commands特性**：依赖Claude CLI的Slash Commands功能
- **文件系统**：支持Windows/macOS/Linux文件路径

### 7.3 依赖关系

| 依赖模块       | 依赖原因                     | 集成方式           |
| -------------- | ---------------------------- | ------------------ |
| **状态管理模块** | 读取/写入state.json          | 直接文件操作       |
| **核心流程模型** | 理解阶段划分和流程规则       | 概念依赖           |
| **Git集成模块** | 自动提交状态变更             | Git命令调用        |

**完整依赖关系详见**：docs/architecture/iteration-1/04-模块集成设计.md

---

## 八、迭代规划

### 8.1 Iteration 1 (MVP)

- **目标**：实现7个核心命令，支持完整的5阶段工作流
- **功能范围**：
  - `/start-requirements`、`/approve-requirements`
  - `/start-architecture`、`/approve-architecture`
  - `/start-implementation`
  - `/start-testing`
  - `/start-deployment`
- **验收标准**：
  - 所有命令可正常执行
  - 状态检查和审批点机制生效
  - Git自动提交正常工作

### 8.2 Iteration 2（未来增强）

- **目标**：增加命令参数支持、命令别名、命令组合
- **功能范围**：
  - 命令参数（如 `--skip-approval`、`--module=模块名`）
  - 命令别名（如 `/req` = `/start-requirements`）
  - 命令组合（如 `/full-cycle` = 依次执行所有阶段命令）
- **验收标准**：
  - 参数验证和帮助文档完善
  - 命令别名正常解析
  - 命令组合支持中断和恢复

---

**文档版本历史**

| 版本  | 日期       | 修改内容               | 修改人 |
| ----- | ---------- | ---------------------- | ------ |
| v1.0  | 2025-12-14 | 初始版本，需求确认完成 | Claude AI |
