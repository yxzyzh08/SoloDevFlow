#!/usr/bin/env node

/**
 * 命令体系模块 - CLI 入口
 *
 * 提供命令行界面来执行命令
 *
 * @module command-system/cli
 */

// @integration 状态管理模块.StateManager
import { StateManager } from '../state-management/api/state-manager.js';
import { createCommandRegistry } from './registry.js';
import { createCommandExecutor } from './executor.js';
import { registerAllCommands } from './commands/index.js';

/**
 * 主函数
 */
async function main() {
  try {
    // 获取命令行参数
    const args = process.argv.slice(2);

    if (args.length === 0) {
      printUsage();
      process.exit(0);
    }

    // 构建命令字符串
    const commandInput = args.join(' ');

    // 如果不是以 / 开头，添加 /
    const fullCommand = commandInput.startsWith('/') ? commandInput : `/${commandInput}`;

    // 创建命令注册表并注册所有命令
    const registry = createCommandRegistry();
    registerAllCommands(registry);

    // 创建命令执行器
    const executor = createCommandExecutor({
      registry,
      loadState: async () => {
        try {
          const stateManager = new StateManager();
          return await stateManager.getState();
        } catch (error) {
          // state.json 不存在时返回 undefined（用于 /init 命令）
          return undefined;
        }
      }
    });

    // 执行命令
    const result = await executor.execute(fullCommand);

    // 输出结果
    if (result.success) {
      console.log('\n✅ 成功\n');
      console.log(result.message);

      if (result.details) {
        console.log('\n详细信息:');
        console.log(JSON.stringify(result.details, null, 2));
      }

      if (result.nextAction) {
        console.log('\n💡 下一步建议:');
        console.log(result.nextAction);
      }

      process.exit(0);
    } else {
      console.error('\n❌ 失败\n');
      console.error(result.message);

      if (result.details) {
        console.error('\n详细信息:');
        console.error(JSON.stringify(result.details, null, 2));
      }

      if (result.error) {
        console.error('\n错误堆栈:');
        console.error(result.error.stack);
      }

      if (result.nextAction) {
        console.error('\n💡 建议:');
        console.error(result.nextAction);
      }

      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ 系统错误\n');
    console.error(error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      console.error('\n错误堆栈:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

/**
 * 打印使用说明
 */
function printUsage() {
  console.log(`
SoloDevFlow 命令行工具
=====================

用法:
  solodev <命令> [参数...]

可用命令:
  init <project-name> [--description <描述>]
    初始化新项目

  start-requirements
    开始需求分析阶段

  start-architecture
    开始架构设计阶段

  start-implementation
    开始代码实现阶段

  start-testing
    开始测试阶段

  start-deployment
    开始部署阶段

  approve [目标]
    审批阶段或模块
    - 不指定目标: 审批当前阶段
    - 指定阶段名: 审批指定阶段
    - 指定模块名: 审批指定模块

  rollback <target-phase> <reason>
    回滚到指定阶段
    - target-phase: requirements, architecture, implementation
    - reason: 回滚原因

  status
    显示项目当前状态

示例:
  solodev init "我的项目" --description "这是一个测试项目"
  solodev start-requirements
  solodev approve
  solodev approve 状态管理模块
  solodev rollback architecture "发现架构设计问题"
  solodev status

注意:
  - 命令可以省略前缀 /
  - 参数可以使用位置参数或命名参数（--name value）
`);
}

// 运行主函数
main();
