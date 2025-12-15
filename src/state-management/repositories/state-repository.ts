/**
 * StateRepository - 状态仓储层
 *
 * 职责：
 * - 封装state.json读写操作
 * - 5秒TTL缓存机制
 * - 文件大小检查
 * - 历史数据读写
 *
 * @module state-management/repositories/state-repository
 */

import type {
  State,
  HistoricalState,
  FileSizeCheck,
  StateCache
} from '../types';
import type { IFileIO } from '../io/file-io';
import { FileIO, JSONParseError } from '../io/file-io';

// 复用validators模块中的错误类
import {
  StateFileNotFoundError as ValidatorStateFileNotFoundError,
  StateFileCorruptedError as ValidatorStateFileCorruptedError
} from '../../validators/state-validator.js';

// ============================================================================
// 常量
// ============================================================================

/** state.json 路径 */
const STATE_PATH = '.solodev/state.json';

/** state_his.json 路径 */
const HISTORY_PATH = '.solodev/state_his.json';

/** 文件大小限制 (KB) */
const FILE_SIZE_LIMIT_KB = 100;

/** 文件大小警告阈值 (KB) */
const FILE_SIZE_WARNING_KB = 80;

/** 缓存TTL (毫秒) */
const CACHE_TTL_MS = 5000;

// 重新导出validators模块的错误类，保持API兼容
export { ValidatorStateFileNotFoundError as StateFileNotFoundError };
export { ValidatorStateFileCorruptedError as StateFileCorruptedError };

// ============================================================================
// 缓存实现
// ============================================================================

/**
 * 状态缓存实现
 */
class StateCacheImpl implements StateCache {
  state: State | null = null;
  timestamp: number = 0;
  ttl: number = CACHE_TTL_MS;

  isValid(): boolean {
    return this.state !== null && Date.now() - this.timestamp < this.ttl;
  }

  get(): State {
    if (!this.state) {
      throw new Error('Cache is empty');
    }
    return this.state;
  }

  set(state: State): void {
    this.state = state;
    this.timestamp = Date.now();
  }

  invalidate(): void {
    this.state = null;
    this.timestamp = 0;
  }
}

// ============================================================================
// StateRepository 接口
// ============================================================================

export interface IStateRepository {
  /**
   * 读取state.json
   */
  read(): Promise<State>;

  /**
   * 写入state.json
   */
  write(state: State): Promise<void>;

  /**
   * 检查state.json是否存在
   */
  exists(): Promise<boolean>;

  /**
   * 获取文件大小检查结果
   */
  checkFileSize(): Promise<FileSizeCheck>;

  /**
   * 使缓存失效
   */
  invalidateCache(): void;

  /**
   * 读取历史数据
   */
  readHistory(): Promise<HistoricalState>;

  /**
   * 写入历史数据
   */
  writeHistory(history: HistoricalState): Promise<void>;

  /**
   * 检查历史数据文件是否存在
   */
  historyExists(): Promise<boolean>;
}

// ============================================================================
// StateRepository 实现
// ============================================================================

/**
 * StateRepository - 状态仓储实现
 */
export class StateRepository implements IStateRepository {
  private readonly fileIO: IFileIO;
  private readonly cache: StateCache;

  constructor(fileIO?: IFileIO) {
    this.fileIO = fileIO ?? new FileIO();
    this.cache = new StateCacheImpl();
  }

  /**
   * 读取state.json（带缓存）
   */
  async read(): Promise<State> {
    // 检查缓存
    if (this.cache.isValid()) {
      return this.cache.get();
    }

    // 检查文件是否存在
    const fileExists = await this.fileIO.exists(STATE_PATH);
    if (!fileExists) {
      throw new ValidatorStateFileNotFoundError(STATE_PATH);
    }

    // 读取文件
    try {
      const state = await this.fileIO.readJSON<State>(STATE_PATH);

      // 更新缓存
      this.cache.set(state);

      return state;
    } catch (error) {
      if (error instanceof JSONParseError) {
        throw new ValidatorStateFileCorruptedError(STATE_PATH, error as Error);
      }
      throw error;
    }
  }

  /**
   * 写入state.json
   */
  async write(state: State): Promise<void> {
    await this.fileIO.writeJSON(STATE_PATH, state);

    // 更新缓存
    this.cache.set(state);
  }

  /**
   * 检查state.json是否存在
   */
  async exists(): Promise<boolean> {
    return this.fileIO.exists(STATE_PATH);
  }

  /**
   * 获取文件大小检查结果
   */
  async checkFileSize(): Promise<FileSizeCheck> {
    const fileExists = await this.fileIO.exists(STATE_PATH);
    if (!fileExists) {
      return {
        sizeKB: 0,
        isOverLimit: false,
        isWarning: false,
        recommendation: null
      };
    }

    const stats = await this.fileIO.stat(STATE_PATH);
    const sizeKB = stats.size / 1024;

    const isOverLimit = sizeKB > FILE_SIZE_LIMIT_KB;
    const isWarning = sizeKB > FILE_SIZE_WARNING_KB;

    let recommendation: string | null = null;
    if (isOverLimit) {
      recommendation = `state.json 文件大小 (${sizeKB.toFixed(1)}KB) 超过 ${FILE_SIZE_LIMIT_KB}KB 限制，需要立即迁移历史迭代到 state_his.json`;
    } else if (isWarning) {
      recommendation = `state.json 文件大小 (${sizeKB.toFixed(1)}KB) 接近 ${FILE_SIZE_LIMIT_KB}KB 限制，建议迁移历史迭代到 state_his.json`;
    }

    return {
      sizeKB,
      isOverLimit,
      isWarning,
      recommendation
    };
  }

  /**
   * 使缓存失效
   */
  invalidateCache(): void {
    this.cache.invalidate();
  }

  /**
   * 读取历史数据
   */
  async readHistory(): Promise<HistoricalState> {
    const fileExists = await this.fileIO.exists(HISTORY_PATH);
    if (!fileExists) {
      // 返回空的历史状态
      return {
        schema_version: '1.0.0',
        completedIterations: {}
      };
    }

    try {
      return await this.fileIO.readJSON<HistoricalState>(HISTORY_PATH);
    } catch (error) {
      if (error instanceof JSONParseError) {
        throw new ValidatorStateFileCorruptedError(HISTORY_PATH, error as Error);
      }
      throw error;
    }
  }

  /**
   * 写入历史数据
   */
  async writeHistory(history: HistoricalState): Promise<void> {
    await this.fileIO.writeJSON(HISTORY_PATH, history);
  }

  /**
   * 检查历史数据文件是否存在
   */
  async historyExists(): Promise<boolean> {
    return this.fileIO.exists(HISTORY_PATH);
  }

  /**
   * 获取state.json路径
   */
  getStatePath(): string {
    return STATE_PATH;
  }

  /**
   * 获取state_his.json路径
   */
  getHistoryPath(): string {
    return HISTORY_PATH;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建StateRepository实例
 */
export function createStateRepository(fileIO?: IFileIO): IStateRepository {
  return new StateRepository(fileIO);
}
