// ============================================
// SECURITY UTILITIES
// ============================================

import { customAlphabet } from "nanoid";
import {
  CLIP_ID_LENGTH,
  RETRIEVAL_CODE_LENGTH,
  PUBLIC_MAX_FILE_SIZE,
  PUBLIC_MAX_TEXT_LENGTH,
  ADMIN_MAX_FILE_SIZE,
  ADMIN_MAX_TEXT_LENGTH,
  ALLOWED_FILE_TYPES,
  MAX_FILES_COUNT,
  PUBLIC_MAX_TOTAL_SIZE,
} from "./constants.js";

// ─── Clip ID Generator (URL-safe) ───
const clipIdGenerator = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  CLIP_ID_LENGTH,
);

// ─── Retrieval Code Generator (NUMBERS ONLY) ───
// Feature #7: Only digits for easy sharing
const codeGenerator = customAlphabet("0123456789", RETRIEVAL_CODE_LENGTH);

export function createClipId() {
  return clipIdGenerator();
}

export function createRetrievalCode() {
  return codeGenerator();
}

/**
 * Sanitize text input
 */
export function sanitizeText(text, maxLength = PUBLIC_MAX_TEXT_LENGTH) {
  if (typeof text !== "string") return "";
  let clean = text.trim();
  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength);
  }
  return clean;
}

/**
 * Validate a single file (works for both public & admin)
 */
export function validateFile(file, maxSize = PUBLIC_MAX_FILE_SIZE) {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (file.size === 0) {
    return { valid: false, error: `${file.name}: File is empty` };
  }

  if (file.size > maxSize) {
    const maxMB = (maxSize / (1024 * 1024)).toFixed(1);
    const fileMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `${file.name}: Too large (${fileMB}MB). Max is ${maxMB}MB`,
    };
  }

  // Allow all types including octet-stream (fallback for unknown files)
  // This enables ANY file type to be uploaded
  if (!ALLOWED_FILE_TYPES.includes(file.type) && file.type !== "") {
    // Still allow it — we're permissive now
    // Only block if literally no type and no name
    if (!file.name) {
      return { valid: false, error: "Unknown file with no name" };
    }
  }

  return { valid: true };
}

/**
 * Validate bulk files for PUBLIC upload
 * Returns { accepted: File[], rejected: { name, reason }[], totalSize }
 */
export function validatePublicBulkFiles(files) {
  const accepted = [];
  const rejected = [];
  let totalSize = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Check individual file
    const validation = validateFile(file, PUBLIC_MAX_FILE_SIZE);
    if (!validation.valid) {
      rejected.push({ name: file.name, reason: validation.error });
      continue;
    }

    // Check if adding this file exceeds total limit
    if (totalSize + file.size > PUBLIC_MAX_TOTAL_SIZE) {
      rejected.push({
        name: file.name,
        reason: `${file.name}: Would exceed 4.5MB total limit`,
      });
      continue;
    }

    totalSize += file.size;
    accepted.push(file);
  }

  return { accepted, rejected, totalSize };
}

/**
 * Validate clip ID format
 */
export function isValidClipId(id) {
  if (typeof id !== "string") return false;
  const pattern = new RegExp(`^[a-z0-9]{${CLIP_ID_LENGTH}}$`);
  return pattern.test(id);
}

/**
 * Validate retrieval code format (NUMBERS ONLY now)
 */
export function isValidCode(code) {
  if (typeof code !== "string") return false;
  const pattern = new RegExp(`^[0-9]{${RETRIEVAL_CODE_LENGTH}}$`);
  return pattern.test(code);
}
