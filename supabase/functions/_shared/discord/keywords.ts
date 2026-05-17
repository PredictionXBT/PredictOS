export const TGE_KEYWORDS = [
  "tge",
  "token generation",
  "token launch",
  "token generation event",
  "airdrop",
  "claim",
  "snapshot",
  "listing",
  "trading starts",
  "dex listing",
  "cex listing",
  "tokenomics",
  "token distribution",
];

export function hasTGEKeywords(text: string): boolean {
  const lowercased = text.toLowerCase();
  return TGE_KEYWORDS.some((keyword) => lowercased.includes(keyword));
}

export function extractMatchedKeywords(text: string): string[] {
  const lowercased = text.toLowerCase();
  return TGE_KEYWORDS.filter((keyword) => lowercased.includes(keyword));
}

export function extractProjectName(text: string): string | null {
  // Simple heuristic: look for capitalized words before TGE keywords
  const patterns = [
    /(\w+)\s+(?:will\s+)?(?:launch|announce|tge|token)/i,
    /(\w+)\s+token\s+(?:launch|generation)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function calculateConfidence(text: string, keywords: string[]): number {
  // More matched keywords = higher confidence
  const maxKeywords = 5;
  const matchCount = Math.min(keywords.length, maxKeywords);
  return matchCount / maxKeywords;
}

