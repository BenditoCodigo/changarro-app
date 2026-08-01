/**
 * Normalizes text by converting to lowercase, decomposing characters (NFD),
 * and removing diacritics (accents, dieresis, tildes like ñ -> n).
 */
export function normalizeText(str: string): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Replaces punctuation/separators with spaces and normalizes the text.
 * Used for contiguous substring matching.
 */
export function cleanText(str: string): string {
  return normalizeText(str)
    .replace(/[-.,_/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calculates the Damerau-Levenshtein distance between two words.
 * It measures the number of insertions, deletions, substitutions, and
 * transpositions of adjacent characters to transform word 'a' into word 'b'.
 */
export function damerauLevenshtein(a: string, b: string): number {
  const al = a.length
  const bl = b.length
  if (al === 0) return bl
  if (bl === 0) return al

  const matrix: number[][] = Array.from({ length: al + 1 }, () => Array(bl + 1).fill(0))

  for (let i = 0; i <= al; i++) {
    matrix[i]![0] = i
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0]![j] = j
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,       // deletion
        matrix[i]![j - 1]! + 1,       // insertion
        matrix[i - 1]![j - 1]! + cost // substitution
      )

      // Transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i]![j] = Math.min(
          matrix[i]![j]!,
          matrix[i - 2]![j - 2]! + cost // transposition
        )
      }
    }
  }

  return matrix[al]![bl]!
}

/**
 * Filters and ranks a list of items using a fuzzy, case-insensitive,
 * and diacritic-insensitive search.
 *
 * @param items List of items to search
 * @param query The search query typed by the user
 * @param keys Keys of the item to search in (must be string fields)
 */
export function searchItems<T>(items: T[], query: string, keys: (keyof T)[]): T[] {
  const queryTrimmed = query.trim()
  if (!queryTrimmed) return items

  const queryCleaned = cleanText(queryTrimmed)
  const qWords = queryCleaned.split(/\s+/).filter(Boolean)

  if (qWords.length === 0) return items

  const scoredItems: { item: T; score: number }[] = []

  for (const item of items) {
    let allQueryWordsMatched = true
    let totalWordScore = 0

    // Collect all target words from the item's keys
    const allTargetWords: string[] = []
    for (const key of keys) {
      const val = item[key]
      if (typeof val !== 'string') continue
      const targetWords = cleanText(val).split(/\s+/).filter(Boolean)
      allTargetWords.push(...targetWords)
    }

    // Evaluate match score for each query word
    for (const qw of qWords) {
      let bestWordScore = 0

      for (const tw of allTargetWords) {
        let score = 0

        if (qw === tw) {
          score = 10
        } else if (tw.startsWith(qw)) {
          score = 8 * (qw.length / tw.length)
        } else if (qw.length >= 3 && tw.includes(qw)) {
          score = 5 * (qw.length / tw.length)
        } else {
          // Fuzzy matching
          const qlen = qw.length
          if (qlen >= 4) {
            const dist = damerauLevenshtein(qw, tw)
            if (qlen <= 7 && dist <= 1) {
              score = 3
            } else if (qlen >= 8) {
              if (dist === 1) {
                score = 4
              } else if (dist === 2) {
                score = 2
              }
            }
          }
        }

        if (score > bestWordScore) {
          bestWordScore = score
        }
      }

      if (bestWordScore === 0) {
        allQueryWordsMatched = false
        break
      } else {
        totalWordScore += bestWordScore
      }
    }

    if (allQueryWordsMatched && totalWordScore > 0) {
      // Check if the full query exists contiguously in any of the keys
      let isContiguousMatch = false
      for (const key of keys) {
        const val = item[key]
        if (typeof val !== 'string') continue
        if (cleanText(val).includes(queryCleaned)) {
          isContiguousMatch = true
          break
        }
      }

      // Apply a large boost for contiguous matches to prioritize them
      const finalScore = isContiguousMatch ? totalWordScore + 100 : totalWordScore
      scoredItems.push({ item, score: finalScore })
    }
  }

  // Sort by score descending
  return scoredItems
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item)
}
