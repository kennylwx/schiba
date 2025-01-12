import { BaseTokenizer } from './base';
import { GPTTokenizer } from './implementations';
export type { TokenCount, TokenEstimate, ModelTokens } from './types';

export function createTokenizer(): BaseTokenizer {
  return new GPTTokenizer();
}
