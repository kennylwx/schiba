interface TableInfo {
  columns?: Array<{
    column: string;
    type: string;
    nullable: string;
    default: string | null;
    constraints: string[] | null;
  }>;
  indexes?: Array<{
    name: string;
    definition: string;
  }>;
  description?: string | null;
}

interface Schema {
  tables?: Record<string, TableInfo>;
  enums?: Record<string, string[]>;
}

export function formatSchema(schemaStr: string, format: 'raw' | 'markdown' = 'raw'): string {
  try {
    // Keep the header part
    const schemaStart = schemaStr.indexOf('Schema Details');
    const [header, ...rest] = schemaStr.split('Schema Details');
    const schemaJson = rest.join('Schema Details').split('\n\n')[1];
    
    // Parse the JSON
    const schema = JSON.parse(schemaJson) as Schema;
    
    // Always include the original header
    let output = header + 'Schema Details\n\n';
    
    if (format === 'markdown') {
      // Format as markdown tables
      output += '# Database Schema Documentation\n\n';
      
      // Format tables
      if (schema.tables) {
        output += '## Tables\n\n';
        
        Object.entries(schema.tables).forEach(([tableName, tableInfo]) => {
          output += `### ${tableName}\n\n`;
          
          if (tableInfo.description) {
            output += `${tableInfo.description}\n\n`;
          }
          
          if (tableInfo.columns) {
            output += '#### Columns\n\n';
            output += '| Column | Type | Nullable | Default | Constraints |\n';
            output += '|--------|------|----------|----------|-------------|\n';
            
            tableInfo.columns.forEach(col => {
              const constraints = col.constraints ? col.constraints.join(', ') : '';
              const defaultVal = col.default === null ? 'null' : col.default;
              output += `| ${col.column} | ${col.type} | ${col.nullable} | ${defaultVal} | ${constraints} |\n`;
            });
            output += '\n';
          }
          
          if (tableInfo.indexes && tableInfo.indexes.length > 0) {
            output += '#### Indexes\n\n';
            output += '| Name | Definition |\n';
            output += '|------|------------|\n';
            
            tableInfo.indexes.forEach(idx => {
              output += `| ${idx.name} | ${idx.definition} |\n`;
            });
            output += '\n';
          }
        });
      }
      
      // Format enums
      if (schema.enums) {
        output += '## Enums\n\n';
        
        Object.entries(schema.enums).forEach(([enumName, values]) => {
          output += `### ${enumName}\n\n`;
          output += `Values: ${values.join(', ')}\n\n`;
        });
      }
    } else {
      // Raw format - just add the JSON with proper indentation
      output += JSON.stringify(schema, null, 2);
    }
    
    return output;
  } catch (error) {
    return `Error formatting schema: ${(error as Error).message}`;
  }
}