# 自举工作流程指南（Bootstrap Workflow）

> 本指南详细说明自举阶段的特殊工作流程：功能完成后如何集成到工作流程中

---

## 一、核心理念

### 自举的本质

**定义**：用系统自身来开发系统本身

**本项目的自举特性**：
- 开发一个AI开发助手工具
- 用这个工具本身来辅助开发这个工具
- 每完成一个功能，立即用这个功能来开发后续功能

### 关键矛盾

```
完成一个功能 → 立即要用这个功能来开发后续功能
    ↓                    ↓
需要代码实现      需要规范文档化，让AI知道如何使用
```

**解决方案**：标准化的自举工作流程（4步）

### 与普通项目的区别

| 维度 | 普通项目 | 自举项目（本项目） |
|------|----------|-------------------|
| **开发流程** | Requirements → Architecture → Implementation → Testing → Deployment | 同左，但每个功能完成后需要额外的集成步骤 |
| **功能使用者** | 最终用户 | **AI自己**（在后续开发中使用） |
| **文档化时机** | 项目完成后 | **功能完成后立即文档化** |
| **规范更新频率** | 迭代间 | **迭代内高频更新** |
| **验证方式** | 用户验证 | **AI使用验证** |
| **文档重要性** | 用户手册 | **AI工作规范**（决定AI能否使用功能） |

---

## 二、标准流程详解

### 适用范围

**所有功能性特性**：
- ✅ 验证器（如state.json验证器、文档引用验证器）
- ✅ 命令（如/start-requirements、/approve等）
- ✅ 工具函数（如模板填充引擎、上下文加载器）
- ✅ CLI接口（如npm run validate:state）

**不适用**：
- ❌ 纯规范约定（如Git集成规范、影响分析规范）
- ❌ 文档更新（如PRD修订、架构补充）
- ❌ Bug修复（除非引入新功能）

### 标准流程（4步）

```
功能实现完成
  ↓
【步骤1】功能验证（使用即测试）
  ↓
【步骤2】规范文档化（4个文档位置）
  ↓
【步骤3】Git提交（workflow_integration类型）
  ↓
【步骤4】验证集成效果（AI能否使用）
```

---

## 三、步骤1：功能验证

### 验证标准

**功能可用，无明显Bug**

### 验证方式（根据功能类型选择）

#### 验证器类功能

**执行npm命令验证**：

```bash
# 示例：验证state.json验证器
npm run validate:state

# 预期结果：
# ✅ state.json 验证通过
# 或
# ❌ 错误提示清晰、修复建议明确
```

#### 命令类功能

**手动执行命令验证**：

```bash
# 示例：验证/start-requirements命令
# （在AI会话中调用命令，观察行为）

# 预期结果：
# - 命令执行成功
# - state.json状态正确更新
# - 提示信息清晰
```

#### 工具函数类功能

**编写简单测试用例或手动调用**：

```typescript
// 示例：验证上下文加载器
import { getContextForPhase } from './context-loader';

const context = await getContextForPhase('requirements');
console.log(context);

// 预期结果：
// - 返回正确的上下文数据
// - 错误处理符合预期
```

### 验证通过标准

- ✅ 功能按预期工作
- ✅ 错误处理符合设计
- ✅ 输出格式正确
- ✅ 边界条件处理合理

---

## 四、步骤2：规范文档化（4个位置）

### 位置1：CLAUDE.md 核心工作流程

**何时更新**：功能影响核心工作流程时

**更新位置**：CLAUDE.md 第六节"核心工作流程摘要"

**更新内容**：
- 在相关流程中添加新步骤
- 示例：验证器完成后，在"会话开始流程"中新增验证步骤

**示例**：

```markdown
### 会话开始流程

\`\`\`
1. 验证 state.json 格式（npm run validate:state） ← 新增
   - 格式错误 → 显示修复建议，等待用户修复
   - 验证通过 → 继续
2. 读取 .solodev/state.json
3. 分析当前阶段（currentPhase）和当前进度
4. 加载对应阶段的专项指南（见 5.2 节）
5. 主动提示用户上次进度和建议的下一步行动
\`\`\`
```

**影响核心工作流程的功能示例**：
- state.json验证器 → 会话开始流程
- 文档引用验证器 → 文档生成流程
- 命令解析器 → 命令执行流程
- 上下文加载器 → 会话开始流程

---

### 位置2：相关专项指南

**何时更新**：功能属于某个专项指南范畴时

**更新位置**：`.claude/guides/[专项指南].md`

**更新内容**：
- 在对应专项指南中添加新功能说明
- 包含：功能介绍、使用方式、触发时机、注意事项

**示例**：

验证器完成后，在 `state-management.md` 中添加：

```markdown
## 八、状态验证

### 验证命令

\`\`\`bash
npm run validate:state   # 验证 state.json
npm run validate:refs    # 验证文档引用
npm run validate:all     # 全部验证
\`\`\`

### 验证时机

- ✅ 每次会话开始时（阻断性错误必须修复）
- ✅ state.json修改后
- ✅ 迭代完成前

### 验证规则

**格式验证**：
- JSON格式正确
- 必需字段完整
- 字段类型正确

**完整性验证**：
- 当前迭代存在
- 当前阶段有效
- 模块依赖关系完整

### 错误处理

**阻断性错误**（必须修复）：
- JSON格式错误
- 必需字段缺失
- 字段类型错误

**警告**（可继续，建议修复）：
- 可选字段缺失
- 格式建议
\`\`\`
```

**专项指南对应关系**：

| 功能类型 | 对应专项指南 |
|----------|-------------|
| 状态管理相关 | state-management.md |
| 文档模板相关 | template-usage.md |
| 代码实现相关 | code-standards.md |
| 测试相关 | testing-standards.md |
| Git相关 | git-integration.md |
| 自举流程相关 | bootstrap-workflow.md |

---

### 位置3：CLAUDE.md 关键原则总结

**何时更新**：功能引入新的工作原则时

**更新位置**：CLAUDE.md 第七节"关键原则总结"

**更新内容**：
- 新增原则类别（如"验证原则"）
- 添加4-6条具体原则

**示例**：

验证器完成后，新增：

```markdown
### 验证原则

- ✅ 会话开始时验证 state.json 格式（阻断性错误必须修复）
- ✅ 文档生成后验证引用关系（文件/章节错误必须修复）
- ✅ 缺失章节ID为警告（可继续，建议补充）
- ✅ 重复章节ID为错误（必须修复）

**验证命令**：
\`\`\`bash
npm run validate:state   # 验证 state.json
npm run validate:refs    # 验证文档引用
npm run validate:all     # 全部验证
\`\`\`
```

**原则编写要求**：
- 使用 ✅/❌ 标识正确/错误做法
- 简洁明了，一条原则一句话
- 必要时提供命令或示例
- 按重要性排序

---

### 位置4：package.json scripts（如适用）

**何时更新**：功能提供CLI命令时

**更新位置**：`package.json` 的 `scripts` 字段

**更新内容**：
- 添加npm script
- 使用清晰的命名
- 添加注释说明用途（如需要）

**示例**：

```json
{
  "scripts": {
    "validate:state": "npx tsx src/validators/cli.ts state",
    "validate:refs": "npx tsx src/validators/cli.ts refs",
    "validate:all": "npx tsx src/validators/cli.ts all"
  }
}
```

**命名规范**：
- 使用 `:` 分隔命名空间（如 `validate:state`）
- 动词开头（validate、build、test、deploy等）
- 简洁明了，见名知义

**不需要更新package.json的情况**：
- 纯内部函数（不对外提供CLI）
- 通过其他命令间接调用
- 非CLI功能

---

### 4个位置的协同更新策略

**选择原则**：

```
功能类型
  ↓
【判断1】是否影响核心工作流程？
  ├─ 是 → 更新CLAUDE.md核心工作流程
  └─ 否 → 跳过

【判断2】是否属于某个专项指南范畴？
  ├─ 是 → 更新对应专项指南
  └─ 否 → 跳过

【判断3】是否引入新的工作原则？
  ├─ 是 → 更新CLAUDE.md关键原则
  └─ 否 → 跳过

【判断4】是否提供CLI命令？
  ├─ 是 → 更新package.json
  └─ 否 → 跳过
```

**示例：state.json验证器**

| 位置 | 是否更新 | 理由 |
|------|----------|------|
| CLAUDE.md核心流程 | ✅ 是 | 影响"会话开始流程"（新增验证步骤） |
| state-management.md | ✅ 是 | 属于状态管理范畴 |
| CLAUDE.md关键原则 | ✅ 是 | 引入"验证原则"类别 |
| package.json | ✅ 是 | 提供 `npm run validate:state` 命令 |

**示例：上下文加载器**

| 位置 | 是否更新 | 理由 |
|------|----------|------|
| CLAUDE.md核心流程 | ✅ 是 | 影响"会话开始流程"（上下文加载） |
| state-management.md | ✅ 是 | 属于状态管理范畴 |
| CLAUDE.md关键原则 | ❌ 否 | 未引入新原则，遵循已有原则 |
| package.json | ❌ 否 | 内部函数，不提供CLI |

---

## 五、步骤3：Git提交

### Commit规范

**Type**：使用 `chore(bootstrap)`

**Message格式**：

```bash
git add [相关文件]
git commit -m "$(cat <<'EOF'
chore(bootstrap): 集成[功能名]到工作流程

更新内容：
- CLAUDE.md：[更新说明]
- [专项指南]：[更新说明]
- package.json：[新增命令]（如适用）

集成效果：
- AI现在可以在[场景]使用[功能]
- [功能]已成为标准工作流程的一部分

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

### 示例

**验证器集成的commit**：

```bash
git add CLAUDE.md .claude/guides/state-management.md package.json
git commit -m "$(cat <<'EOF'
chore(bootstrap): 集成state.json验证器到工作流程

更新内容：
- CLAUDE.md：会话开始流程新增验证步骤、关键原则新增验证原则
- state-management.md：新增第八节"状态验证"
- package.json：新增npm run validate:state命令

集成效果：
- AI现在在每次会话开始时自动验证state.json格式
- 阻断性错误会阻止会话继续，确保状态文件可靠性
- 验证器已成为标准工作流程的一部分

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

### changeHistory记录

**在state.json的changeHistory中添加记录**：

```json
{
  "timestamp": "2025-12-15T[当前时间]",
  "type": "workflow_integration",
  "description": "将[功能名]集成到工作流程",
  "changedBy": "ai",
  "changes": [
    {
      "field": "CLAUDE.md.会话开始流程",
      "from": "4步骤",
      "to": "5步骤（新增state.json验证）"
    },
    {
      "field": "state-management.md",
      "from": null,
      "to": "新增第八节：状态验证"
    }
  ],
  "artifacts": ["CLAUDE.md", "state-management.md", "package.json"]
}
```

**更多详细信息**：参见 `.claude/guides/git-integration.md`

---

## 六、步骤4：验证集成效果

### 验证方式

**AI自问自答**：通过回答以下问题验证规范是否清晰

### 验证问题

#### 问题1：新功能在哪个阶段使用？

**答案要求**：
- 明确说明适用阶段（所有阶段/特定阶段）
- 说明触发条件

**示例**：
```
state.json验证器：
- 适用阶段：所有阶段
- 触发条件：每次会话开始时自动触发
```

#### 问题2：如何触发/调用新功能？

**答案要求**：
- 说明调用方式（自动/手动/命令）
- 提供具体命令或代码示例

**示例**：
```
state.json验证器：
- 自动触发：会话开始时AI自动执行 npm run validate:state
- 手动触发：用户可以随时执行 npm run validate:state
```

#### 问题3：新功能的输入输出是什么？

**答案要求**：
- 明确输入参数
- 明确输出格式
- 说明成功/失败的返回值

**示例**：
```
state.json验证器：
- 输入：.solodev/state.json文件
- 输出：
  - 成功：✅ state.json 验证通过
  - 失败：❌ 错误提示 + 修复建议
```

#### 问题4：新功能失败时如何处理？

**答案要求**：
- 说明错误类型（阻断性/警告）
- 说明处理流程
- 提供修复指引

**示例**：
```
state.json验证器：
- 阻断性错误（格式错误）：
  - 显示错误详情和修复建议
  - 暂停会话，等待用户修复
  - 修复后重新验证
- 警告（可选字段缺失）：
  - 显示警告信息
  - 继续会话，建议后续修复
```

### 验证通过标准

- ✅ AI能够根据规范准确回答所有验证问题
- ✅ 规范清晰、无歧义
- ✅ AI在后续工作中能够正确使用新功能
- ✅ 用户能够通过查阅规范理解功能用途

### 验证失败的处理

**发现问题**：
- 规范描述不清晰
- 缺少关键信息
- AI无法理解如何使用

**处理方式**：
1. 完善文档说明
2. 增加示例
3. 补充注意事项
4. Git commit记录文档完善

---

## 七、实践原则

### 原则1：功能实现 ≠ 功能可用

**正确认知**：
```
代码实现完成 → 立即集成到工作流程 → 功能可用
                      ↓
              规范文档化是功能可用的前提
```

**错误认知**：
```
代码实现完成 = 功能可用
（忘记更新规范，导致AI不知道如何使用）
```

**示例**：
- ✅ 正确：验证器实现完成 → 更新CLAUDE.md + 专项指南 → AI在会话开始时自动使用
- ❌ 错误：验证器实现完成 → 未更新规范 → AI不知道有这个功能

---

### 原则2：规范更新是高频操作

**正确认知**：
```
Bootstrap阶段每完成一个功能都要更新规范
这是自举的核心特性，不是额外负担
```

**错误认知**：
```
规范更新是偶尔的、被动的
等多个功能完成后再统一更新
```

**对比**：

| 场景 | 正确做法 | 错误做法 |
|------|----------|----------|
| 完成验证器 | 立即集成规范 | 等到3个功能都完成再一起更新 |
| 完成命令 | 立即集成规范 | "先攒着，迭代结束再更新" |
| 完成工具函数 | 立即集成规范 | "小功能不用更新规范" |

---

### 原则3：4个位置协同更新

**正确做法**：
- 根据功能特性，在4个位置中选择合适的位置更新
- 确保AI从不同入口都能发现新功能

**错误做法**：
- 只更新一个位置
- 更新位置不合理

**示例**：

| 功能 | 应更新位置 | 常见错误 |
|------|-----------|----------|
| 验证器 | CLAUDE.md + 专项指南 + 原则 + package.json | 只更新专项指南，CLAUDE.md未提及 |
| 命令 | CLAUDE.md + 专项指南 + package.json | 只更新CLAUDE.md，专项指南未补充 |
| 工具函数 | CLAUDE.md + 专项指南 | 错误添加到package.json（内部函数不对外） |

---

### 原则4：集成验证是必需的

**正确做法**：
- 更新规范后，通过AI自问自答验证
- 确保规范清晰、无歧义

**错误做法**：
- 更新规范后不验证
- 假设AI自然会理解

**验证流程**：

```
更新规范
  ↓
AI自问自答（4个验证问题）
  ↓
【判断】AI能否准确回答？
  ├─ 能 → 集成完成
  └─ 不能 → 完善规范 → 重新验证
```

---

## 八、常见问题

### Q1: 如何判断哪些文档位置需要更新？

**A**: 使用4个判断步骤：

1. **是否影响核心工作流程？** → 更新CLAUDE.md核心流程
2. **是否属于某个专项指南范畴？** → 更新对应专项指南
3. **是否引入新的工作原则？** → 更新CLAUDE.md关键原则
4. **是否提供CLI命令？** → 更新package.json

通常，一个功能会更新2-4个位置。

---

### Q2: Git commit message如何写？

**A**: 遵循以下格式：

```
chore(bootstrap): 集成[功能名]到工作流程

更新内容：
- [文档1]：[更新说明]
- [文档2]：[更新说明]

集成效果：
- [效果描述1]
- [效果描述2]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**关键点**：
- Type固定使用 `chore(bootstrap)`
- Subject简洁描述集成的功能
- Body分为"更新内容"和"集成效果"两部分

---

### Q3: 如何验证AI能够使用新功能？

**A**: 通过AI自问自答4个问题：

1. 新功能在哪个阶段使用？
2. 如何触发/调用新功能？
3. 新功能的输入输出是什么？
4. 新功能失败时如何处理？

如果AI能够准确回答所有问题，说明规范清晰。

---

### Q4: 如果功能很小，是否可以跳过某些步骤？

**A**: 不建议。

**理由**：
- 自举阶段的所有功能都是为AI设计的
- 即使功能很小，AI也需要知道它的存在和使用方式
- 跳过步骤会导致AI"不知道"这个功能

**例外**：
- 纯Bug修复（不引入新功能）
- 代码重构（不改变对外接口）
- 文档错别字修正

---

### Q5: 如果发现集成后AI仍无法使用，怎么办？

**A**: 分析原因并改进：

**常见原因**：
1. 规范描述不清晰 → 完善描述，增加示例
2. 更新位置不合理 → 补充遗漏的文档位置
3. 验证问题设计不当 → 调整验证问题

**处理流程**：
```
发现问题 → 分析原因 → 完善规范 → 重新验证 → Git commit记录改进
```

---

### Q6: 自举功能清单在哪里查看？

**A**: 在 `state.json` 的 `bootstrap.features` 字段中。

**示例**：
```json
{
  "bootstrap": {
    "features": [
      {
        "name": "state.json验证器",
        "status": "已集成",
        "implementation": "completed",
        "documentation": "completed",
        "integration": "completed"
      }
    ]
  }
}
```

---

## 九、完整示例

### 示例：集成state.json验证器

#### 步骤1：功能验证

```bash
npm run validate:state
# ✅ state.json 验证通过
```

#### 步骤2：规范文档化

**更新CLAUDE.md**：
- 第六节"会话开始流程"：新增验证步骤
- 第七节"关键原则"：新增"验证原则"

**更新state-management.md**：
- 新增第八节"状态验证"

**更新package.json**：
- 新增 `validate:state` 脚本

#### 步骤3：Git提交

```bash
git add CLAUDE.md .claude/guides/state-management.md package.json .solodev/state.json
git commit -m "$(cat <<'EOF'
chore(bootstrap): 集成state.json验证器到工作流程

更新内容：
- CLAUDE.md：会话开始流程新增验证步骤、关键原则新增验证原则
- state-management.md：新增第八节"状态验证"
- package.json：新增npm run validate:state命令
- state.json：更新changeHistory和bootstrap.features

集成效果：
- AI现在在每次会话开始时自动验证state.json格式
- 阻断性错误会阻止会话继续，确保状态文件可靠性
- 验证器已成为标准工作流程的一部分

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

#### 步骤4：验证集成效果

**问题1**：新功能在哪个阶段使用？
- **答案**：所有阶段。每次会话开始时自动触发。

**问题2**：如何触发/调用新功能？
- **答案**：自动触发（会话开始时）或手动执行 `npm run validate:state`

**问题3**：新功能的输入输出是什么？
- **答案**：输入 `.solodev/state.json`，输出验证结果（通过/失败+修复建议）

**问题4**：新功能失败时如何处理？
- **答案**：阻断性错误暂停会话，显示修复建议，等待用户修复后继续。

✅ **验证通过**：AI能够准确回答所有问题，集成成功。

---

## 十、总结

**自举工作流程的核心价值**：
- 确保每个完成的功能立即可用
- AI能够在后续开发中使用新功能
- 避免"功能实现了但AI不知道"的问题

**记住4步流程**：
1. 功能验证（使用即测试）
2. 规范文档化（4个位置协同更新）
3. Git提交（workflow_integration类型）
4. 验证集成效果（AI自问自答）

**坚持4条原则**：
1. 功能实现 ≠ 功能可用（规范文档化是前提）
2. 规范更新是高频操作（每个功能完成后立即更新）
3. 多位置协同更新（确保AI从不同入口发现新功能）
4. 集成验证是必需的（AI自问自答验证）

---

**相关文档**：
- CLAUDE.md：第二.五节"自举阶段特殊规范"
- state.json：`bootstrap.features` 字段
- git-integration.md：Git提交规范详细说明
