# 代码规范指南（Code Standards）

> 本指南详细说明代码编写规范，特别是@integration集成点标注规范（implementation阶段必读）

---

## 一、集成点标注规范

### 强制要求

**所有调用外部模块的代码必须添加 `@integration` 标注**

这是影响分析模块的核心依赖，用于：
- AI快速定位集成点调用位置
- 影响分析时追溯受影响代码
- 依赖关系验证

### 标注格式

```typescript
// @integration [目标模块].[接口名称]
const result = await targetModuleMethod(...);
```

**格式说明**：
- 必须是单行注释（`//`）
- 关键字：`@integration`
- 格式：`[模块名].[接口名]`
- 位置：紧邻调用语句的上一行

---

## 二、标注示例

### 正确示例

```typescript
// src/order/createOrder.ts

export async function createOrder(userId: string, productId: string) {
  // @integration 用户模块.getUserInfo
  const user = await getUserInfo(userId);

  // @integration 库存模块.checkStock
  const stockAvailable = await checkStock(productId);

  if (!stockAvailable) {
    throw new OutOfStockError();
  }

  // @integration 支付模块.createPayment
  const payment = await createPayment({
    userId,
    amount: calculateAmount(productId)
  });

  // 创建订单（内部逻辑，无需标注）
  const order = {
    userId: user.id,
    productId,
    amount: payment.amount,
    status: 'pending'
  };

  return await saveOrder(order);
}
```

### 错误示例

```typescript
// ❌ 错误1：缺少标注
const user = await getUserInfo(userId);

// ❌ 错误2：格式错误（缺少模块名）
// @integration getUserInfo
const user = await getUserInfo(userId);

// ❌ 错误3：标注位置错误（不在调用上方）
const user = await getUserInfo(userId); // @integration 用户模块.getUserInfo

// ❌ 错误4：多行注释
/*
 * @integration 用户模块.getUserInfo
 */
const user = await getUserInfo(userId);
```

---

## 三、模块名称规范

**模块名称必须与 state.json 中的模块名称一致**

```json
// state.json
{
  "moduleDependencies": {
    "订单模块": {
      "integrationPoints": [
        {
          "targetModule": "用户模块",  // 使用此名称
          "interface": "getUserInfo"
        }
      ]
    }
  }
}
```

```typescript
// 代码中使用相同的模块名称
// @integration 用户模块.getUserInfo  ✓ 正确
// @integration UserModule.getUserInfo  ✗ 错误（模块名不一致）
```

---

## 四、何时需要标注

### 需要标注的场景

✅ **调用其他模块的公开接口**：
```typescript
// @integration 用户模块.getUserInfo
const user = await getUserInfo(userId);
```

✅ **调用其他模块的服务类**：
```typescript
// @integration 支付模块.PaymentService.create
const payment = await PaymentService.create({...});
```

✅ **调用其他模块的工具函数（如果跨模块）**：
```typescript
// @integration 工具模块.formatDate
const formattedDate = formatDate(new Date());
```

### 无需标注的场景

❌ **模块内部函数调用**：
```typescript
// 同一模块内的函数调用，无需标注
const total = calculateTotal(items);
```

❌ **第三方库调用**：
```typescript
// 第三方npm包，无需标注
import axios from 'axios';
const response = await axios.get(url);
```

❌ **Node.js内置模块**：
```typescript
// Node.js内置模块，无需标注
import fs from 'fs';
const content = fs.readFileSync(filePath);
```

❌ **数据库直接查询**（非跨模块）：
```typescript
// 直接查询数据库，无需标注
const orders = await db.query('SELECT * FROM orders');
```

---

## 五、AI实现代码时的职责

**强制要求**：AI在实现代码时必须自动添加 `@integration` 标注

**实现流程**：
```
步骤1: AI读取 state.json 的 integrationPoints
  → 知道订单模块需要调用 getUserInfo

步骤2: AI生成代码时，自动添加标注
  // @integration 用户模块.getUserInfo
  const user = await getUserInfo(userId);

步骤3: AI自检（可选）
  → 检查是否所有外部调用都有标注
  → 检查标注格式是否正确
```

---

## 六、标注验证（v2.0演进）

**未来可能的验证机制**：

```bash
# 检查缺失的标注
grep -r "await.*Service\." src/ | grep -v "@integration"

# 检查标注格式
grep -r "@integration" src/ | grep -v "@integration [^.]*\.[^.]*$"
```

**集成到CI/CD**：
- pre-commit hook 检查标注完整性
- 发现缺失标注时阻止提交

---

## 七、标注的使用场景

### 场景1：AI影响分析

```
用户修改：用户模块的 getUserInfo 接口签名变化

AI分析流程：
步骤1: 读取 state.json
  → 发现"订单模块"依赖"用户模块.getUserInfo"

步骤2: 使用 grep 搜索代码标注
  grep -r "@integration 用户模块.getUserInfo" src/

  结果：
  src/order/createOrder.ts:12
  src/order/orderService.ts:45
  src/report/userReport.ts:23

步骤3: 读取这些文件，分析调用上下文

步骤4: 生成待办任务
  - [ ] 检查 src/order/createOrder.ts:12 的getUserInfo调用
  - [ ] 检查 src/order/orderService.ts:45 的getUserInfo调用
  - [ ] 检查 src/report/userReport.ts:23 的getUserInfo调用
```

### 场景2：依赖关系验证

```
架构设计声明：订单模块依赖用户模块.getUserInfo

实现验证：
步骤1: grep 搜索代码标注
  grep -r "@integration 用户模块" src/order/

  结果：
  @integration 用户模块.getUserInfo  ✓
  @integration 用户模块.validateUser  ✗ 架构中未声明！

步骤2: AI提示
  "发现未声明的集成点：用户模块.validateUser
   建议回滚到架构阶段补充设计"
```

---

## 八、实践原则

### 1. 标注即文档

```
✅ 正确做法：
- 代码标注清晰标识了模块间依赖
- 任何人读代码时能快速识别外部调用

❌ 错误做法：
- 缺少标注，无法区分内部调用和外部调用
- 影响分析时需要人工查找
```

### 2. 标注与state.json保持一致

```
✅ 正确做法：
- 架构设计阶段在state.json中声明集成点
- 实现阶段代码标注使用相同的模块名和接口名

❌ 错误做法：
- state.json中声明"用户模块.getUserInfo"
- 代码标注写成"UserModule.getUserInfo"
- 导致AI无法匹配
```

### 3. 发现遗漏立即回滚

```
✅ 正确做法：
- 实现阶段发现需要调用架构中未声明的接口
- 立即停止实现，回滚到架构阶段补充设计
- 更新state.json和架构文档后继续实现

❌ 错误做法：
- 直接添加调用，不更新架构设计
- 导致架构文档与实际代码不一致
```
