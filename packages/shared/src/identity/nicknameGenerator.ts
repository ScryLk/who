export const MUSIC_PREFIXES = [
  'Bass',
  'Beat',
  'Vinyl',
  'Groove',
  'Echo',
  'Disco',
  'Tempo',
  'Synth',
  'Jazz',
  'Funk',
  'Melody',
  'Rhythm',
] as const;

export const ANIMAL_SUFFIXES = [
  'Fox',
  'Panda',
  'Wolf',
  'Otter',
  'Bear',
  'Cat',
  'Koala',
  'Tiger',
  'Raven',
  'Gecko',
] as const;

/**
 * Generates a clean, friendly random nickname.
 * Accepts an optional randomFn (returning [0, 1)) for deterministic testing.
 */
export function generateRandomNickname(randomFn: () => number = Math.random): string {
  const prefixIdx = Math.floor(randomFn() * MUSIC_PREFIXES.length);
  const suffixIdx = Math.floor(randomFn() * ANIMAL_SUFFIXES.length);

  const prefix = MUSIC_PREFIXES[Math.min(prefixIdx, MUSIC_PREFIXES.length - 1)];
  const suffix = ANIMAL_SUFFIXES[Math.min(suffixIdx, ANIMAL_SUFFIXES.length - 1)];

  return `${prefix}${suffix}`;
}

/**
 * Generates all possible unique combinations from vocabulary.
 */
export function getAllNicknameCombinations(): string[] {
  const combos: string[] = [];
  for (const prefix of MUSIC_PREFIXES) {
    for (const suffix of ANIMAL_SUFFIXES) {
      combos.push(`${prefix}${suffix}`);
    }
  }
  return combos;
}

/**
 * Generates a nickname ensuring it does not collide with already existing room nicknames.
 * Prefers unused vocabulary combinations before appending minimal friendly numbers.
 */
export function generateUniqueNickname(
  existingNicknames: string[],
  randomFn: () => number = Math.random
): string {
  const existingLowerSet = new Set(existingNicknames.map((n) => n.toLowerCase().trim()));

  // Try generating with vocabulary up to 30 times
  for (let attempt = 0; attempt < 30; attempt++) {
    const candidate = generateRandomNickname(randomFn);
    if (!existingLowerSet.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  // If collisions continue, find first unused combination in vocabulary
  const allCombos = getAllNicknameCombinations();
  for (const candidate of allCombos) {
    if (!existingLowerSet.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  // Fallback if all combinations are exhausted in the room (unlikely with 12 max players)
  const base = generateRandomNickname(randomFn);
  let counter = 2;
  while (existingLowerSet.has(`${base}${counter}`.toLowerCase())) {
    counter++;
  }
  return `${base}${counter}`;
}
