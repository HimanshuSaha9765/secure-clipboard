// ============================================
// CONSTANTS — Shared settings
// ============================================

// Clip expiry: 10 minutes
export const CLIP_TTL_SECONDS = 600;

// ============================================
// PUBLIC USER LIMITS (stored in Redis)
// ============================================

// Max text size: ~4.5MB characters
export const PUBLIC_MAX_TEXT_LENGTH = 4500000;

// Max TOTAL upload size: 4.5MB
// All files combined must be under this
export const PUBLIC_MAX_TOTAL_SIZE = 4.5 * 1024 * 1024;

// Max single file size: 4.5MB
export const PUBLIC_MAX_FILE_SIZE = 4.5 * 1024 * 1024;

// ============================================
// ADMIN LIMITS (direct to Telegram)
// ============================================

// Max text: 4.5MB
export const ADMIN_MAX_TEXT_LENGTH = 4500000;

// Max single file: 4.5MB (Vercel limit)
export const ADMIN_MAX_FILE_SIZE = 4.5 * 1024 * 1024;

// ============================================
// BULK UPLOAD
// ============================================

// Max number of files per upload
export const MAX_FILES_COUNT = 10;

// ============================================
// ALL ALLOWED FILE TYPES
// Same for both public and admin
// ============================================
export const ALLOWED_FILE_TYPES = [
  // ── Images ──
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/avif",
  "image/apng",
  "image/heic",
  "image/heif",

  // ── Video ──
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/mpeg",
  "video/3gpp",
  "video/x-flv",
  "video/x-ms-wmv",
  "video/MP2T",
  "video/x-m4v",

  // ── Audio ──
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/mp4",
  "audio/x-m4a",
  "audio/webm",
  "audio/opus",
  "audio/midi",
  "audio/x-midi",
  "audio/amr",
  "audio/aiff",
  "audio/x-aiff",

  // ── Documents ──
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.oasis.opendocument.graphics",
  "application/rtf",
  "application/epub+zip",
  "application/vnd.apple.pages",
  "application/vnd.apple.numbers",
  "application/vnd.apple.keynote",

  // ── Text & Code ──
  "text/plain",
  "text/csv",
  "text/html",
  "text/css",
  "text/javascript",
  "text/xml",
  "text/markdown",
  "text/x-python",
  "text/x-java-source",
  "text/x-c",
  "text/x-c++",
  "text/x-csharp",
  "text/x-go",
  "text/x-rust",
  "text/x-ruby",
  "text/x-php",
  "text/x-shellscript",
  "text/x-sql",
  "text/x-yaml",
  "text/x-toml",
  "text/x-lua",
  "text/x-perl",
  "text/x-swift",
  "text/x-kotlin",
  "text/x-scala",
  "text/x-typescript",
  "text/x-diff",
  "text/x-r",
  "text/x-dart",
  "text/x-haskell",
  "text/x-elixir",
  "text/x-erlang",
  "text/x-clojure",
  "text/x-groovy",
  "text/x-objective-c",
  "text/x-fortran",
  "text/x-pascal",
  "text/x-matlab",
  "text/x-cmake",
  "text/x-dockerfile",
  "text/x-makefile",
  "text/tab-separated-values",
  "text/calendar",
  "text/vcard",

  // ── Data & Config ──
  "application/json",
  "application/xml",
  "application/x-yaml",
  "application/toml",
  "application/sql",
  "application/graphql",
  "application/ld+json",
  "application/x-sh",
  "application/x-httpd-php",

  // ── Archives ──
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/gzip",
  "application/x-gzip",
  "application/x-7z-compressed",
  "application/x-tar",
  "application/x-bzip",
  "application/x-bzip2",
  "application/x-xz",
  "application/zstd",

  // ── Fonts ──
  "font/ttf",
  "font/otf",
  "font/woff",
  "font/woff2",
  "application/font-ttf",
  "application/font-otf",
  "application/font-woff",
  "application/font-woff2",
  "application/vnd.ms-fontobject",

  // ── Design ──
  "application/postscript",
  "image/vnd.adobe.photoshop",
  "application/x-photoshop",

  // ── Database & Misc ──
  "application/x-sqlite3",
  "application/vnd.sqlite3",
  "application/wasm",
  "application/java-archive",
  "application/x-msdownload",

  // ── Jupyter Notebooks ──
  "application/x-ipynb+json",

  // ── Email ──
  "message/rfc822",
  "application/vnd.ms-outlook",

  // ── Ebook ──
  "application/x-mobipocket-ebook",
  "application/vnd.amazon.ebook",

  // ── Fallback (browser sends this for unknown types) ──
  "application/octet-stream",
];

// ── Rate limits ──
export const RATE_LIMIT = {
  MAX_REQUESTS: 10,
  WINDOW_SECONDS: 60,
};

// ── ID and Code settings ──
export const CLIP_ID_LENGTH = 10;
// Code is now NUMBERS ONLY, 6 digits
export const RETRIEVAL_CODE_LENGTH = 6;
