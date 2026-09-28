/**
 * YouTube duration, URL parsing and timestamp utilities.
 * Compliant with ISO-8601 duration format returned by YouTube Data API v3.
 */

/**
 * Parses an ISO-8601 duration string into seconds.
 * Example formats:
 * - PT4M33S -> 273
 * - PT1H2M10S -> 3730
 * - PT45S -> 45
 * - PT2M -> 120
 * - PT1H -> 3600
 */
export function parseYouTubeDuration(duration: string | null | undefined): number {
  if (!duration || typeof duration !== 'string') {
    return 0;
  }

  const regex = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i;
  const match = duration.match(regex);
  if (!match) {
    return 0;
  }

  const days = parseInt(match[1] || '0', 10);
  const hours = parseInt(match[2] || '0', 10);
  const minutes = parseInt(match[3] || '0', 10);
  const seconds = parseInt(match[4] || '0', 10);

  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

/**
 * Extracts the 11-character YouTube video ID from various URL patterns
 * or returns the string if it is already a valid 11-character video ID.
 */
export function extractYouTubeVideoId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') {
    return null;
  }

  const trimmed = urlOrId.trim();

  // If already an 11-character ID (alphanumeric, -, _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Matches youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
  const match = trimmed.match(regExp);

  return match && match[1] ? match[1] : null;
}

/**
 * Extracts start time in seconds from YouTube URL query parameter (?t=X or &t=X).
 */
export function extractYouTubeStartTime(url: string | null | undefined): number {
  if (!url || typeof url !== 'string') {
    return 0;
  }

  const timeMatch = url.match(/[?&]t=([^&#]+)/i);
  if (!timeMatch) {
    return 0;
  }

  const rawTime = timeMatch[1].toLowerCase().trim();

  // Simple number in seconds (e.g., 90 or 90s)
  if (!rawTime.includes('h') && !rawTime.includes('m')) {
    const sOnly = rawTime.replace('s', '');
    return parseInt(sOnly, 10) || 0;
  }

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  const hMatch = rawTime.match(/(\d+)h/);
  if (hMatch) {
    hours = parseInt(hMatch[1], 10) || 0;
  }

  const mMatch = rawTime.match(/(\d+)m/);
  if (mMatch) {
    minutes = parseInt(mMatch[1], 10) || 0;
  }

  const sRemainder = rawTime.replace(/\d+h/, '').replace(/\d+m/, '');
  const sMatch = sRemainder.match(/(\d+)s?/);
  if (sMatch) {
    seconds = parseInt(sMatch[1], 10) || 0;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Formats seconds into MM:SS or HH:MM:SS string.
 */
export function formatDurationDisplay(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds <= 0) {
    return '00:00';
  }

  const rounded = Math.floor(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');

  if (hours > 0) {
    const hh = hours.toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
}
