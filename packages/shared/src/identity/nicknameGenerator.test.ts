import {
  generateRandomNickname,
  generateUniqueNickname,
  getAllNicknameCombinations,
  MUSIC_PREFIXES,
  ANIMAL_SUFFIXES,
} from './nicknameGenerator';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`Assertion FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('Running NicknameGenerator Unit Tests...\n');

// Test 1: Controlled vocabulary bounds
const combos = getAllNicknameCombinations();
assert(combos.length === MUSIC_PREFIXES.length * ANIMAL_SUFFIXES.length, 'Total combinations must equal 120');
console.log(`[PASS] Total combinations count: ${combos.length}`);

// Test 2: Deterministic generation with controlled pseudo-random
const deterministicNick = generateRandomNickname(() => 0.0);
assert(deterministicNick === `${MUSIC_PREFIXES[0]}${ANIMAL_SUFFIXES[0]}`, 'First elements match at 0.0');
console.log(`[PASS] Deterministic at 0.0: ${deterministicNick}`);

const deterministicLast = generateRandomNickname(() => 0.999);
assert(
  deterministicLast ===
    `${MUSIC_PREFIXES[MUSIC_PREFIXES.length - 1]}${ANIMAL_SUFFIXES[ANIMAL_SUFFIXES.length - 1]}`,
  'Last elements match at 0.999'
);
console.log(`[PASS] Deterministic at 0.999: ${deterministicLast}`);

// Test 3: Deduplication with existing room players
const existing = ['BassFox', 'BassPanda'];
let seed = 0;
const pseudoRandom = () => {
  seed = (seed + 0.1) % 1;
  return seed;
};

const uniqueNick = generateUniqueNickname(existing, pseudoRandom);
assert(!existing.includes(uniqueNick), `Generated nickname ${uniqueNick} must not collide with existing`);
console.log(`[PASS] Deduplicated nickname generated: ${uniqueNick}`);

console.log('\n========================================');
console.log('All Nickname Generator Tests PASSED!');
console.log('========================================\n');
