import { BaseTokenizer } from './base';
import type { TokenEstimate, ModelTokens, TokenCounter } from './types';
import { TOKEN_MULTIPLIERS } from './constants';
import { encode } from 'gpt-tokenizer';

export class GPTTokenizer extends BaseTokenizer {
  estimateTokens(text: string): TokenEstimate {
    const baseCount = this.countBaseTokens(text);

    const calculateModelTokens = (
      count: number,
      type: keyof typeof TOKEN_MULTIPLIERS.GPT4
    ): ModelTokens => ({
      claude: Math.ceil(count * TOKEN_MULTIPLIERS.CLAUDE[type]),
      gpt4: Math.ceil(count * TOKEN_MULTIPLIERS.GPT4[type]),
      gpt35: Math.ceil(count * TOKEN_MULTIPLIERS.GPT35[type]),
    });

    const breakdown = {
      text: calculateModelTokens(baseCount.breakdown.text, 'BASE'),
      code: calculateModelTokens(baseCount.breakdown.code, 'CODE'),
      tables: calculateModelTokens(baseCount.breakdown.tables, 'TABLE'),
      formatting: calculateModelTokens(baseCount.breakdown.formatting, 'FORMATTING'),
    };

    const total = {
      claude: Object.values(breakdown).reduce((acc, curr) => acc + curr.claude, 0),
      gpt4: Object.values(breakdown).reduce((acc, curr) => acc + curr.gpt4, 0),
      gpt35: Object.values(breakdown).reduce((acc, curr) => acc + curr.gpt35, 0),
    };

    const plainTextTokens = Math.ceil(text.length / 4);

    return {
      total,
      breakdown,
      comparison: {
        plainText: plainTextTokens,
        savings: plainTextTokens - total.gpt4,
      },
    };
  }
}

export class TokenCounterImpl implements TokenCounter {
  countTokens(text: string): { claude: number; gpt4: number; gpt35: number } {
    try {
      // GPT-4 and GPT-3.5 use the same tokenizer
      const tokenCount = encode(text).length;

      return {
        claude: Math.ceil(tokenCount * 1.1), // Claude typically uses ~10% more tokens
        gpt4: tokenCount,
        gpt35: tokenCount,
      };
    } catch (error) {
      // Fallback to character-based estimation if tokenizer fails
      const charCount = text.length;
      return {
        claude: Math.ceil(charCount * 0.25),
        gpt4: Math.ceil(charCount * 0.3),
        gpt35: Math.ceil(charCount * 0.28),
      };
    }
  }
}
