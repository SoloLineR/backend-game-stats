/**
 * @description Generic retry mechanism for promise-based functions.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      // Exponential backoff
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * @description Compares two strings and returns a similarity score.
 */
export function matchScore(searchTerm: string, candidate: string): number {
  const searchLower = searchTerm.toLowerCase();
  const candidateLower = candidate.toLowerCase();

  if (searchLower === candidateLower) return 100;

  const cleanSearch = searchLower.replace(/[^a-z0-9\s]/g, '');
  const cleanCandidate = candidateLower.replace(/[^a-z0-9\s]/g, '');

  if (cleanCandidate.startsWith(cleanSearch)) return 90;
  if (cleanCandidate.includes(` ${cleanSearch} `)) return 80;
  if (cleanCandidate.includes(cleanSearch)) return 60;

  const searchWords = cleanSearch.split(/\s+/).filter((w) => w.length > 2);
  const candidateWords = cleanCandidate
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (searchWords.length === 0) return 0;

  const matchedWords = searchWords.filter((word) =>
    candidateWords.includes(word),
  ).length;

  return (matchedWords / searchWords.length) * 70;
}
