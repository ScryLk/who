import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { roomStore } from './roomStore';
import { Track, SecondaryPredictionKind, getTrackUniqueKey } from '@who/shared';

describe('Security, Rules, Authorization and Zero-Leak Integration Tests', () => {
  it('DevTools Leak Defense: sanitizes selectedTrack and submittedTracks during MUSIC_SELECTION', () => {
    const hostId = 'p1-host';
    const p2Id = 'p2-guesser';
    const p3Id = 'p3-guesser';

    const room = roomStore.createRoom(hostId, 'HostAlice', 'party-1', {
      startingChips: 1000,
    });
    roomStore.joinRoom(room.code, p2Id, 'Bob', 'party-2');
    roomStore.joinRoom(room.code, p3Id, 'Charlie', 'party-3');

    roomStore.setPlayerReady(room.code, p2Id, true);
    roomStore.setPlayerReady(room.code, p3Id, true);

    // Start game
    roomStore.startTurnSequence(room.code);
    assert.equal(room.phase, 'MUSIC_SELECTION');
    assert.equal(room.currentTurnPlayerId, hostId);

    // Host submits secret song
    const secretTrackP1: Omit<Track, 'submittedByPlayerId'> = {
      id: 'song-alice-secret',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      albumArt: 'https://example.com/queen.jpg',
      audioUrl: 'https://example.com/bohemian.mp3',
      genre: 'Rock',
      durationSeconds: 354,
      startTimeSeconds: 60,
      provider: 'preview',
    };

    const submitRes = roomStore.submitTrack(room.code, hostId, secretTrackP1);
    assert.ok(submitRes.room);

    // AUDIT: DevTools inspection by Bob (p2Id)
    const bobView = roomStore.getSanitizedRoomState(room.code, p2Id);
    assert.ok(bobView);

    // 1. Bob must NOT see Alice's selectedTrack in players array
    const aliceInBobView = bobView.players.find((p) => p.id === hostId);
    assert.ok(aliceInBobView);
    assert.equal(aliceInBobView.selectedTrack, undefined, 'SelectedTrack must be stripped for other players');

    // 2. Bob must NOT see Alice's track title, artist, audioUrl in submittedTracks
    const submittedInBobView = bobView.submittedTracks;
    assert.equal(submittedInBobView.length, 1);
    assert.equal(submittedInBobView[0].title, 'Faixa Secreta');
    assert.equal(submittedInBobView[0].artist, 'Artista Secreto');
    assert.equal(submittedInBobView[0].audioUrl, '');
    assert.equal(submittedInBobView[0].submittedByPlayerId, 'SECRET_OWNER');

    // 3. Alice (hostId) CAN see her own submitted track
    const aliceView = roomStore.getSanitizedRoomState(room.code, hostId);
    assert.ok(aliceView);
    assert.equal(aliceView.submittedTracks[0].title, 'Bohemian Rhapsody');
    assert.equal(aliceView.submittedTracks[0].submittedByPlayerId, hostId);
  });

  it('DevTools Leak Defense: masks future round tracks, bets and owner during BETTING phase', () => {
    const hostId = 'owner-p1';
    const guesserId = 'guesser-p2';

    const room = roomStore.createRoom(hostId, 'OwnerPlayer', 'party-1', {
      startingChips: 1000,
    });
    roomStore.joinRoom(room.code, guesserId, 'GuesserPlayer', 'party-2');

    // Submit track for P1
    roomStore.submitTrack(room.code, hostId, {
      id: 'track-1',
      title: 'Round 1 Mystery',
      artist: 'Artist 1',
      audioUrl: 'https://example.com/1.mp3',
      genre: 'Pop',
      durationSeconds: 180,
      startTimeSeconds: 10,
    });

    // Submit track for P2
    roomStore.submitTrack(room.code, guesserId, {
      id: 'track-2',
      title: 'Round 2 Mystery',
      artist: 'Artist 2',
      audioUrl: 'https://example.com/2.mp3',
      genre: 'Rock',
      durationSeconds: 200,
      startTimeSeconds: 20,
    });

    // Set Owner Prediction for P1
    roomStore.placeOwnerBet(room.code, hostId, 'PLAYER_COUNT', 200, undefined, 1);

    // Advance to BETTING
    roomStore.startBettingRound(room.code);
    assert.equal(room.phase, 'BETTING');
    assert.equal(room.currentRound, 1);

    // Total rounds must strictly equal submitted tracks
    assert.equal(room.totalRounds, 2);

    const currentOwnerId = room.currentTrack!.submittedByPlayerId;
    const nonOwnerId = currentOwnerId === hostId ? guesserId : hostId;

    // Guesser places bet
    const betRes = roomStore.placeGuesserBet(room.code, nonOwnerId, currentOwnerId, 300);
    assert.equal(betRes.accepted, true);

    // AUDIT: Check sanitized state for Guesser
    const guesserView = roomStore.getSanitizedRoomState(room.code, nonOwnerId);
    assert.ok(guesserView);

    // 1. Current track owner must be hidden
    assert.equal(guesserView.currentTrack?.submittedByPlayerId, 'SECRET_OWNER');

    // 2. Future round track (index 1) must be masked to Faixa Futura
    assert.equal(guesserView.submittedTracks[1].title, 'Faixa Futura');
    assert.equal(guesserView.submittedTracks[1].submittedByPlayerId, 'SECRET_OWNER');

    // 3. Guesser must NOT see ownerBet
    assert.equal(guesserView.ownerBet, undefined);

    // 4. Guesser sees their own guesserBet, but not other players' full bets
    assert.ok(guesserView.guesserBets[nonOwnerId]);
    assert.equal(guesserView.guesserBets[nonOwnerId].chipAmount, 300);
  });

  it('Enforces Track Uniqueness (TRACK_ALREADY_SELECTED rejection)', () => {
    const room = roomStore.createRoom('p1', 'PlayerOne', 'party-1');
    roomStore.joinRoom(room.code, 'p2', 'PlayerTwo', 'party-2');

    const songA: Omit<Track, 'submittedByPlayerId'> = {
      id: 'catalog-song-1',
      title: 'Stairway to Heaven',
      artist: 'Led Zeppelin',
      audioUrl: 'https://example.com/stairway.mp3',
      genre: 'Classic Rock',
      durationSeconds: 480,
      startTimeSeconds: 30,
    };

    const firstSubmit = roomStore.submitTrack(room.code, 'p1', songA);
    assert.ok(firstSubmit.room);
    assert.equal(firstSubmit.error, undefined);

    // Player 2 attempts to submit the exact same track
    const duplicateSubmit = roomStore.submitTrack(room.code, 'p2', songA);
    assert.equal(duplicateSubmit.error, 'TRACK_ALREADY_SELECTED');
    assert.equal(duplicateSubmit.room, undefined);
  });

  it('Preserves track draft when timeout occurs in MUSIC_SELECTION', () => {
    const room = roomStore.createRoom('p1', 'PlayerOne', 'party-1');
    room.phase = 'MUSIC_SELECTION';
    room.currentTurnPlayerId = 'p1';

    const draftSong: Omit<Track, 'submittedByPlayerId'> = {
      id: 'custom-draft-1',
      title: 'My Carefully Selected Song',
      artist: 'Draft Artist',
      audioUrl: 'https://example.com/draft.mp3',
      genre: 'Indie',
      durationSeconds: 120,
      startTimeSeconds: 45,
    };

    // Active player saves draft upon clicking Confirmar Trecho
    const saved = roomStore.saveTrackDraft(room.code, 'p1', draftSong);
    assert.equal(saved, true);

    // Timeout triggers
    const updated = roomStore.handleTurnTimeout(room.code);
    assert.ok(updated);

    // Submitted track should be the draft, not a random catalog fallback
    assert.equal(updated.submittedTracks[0].title, 'My Carefully Selected Song');
    assert.equal(updated.submittedTracks[0].startTimeSeconds, 45);
  });

  it('Economy: reserves chips on owner bet and prevents guesser overcommit', () => {
    const room = roomStore.createRoom('p1', 'Alice', 'party-1', {
      startingChips: 1000,
    });
    roomStore.joinRoom(room.code, 'p2', 'Bob', 'party-2');

    room.phase = 'BETTING';
    room.currentRound = 1;
    room.totalRounds = 2;
    room.startingBalances = { p1: 1000, p2: 1000 };

    room.currentTrack = {
      id: 'track-1',
      title: 'Song 1',
      artist: 'Artist 1',
      audioUrl: '',
      submittedByPlayerId: 'p1',
    };

    // 1. Owner attempts to guess on their own song -> rejected
    const ownerGuess = roomStore.placeGuesserBet(room.code, 'p1', 'p2', 100);
    assert.equal(ownerGuess.accepted, false);
    assert.equal(ownerGuess.error, 'O dono da música não pode apostar como adivinhador.');

    // 2. Guesser attempts to guess on themselves -> rejected
    const selfGuess = roomStore.placeGuesserBet(room.code, 'p2', 'p2', 100);
    assert.equal(selfGuess.accepted, false);
    assert.equal(selfGuess.error, 'Você não pode apostar em você mesmo.');

    // 3. Guesser attempts decimal or negative bet -> rejected
    const invalidBet = roomStore.placeGuesserBet(room.code, 'p2', 'p1', -50);
    assert.equal(invalidBet.accepted, false);

    // 4. Guesser bets more chips than balance -> rejected
    const overBet = roomStore.placeGuesserBet(room.code, 'p2', 'p1', 1500);
    assert.equal(overBet.accepted, false);
    assert.equal(overBet.code, 'INSUFFICIENT_CHIPS');

    // 5. Valid guesser bet -> accepted
    const validGuess = roomStore.placeGuesserBet(room.code, 'p2', 'p1', 400);
    assert.equal(validGuess.accepted, true);
    assert.equal(validGuess.remainingBalance, 600);
  });

  it('Owner Prediction: respects enableOwnerPrediction=false setting', () => {
    const room = roomStore.createRoom('p1', 'Alice', 'party-1', {
      enableOwnerPrediction: false,
    });

    const betRes = roomStore.placeOwnerBet(room.code, 'p1', 'PLAYER_COUNT', 100, undefined, 1);
    assert.equal(betRes.accepted, false);
    assert.equal(betRes.error, 'Previsões do dono estão desativadas nesta sala.');
  });

  it('Cryptographic Reconnection: rejects forgery and rotates token upon successful reconnect', () => {
    const hostId = 'socket-original-1';
    const room = roomStore.createRoom(hostId, 'Alice', 'party-1');

    const originalToken = roomStore.getReconnectToken(room.code, hostId);
    assert.ok(originalToken);
    assert.equal(typeof originalToken, 'string');
    assert.ok(originalToken.length >= 16);

    // Attempt reconnect with counterfeit token
    const forgedValid = roomStore.validateReconnectToken(room.code, hostId, 'counterfeit-token-12345');
    assert.equal(forgedValid, false);

    // Attempt reconnect with valid token
    const newSocketId = 'socket-reconnected-2';
    const rotatedToken = roomStore.rotateReconnectToken(room.code, hostId, newSocketId, originalToken);
    assert.ok(rotatedToken);
    assert.notEqual(rotatedToken, originalToken);

    // Old token must no longer be valid
    const oldStillValid = roomStore.validateReconnectToken(room.code, hostId, originalToken);
    assert.equal(oldStillValid, false);

    // New token is valid for new player socket ID
    const newValid = roomStore.validateReconnectToken(room.code, newSocketId, rotatedToken);
    assert.equal(newValid, true);
  });

  it('Leave room cleans up reconnect tokens and player records', () => {
    const room = roomStore.createRoom('h1', 'Alice', 'party-1');
    roomStore.joinRoom(room.code, 'p2', 'Bob', 'party-2');

    assert.ok(roomStore.getReconnectToken(room.code, 'p2'));

    // P2 leaves
    const res = roomStore.leaveRoom(room.code, 'p2');
    assert.ok(res.room);
    assert.equal(roomStore.getReconnectToken(room.code, 'p2'), undefined);

    // Host leaves -> room completely deleted
    const hostLeave = roomStore.leaveRoom(room.code, 'h1');
    assert.equal(hostLeave.deleted, true);
    assert.equal(roomStore.getRoom(room.code), undefined);
    assert.equal(roomStore.getReconnectToken(room.code, 'h1'), undefined);
  });

  it('Join Room Error Codes: returns ROOM_NOT_FOUND, ROOM_FULL, and GAME_ALREADY_STARTED', () => {
    // 1. ROOM_NOT_FOUND
    const notFoundRes = roomStore.joinRoom('ZZZZ', 'p-unknown', 'Ghost', 'party-1');
    assert.equal(notFoundRes.errorCode, 'ROOM_NOT_FOUND');
    assert.ok(notFoundRes.error);

    // 2. ROOM_FULL
    const room = roomStore.createRoom('h-full', 'Alice', 'party-1', { maxPlayers: 2 });
    const p2Res = roomStore.joinRoom(room.code, 'p2-full', 'Bob', 'party-2');
    assert.ok(p2Res.room);
    assert.equal(p2Res.errorCode, undefined);

    // Third player should get ROOM_FULL
    const p3Res = roomStore.joinRoom(room.code, 'p3-overflow', 'Charlie', 'party-3');
    assert.equal(p3Res.errorCode, 'ROOM_FULL');
    assert.ok(p3Res.error);

    // 3. GAME_ALREADY_STARTED
    roomStore.setPlayerReady(room.code, 'p2-full', true);
    roomStore.startTurnSequence(room.code);
    assert.notEqual(room.phase, 'LOBBY');

    const lateJoinRes = roomStore.joinRoom(room.code, 'p4-late', 'Dave', 'party-4');
    assert.equal(lateJoinRes.errorCode, 'GAME_ALREADY_STARTED');
    assert.ok(lateJoinRes.error);
  });
});
