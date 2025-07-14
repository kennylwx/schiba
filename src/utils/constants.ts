export const EMOJI_MAP = {
  database: '🗄️',
  table: '📋',
  column: '📝',
  index: '🔍',
  enum: '📑',
  warning: '⚠️',
  success: '✓',
  error: '✗',
  info: 'ℹ️',
  security: '🔒',
  stats: '📊',
  time: '⏱️',
  size: '📏',
  token: '🤖',
  memory: '💾',
  performance: '⚡',
  config: '⚙️',
  connection: '🔌',
  key: '🔑',
};

export const MODEL_NAMES = {
  CLAUDE: 'Claude',
  GPT4: 'GPT-4',
  GPT35: 'GPT-3.5',
} as const;

// Add configuration-related constants
export const CONFIG_PATHS = {
  LOCAL: '.schiba/config.json',
  LOCAL_ENV: '.schiba/.env',
  GLOBAL_UNIX: '~/.config/schiba/config.json',
  GLOBAL_WINDOWS: '%APPDATA%/schiba/config.json',
} as const;

export const SSL_MODES = {
  DISABLE: 'disable',
  ALLOW: 'allow',
  PREFER: 'prefer',
  REQUIRE: 'require',
  VERIFY_CA: 'verify-ca',
  VERIFY_FULL: 'verify-full',
} as const;
