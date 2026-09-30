try {
  process.loadEnvFile?.('.env');
} catch (e) {
  // Ignore missing .env file
}

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractYouTubeInfo, searchTracks } from './musicService';
import { searchYouTubeVideos, isYouTubeApiKeyConfigured } from './youtubeService';
import { roomStore } from './roomStore';
import type { Track } from '@who/shared';

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
    const response = await searchTracks('');
    assert.ok(response.length > 0);
    assert.equal(response[0].provider, 'preview');
    assert.equal(response[0].durationSeconds, 30);
    assert.equal(response.provider, 'preview');
    assert.equal(response.fallbackApplied, false);
  });

  it('searchTracks identifies direct YouTube URL and returns YouTube track item', async () => {
    const response = await searchTracks('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s');
    assert.equal(response.length, 1);
    assert.equal(response[0].provider, 'youtube');
    assert.equal(response[0].videoId, 'dQw4w9WgXcQ');
    assert.equal(response[0].startTimeSeconds, 30);
    assert.equal(response.provider, 'youtube');
  });

  it('searchYouTubeVideos returns YOUTUBE_KEY_MISSING when API key is missing', async () => {
    const originalKey = process.env.YOUTUBE_API_KEY;
    try {
      delete process.env.YOUTUBE_API_KEY;
      const res = await searchYouTubeVideos('Queen Bohemian Rhapsody');
      assert.equal(res.success, false);
      assert.equal(res.errorCode, 'YOUTUBE_KEY_MISSING');
      assert.equal(res.tracks.length, 0);

      // Verify musicService falls back gracefully with fallbackApplied: true
      const fallbackRes = await searchTracks('Queen Bohemian Rhapsody');
      assert.equal(fallbackRes.provider, 'preview');
      assert.equal(fallbackRes.fallbackApplied, true);
      assert.equal(fallbackRes.errorCode, 'YOUTUBE_KEY_MISSING');
      assert.ok(fallbackRes.warning && fallbackRes.warning.length > 0);
    } finally {
      process.env.YOUTUBE_API_KEY = originalKey;
    }
  });

  it('performs live YouTube search if API key is configured with full duration > 30s', async () => {
    if (!isYouTubeApiKeyConfigured()) {
      return;
    }

    const response = await searchTracks('Bohemian Rhapsody Queen');
    assert.equal(response.provider, 'youtube');
    assert.equal(response.fallbackApplied, false);
    assert.ok(response.length > 0);

    const firstTrack = response[0];
    assert.equal(firstTrack.provider, 'youtube');
    assert.ok(firstTrack.videoId, 'Track should have videoId');
    // Bohemian Rhapsody is ~355-360 seconds, definitively > 30s and not defaulted to 180
    assert.ok(
      typeof firstTrack.durationSeconds === 'number' && firstTrack.durationSeconds > 180,
      `Duration should be a real number > 180s, got ${firstTrack.durationSeconds}`
    );
  });

  describe('roomStore track submission and clamping', () => {
    it('authoritatively calculates endTimeSeconds and clamps startTimeSeconds', () => {
      const room = roomStore.createRoom('host-1', 'HostPlayer', 'party-1', {
        clipDurationSeconds: 30,
      });

      // Track with 360s duration and selection at 120s
      const ytTrack: Track = {
        id: 'track-yt-1',
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        audioUrl: '',
        submittedByPlayerId: 'host-1',
        durationSeconds: 360,
        provider: 'youtube',
        videoId: 'fJ9rUzIMcZQ',
        startTimeSeconds: 120,
        endTimeSeconds: 999, // Attempted invalid client value
      };

      const submitRes = roomStore.submitTrack(room.code, 'host-1', ytTrack);
      assert.ok(submitRes.room);

      const submitted = submitRes.room.submittedTracks[0];
      assert.ok(submitted);
      assert.equal(submitted.startTimeSeconds, 120);
      // Server must override client's 999 with 120 + 30 = 150
      assert.equal(submitted.endTimeSeconds, 150);
    });

    it('clamps startTimeSeconds if selection exceeds video bounds', () => {
      const room = roomStore.createRoom('host-2', 'HostPlayer2', 'party-2', {
        clipDurationSeconds: 30,
      });

      // Track with 200s duration, but client passed startTimeSeconds = 190
      const ytTrack: Track = {
        id: 'track-yt-2',
        title: 'Test Song',
        artist: 'Test Artist',
        audioUrl: '',
        submittedByPlayerId: 'host-2',
        durationSeconds: 200,
        provider: 'youtube',
        videoId: 'testVid123',
        startTimeSeconds: 190,
      };

      const submitRes = roomStore.submitTrack(room.code, 'host-2', ytTrack);
      assert.ok(submitRes.room);

      const submitted = submitRes.room.submittedTracks[0];
      assert.ok(submitted);
      // Clamped to 200 - 30 = 170
      assert.equal(submitted.startTimeSeconds, 170);
      assert.equal(submitted.endTimeSeconds, 200);
    });

    it('handles player leaving room with host migration or room deletion', () => {
      // Scenario A: Host leaves with bot remaining -> room deleted
      const botRoom = roomStore.createRoom('solo-host', 'SoloHost', 'party-1');
      roomStore.addBotPlayer(botRoom.code);
      const leaveRes = roomStore.leaveRoom(botRoom.code, 'solo-host');
      assert.equal(leaveRes.deleted, true);
      assert.equal(roomStore.getRoom(botRoom.code), undefined);

      // Scenario B: Host leaves with another human player remaining -> host migrated
      const multiRoom = roomStore.createRoom('host-a', 'HostA', 'party-1');
      roomStore.joinRoom(multiRoom.code, 'human-b', 'PlayerB', 'party-2');
      const multiLeave = roomStore.leaveRoom(multiRoom.code, 'host-a');
      assert.equal(multiLeave.deleted, undefined);
      assert.ok(multiLeave.room);
      assert.equal(multiLeave.room.players.length, 1);
      assert.equal(multiLeave.room.hostId, 'human-b');
      assert.equal(multiLeave.room.players[0].isHost, true);
    });

    it('sets server-authoritative selectionDeadlineAt on turn start and handles timeout gracefully', () => {
      const room = roomStore.createRoom('p1', 'Player1', 'p-1', {
        musicSelectionDurationSeconds: 90,
        clipDurationSeconds: 20,
      });
      roomStore.joinRoom(room.code, 'p2', 'Player2', 'p-2');

      const startedRoom = roomStore.startTurnSequence(room.code);
      assert.ok(startedRoom);
      assert.equal(startedRoom.phase, 'MUSIC_SELECTION');
      assert.equal(startedRoom.turnTimeRemainingSeconds, 90);
      assert.ok(startedRoom.selectionDeadlineAt);
      // Deadline should be approximately 90s in the future
      const now = Date.now();
      assert.ok(startedRoom.selectionDeadlineAt >= now + 88000);
      assert.ok(startedRoom.selectionDeadlineAt <= now + 92000);

      // Timeout execution: player 1 has not selected a track, auto-picks from catalog
      const timeoutRes = roomStore.handleTurnTimeout(room.code);
      assert.ok(timeoutRes);
      assert.equal(timeoutRes.submittedTracks.length, 1);
      assert.ok(timeoutRes.submittedTracks[0].title);
    });
  });
});
