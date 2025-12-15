/**
 * FileIO - 文件IO层
 *
 * 职责：
 * - 原子化的JSON文件读写操作
 * - 文件存在性检查
 * - 目录操作
 * - 文件复制/删除
 *
 * @module state-management/io/file-io
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================================================
// 错误类型
// ============================================================================

/**
 * 文件IO错误基类
 */
export class FileIOError extends Error {
  readonly code: string;
  readonly filePath: string;

  constructor(message: string, code: string, filePath: string) {
    super(message);
    this.name = 'FileIOError';
    this.code = code;
    this.filePath = filePath;
  }
}

/**
 * 文件读取错误
 */
export class FileReadError extends FileIOError {
  constructor(filePath: string, cause?: Error) {
    super(
      `无法读取文件: ${filePath}${cause ? ` (${cause.message})` : ''}`,
      'FILE_READ_ERROR',
      filePath
    );
    this.name = 'FileReadError';
  }
}

/**
 * 文件写入错误
 */
export class FileWriteError extends FileIOError {
  constructor(filePath: string, cause?: Error) {
    super(
      `无法写入文件: ${filePath}${cause ? ` (${cause.message})` : ''}`,
      'FILE_WRITE_ERROR',
      filePath
    );
    this.name = 'FileWriteError';
  }
}

/**
 * JSON解析错误
 */
export class JSONParseError extends FileIOError {
  readonly parseError: string;

  constructor(filePath: string, cause: Error) {
    super(
      `JSON解析失败: ${filePath} (${cause.message})`,
      'JSON_PARSE_ERROR',
      filePath
    );
    this.name = 'JSONParseError';
    this.parseError = cause.message;
  }
}

// ============================================================================
// FileIO 接口
// ============================================================================

export interface IFileIO {
  /**
   * 读取JSON文件
   */
  readJSON<T>(filePath: string): Promise<T>;

  /**
   * 写入JSON文件
   */
  writeJSON<T>(filePath: string, data: T): Promise<void>;

  /**
   * 读取原始文件内容
   */
  readRaw(filePath: string): Promise<string>;

  /**
   * 写入原始文件内容
   */
  writeRaw(filePath: string, content: string): Promise<void>;

  /**
   * 检查文件是否存在
   */
  exists(filePath: string): Promise<boolean>;

  /**
   * 获取文件状态
   */
  stat(filePath: string): Promise<fs.Stats>;

  /**
   * 确保目录存在
   */
  ensureDir(dirPath: string): Promise<void>;

  /**
   * 复制文件
   */
  copy(src: string, dest: string): Promise<void>;

  /**
   * 删除文件
   */
  delete(filePath: string): Promise<void>;
}

// ============================================================================
// FileIO 实现
// ============================================================================

/**
 * FileIO - 文件IO操作实现
 */
export class FileIO implements IFileIO {
  private readonly basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  /**
   * 解析相对路径为绝对路径
   */
  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.basePath, filePath);
  }

  /**
   * 读取JSON文件
   */
  async readJSON<T>(filePath: string): Promise<T> {
    const fullPath = this.resolvePath(filePath);

    try {
      const content = await fs.promises.readFile(fullPath, 'utf-8');

      try {
        return JSON.parse(content) as T;
      } catch (parseError) {
        throw new JSONParseError(fullPath, parseError as Error);
      }
    } catch (error) {
      if (error instanceof JSONParseError) {
        throw error;
      }
      throw new FileReadError(fullPath, error as Error);
    }
  }

  /**
   * 写入JSON文件
   */
  async writeJSON<T>(filePath: string, data: T): Promise<void> {
    const fullPath = this.resolvePath(filePath);

    // 确保父目录存在
    const dir = path.dirname(fullPath);
    await this.ensureDir(dir);

    try {
      const content = JSON.stringify(data, null, 2);
      await fs.promises.writeFile(fullPath, content, 'utf-8');
    } catch (error) {
      throw new FileWriteError(fullPath, error as Error);
    }
  }

  /**
   * 读取原始文件内容
   */
  async readRaw(filePath: string): Promise<string> {
    const fullPath = this.resolvePath(filePath);

    try {
      return await fs.promises.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new FileReadError(fullPath, error as Error);
    }
  }

  /**
   * 写入原始文件内容
   */
  async writeRaw(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);

    // 确保父目录存在
    const dir = path.dirname(fullPath);
    await this.ensureDir(dir);

    try {
      await fs.promises.writeFile(fullPath, content, 'utf-8');
    } catch (error) {
      throw new FileWriteError(fullPath, error as Error);
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(filePath: string): Promise<boolean> {
    const fullPath = this.resolvePath(filePath);

    try {
      await fs.promises.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件状态
   */
  async stat(filePath: string): Promise<fs.Stats> {
    const fullPath = this.resolvePath(filePath);

    try {
      return await fs.promises.stat(fullPath);
    } catch (error) {
      throw new FileReadError(fullPath, error as Error);
    }
  }

  /**
   * 确保目录存在
   */
  async ensureDir(dirPath: string): Promise<void> {
    const fullPath = this.resolvePath(dirPath);

    try {
      await fs.promises.mkdir(fullPath, { recursive: true });
    } catch (error) {
      // 目录已存在不是错误
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== 'EEXIST') {
        throw new FileWriteError(fullPath, error as Error);
      }
    }
  }

  /**
   * 复制文件
   */
  async copy(src: string, dest: string): Promise<void> {
    const srcPath = this.resolvePath(src);
    const destPath = this.resolvePath(dest);

    // 确保目标目录存在
    const destDir = path.dirname(destPath);
    await this.ensureDir(destDir);

    try {
      await fs.promises.copyFile(srcPath, destPath);
    } catch (error) {
      throw new FileWriteError(destPath, error as Error);
    }
  }

  /**
   * 删除文件
   */
  async delete(filePath: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);

    try {
      await fs.promises.unlink(fullPath);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      // 文件不存在不是错误
      if (nodeError.code !== 'ENOENT') {
        throw new FileWriteError(fullPath, error as Error);
      }
    }
  }

  /**
   * 获取基础路径
   */
  getBasePath(): string {
    return this.basePath;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建FileIO实例
 */
export function createFileIO(basePath?: string): IFileIO {
  return new FileIO(basePath);
}
