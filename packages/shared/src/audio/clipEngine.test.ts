import {
  clampHead,
  clampSelectionStart,
  calculateClipBounds,
  shiftClipWindow,
  isInsideClip,
  shouldStopPlayback,
} from './clipEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`Assertion FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('Running ClipEngine Unit Tests...\n');

// Test 1: Invariant HEAD >= 0
assert(clampHead(-10, 30, 180) === 0, 'Negative HEAD must be clamped to 0');
console.log('[PASS] Negative HEAD clamped to 0');

// Test 2: Invariant TAIL <= totalDuration
const boundsEnd = calculateClipBounds(170, 30, 180);
assert(boundsEnd.head === 150, 'HEAD must clamp so tail reaches exactly 180');
assert(boundsEnd.tail === 180, 'TAIL must not exceed totalDuration');
assert(boundsEnd.duration === 30, 'Duration must equal clip duration');
console.log(`[PASS] Upper bounds: head=${boundsEnd.head}, tail=${boundsEnd.tail}`);

// Test 3: Short track where totalDuration < clipDuration
const shortBounds = calculateClipBounds(0, 30, 20);
assert(shortBounds.head === 0, 'HEAD is 0');
assert(shortBounds.tail === 20, 'TAIL is capped by total track length');
assert(shortBounds.duration === 20, 'Duration matches track length');
console.log(`[PASS] Short track bounds: duration=${shortBounds.duration}`);

// Test 4: Window shifting preserving duration
const shifted = shiftClipWindow(10, 5, 30, 180);
assert(shifted.head === 15, 'Shifted head is 15');
assert(shifted.tail === 45, 'Shifted tail is 45');
assert(shifted.duration === 30, 'Duration remains 30');
console.log('[PASS] Window shift preserved duration');

// Test 5: Playback boundary check
assert(isInsideClip(15, 10, 40) === true, '15 is inside [10, 40]');
assert(isInsideClip(5, 10, 40) === false, '5 is outside [10, 40]');
assert(shouldStopPlayback(39.98, 40, 0.05) === true, 'Within tolerance stops playback');
// Test 6: clampSelectionStart examples from section 69
assert(clampSelectionStart(10, 30, 30) === 0, 'duration=30, clip=30, desired=10 must be 0');
assert(clampSelectionStart(10, 60, 30) === 10, 'duration=60, clip=30, desired=10 must be 10');
assert(clampSelectionStart(40, 60, 30) === 30, 'duration=60, clip=30, desired=40 must be 30');
assert(clampSelectionStart(45, 60, 15) === 45, 'duration=60, clip=15, desired=45 must be 45');
assert(clampSelectionStart(-10, 60, 30) === 0, 'desired=-10 must clamp to 0');
assert(clampSelectionStart(50, 60, 30) === 30, 'desired=50 beyond max must clamp to 30');
console.log('[PASS] clampSelectionStart examples verified');

console.log('\n========================================');
console.log('All Clip Engine Tests PASSED!');
console.log('========================================\n');
