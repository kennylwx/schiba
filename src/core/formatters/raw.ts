import { BaseFormatter } from './base';
import { SchemaStats } from '../types';

export class RawFormatter extends BaseFormatter {
  format(schema: string, stats: SchemaStats): string {
    const header = this.generateHeader('POSTGRES', stats);
    return header + JSON.stringify(JSON.parse(schema), null, 2);
  }
}