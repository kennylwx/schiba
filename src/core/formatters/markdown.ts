import { BaseFormatter } from './base';
import { ColumnDefinition, SchemaStats, TableIndex } from '../types';

interface TableInfo {
  description?: string;
  columns?: Array<{
    column: string;
    type: string;
    nullable: string;
    default: string | null;
    constraints: string[] | null;
  }>;
  indexes: TableIndex[];
}

interface Schema {
  tables?: Record<string, TableInfo>;
  enums?: Record<string, string[]>;
}

export class MarkdownFormatter extends BaseFormatter {
  format(schemaStr: string, stats: SchemaStats): string {
    try {
      const schema = JSON.parse(schemaStr) as Schema;
      let output = this.generateHeader('POSTGRES', stats);

      output += '# Database Schema Documentation\n\n';

      if (schema.tables) {
        output += this.formatTables(schema.tables);
      }

      if (schema.enums) {
        output += this.formatEnums(schema.enums);
      }

      return output;
    } catch (error) {
      return `Error formatting schema: ${(error as Error).message}`;
    }
  }

  private formatTables(tables: Record<string, TableInfo>): string {
    let output = '## Tables\n\n';

    Object.entries(tables).forEach(([tableName, tableInfo]) => {
      output += `### ${tableName}\n\n`;

      if (tableInfo.description) {
        output += `${tableInfo.description}\n\n`;
      }

      if (tableInfo.columns) {
        output += this.formatColumns(tableInfo.columns);
      }

      // Check if indexes exist and have length
      if (tableInfo.indexes && tableInfo.indexes.length > 0) {
        output += this.formatIndexes(tableInfo.indexes);
      }
    });

    return output;
  }

  private formatColumns(columns: ColumnDefinition[]): string {
    let output = '#### Columns\n\n';
    output += '| Column | Type | Nullable | Default | Constraints |\n';
    output += '|--------|------|----------|----------|-------------|\n';

    columns.forEach((col) => {
      const constraints = col.constraints ? col.constraints.join(', ') : '';
      const defaultVal = col.default === null ? 'null' : col.default;
      output += `| ${col.column} | ${col.type} | ${col.nullable} | ${defaultVal} | ${constraints} |\n`;
    });

    return output + '\n';
  }

  private formatIndexes(indexes: TableIndex[]): string {
    let output = '#### Indexes\n\n';
    output += '| Name | Definition |\n';
    output += '|------|------------|\n';

    indexes.forEach((idx) => {
      output += `| ${idx.name} | ${idx.definition} |\n`;
    });

    return output + '\n';
  }

  private formatEnums(enums: Record<string, string[]>): string {
    let output = '## Enums\n\n';

    Object.entries(enums).forEach(([enumName, values]) => {
      output += `### ${enumName}\n\n`;
      output += `Values: ${values.join(', ')}\n\n`;
    });

    return output;
  }
}
