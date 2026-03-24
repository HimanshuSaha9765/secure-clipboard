import { customAlphabet } from "nanoid";
import {
  CLIP_ID_LENGTH,
  RETRIEVAL_CODE_LENGTH,
  PUBLIC_MAX_FILE_SIZE,
  PUBLIC_MAX_TEXT_LENGTH,
  ADMIN_MAX_FILE_SIZE,
  ADMIN_MAX_TEXT_LENGTH,
  PUBLIC_ALLOWED_FILE_TYPES,
  ADMIN_ALLOWED_FILE_TYPES,
  PUBLIC_SAFE_EXTENSIONS,
} from "./constants.js";

const clipIdGenerator = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  CLIP_ID_LENGTH,
);

const codeGenerator = customAlphabet(
  "ABCDEFGHJKMNPQRSTUVWXYZ23456789",
  RETRIEVAL_CODE_LENGTH,
);

export function createClipId() {
  return clipIdGenerator();
}

export function createRetrievalCode() {
  return codeGenerator();
}

export function sanitizeText(text, maxLength = PUBLIC_MAX_TEXT_LENGTH) {
  if (typeof text !== "string") return "";
  let clean = text.trim();
  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength);
  }
  return clean;
}

function getFileExtension(fileName) {
  if (!fileName || typeof fileName !== "string") return "";
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.slice(lastDot).toLowerCase();
}

export function validatePublicFile(file) {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  if (file.size > PUBLIC_MAX_FILE_SIZE) {
    const maxKB = Math.round(PUBLIC_MAX_FILE_SIZE / 1024);
    return {
      valid: false,
      error: `File too large. Public limit is ${maxKB}KB. Your file: ${Math.round(file.size / 1024)}KB`,
    };
  }

  const isTypeAllowed = PUBLIC_ALLOWED_FILE_TYPES.includes(file.type);

  if (file.type === "application/octet-stream" || !isTypeAllowed) {
    const ext = getFileExtension(file.name);
    if (!PUBLIC_SAFE_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: `File type not allowed for public sharing. Only text, code, and document files are accepted.`,
      };
    }
  }

  return { valid: true };
}

export function validateAdminFile(file) {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  if (file.size > ADMIN_MAX_FILE_SIZE) {
    const maxMB = (ADMIN_MAX_FILE_SIZE / (1024 * 1024)).toFixed(1);
    const fileMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File too large. Max ${maxMB}MB. Your file: ${fileMB}MB`,
    };
  }

  if (!ADMIN_ALLOWED_FILE_TYPES.includes(file.type)) {
    const ext = getFileExtension(file.name);

    if (!ext || ext === ".") {
      return {
        valid: false,
        error: `File type "${file.type}" is not allowed`,
      };
    }
  }

  return { valid: true };
}

export function isValidClipId(id) {
  if (typeof id !== "string") return false;
  const pattern = new RegExp(`^[a-z0-9]{${CLIP_ID_LENGTH}}$`);
  return pattern.test(id);
}

export function isValidCode(code) {
  if (typeof code !== "string") return false;
  const pattern = new RegExp(
    `^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{${RETRIEVAL_CODE_LENGTH}}$`,
  );
  return pattern.test(code);
}
