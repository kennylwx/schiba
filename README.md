# 🐕 Schiba - Database Schema Extractor for AI Context Windows

A streamlined database schema extraction tool designed specifically for AI language model context windows. Schiba connects to your databases and generates compact, token-efficient schema representations perfect for use with Claude, ChatGPT, Gemini, and other LLMs.

## Installation

```bash
# Using NPM (recommended)
npm install -g schiba

# Using Yarn
yarn global add schiba

# On macOS with Homebrew
brew install kennylwx/tap/schiba

# On Windows with Chocolatey
choco install schiba
```

## Quick Start

```bash
# 1. Add your database connection using interactive mode (recommended)
schiba add

# 2. Configure which schemas to extract (PostgreSQL only)
schiba schemas local

# 3. Fetch the schema (it's saved to a file and copied to your clipboard)
schiba fetch

# 4. List all your saved connections in a tidy table
schiba list
```

## Commands

Schiba provides a comprehensive set of commands to manage your database connections and extract schemas efficiently.

### `add`

Adds a new database connection to the configuration. **Interactive mode is recommended** for ease of use.

**Usage**

```bash
# Interactive mode (recommended) - step-by-step setup
schiba add

# Auto-generate tag mode - uses Greek alphabet
schiba add <connection-string>

# Direct mode - provide all details upfront
schiba add <tag> <connection-string> [options]
```

**Interactive Mode Features**

When you run `schiba add` without arguments, you'll get a guided setup that asks for:

- **Database type**: PostgreSQL or MongoDB
- **Connection tag**: A friendly name for your connection (e.g., "local", "prod")
- **Host and port**: Database server details
- **Database name**: The specific database to connect to
- **Credentials**: Username and password (password is hidden as you type)
- **Schema**: For PostgreSQL, defaults to "public"
- **SSL configuration**: Choose appropriate security level
- **Description**: Optional description for the connection
- **Default setting**: Whether to set as your default connection
- **Connection test**: Option to test the connection immediately

**Direct Mode Options**

- `--no-ssl`: Disables SSL for the connection by setting its `ssl-mode` to `disable`.
- `--default`: Sets this connection as the new default.
- `--description <text>`: Adds a description for the connection.

**Examples**

```bash
# Interactive setup (recommended for beginners)
schiba add

# Auto-generate Greek alphabet tag (e.g., "alpha")
schiba add "postgresql://localhost:5432/mydb"

# Quick setup for experienced users
schiba add prod "postgresql://user:pass@host:5432/db" --default

# Local development setup
schiba add dev "mongodb://localhost:27017/devdb" --no-ssl
```

---

### `schemas`

Manage schemas for a database connection with an interactive multi-select interface.

**Usage**

```bash
schiba schemas <tag> [options]
```

**Options**

- `--list`: List current schemas for the connection.

**Examples**

```bash
# Interactive schema selection (shows checkbox interface)
schiba schemas prod

# List currently selected schemas
schiba schemas prod --list
```

**Interactive Interface**
The schemas command provides a modern checkbox interface where you can:

- Use ↑/↓ arrow keys to navigate
- Press space to select/deselect schemas
- Press 'a' to toggle all schemas
- Press 'i' to invert selection
- Press enter to confirm your selection

---

### `list`

Lists all saved connections in a table format, showing selected schemas for each connection.

**Usage**

```bash
schiba list [options]
```

**Options**

- `--show-passwords`: Displays passwords in plain text instead of `***`.

**Example**

```bash
schiba list --show-passwords
```

---

### `fetch`

Fetches the database schema from all selected schemas, formats it, saves it to a file, and copies it to the clipboard.

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
- `--verbose`: Enables detailed logging for debugging.

**Examples**

```bash
# Fetch schema from the default connection (all selected schemas)
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

- `ssl-mode`: Sets the SSL mode (`disable`, `require`, `verify-ca`, `verify-full`, etc.).
- `username`: The new database username.
- `password`: The new database password.
- `host`: The new database host.
- `port`: The new database port.
- `database`: The new database name.
- `schema`: (PostgreSQL) The new schema name.

**Examples**

```bash
# Disable SSL for the 'local' connection
schiba update local ssl-mode disable

# Require full SSL verification for the 'prod' connection
schiba update prod ssl-mode verify-full

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

## Multi-Schema Support

Schiba supports extracting from multiple database schemas simultaneously. This is particularly useful for PostgreSQL databases with multiple schemas.

### How it works:

1. **Add a connection**: `schiba add` (use interactive mode)
2. **Select schemas interactively**: `schiba schemas local`
3. **Extract all selected schemas**: `schiba fetch local`

### Schema Selection Interface:

```
📋 Schema Selection for 'local'

Currently selected: public, orders

Instructions:
  ↑/↓ to navigate, space to select/deselect, enter to confirm
  a to toggle all, i to invert selection

? Select schemas to extract: (Press <space> to select, <a> to toggle all, <i> to invert selection, and <enter> to proceed)
❯◉ public
 ◯ orders
 ◉ analytics
 ◯ reporting
 ◯ temp_data
```

The extracted schema will include tables, columns, indexes, and enums from all selected schemas, organized by schema name.

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
# Use environment variables in your connection string (direct mode)
schiba add prod "postgresql://${DB_USER}:${DB_PASS}@prod-host.com/db"
```

## Interactive Mode vs Direct Mode

### Interactive Mode (Recommended)

- **User-friendly**: Step-by-step guided setup
- **Error prevention**: Input validation at each step
- **SSL guidance**: Helps choose appropriate security settings
- **Connection testing**: Built-in connection verification
- **Beginner-friendly**: No need to remember connection string formats

```bash
schiba add  # Starts interactive mode
```

### Direct Mode (For Power Users)

- **Fast setup**: One command for experienced users
- **Scriptable**: Can be used in automation scripts
- **Flexible**: Support for environment variables

```bash
schiba add local "postgresql://user:pass@localhost:5432/mydb" --no-ssl
```

## Supported Databases

| Database             | Connection String              | Multi-Schema | Interactive Mode | Supported |
| :------------------- | :----------------------------- | :----------: | :--------------: | :-------: |
| PostgreSQL           | `postgresql://`, `postgres://` |      ✅      |        ✅        |    ✅     |
| MongoDB              | `mongodb://`, `mongodb+srv://` |      ❌      |        ✅        |    ✅     |
| MySQL                | `mysql://`                     |      ❌      |        ❌        |    ❌     |
| Microsoft SQL Server | `mssql://`, `sqlserver://`     |      ❌      |        ❌        |    ❌     |
| Oracle               | `oracle://`                    |      ❌      |        ❌        |    ❌     |

## License

MIT License

_Note: Schiba is a tool designed for development and documentation. Always review any schema output to ensure you are not unintentionally sharing sensitive information._
