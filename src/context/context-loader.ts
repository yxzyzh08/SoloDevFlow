/**
 * 上下文加载模块
 *
 * 实现PRD 3.5 上下文加载能力
 * 提供 getContextForPhase 和 getContextForModule 接口
 *
 * @module context-loader
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ===========================================
// 类型定义
// ===========================================

/** 阶段类型 */
export type Phase = 'requirements' | 'architecture' | 'implementation' | 'testing' | 'deployment';

/** 上下文加载结果 */
export interface ContextResult {
  /** 是否成功获取上下文 */
  success: boolean;
  /** 需要加载的文件路径列表 */
  files: string[];
  /** 需要加载的模板 */
  templates: string[];
  /** 需要读取的state.json字段 */
  stateFields: string[];
  /** 上下文描述（供AI理解） */
  description: string;
  /** 非阻断性警告 */
  warnings?: string[];
  /** 阻断性错误 */
  error?: string;
}

/** 模块依赖信息 */
interface ModuleDependency {
  dependsOn: string[];
  dependedBy: string[];
  integrationPoints?: unknown[];
}

/** 模块状态 */
interface ModuleStatus {
  status: 'pending' | 'in_progress' | 'approved' | 'completed';
  artifacts?: string[];
}

/** State.json 迭代信息 */
interface IterationInfo {
  currentPhase: Phase;
  phases: {
    [key: string]: {
      status: string;
      modules?: {
        [moduleName: string]: ModuleStatus;
      };
    };
  };
}

/** State.json 结构（简化版） */
interface StateJSON {
  project: {
    name: string;
  };
  currentIteration: string;
  iterations: {
    [key: string]: IterationInfo;
  };
  moduleDependencies: {
    [moduleName: string]: ModuleDependency;
  };
}

// ===========================================
// 常量定义
// ===========================================

/** 有效阶段列表 */
const VALID_PHASES: Phase[] = ['requirements', 'architecture', 'implementation', 'testing', 'deployment'];

/** 阶段级上下文规则 */
const PHASE_CONTEXT_RULES: Record<Phase, {
  stateFields: string[];
  templates: string[];
  description: string;
}> = {
  requirements: {
    stateFields: ['project', 'currentIteration', 'iterations.*.phases.requirements'],
    templates: ['.solodev/templates/PRD-project-template.md', '.solodev/templates/PRD-module-template.md'],
    description: '需求阶段：加载PRD模板和项目状态，用于需求澄清和PRD编写'
  },
  architecture: {
    stateFields: ['project', 'currentIteration', 'iterations.*.phases.requirements', 'iterations.*.phases.architecture', 'moduleDependencies'],
    templates: ['.solodev/templates/架构-系统总览-template.md', '.solodev/templates/架构-数据模型-template.md', '.solodev/templates/架构-集成设计-template.md'],
    description: '架构阶段：加载已审批PRD、架构模板和模块依赖，用于架构设计'
  },
  implementation: {
    stateFields: ['project', 'currentIteration', 'iterations.*.phases.architecture', 'iterations.*.phases.implementation', 'moduleDependencies'],
    templates: [],
    description: '实现阶段：加载已审批架构文档和代码模板，用于代码实现'
  },
  testing: {
    stateFields: ['project', 'currentIteration', 'iterations.*.phases.requirements', 'iterations.*.phases.architecture', 'iterations.*.phases.testing'],
    templates: ['.solodev/templates/测试-E2E测试计划-template.md', '.solodev/templates/测试-性能测试方案-template.md'],
    description: '测试阶段：加载PRD验收标准、架构文档和测试模板，用于测试设计和执行'
  },
  deployment: {
    stateFields: ['project', 'currentIteration', 'iterations.*.phases.deployment'],
    templates: ['.solodev/templates/部署-部署计划-template.md', '.solodev/templates/部署-发布检查清单-template.md'],
    description: '部署阶段：加载架构文档和部署模板，用于部署计划编写'
  }
};

// ===========================================
// 辅助函数
// ===========================================

/**
 * 读取state.json
 */
function readState(projectRoot: string): StateJSON | null {
  const statePath = path.join(projectRoot, '.solodev', 'state.json');
  if (!fs.existsSync(statePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    return JSON.parse(content) as StateJSON;
  } catch {
    return null;
  }
}

/**
 * 获取已审批的模块列表
 */
function getApprovedModules(state: StateJSON, phase: Phase): string[] {
  const currentIteration = state.iterations[state.currentIteration];
  if (!currentIteration) return [];

  const phaseData = currentIteration.phases[phase];
  if (!phaseData || !phaseData.modules) return [];

  return Object.entries(phaseData.modules)
    .filter(([_, info]) => info.status === 'approved')
    .map(([name, _]) => name);
}

/**
 * 获取模块的依赖模块列表
 */
function getModuleDependencies(state: StateJSON, moduleName: string): string[] {
  const deps = state.moduleDependencies[moduleName];
  return deps?.dependsOn || [];
}

/**
 * 检查模块是否有效
 */
function isValidModule(state: StateJSON, moduleName: string): boolean {
  return moduleName in state.moduleDependencies;
}

/**
 * 获取模块的文档路径列表
 */
function getModuleFiles(projectRoot: string, moduleName: string, phase: Phase, currentIteration: string): string[] {
  const files: string[] = [];
  const iterationPath = `docs/${phase === 'requirements' ? 'PRD' : phase}/iteration-${currentIteration.split('-')[1] || '1'}`;

  // PRD文档
  const prdPath = path.join(projectRoot, 'docs', 'PRD', 'modules', `${moduleName}-PRD.md`);
  if (fs.existsSync(prdPath)) {
    files.push(prdPath);
  }

  // 架构文档
  if (phase !== 'requirements') {
    const archDir = path.join(projectRoot, 'docs', 'architecture', `iteration-${currentIteration.split('-')[1] || '1'}`);
    if (fs.existsSync(archDir)) {
      const archFiles = fs.readdirSync(archDir)
        .filter(f => f.startsWith(moduleName) && f.endsWith('.md'))
        .map(f => path.join(archDir, f));
      files.push(...archFiles);
    }
  }

  return files;
}

/**
 * 获取模板文件路径
 */
function getTemplateFiles(projectRoot: string, templates: string[]): string[] {
  return templates
    .map(t => path.join(projectRoot, t))
    .filter(f => fs.existsSync(f));
}

// ===========================================
// 主要接口实现
// ===========================================

/**
 * 获取阶段级上下文
 *
 * @param phase - 阶段名称
 * @param projectRoot - 项目根目录（默认为当前目录）
 * @returns ContextResult
 */
export function getContextForPhase(phase: Phase, projectRoot: string = process.cwd()): ContextResult {
  // 验证阶段有效性
  if (!VALID_PHASES.includes(phase)) {
    return {
      success: false,
      files: [],
      templates: [],
      stateFields: [],
      description: '',
      error: `阶段名无效: ${phase}`
    };
  }

  // 读取state.json
  const state = readState(projectRoot);
  if (!state) {
    return {
      success: false,
      files: [],
      templates: [],
      stateFields: [],
      description: '',
      error: 'state.json 不存在或格式错误'
    };
  }

  const rules = PHASE_CONTEXT_RULES[phase];
  const files: string[] = [];
  const warnings: string[] = [];

  // 添加state.json
  files.push(path.join(projectRoot, '.solodev', 'state.json'));

  // 获取模板文件
  const templates = getTemplateFiles(projectRoot, rules.templates);

  // 获取已审批模块的文档
  if (phase !== 'requirements') {
    const approvedModules = getApprovedModules(state, phase === 'architecture' ? 'requirements' : 'architecture');
    for (const moduleName of approvedModules) {
      const moduleFiles = getModuleFiles(projectRoot, moduleName, phase, state.currentIteration);
      files.push(...moduleFiles);
    }
  }

  return {
    success: true,
    files,
    templates,
    stateFields: rules.stateFields,
    description: rules.description,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * 获取模块级上下文（更精确）
 *
 * 模块级上下文 = 基础上下文(阶段级) + 当前模块文档 + 依赖模块文档(仅approved)
 *
 * @param module - 模块名称
 * @param phase - 阶段名称
 * @param projectRoot - 项目根目录（默认为当前目录）
 * @returns ContextResult
 */
export function getContextForModule(module: string, phase: Phase, projectRoot: string = process.cwd()): ContextResult {
  // 验证阶段有效性
  if (!VALID_PHASES.includes(phase)) {
    return {
      success: false,
      files: [],
      templates: [],
      stateFields: [],
      description: '',
      error: `阶段名无效: ${phase}`
    };
  }

  // 读取state.json
  const state = readState(projectRoot);
  if (!state) {
    return {
      success: false,
      files: [],
      templates: [],
      stateFields: [],
      description: '',
      error: 'state.json 不存在或格式错误'
    };
  }

  // 验证模块有效性
  if (!isValidModule(state, module)) {
    return {
      success: false,
      files: [],
      templates: [],
      stateFields: [],
      description: '',
      error: `模块名无效: ${module}`
    };
  }

  const rules = PHASE_CONTEXT_RULES[phase];
  const files: string[] = [];
  const warnings: string[] = [];

  // 添加state.json
  files.push(path.join(projectRoot, '.solodev', 'state.json'));

  // 获取模板文件
  const templates = getTemplateFiles(projectRoot, rules.templates);

  // 1. 添加当前模块文档
  const currentModuleFiles = getModuleFiles(projectRoot, module, phase, state.currentIteration);
  files.push(...currentModuleFiles);

  // 2. 添加依赖模块文档（仅approved）
  const dependencies = getModuleDependencies(state, module);
  const approvedModules = phase === 'requirements'
    ? []
    : getApprovedModules(state, phase === 'architecture' ? 'requirements' : 'architecture');

  for (const depModule of dependencies) {
    // 检查依赖模块是否approved
    if (phase !== 'requirements') {
      if (!approvedModules.includes(depModule)) {
        // 检查是否存在但未approved
        const currentIteration = state.iterations[state.currentIteration];
        const targetPhase = phase === 'architecture' ? 'requirements' : 'architecture';
        const phaseData = currentIteration?.phases[targetPhase];
        const moduleInfo = phaseData?.modules?.[depModule];

        if (moduleInfo) {
          warnings.push(`依赖模块'${depModule}'的${targetPhase === 'requirements' ? 'PRD' : '架构文档'}尚未审批通过，已跳过`);
        } else {
          warnings.push(`依赖模块'${depModule}'的${targetPhase === 'requirements' ? 'PRD' : '架构文档'}尚未完成，已跳过`);
        }
        continue;
      }
    }

    const depFiles = getModuleFiles(projectRoot, depModule, phase, state.currentIteration);
    files.push(...depFiles);
  }

  // 去重文件列表
  const uniqueFiles = [...new Set(files)];

  return {
    success: true,
    files: uniqueFiles,
    templates,
    stateFields: rules.stateFields,
    description: `${rules.description}\n当前模块: ${module}`,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

// ===========================================
// CLI 入口
// ===========================================

/**
 * CLI主函数
 */
function main(): void {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📂 SoloDevFlow 上下文加载器');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (command === 'phase') {
    const phase = args[1] as Phase;
    if (!phase) {
      console.error('用法: npx tsx src/context/context-loader.ts phase <阶段名>');
      console.error('阶段: requirements | architecture | implementation | testing | deployment');
      process.exit(1);
    }
    const result = getContextForPhase(phase);
    console.log(JSON.stringify(result, null, 2));
  } else if (command === 'module') {
    const moduleName = args[1];
    const phase = args[2] as Phase;
    if (!moduleName || !phase) {
      console.error('用法: npx tsx src/context/context-loader.ts module <模块名> <阶段名>');
      process.exit(1);
    }
    const result = getContextForModule(moduleName, phase);
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('用法:');
    console.log('  npx tsx src/context/context-loader.ts phase <阶段名>');
    console.log('  npx tsx src/context/context-loader.ts module <模块名> <阶段名>');
    console.log('\n阶段: requirements | architecture | implementation | testing | deployment');
  }
}

// ES Module方式检测是否为入口文件
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename || process.argv[1]?.endsWith('context-loader.ts')) {
  main();
}
