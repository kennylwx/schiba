# Schiba 🔍

Extract and format database schemas for AI context windows. Optimized for use with LLMs like Claude, GPT-4, and others.

## Features ✨

- 📊 Extracts database schemas in a compact, AI-friendly format
- 🎯 Optimizes token usage for AI context windows
- 🚀 Supports multiple databases (PostgreSQL, MongoDB)
- 📝 Multiple output formats (raw JSON, Markdown)
- 🔒 Security-aware with sensitive data warnings
- 📈 Token usage analysis for different AI models

## Installation 📦

```bash
npm install -g schiba
```

Or run directly with npx:

```bash
npx schiba
```

## Usage 🛠️

Basic usage:

```bash
# PostgreSQL
schiba "postgresql://user:password@localhost:5432/dbname"

# MongoDB
schiba "mongodb://user:password@localhost:27017/dbname"

# Output as markdown
schiba "postgresql://localhost:5432/dbname" --format markdown

# Custom output file
schiba "postgresql://localhost:5432/dbname" -f my-schema.md
```

### Options

- `-f, --filename <name>` - Output filename
- `-d, --directory <path>` - Output directory
- `-t, --timeout <ms>` - Connection timeout (default: 10000ms)
- `--format <type>` - Output format: "raw" or "markdown"
- `--verbose` - Enable verbose logging
- `-v, --version` - Show version
- `-h, --help` - Show help

## Supported Databases 💾

- PostgreSQL (postgresql://, postgres://)
- MongoDB (mongodb://, mongodb+srv://)
- MySQL (coming soon)
- MSSQL (coming soon)
- Oracle (coming soon)

## Output Formats 📄

### Raw Format
JSON output with AI context header and metadata:

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
      ]
    }
  }
}
```

### Markdown Format
Formatted tables with full documentation:

```markdown
## Tables

### users

#### Columns
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|----------|-------------|
| id | uuid | NO | null | PRIMARY KEY |
```

## Token Analysis 🤖

schiba provides detailed token usage analysis for different AI models:

- Estimates for Claude, GPT-4, and GPT-3.5
- Token breakdown by content type
- Comparison with plain text format
- Optimization suggestions

## Development 🛠️

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format code
npm run format
```

## Contributing 🤝

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License 📄

MIT License - see the [LICENSE](LICENSE) file for details

## Security 🔒

schiba automatically detects potentially sensitive tables and provides warnings. However, always review the output before sharing, especially when dealing with:

- User data tables
- Authentication systems
- Security configurations
- Access control lists

## Roadmap 🗺️

- [ ] Support for MySQL
- [ ] Support for MSSQL
- [ ] Support for Oracle
- [ ] Schema diffing
- [ ] Custom formatters
- [ ] Schema validation
- [ ] Interactive mode
- [ ] Configuration files
- [ ] Plugin system

## Acknowledgments 👏

- Command-line interface built with [Commander.js](https://github.com/tj/commander.js)
- Progress indicators by [ora](https://github.com/sindresorhus/ora)
- Color support by [chalk](https://github.com/chalk/chalk)

---

📝 **Note**: This is a tool designed for development and documentation purposes. Always review the output before sharing sensitive database information.