import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractYouTubeInfo, searchTracks } from './musicService';

describe('Server Music and YouTube Service Tests', () => {
  it('extracts youtube info from watch and youtu.be URLs', () => {
    const watchUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=45s';
    const watchRes = extractYouTubeInfo(watchUrl);
    assert.equal(watchRes.youtubeId, 'dQw4w9WgXcQ');
    assert.equal(watchRes.startTimeSeconds, 45);

    const shortUrl = 'https://youtu.be/dQw4w9WgXcQ?t=2m10s';
    const shortRes = extractYouTubeInfo(shortUrl);
    assert.equal(shortRes.youtubeId, 'dQw4w9WgXcQ');
    assert.equal(shortRes.startTimeSeconds, 130);
  });

  it('searchTracks returns featured catalog when query is empty', async () => {
    const results = await searchTracks('');
    assert.ok(results.length > 0);
    assert.equal(results[0].provider, 'preview');
    assert.equal(results[0].durationSeconds, 30);
  });

  it('searchTracks identifies direct YouTube URL and returns YouTube track item', async () => {
    const results = await searchTracks('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s');
    assert.equal(results.length, 1);
    assert.equal(results[0].provider, 'youtube');
    assert.equal(results[0].videoId, 'dQw4w9WgXcQ');
    assert.equal(results[0].startTimeSeconds, 30);
  });
});
