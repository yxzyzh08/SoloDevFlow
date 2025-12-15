/**
 * Validators Module
 *
 * 导出所有验证器功能
 *
 * @module validators
 */

export {
  // State Validator
  validateStateFile,
  formatValidationResult,
  StateError,
  StateFileNotFoundError,
  StateFileCorruptedError,
  StateFieldMissingError,
  type RepairSuggestion,
  type ValidationResult
} from './state-validator.js';

export {
  // Reference Validator
  validateDocumentReferences,
  formatReferenceValidationResult,
  type DocumentReference,
  type SectionIdInfo,
  type MissingSectionInfo,
  type DuplicateIdInfo,
  type ReferenceValidationResult
} from './reference-validator.js';
