# Schiba MCP Server

The Schiba MCP (Model Context Protocol) server exposes all Schiba database functionality as tools that AI assistants and other MCP clients can use.

## Quick Start

```bash
# Start the MCP server
schiba up

# Check server status
schiba status

# Stop the server
schiba down
```

## Server Management

### Starting the Server

```bash
# Start with default settings (port 3001, background mode)
schiba up

# Start on custom port
schiba up --port 3002

# Start with verbose logging
schiba up --verbose

# Run in foreground (for debugging)
schiba up --no-detach
```

### Stopping the Server

```bash
# Graceful shutdown (recommended)
schiba down

# Force kill if unresponsive
schiba down --force

# Verbose shutdown logging
schiba down --verbose
```

### Checking Status

```bash
# Basic status
schiba status

# Detailed status with system info
schiba status --verbose

# Include recent operation logs
schiba status --logs
```

## Available Tools

When the MCP server is running, the following tools are available to MCP clients:

### Database Operations

- **`list_connections`** - List all configured database connections
- **`fetch_schema`** - Extract database schema in raw or markdown format
- **`test_connection`** - Test database connectivity

### Connection Management

- **`add_connection`** - Add new database connections
- **`remove_connection`** - Remove database connections
- **`update_connection`** - Update connection properties
- **`set_default_connection`** - Set default connection

### Monitoring

- **`get_operation_logs`** - View server operation history with timing and success/failure info

## Tool Usage Examples

### Fetch Schema

```json
{
  "name": "fetch_schema",
  "arguments": {
    "tag": "prod",
    "format": "markdown"
  }
}
```

### Add Connection

```json
{
  "name": "add_connection",
  "arguments": {
    "tag": "staging",
    "connectionString": "postgresql://user:pass@host:5432/db",
    "ssl": true,
    "default": false,
    "description": "Staging environment database"
  }
}
```

### Test Connection

```json
{
  "name": "test_connection",
  "arguments": {
    "tag": "local"
  }
}
```

## MCP Client Configuration

To connect an MCP client to Schiba:

### Standard MCP Client Configuration

```json
{
  "name": "schiba",
  "command": "schiba-mcp",
  "args": [],
  "env": {}
}
```

### Claude Desktop Configuration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "schiba": {
      "command": "schiba-mcp",
      "args": []
    }
  }
}
```

## Storage and Persistence

The MCP server uses SQLite for persistent storage:

- **Location**: `~/.config/schiba/mcp.db` (macOS/Linux) or `%APPDATA%\schiba\mcp.db` (Windows)
- **Data stored**:
  - Server state and process information
  - Connection cache for faster access
  - Operation logs with timing and success/failure tracking

## Error Handling

The server provides comprehensive error handling:

- **Invalid parameters**: Clear error messages with expected types
- **Database connection failures**: Detailed connectivity diagnostics
- **Process management**: Graceful shutdown with fallback to force termination
- **Operation logging**: All operations are logged with success/failure status

## Security Considerations

- Connection strings are masked in logs and responses
- SQLite database is stored in user's config directory with appropriate permissions
- Server runs locally and doesn't expose network services
- All communication uses stdio transport (MCP standard)

## Troubleshooting

### Server Won't Start

```bash
# Check if port is in use
schiba up --port 3002

# Run with verbose logging
schiba up --verbose

# Check system requirements
schiba status --verbose
```

### Server Won't Stop

```bash
# Force kill the process
schiba down --force

# Check process manually
ps aux | grep schiba
```

### Connection Issues

```bash
# Test individual connections
schiba test <tag>

# Check server logs
schiba status --logs

# Verify connection configuration
schiba list
```

## Integration Examples

### Using with AI Assistants

The MCP server allows AI assistants to:

1. **Discover databases**: List all configured connections
2. **Extract schemas**: Get formatted schema data for context
3. **Manage connections**: Add, update, or remove database configurations
4. **Monitor operations**: Track what database operations have been performed

### Custom MCP Clients

Developers can build custom MCP clients that leverage Schiba's database functionality:

```javascript
// Example: Connecting to Schiba MCP server
const client = new MCP.Client({
  transport: new StdioTransport({
    command: 'schiba-mcp',
  }),
});

// List available tools
const tools = await client.request('tools/list');

// Extract schema
const schema = await client.request('tools/call', {
  name: 'fetch_schema',
  arguments: { tag: 'prod', format: 'markdown' },
});
```

For more information, visit: https://github.com/kennylwx/schiba
