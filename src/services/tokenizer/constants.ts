export const TOKEN_MULTIPLIERS = {
  CLAUDE: {
    BASE: 1.1,
    FORMATTING: 1.2,
    CODE: 1.1,
    TABLE: 1.3,
  },
  GPT4: {
    BASE: 1.0,
    FORMATTING: 1.1,
    CODE: 1.0,
    TABLE: 1.2,
  },
  GPT35: {
    BASE: 0.95,
    FORMATTING: 1.05,
    CODE: 0.95,
    TABLE: 1.1,
  },
} as const;

export const TOKEN_PATTERNS = {
  WHITESPACE: /\s+/g,
  SPECIAL_CHARS: /[^a-zA-Z0-9\s]/g,
  NUMBERS: /\d+/g,
  CODE_BLOCK: /```[\s\S]*?```/g,
  TABLE: /\|[\s\S]*?\|/g,
  FORMATTING_CHARS: /[*_#()[\]]/g,
  HEADERS: /^#+\s/gm,
  LINKS: /\[([^[]+)\]\(([^)]+)\)/g,
} as const;
