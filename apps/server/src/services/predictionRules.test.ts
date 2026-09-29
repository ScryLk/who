import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  requiresExpectedCount,
  getExpectedCountBounds,
  clampExpectedCount,
  getPredictionDescription,
  normalizeOwnerPrediction,
  validateOwnerPrediction,
  calculateRoundResolution,
  Track,
  Player,
  GuesserBet,
  OwnerBet,
} from '@who/shared';
import { roomStore } from './roomStore';

describe('Owner Prediction Rules & Settlement Tests', () => {
  describe('requiresExpectedCount', () => {
    it('correctly identifies kinds requiring expectedCount', () => {
      assert.equal(requiresExpectedCount('PLAYER_COUNT'), true);
      assert.equal(requiresExpectedCount('MORE_THAN'), true);
      assert.equal(requiresExpectedCount('FEWER_THAN'), true);
      assert.equal(requiresExpectedCount('SPECIFIC_PLAYERS'), false);
      assert.equal(requiresExpectedCount('NONE'), false);
      assert.equal(requiresExpectedCount(undefined), false);
    });
  });

  describe('getExpectedCountBounds and range validation', () => {
    const eligibleCount = 4;

    it('calculates bounds for PLAYER_COUNT (1..eligibleCount)', () => {
      const bounds = getExpectedCountBounds('PLAYER_COUNT', eligibleCount);
      assert.equal(bounds.min, 1);
      assert.equal(bounds.max, 4);
      assert.equal(bounds.isAvailable, true);

      // Validation
      assert.equal(
        validateOwnerPrediction(
          { predictionKind: 'PLAYER_COUNT', expectedCount: 1, chipAmount: 100, availableBalance: 500 },
          eligibleCount
        ).valid,
        true
      );
      assert.equal(
        validateOwnerPrediction(
          { predictionKind: 'PLAYER_COUNT', expectedCount: 4, chipAmount: 100, availableBalance: 500 },
          eligibleCount
        ).valid,
        true
      );
      assert.equal(
        validateOwnerPrediction(
          { predictionKind: 'PLAYER_COUNT', expectedCount: -1, chipAmount: 100, availableBalance: 500 },
          eligibleCount
        ).valid,
        false
      );
      assert.equal(
        validateOwnerPrediction(
          { predictionKind: 'PLAYER_COUNT', expectedCount: 5, chipAmount: 100, availableBalance: 500 },
          eligibleCount
        ).valid,
        false
      );
      assert.equal(
        validateOwnerPrediction(
          { predictionKind: 'PLAYER_COUNT', expectedCount: 1.5, chipAmount: 100, availableBalance: 500 },
          eligibleCount
        ).valid,
        false
      );
      assert.equal(
        validateOwnerPrediction(
          { predictionKind: 'PLAYER_COUNT', expectedCount: NaN, chipAmount: 100, availableBalance: 500 },
          eligibleCount
        ).valid,
        false
      );
    });

    it('calculates bounds for MORE_THAN (1..(eligibleCount - 1))', () => {
      const bounds = getExpectedCountBounds('MORE_THAN', eligibleCount);
      assert.equal(bounds.min, 1);
      assert.equal(bounds.max, 3);
      assert.equal(bounds.isAvailable, true);

      // Max is 3 because > 4 with 4 players is impossible
      assert.equal(
        validateOwnerPrediction(
          { predictionKind: 'MORE_THAN', expectedCount: 3, chipAmount: 100, availableBalance: 500 },
          eligibleCount
        ).valid,
        true
      );
      assert.equal(
        validateOwnerPrediction(
          { predictionKind: 'MORE_THAN', expectedCount: 4, chipAmount: 100, availableBalance: 500 },
          eligibleCount
        ).valid,
        false
      );
    });

    it('calculates bounds for FEWER_THAN (2..eligibleCount)', () => {
      const bounds = getExpectedCountBounds('FEWER_THAN', eligibleCount);
      assert.equal(bounds.min, 2);
      assert.equal(bounds.max, 4);
      assert.equal(bounds.isAvailable, true);

      // Min is 2 because < 1 is 0 (which is NONE)
      assert.equal(
        validateOwnerPrediction(
          { predictionKind: 'FEWER_THAN', expectedCount: 2, chipAmount: 100, availableBalance: 500 },
          eligibleCount
        ).valid,
        true
      );
      assert.equal(
        validateOwnerPrediction(
          { predictionKind: 'FEWER_THAN', expectedCount: 1, chipAmount: 100, availableBalance: 500 },
          eligibleCount
        ).valid,
        false
      );
    });
  });

  describe('Category Switching and Normalization', () => {
    const eligibleCount = 4;

    it('clamps expectedCount when switching from PLAYER_COUNT to MORE_THAN', () => {
      // Current count 4 is valid for PLAYER_COUNT, but invalid for MORE_THAN (max 3)
      const clamped = clampExpectedCount('MORE_THAN', 4, eligibleCount);
      assert.equal(clamped, 3);
    });

    it('clears residual expectedCount when normalizing SPECIFIC_PLAYERS', () => {
      const normalized = normalizeOwnerPrediction(
        {
          predictionKind: 'SPECIFIC_PLAYERS',
          expectedCount: 3,
          targetPlayerIds: ['p2', 'p3'],
          chipAmount: 200,
        },
        eligibleCount
      );
      assert.equal(normalized.predictionKind, 'SPECIFIC_PLAYERS');
      assert.equal(normalized.expectedCount, undefined);
      assert.deepEqual(normalized.targetPlayerIds, ['p2', 'p3']);
    });

    it('clears targetPlayerIds when normalizing PLAYER_COUNT', () => {
      const normalized = normalizeOwnerPrediction(
        {
          predictionKind: 'PLAYER_COUNT',
          expectedCount: 2,
          targetPlayerIds: ['p2', 'p3'],
          chipAmount: 200,
        },
        eligibleCount
      );
      assert.equal(normalized.predictionKind, 'PLAYER_COUNT');
      assert.equal(normalized.expectedCount, 2);
      assert.equal(normalized.targetPlayerIds, undefined);
    });

    it('clears both targetPlayerIds and expectedCount when normalizing NONE', () => {
      const normalized = normalizeOwnerPrediction(
        {
          predictionKind: 'NONE',
          expectedCount: 2,
          targetPlayerIds: ['p2'],
          chipAmount: 100,
        },
        eligibleCount
      );
      assert.equal(normalized.predictionKind, 'NONE');
      assert.equal(normalized.expectedCount, undefined);
      assert.equal(normalized.targetPlayerIds, undefined);
    });
  });

  describe('Round Settlement Evaluation for Expected Count', () => {
    const testTrack: Track = {
      id: 'track-1',
      title: 'Test Song',
      artist: 'Test Artist',
      audioUrl: '',
      submittedByPlayerId: 'owner-1',
    };

    const players: Player[] = [
      { id: 'owner-1', nickname: 'Owner', avatar: 'a1', chips: 1000, isHost: true, isReady: true },
      { id: 'p2', nickname: 'P2', avatar: 'a2', chips: 1000, isHost: false, isReady: true },
      { id: 'p3', nickname: 'P3', avatar: 'a3', chips: 1000, isHost: false, isReady: true },
      { id: 'p4', nickname: 'P4', avatar: 'a4', chips: 1000, isHost: false, isReady: true },
      { id: 'p5', nickname: 'P5', avatar: 'a5', chips: 1000, isHost: false, isReady: true },
    ];

    it('evaluates PLAYER_COUNT: actual=3, expected=3 -> success; actual=2, expected=3 -> failure', () => {
      // 3 correct guessers (p2, p3, p4 guessed owner-1; p5 guessed wrong)
      const threeCorrectBets: GuesserBet[] = [
        { guesserId: 'p2', targetOwnerId: 'owner-1', chipAmount: 100 },
        { guesserId: 'p3', targetOwnerId: 'owner-1', chipAmount: 100 },
        { guesserId: 'p4', targetOwnerId: 'owner-1', chipAmount: 100 },
        { guesserId: 'p5', targetOwnerId: 'p2', chipAmount: 100 },
      ];

      const ownerBetSuccess: OwnerBet = {
        ownerId: 'owner-1',
        predictionKind: 'PLAYER_COUNT',
        expectedCount: 3,
        chipAmount: 100,
      };

      const resSuccess = calculateRoundResolution(testTrack, players, threeCorrectBets, ownerBetSuccess, 1, 1);
      const ownerSummarySuccess = resSuccess.playerSummaries.find((s) => s.playerId === 'owner-1');
      assert.ok(ownerSummarySuccess);
      assert.equal(ownerSummarySuccess.chipsWon, 300); // 3.0x on 100 chips

      // Failure case: expected 2, but actual is 3
      const ownerBetFail: OwnerBet = {
        ownerId: 'owner-1',
        predictionKind: 'PLAYER_COUNT',
        expectedCount: 2,
        chipAmount: 100,
      };

      const resFail = calculateRoundResolution(testTrack, players, threeCorrectBets, ownerBetFail, 1, 1);
      const ownerSummaryFail = resFail.playerSummaries.find((s) => s.playerId === 'owner-1');
      assert.ok(ownerSummaryFail);
      assert.equal(ownerSummaryFail.chipsWon, 0);
    });

    it('evaluates MORE_THAN: actual=4, expected=3 -> success; actual=3, expected=3 -> failure', () => {
      const fourCorrectBets: GuesserBet[] = [
        { guesserId: 'p2', targetOwnerId: 'owner-1', chipAmount: 100 },
        { guesserId: 'p3', targetOwnerId: 'owner-1', chipAmount: 100 },
        { guesserId: 'p4', targetOwnerId: 'owner-1', chipAmount: 100 },
        { guesserId: 'p5', targetOwnerId: 'owner-1', chipAmount: 100 },
      ];

      const ownerBetSuccess: OwnerBet = {
        ownerId: 'owner-1',
        predictionKind: 'MORE_THAN',
        expectedCount: 3,
        chipAmount: 100,
      };

      const resSuccess = calculateRoundResolution(testTrack, players, fourCorrectBets, ownerBetSuccess, 1, 1);
      const ownerSummary = resSuccess.playerSummaries.find((s) => s.playerId === 'owner-1');
      assert.ok(ownerSummary);
      assert.equal(ownerSummary.chipsWon, 250); // 2.5x on 100 chips

      // Failure case: 3 correct guessers with expected > 3
      const threeCorrectBets: GuesserBet[] = [
        { guesserId: 'p2', targetOwnerId: 'owner-1', chipAmount: 100 },
        { guesserId: 'p3', targetOwnerId: 'owner-1', chipAmount: 100 },
        { guesserId: 'p4', targetOwnerId: 'owner-1', chipAmount: 100 },
        { guesserId: 'p5', targetOwnerId: 'other', chipAmount: 100 },
      ];

      const resFail = calculateRoundResolution(testTrack, players, threeCorrectBets, ownerBetSuccess, 1, 1);
      const ownerSummaryFail = resFail.playerSummaries.find((s) => s.playerId === 'owner-1');
      assert.ok(ownerSummaryFail);
      assert.equal(ownerSummaryFail.chipsWon, 0);
    });

    it('evaluates FEWER_THAN: actual=2, expected=3 -> success; actual=3, expected=3 -> failure', () => {
      const twoCorrectBets: GuesserBet[] = [
        { guesserId: 'p2', targetOwnerId: 'owner-1', chipAmount: 100 },
        { guesserId: 'p3', targetOwnerId: 'owner-1', chipAmount: 100 },
        { guesserId: 'p4', targetOwnerId: 'other', chipAmount: 100 },
        { guesserId: 'p5', targetOwnerId: 'other', chipAmount: 100 },
      ];

      const ownerBet: OwnerBet = {
        ownerId: 'owner-1',
        predictionKind: 'FEWER_THAN',
        expectedCount: 3,
        chipAmount: 100,
      };

      const resSuccess = calculateRoundResolution(testTrack, players, twoCorrectBets, ownerBet, 1, 1);
      const ownerSummary = resSuccess.playerSummaries.find((s) => s.playerId === 'owner-1');
      assert.ok(ownerSummary);
      assert.equal(ownerSummary.chipsWon, 250);

      // Failure case: 3 correct, expected < 3 -> false
      const threeCorrectBets: GuesserBet[] = [
        { guesserId: 'p2', targetOwnerId: 'owner-1', chipAmount: 100 },
        { guesserId: 'p3', targetOwnerId: 'owner-1', chipAmount: 100 },
        { guesserId: 'p4', targetOwnerId: 'owner-1', chipAmount: 100 },
        { guesserId: 'p5', targetOwnerId: 'other', chipAmount: 100 },
      ];

      const resFail = calculateRoundResolution(testTrack, players, threeCorrectBets, ownerBet, 1, 1);
      const ownerSummaryFail = resFail.playerSummaries.find((s) => s.playerId === 'owner-1');
      assert.ok(ownerSummaryFail);
      assert.equal(ownerSummaryFail.chipsWon, 0);
    });

    it('evaluates NONE: actual=0 -> success; actual=1 -> failure', () => {
      const zeroCorrectBets: GuesserBet[] = [
        { guesserId: 'p2', targetOwnerId: 'other', chipAmount: 100 },
        { guesserId: 'p3', targetOwnerId: 'other', chipAmount: 100 },
      ];

      const ownerBetNone: OwnerBet = {
        ownerId: 'owner-1',
        predictionKind: 'NONE',
        chipAmount: 100,
      };

      const resSuccess = calculateRoundResolution(testTrack, players, zeroCorrectBets, ownerBetNone, 1, 1);
      const ownerSummary = resSuccess.playerSummaries.find((s) => s.playerId === 'owner-1');
      assert.ok(ownerSummary);
      assert.equal(ownerSummary.chipsWon, 400); // 4.0x on 100 chips

      // Failure case: 1 correct guesser
      const oneCorrectBet: GuesserBet[] = [
        { guesserId: 'p2', targetOwnerId: 'owner-1', chipAmount: 100 },
      ];

      const resFail = calculateRoundResolution(testTrack, players, oneCorrectBet, ownerBetNone, 1, 1);
      const ownerSummaryFail = resFail.playerSummaries.find((s) => s.playerId === 'owner-1');
      assert.ok(ownerSummaryFail);
      assert.equal(ownerSummaryFail.chipsWon, 0);
    });
  });

  describe('roomStore placeOwnerBet during MUSIC_SELECTION', () => {
    it('persists pendingOwnerBets during MUSIC_SELECTION and attaches to currentTrack when betting starts', () => {
      const room = roomStore.createRoom('h1', 'HostPlayer', 'party-1');
      roomStore.joinRoom(room.code, 'p2', 'PlayerTwo', 'party-2');
      roomStore.joinRoom(room.code, 'p3', 'PlayerThree', 'party-3');
      roomStore.startTurnSequence(room.code);

      // Host places owner prediction during MUSIC_SELECTION
      const betRes = roomStore.placeOwnerBet(
        room.code,
        'h1',
        'MORE_THAN',
        100,
        undefined,
        1
      );
      assert.equal(betRes.accepted, true);
      assert.ok(betRes.room);
      assert.ok(betRes.room.pendingOwnerBets?.['h1']);
      assert.equal(betRes.room.pendingOwnerBets['h1'].predictionKind, 'MORE_THAN');
      assert.equal(betRes.room.pendingOwnerBets['h1'].expectedCount, 1);

      // Rejects bet exceeding balance
      const invalidBalanceRes = roomStore.placeOwnerBet(
        room.code,
        'h1',
        'PLAYER_COUNT',
        999999,
        undefined,
        1
      );
      assert.equal(invalidBalanceRes.accepted, false);
      assert.ok(invalidBalanceRes.error?.includes('Saldo insuficiente'));
    });
  });
});
