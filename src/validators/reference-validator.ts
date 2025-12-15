/**
 * Reference Validator - 文档引用验证器
 *
 * 实现PRD 4.4：文档引用验证功能
 * - 规则1：文件存在性检查
 * - 规则2：章节ID存在性检查
 * - 规则3：必须章节ID检查
 * - 规则4：内容一致性检查（简化版本，仅检查引用）
 * - 规则5：ID唯一性检查
 *
 * @module validators/reference-validator
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ===== 类型定义 =====

/**
 * 文档引用信息
 */
export interface DocumentReference {
  sourceFile: string;
  sourceLine: number;
  targetFile: string;
  targetSection?: string;
  referenceText: string;
}

/**
 * 章节ID信息
 */
export interface SectionIdInfo {
  file: string;
  sectionName: string;
  lineNumber: number;
  id: string;
}

/**
 * 缺失ID信息
 */
export interface MissingSectionInfo {
  file: string;
  sectionName: string;
  lineNumber: number;
  requiredId: string;
}

/**
 * 重复ID信息
 */
export interface DuplicateIdInfo {
  id: string;
  occurrences: {
    file: string;
    lineNumber: number;
    sectionName: string;
  }[];
}

/**
 * 验证结果
 */
export interface ReferenceValidationResult {
  valid: boolean;
  summary: {
    totalReferences: number;
    validReferences: number;
    brokenFiles: number;
    brokenSections: number;
    missingIds: number;
    duplicateIds: number;
  };
  validRefs: DocumentReference[];
  brokenFile: DocumentReference[];
  brokenSection: DocumentReference[];
  missingId: MissingSectionInfo[];
  duplicateId: DuplicateIdInfo[];
  allSectionIds: SectionIdInfo[];
}

// ===== 正则表达式 =====

// 匹配 Markdown 链接: [text](path) 或 [text](path#section)
const REFERENCE_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

// 匹配章节ID: {#id}
const SECTION_ID_REGEX = /\{#([^}]+)\}/g;

// 匹配标题: ## Title {#id} 或 ### 4.1 Title {#id}
const HEADING_WITH_ID_REGEX = /^(#{1,6})\s+(.+?)\s*\{#([^}]+)\}\s*$/;

// 匹配标题（不带ID）
const HEADING_REGEX = /^(#{1,6})\s+(.+?)\s*$/;

// ===== 必须标注ID的章节模式 =====

interface RequiredSectionPattern {
  filePattern: RegExp;
  sectionPatterns: {
    pattern: RegExp;
    idPrefix: string;
  }[];
}

const REQUIRED_SECTION_PATTERNS: RequiredSectionPattern[] = [
  // PRD模块文档
  {
    filePattern: /docs\/PRD\/modules\/.*-PRD\.md$/,
    sectionPatterns: [
      { pattern: /^#+\s*[\d.]*\s*(?:命令清单|接口清单|功能点清单|功能清单)/, idPrefix: 'prd-' },
      { pattern: /^#+\s*[\d.]*\s*数据模型/, idPrefix: 'prd-' },
      { pattern: /^#+\s*[\d.]*\s*(?:验收标准|用户故事与验收标准)/, idPrefix: 'prd-' },
    ]
  },
  // 架构文档-系统总览
  {
    filePattern: /docs\/architecture\/.*-00-系统架构总览\.md$/,
    sectionPatterns: [
      { pattern: /^#+\s*[\d.]*\s*(?:技术架构|架构概述)/, idPrefix: 'arch-' },
      { pattern: /^#+\s*[\d.]*\s*对外接口/, idPrefix: 'arch-' },
    ]
  },
  // 架构文档-数据模型
  {
    filePattern: /docs\/architecture\/.*数据模型设计\.md$/,
    sectionPatterns: [
      { pattern: /^#+\s*[\d.]*\s*(?:Schema定义|类型定义|核心类型)/, idPrefix: 'arch-' },
    ]
  },
  // 架构文档-集成设计
  {
    filePattern: /docs\/architecture\/.*集成设计\.md$/,
    sectionPatterns: [
      { pattern: /^#+\s*[\d.]*\s*(?:接口定义|集成点)/, idPrefix: 'arch-' },
    ]
  },
];

// ===== 工具函数 =====

/**
 * 标记代码块中的行
 * 返回一个布尔数组，true表示该行在代码块内
 */
function markCodeBlockLines(content: string): boolean[] {
  const lines = content.split('\n');
  const inCodeBlock: boolean[] = new Array(lines.length).fill(false);
  let isInCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检测代码块开始/结束标记
    if (line.trim().startsWith('```')) {
      if (isInCodeBlock) {
        // 代码块结束（当前行也算在代码块内）
        inCodeBlock[i] = true;
        isInCodeBlock = false;
      } else {
        // 代码块开始
        isInCodeBlock = true;
        inCodeBlock[i] = true;
      }
    } else {
      inCodeBlock[i] = isInCodeBlock;
    }
  }

  return inCodeBlock;
}

// ===== 验证器实现 =====

/**
 * 扫描目录下的所有 Markdown 文件
 */
function scanMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    if (!fs.existsSync(currentDir)) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // 跳过 node_modules 和 .git
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          walk(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * 移除行内代码（反引号包裹的内容）
 */
function removeInlineCode(line: string): string {
  // 匹配单个反引号包裹的内容
  return line.replace(/`[^`]+`/g, '');
}

/**
 * 解析文件中的所有引用（跳过代码块和行内代码）
 */
function parseReferences(
  filePath: string,
  content: string
): DocumentReference[] {
  const references: DocumentReference[] = [];
  const lines = content.split('\n');
  const fileDir = path.dirname(filePath);
  const codeBlockLines = markCodeBlockLines(content);

  for (let i = 0; i < lines.length; i++) {
    // 跳过代码块内的行
    if (codeBlockLines[i]) {
      continue;
    }

    // 移除行内代码后再解析
    const line = removeInlineCode(lines[i]);
    let match: RegExpExecArray | null;

    // 重置正则表达式
    REFERENCE_REGEX.lastIndex = 0;

    while ((match = REFERENCE_REGEX.exec(line)) !== null) {
      const [fullMatch, text, href] = match;

      // 跳过外部链接
      if (href.startsWith('http://') || href.startsWith('https://')) {
        continue;
      }

      // 解析路径和章节
      const [targetPath, section] = href.split('#');

      // 跳过空路径（纯锚点链接）
      if (!targetPath) {
        continue;
      }

      // 计算绝对路径
      const absoluteTarget = path.resolve(fileDir, targetPath);

      references.push({
        sourceFile: filePath,
        sourceLine: i + 1,
        targetFile: absoluteTarget,
        targetSection: section,
        referenceText: fullMatch
      });
    }
  }

  return references;
}

/**
 * 解析文件中的所有章节ID（跳过代码块内的ID）
 */
function parseSectionIds(
  filePath: string,
  content: string
): SectionIdInfo[] {
  const sections: SectionIdInfo[] = [];
  const lines = content.split('\n');
  const codeBlockLines = markCodeBlockLines(content);

  for (let i = 0; i < lines.length; i++) {
    // 跳过代码块内的行
    if (codeBlockLines[i]) {
      continue;
    }

    const line = lines[i];
    const match = line.match(HEADING_WITH_ID_REGEX);

    if (match) {
      const [, , sectionName, id] = match;
      sections.push({
        file: filePath,
        sectionName: sectionName.trim(),
        lineNumber: i + 1,
        id
      });
    }
  }

  return sections;
}

/**
 * 检查必须标注ID的章节
 */
function checkRequiredSectionIds(
  filePath: string,
  content: string
): MissingSectionInfo[] {
  const missing: MissingSectionInfo[] = [];
  const lines = content.split('\n');

  // 找到匹配的文件模式
  const normalizedPath = filePath.replace(/\\/g, '/');
  const matchingPatterns = REQUIRED_SECTION_PATTERNS.filter(p =>
    p.filePattern.test(normalizedPath)
  );

  if (matchingPatterns.length === 0) {
    return missing;
  }

  // 检查每一行
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检查是否是标题
    const headingMatch = line.match(HEADING_REGEX);
    if (!headingMatch) continue;

    // 检查是否已有ID
    if (line.includes('{#')) continue;

    // 检查是否匹配必须标注ID的章节
    for (const pattern of matchingPatterns) {
      for (const sectionPattern of pattern.sectionPatterns) {
        if (sectionPattern.pattern.test(line)) {
          // 提取模块名
          const moduleMatch = normalizedPath.match(/\/([^/]+)-(?:PRD|00-系统架构总览|数据模型设计|集成设计)\.md$/);
          const moduleName = moduleMatch ? moduleMatch[1] : 'unknown';

          // 生成建议的ID
          const sectionName = headingMatch[2].replace(/[\d.]+\s*/, '').trim();
          const suggestedId = `${sectionPattern.idPrefix}${moduleName}-${sectionName}`;

          missing.push({
            file: filePath,
            sectionName: headingMatch[2].trim(),
            lineNumber: i + 1,
            requiredId: suggestedId
          });
        }
      }
    }
  }

  return missing;
}

/**
 * 检查ID唯一性
 */
function checkIdUniqueness(
  allSectionIds: SectionIdInfo[]
): DuplicateIdInfo[] {
  const idMap = new Map<string, SectionIdInfo[]>();

  // 按ID分组
  for (const section of allSectionIds) {
    const existing = idMap.get(section.id) || [];
    existing.push(section);
    idMap.set(section.id, existing);
  }

  // 找出重复的ID
  const duplicates: DuplicateIdInfo[] = [];
  for (const [id, occurrences] of idMap) {
    if (occurrences.length > 1) {
      duplicates.push({
        id,
        occurrences: occurrences.map(o => ({
          file: o.file,
          lineNumber: o.lineNumber,
          sectionName: o.sectionName
        }))
      });
    }
  }

  return duplicates;
}

/**
 * 检查文件中是否存在指定的章节ID
 */
function sectionIdExists(content: string, sectionId: string): boolean {
  return content.includes(`{#${sectionId}}`);
}

/**
 * 验证所有文档引用
 */
export function validateDocumentReferences(
  basePath: string = process.cwd()
): ReferenceValidationResult {
  const docsPath = path.join(basePath, 'docs');

  // 初始化结果
  const result: ReferenceValidationResult = {
    valid: true,
    summary: {
      totalReferences: 0,
      validReferences: 0,
      brokenFiles: 0,
      brokenSections: 0,
      missingIds: 0,
      duplicateIds: 0
    },
    validRefs: [],
    brokenFile: [],
    brokenSection: [],
    missingId: [],
    duplicateId: [],
    allSectionIds: []
  };

  // 如果docs目录不存在，直接返回
  if (!fs.existsSync(docsPath)) {
    result.valid = false;
    return result;
  }

  // 扫描所有Markdown文件
  const mdFiles = scanMarkdownFiles(docsPath);

  // 收集所有引用和章节ID
  const allReferences: DocumentReference[] = [];
  const fileContents = new Map<string, string>();

  for (const file of mdFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    fileContents.set(file, content);

    // 解析引用
    const refs = parseReferences(file, content);
    allReferences.push(...refs);

    // 解析章节ID
    const sections = parseSectionIds(file, content);
    result.allSectionIds.push(...sections);

    // 检查必须标注ID的章节
    const missingIds = checkRequiredSectionIds(file, content);
    result.missingId.push(...missingIds);
  }

  // 检查ID唯一性
  result.duplicateId = checkIdUniqueness(result.allSectionIds);

  // 验证每个引用
  for (const ref of allReferences) {
    result.summary.totalReferences++;

    // 规则1：检查文件是否存在
    if (!fs.existsSync(ref.targetFile)) {
      result.brokenFile.push(ref);
      result.summary.brokenFiles++;
      continue;
    }

    // 规则2：如果有章节引用，检查章节是否存在
    if (ref.targetSection) {
      const targetContent = fileContents.get(ref.targetFile) ||
        fs.readFileSync(ref.targetFile, 'utf-8');

      if (!sectionIdExists(targetContent, ref.targetSection)) {
        result.brokenSection.push(ref);
        result.summary.brokenSections++;
        continue;
      }
    }

    // 引用有效
    result.validRefs.push(ref);
    result.summary.validReferences++;
  }

  // 更新汇总信息
  result.summary.missingIds = result.missingId.length;
  result.summary.duplicateIds = result.duplicateId.length;

  // 判断是否通过
  // brokenFile 和 brokenSection 是错误（阻断）
  // missingId 和 duplicateId 是警告
  result.valid =
    result.brokenFile.length === 0 &&
    result.brokenSection.length === 0 &&
    result.duplicateId.length === 0;

  return result;
}

/**
 * 格式化验证结果为可读输出
 */
export function formatReferenceValidationResult(
  result: ReferenceValidationResult
): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push('✅ 文档引用验证通过');
  } else {
    lines.push('❌ 文档引用验证失败');
  }

  // 汇总信息
  lines.push('');
  lines.push('📊 验证汇总:');
  lines.push(`  总引用数: ${result.summary.totalReferences}`);
  lines.push(`  有效引用: ${result.summary.validReferences}`);
  lines.push(`  文件不存在: ${result.summary.brokenFiles}`);
  lines.push(`  章节不存在: ${result.summary.brokenSections}`);
  lines.push(`  缺失ID: ${result.summary.missingIds}`);
  lines.push(`  重复ID: ${result.summary.duplicateIds}`);

  // 输出错误：文件不存在
  if (result.brokenFile.length > 0) {
    lines.push('');
    lines.push('❌ 文件引用错误 (被引用文件不存在):');
    for (const ref of result.brokenFile) {
      lines.push(`  ${ref.sourceFile}:${ref.sourceLine}`);
      lines.push(`    引用: ${ref.referenceText}`);
      lines.push(`    目标: ${ref.targetFile}`);
    }
  }

  // 输出错误：章节不存在
  if (result.brokenSection.length > 0) {
    lines.push('');
    lines.push('❌ 章节引用错误 (章节ID不存在):');
    for (const ref of result.brokenSection) {
      lines.push(`  ${ref.sourceFile}:${ref.sourceLine}`);
      lines.push(`    引用: ${ref.referenceText}`);
      lines.push(`    目标章节: #${ref.targetSection}`);
    }
  }

  // 输出错误：重复ID
  if (result.duplicateId.length > 0) {
    lines.push('');
    lines.push('❌ 重复ID错误:');
    for (const dup of result.duplicateId) {
      lines.push(`  ID: {#${dup.id}}`);
      for (const occ of dup.occurrences) {
        lines.push(`    - ${occ.file}:${occ.lineNumber} (${occ.sectionName})`);
      }
    }
  }

  // 输出警告：缺失ID
  if (result.missingId.length > 0) {
    lines.push('');
    lines.push('⚠️ 缺失章节ID警告 (建议补充):');
    for (const missing of result.missingId) {
      lines.push(`  ${missing.file}:${missing.lineNumber}`);
      lines.push(`    章节: ${missing.sectionName}`);
      lines.push(`    建议ID: {#${missing.requiredId}}`);
    }
  }

  return lines.join('\n');
}
