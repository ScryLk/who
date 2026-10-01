/**
 * Room Invite and Code Utilities for WHO?
 * Provides canonical invite URL derivation, room code normalization, and validation.
 */

export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_REGEX = /^[A-Z0-9]{4}$/;

/**
 * Normalizes an arbitrary user input into a canonical 4-character room code.
 * Handles inputs like:
 * - "cdsa" -> "CDSA"
 * - "#CDSA" -> "CDSA"
 * - " CDSA " -> "CDSA"
 * - "https://who.app/?room=CDSA" -> "CDSA"
 * - "/?code=cdsa" -> "CDSA"
 */
export function normalizeRoomCode(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let cleaned = input.trim();

  // If input contains URL or query parameters, attempt to extract room or code parameter
  if (cleaned.includes('?') || cleaned.includes('/')) {
    try {
      // Try URL parsing
      const parsedUrl = cleaned.startsWith('http://') || cleaned.startsWith('https://')
        ? new URL(cleaned)
        : new URL(cleaned, 'http://localhost');

      const roomParam = parsedUrl.searchParams.get('room') || parsedUrl.searchParams.get('code');
      if (roomParam) {
        cleaned = roomParam;
      }
    } catch {
      // Fallback regex if URL parsing fails
      const match = cleaned.match(/[?&](?:room|code)=([a-zA-Z0-9]+)/i);
      if (match && match[1]) {
        cleaned = match[1];
      }
    }
  }

  // Remove leading '#' if present
  if (cleaned.startsWith('#')) {
    cleaned = cleaned.slice(1).trim();
  }

  // Remove non-alphanumeric characters and uppercase
  cleaned = cleaned.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  return cleaned;
}

/**
 * Validates whether a given room code strictly satisfies the 4-character alphanumeric format.
 */
export function isValidRoomCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }
  return ROOM_CODE_REGEX.test(code);
}

/**
 * Derives the canonical invite relative path for a given room code.
 * Always generates the canonical '?room=CODE' format.
 */
export function buildRoomInvitePath(roomCode: string): string {
  const normalized = normalizeRoomCode(roomCode);
  return `/?room=${encodeURIComponent(normalized)}`;
}

/**
 * Builds the canonical full invite URL for a room.
 * In a browser environment, automatically resolves with window.location.origin.
 * In non-browser environments or when an explicit origin is passed, resolves with provided origin.
 */
export function buildRoomInviteUrl(roomCode: string, origin?: string): string {
  const path = buildRoomInvitePath(roomCode);

  if (origin) {
    try {
      return new URL(path, origin).toString();
    } catch {
      return path;
    }
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    try {
      return new URL(path, window.location.origin).toString();
    } catch {
      return path;
    }
  }

  return path;
}

/**
 * Extracts and validates a room code from search parameters or URL string.
 * Supports canonical '?room=ABCD' and legacy '?code=ABCD'.
 * Returns the normalized 4-character code or null if invalid.
 */
export function extractRoomCodeFromUrl(urlOrSearch: string): string | null {
  if (!urlOrSearch || typeof urlOrSearch !== 'string') {
    return null;
  }

  try {
    const searchParams = urlOrSearch.includes('?')
      ? new URLSearchParams(urlOrSearch.slice(urlOrSearch.indexOf('?')))
      : new URLSearchParams(urlOrSearch);

    const raw = searchParams.get('room') || searchParams.get('code');
    if (!raw) {
      return null;
    }

    const normalized = normalizeRoomCode(raw);
    return isValidRoomCode(normalized) ? normalized : null;
  } catch {
    return null;
  }
}
