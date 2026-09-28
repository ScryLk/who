export interface ClipBounds {
  head: number;
  tail: number;
  duration: number;
}

/**
 * Clamps HEAD so that:
 * 0 <= HEAD <= max(0, totalDuration - clipDuration)
 */
export function clampHead(
  desiredHead: number,
  clipDuration: number,
  totalDuration: number
): number {
  if (isNaN(desiredHead) || desiredHead <= 0) return 0;
  if (totalDuration <= 0) return 0;

  const effectiveClipDuration = Math.min(clipDuration, totalDuration);
  const maxHead = Math.max(0, totalDuration - effectiveClipDuration);

  return Math.min(maxHead, Math.max(0, desiredHead));
}

/**
 * Calculates guaranteed valid clip boundaries obeying:
 * 0 <= HEAD < TAIL <= totalDuration (when totalDuration > 0)
 * TAIL - HEAD === min(clipDuration, totalDuration)
 */
export function calculateClipBounds(
  desiredHead: number,
  clipDuration: number,
  totalDuration: number
): ClipBounds {
  const safeTotalDuration = Math.max(0, totalDuration);
  const effectiveClipDuration = Math.min(Math.max(1, clipDuration), safeTotalDuration || clipDuration);
  const head = clampHead(desiredHead, effectiveClipDuration, safeTotalDuration);
  const tail = Math.min(safeTotalDuration, head + effectiveClipDuration);

  return {
    head: Math.round(head * 100) / 100,
    tail: Math.round(tail * 100) / 100,
    duration: Math.round((tail - head) * 100) / 100,
  };
}

/**
 * Shifts the selection window by deltaSeconds while strictly preserving duration.
 */
export function shiftClipWindow(
  currentHead: number,
  deltaSeconds: number,
  clipDuration: number,
  totalDuration: number
): ClipBounds {
  return calculateClipBounds(currentHead + deltaSeconds, clipDuration, totalDuration);
}

/**
 * Checks if a playback timestamp is strictly within the active clip.
 */
export function isInsideClip(currentTime: number, head: number, tail: number): boolean {
  return currentTime >= head && currentTime <= tail;
}

/**
 * Determines if audio playback reached the TAIL boundary with a small tolerance.
 */
export function shouldStopPlayback(
  currentTime: number,
  tail: number,
  toleranceSeconds = 0.05
): boolean {
  return currentTime >= tail - toleranceSeconds;
}
