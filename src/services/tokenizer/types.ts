export interface TokenCounter {
  countTokens(text: string): {
    claude: number;
    gpt4: number;
    gpt35: number;
  };
}

export interface TokenCount {
  total: number;
  breakdown: {
    text: number;
    code: number;
    tables: number;
    formatting: number;
  };
}

export interface ModelTokens {
  claude: number;
  gpt4: number;
  gpt35: number;
}

export interface TokenEstimate {
  total: ModelTokens;
  breakdown: {
    text: ModelTokens;
    code: ModelTokens;
    tables: ModelTokens;
    formatting: ModelTokens;
  };
  comparison: {
    plainText: number;
    savings: number;
  };
}
