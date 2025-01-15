# 🐕 Schiba

A specialized CLI tool for extracting and formatting database schemas, optimized for AI context windows. Schiba generates compact, token-efficient schema representations for use with Large Language Models (LLMs).

## Key Features

- Extract database schemas with contextual metadata and AI-optimized formatting
- Intelligent token usage analysis for Claude, GPT-4, and GPT-3.5
- Multiple output formats with AI context headers and schema documentation
- Built-in security analysis for sensitive data detection
- Automatic clipboard support for quick AI context insertion
- Progress indicators and detailed operation statistics

## Installation

```bash
npm install -g schiba
```

For one-time use:

```bash
npx schiba
```

## Usage

Basic schema extraction:

```bash
# PostgreSQL
schiba "postgresql://user:pass@localhost:5432/mydb"

# MongoDB
schiba "mongodb://user:pass@localhost:27017/mydb"

# With custom format and output and copy to clipboard
schiba "postgresql://localhost/mydb" --format markdown -f schema.md -c
```

### Command Options

```bash
schiba <connection-string> [options]

Options:
  -f, --filename <name>     Output filename (default: schiba-out.txt/md)
  -d, --directory <path>    Output directory (default: current directory)
  -t, --timeout <ms>        Connection timeout (default: 10000ms)
  --format <type>           Output format: "raw" or "markdown"
  --verbose                 Enable detailed logging
  -c, --copy                Copy output to clipboard
  -v, --version             Display version
  -h, --help                Show help
```

### Supported Databases

Currently implemented:

- PostgreSQL (`postgresql://`, `postgres://`)
- MongoDB (`mongodb://`, `mongodb+srv://`)

## Output Formats

### Raw Format (Default)

Compact JSON with AI context header:

```json
{
  "tables": {
    "users": {
      "columns": [
        {
          "column": "id",
          "type": "uuid",
          "nullable": "NO",
          "constraints": ["PRIMARY KEY"]
        }
      ],
      "indexes": [
        {
          "name": "users_pkey",
          "definition": "CREATE UNIQUE INDEX users_pkey ON users USING btree (id)"
        }
      ]
    }
  },
  "enums": {
    "user_role": ["admin", "user", "guest"]
  }
}
```

### Markdown Format

Documentation-style output with formatted tables:

```markdown
## Tables

### users

User account information

#### Columns

| Column | Type | Nullable | Default | Constraints |
| ------ | ---- | -------- | ------- | ----------- |
| id     | uuid | NO       | null    | PRIMARY KEY |

#### Indexes

| Name       | Definition                                               |
| ---------- | -------------------------------------------------------- |
| users_pkey | CREATE UNIQUE INDEX users_pkey ON users USING btree (id) |
```

## Development

```bash
# Setup
git clone <repository>
npm install

# Development
npm run dev

# Testing
npm test

# Build
npm run build

# Lint and Format
npm run lint
npm run format
```

## License

MIT License

**Note**: Schiba is designed for development and documentation purposes. Always review schema output before sharing sensitive database information.
