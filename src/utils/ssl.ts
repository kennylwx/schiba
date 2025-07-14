export function isLocalhost(connectionString: string): boolean {
  const patterns = [
    /localhost/i,
    /127\.0\.0\.1/,
    /\[::1\]/,
    /host\.docker\.internal/i,
    /^postgres:\/\/[^@]*@[^:]*:5432/i, // Default postgres without host
  ];
  return patterns.some((pattern) => pattern.test(connectionString));
}

export function buildSSLConfig(
  sslMode: string
): false | { rejectUnauthorized: boolean; checkServerIdentity?: () => undefined } {
  const sslModes: Record<
    string,
    false | { rejectUnauthorized: boolean; checkServerIdentity?: () => undefined }
  > = {
    disable: false,
    allow: { rejectUnauthorized: false },
    prefer: { rejectUnauthorized: false },
    require: { rejectUnauthorized: false },
    'verify-ca': { rejectUnauthorized: true, checkServerIdentity: () => undefined },
    'verify-full': { rejectUnauthorized: true },
  };

  return sslModes[sslMode] || false;
}

export function appendSSLToConnectionString(connectionString: string, sslMode: string): string {
  // Remove existing ssl parameters
  const cleanUrl = connectionString.replace(/[?&]ssl(mode)?=[^&]*/g, '');

  // Add new ssl parameter
  const separator = cleanUrl.includes('?') ? '&' : '?';

  if (sslMode === 'disable') {
    return `${cleanUrl}${separator}sslmode=disable`;
  }

  return `${cleanUrl}${separator}sslmode=${sslMode}`;
}
