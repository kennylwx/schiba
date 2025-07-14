# 🐕 Schiba (Database Schema Extractor for LLM)

Database schema extraction tool with built-in connection management. Schiba generates compact, token-efficient schema representations optimized for AI context windows.

## Installation

```bash
npm install -g schiba

yarn global add schiba

# macOS Installation
brew install schiba
```

## Quick Start

```bash
# 1. Add your database connection (e.g., a local PostgreSQL)
schiba add local "postgresql://user:pass@localhost:5432/mydb" --no-ssl

# 2. Fetch the schema (it will be saved to a file and copied to your clipboard)
schiba fetch

# 3. List all your saved connections in a tidy table
schiba list
```

## Commands

Schiba provides a comprehensive set of commands to manage your database connections and extract schemas efficiently.

### `add`

Adds a new database connection to the configuration.

**Usage**

```bash
schiba add <tag> <connection-string> [options]
```

**Options**

- `--no-ssl`: Disable SSL for the connection.
- `--default`: Set this connection as the new default.
- `--description <text>`: Add a description for the connection.

**Examples**

```bash
# Add a production PostgreSQL DB and set it as the default
schiba add prod "postgresql://user:pass@host:5432/db" --default

# Add a local MongoDB connection without SSL enabled
schiba add dev "mongodb://localhost:27017/devdb" --no-ssl
```

---

### `list`

Lists all saved connections in a table format.

**Usage**

```bash
schiba list [options]
```

**Options**

- `--show-passwords`: Display passwords in plain text instead of `***`.

**Example**

```bash
schiba list --show-passwords
```

---

### `fetch`

Fetches the database schema, formats it, saves it to a file, and copies it to the clipboard.

**Usage**

```bash
schiba fetch [tag] [options]
```

**Options**

- `-f, --filename <name>`: Custom output filename.
- `-d, --directory <path>`: Custom output directory.
- `-t, --timeout <ms>`: Connection timeout in milliseconds.
- `--format <type>`: Output format (`raw` or `markdown`).
- `--no-copy`: Prevents copying the output to the clipboard.
- `--verbose`: Enable detailed logging for debugging.

**Examples**

```bash
# Fetch schema from the default connection
schiba fetch

# Fetch schema from a specific connection in markdown format
schiba fetch prod --format markdown
```

---

### `update`

Updates a property of an existing connection.

**Usage**

```bash
schiba update <tag> <property> <value>
```

**Properties**

- `ssl`: `enable` or `disable`
- `username`: The new database username.
- `password`: The new database password.
- `host`: The new database host.
- `port`: The new database port.
- `database`: The new database name.
- `schema`: (PostgreSQL) The new schema name.

**Examples**

```bash
# Disable SSL for the 'local' connection
schiba update local ssl disable

# Change the user for the 'prod' connection
schiba update prod username new_user
```

---

### `remove`

Removes a saved connection.

**Usage**

```bash
schiba remove <tag>
```

**Example**

```bash
schiba remove staging
```

---

### `default`

Sets a connection as the default for commands like `fetch` and `test`.

**Usage**

```bash
schiba default <tag>
```

**Example**

```bash
schiba default prod
```

---

### `test`

Tests the connection to a database without fetching the full schema.

**Usage**

```bash
schiba test [tag]
```

**Example**

```bash
# Test the default connection
schiba test

# Test a specific connection
schiba test prod
```

---

### `copy`

Copies a connection string to the clipboard.

**Usage**

```bash
schiba copy <tag>
```

**Example**

```bash
schiba copy prod
```

## Configuration

Schiba stores its configuration in a `config.json` file in a centralized location on your system.

- **macOS/Linux**: `~/.config/schiba/config.json`
- **Windows**: `%APPDATA%\schiba\config.json`

The configuration is automatically created when you add your first connection.

### Environment Variables

For sensitive data like passwords, you can use environment variables. Create a `.env` file in the same directory as your `config.json`:

- **macOS/Linux**: `~/.config/schiba/.env`
- **Windows**: `%APPDATA%\schiba\.env`

**Example `.env` file:**

```
DB_USER=myuser
DB_PASS=verysecretpassword
```

You can then reference these variables when adding a connection string. Schiba will automatically substitute them.

```bash
# Use environment variables in your connection string
schiba add prod "postgresql://${DB_USER}:${DB_PASS}@prod-host.com/db"
```

## Supported Databases

| Database             | Connection String              | Supported |
| :------------------- | :----------------------------- | :-------: |
| PostgreSQL           | `postgresql://`, `postgres://` |    ✅     |
| MongoDB              | `mongodb://`, `mongodb+srv://` |    ✅     |
| MySQL                | `mysql://`                     |    ❌     |
| Microsoft SQL Server | `mssql://`, `sqlserver://`     |    ❌     |
| Oracle               | `oracle://`                    |    ❌     |

## License

MIT License

_Note: Schiba is a tool designed for development and documentation. Always review any schema output to ensure you are not unintentionally sharing sensitive information._
