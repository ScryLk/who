import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseYouTubeDuration,
  extractYouTubeVideoId,
  extractYouTubeStartTime,
  formatDurationDisplay,
} from './youtubeParser';

describe('YouTube Parser Utilities', () => {
  it('parses standard ISO-8601 durations correctly', () => {
    // PT4M33S -> 4*60 + 33 = 273
    assert.equal(parseYouTubeDuration('PT4M33S'), 273);

    // PT1H2M10S -> 3600 + 120 + 10 = 3730
    assert.equal(parseYouTubeDuration('PT1H2M10S'), 3730);

    // PT45S -> 45
    assert.equal(parseYouTubeDuration('PT45S'), 45);

    // PT3M -> 180
    assert.equal(parseYouTubeDuration('PT3M'), 180);

    // PT2H -> 7200
    assert.equal(parseYouTubeDuration('PT2H'), 7200);

    // Empty or invalid
    assert.equal(parseYouTubeDuration(''), 0);
    assert.equal(parseYouTubeDuration(undefined), 0);
    assert.equal(parseYouTubeDuration('invalid'), 0);
  });

  it('extracts YouTube video IDs across different URL formats', () => {
    // Raw 11-char ID
    assert.equal(extractYouTubeVideoId('dQw4w9WgXcQ'), 'dQw4w9WgXcQ');

    // Standard watch URL
    assert.equal(
      extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      'dQw4w9WgXcQ'
    );

    // Standard watch URL with additional query params
    assert.equal(
      extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&feature=shared'),
      'dQw4w9WgXcQ'
    );

    // Shortened URL
    assert.equal(
      extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=10'),
      'dQw4w9WgXcQ'
    );

    // Embed URL
    assert.equal(
      extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'),
      'dQw4w9WgXcQ'
    );

    // Shorts URL
    assert.equal(
      extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'),
      'dQw4w9WgXcQ'
    );

    // Invalid or empty
    assert.equal(extractYouTubeVideoId(''), null);
    assert.equal(extractYouTubeVideoId('https://google.com'), null);
  });

  it('extracts start time parameters accurately', () => {
    assert.equal(extractYouTubeStartTime('https://youtu.be/dQw4w9WgXcQ?t=90'), 90);
    assert.equal(extractYouTubeStartTime('https://youtu.be/dQw4w9WgXcQ?t=90s'), 90);
    assert.equal(extractYouTubeStartTime('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=2m30s'), 150);
    assert.equal(extractYouTubeStartTime('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h10m5s'), 4205);
    assert.equal(extractYouTubeStartTime('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 0);
  });

  it('formats duration display neatly', () => {
    assert.equal(formatDurationDisplay(0), '00:00');
    assert.equal(formatDurationDisplay(45), '00:45');
    assert.equal(formatDurationDisplay(273), '04:33');
    assert.equal(formatDurationDisplay(3730), '01:02:10');
  });
});
