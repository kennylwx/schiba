import { TokenCount, TokenEstimate } from './types';
import { TOKEN_PATTERNS } from './constants';

export abstract class BaseTokenizer {
  protected countBaseTokens(text: string): TokenCount {
    const codeBlocks = text.match(TOKEN_PATTERNS.CODE_BLOCK) || [];
    const tables = text.match(TOKEN_PATTERNS.TABLE) || [];

    // Remove code blocks and tables for text counting
    const cleanText = text.replace(TOKEN_PATTERNS.CODE_BLOCK, '').replace(TOKEN_PATTERNS.TABLE, '');

    // Count words and special characters
    const words = cleanText.split(TOKEN_PATTERNS.WHITESPACE).filter(Boolean);
    const specialChars = cleanText.match(TOKEN_PATTERNS.SPECIAL_CHARS) || [];
    const numbers = cleanText.match(TOKEN_PATTERNS.NUMBERS) || [];

    return {
      total: 0, // Will be calculated by specific implementations
      breakdown: {
        text: words.length + specialChars.length + numbers.length,
        code: this.calculateCodeTokens(codeBlocks),
        tables: this.calculateTableTokens(tables),
        formatting: this.calculateFormattingTokens(text),
      },
    };
  }

  protected calculateCodeTokens(codeBlocks: string[]): number {
    let total = 0;
    for (const block of codeBlocks) {
      // Remove code fence markers
      const code = block.replace(/```\w*\n?|\n?```/g, '');
      const lines = code.split('\n').filter(Boolean);
      total += lines.reduce((acc, line) => {
        return acc + Math.ceil(line.trim().length / 4);
      }, 0);
    }
    return total;
  }

  protected calculateTableTokens(tables: string[]): number {
    let total = 0;
    for (const table of tables) {
      const rows = table.split('\n').filter(Boolean);
      total += rows.reduce((acc, row) => {
        const cells = row.split('|').filter(Boolean);
        return acc + cells.length;
      }, 0);
    }
    return total;
  }

  protected calculateFormattingTokens(text: string): number {
    // Count markdown formatting characters
    const formatting = text.match(/[*_#[\]()]/g) || [];
    const headers = text.match(/^#+\s/gm) || [];
    const links = text.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];

    return formatting.length + headers.length * 2 + links.length * 3;
  }

  abstract estimateTokens(text: string): TokenEstimate;
}
