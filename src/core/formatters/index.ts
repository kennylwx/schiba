import { BaseFormatter } from './base';
import { MarkdownFormatter } from './markdown';
import { RawFormatter } from './raw';

export function createFormatter(format: 'raw' | 'markdown'): BaseFormatter {
  switch (format) {
    case 'markdown':
      return new MarkdownFormatter();
    case 'raw':
    default:
      return new RawFormatter();
  }
}

export * from './base';
export * from './markdown';
export * from './raw';