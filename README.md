# 🐕 Schiba

Database schema extraction tool with built-in connection management. Schiba generates compact, token-efficient schema representations optimized for AI context windows.

Heavily inspired by [repomix](https://www.npmjs.com/package/repomix)

## Installation

```bash
npm install -g schiba
```

## Quick Start

```bash
# Add your first connection
schiba add local "postgresql://localhost:5432/mydb"

# Fetch the schema
schiba fetch
```

## Commands

### Add Connection

```bash
schiba add <tag> <connection-string> [options]

Options:
--no-ssl Disable SSL connection
--default Set as default connection
--description <text> Add a description

Examples:
schiba add prod "postgresql://user:pass@host:5432/db"
schiba add local "postgresql://localhost:5432/mydb" --no-ssl --default
```

### Fetch Schema

```bash
schiba fetch [tag] [options]

Options:
-f, --filename <name> Output filename
-d, --directory <path> Output directory
-t, --timeout <ms> Connection timeout
--format <type> Output format: "raw" or "markdown"
-c, --copy Copy to clipboard
--verbose Enable detailed logging

Examples:
schiba fetch # Uses default connection
schiba fetch production # Uses specific connection
schiba fetch --format markdown --copy
```

### Other Commands

```bash
schiba list # List all connections
schiba remove <tag> # Remove a connection
schiba default <tag> # Set default connection
schiba test [tag] # Test a connection
```

## Configuration

Schiba stores its configuration in a centralized location on your system:

- **macOS/Linux**: `~/.config/schiba/config.json`
- **Windows**: `%APPDATA%\schiba\config.json`

The configuration is automatically created when you add your first connection.

### Environment Variables

Create a `.env` file in the same directory as your config for sensitive data:

- **macOS/Linux**: `~/.config/schiba/.env`
- **Windows**: `%APPDATA%\schiba\.env`

```bash
DB_USER=myuser
DB_PASS=mypass
```

Use in connection strings:

```bash
schiba add prod "postgresql://${DB_USER}:${DB_PASS}@host/db"
```

### SSL Configuration

For local databases that don't support SSL:

```bash
schiba add local "postgresql://localhost:5432/mydb" --no-ssl
```

## Supported Databases

| Database             | Connection String              | Supported |
| -------------------- | ------------------------------ | --------- |
| PostgreSQL           | `postgresql://`, `postgres://` | ✅        |
| MongoDB              | `mongodb://`, `mongodb+srv://` | ✅        |
| MySQL                | `mysql://`                     | ❌        |
| SQLite               | `sqlite://`                    | ❌        |
| Redis                | `redis://`, `rediss://`        | ❌        |
| Microsoft SQL Server | `sqlserver://`                 | ❌        |

## Output Formats

### Raw Format (Default)

Compact JSON with AI context header and token usage analysis.

### Markdown Format

Documentation-style output with formatted tables and schema information.

## License

MIT License
Note: Schiba is designed for development and documentation purposes. Always review schema output before sharing sensitive database information.
