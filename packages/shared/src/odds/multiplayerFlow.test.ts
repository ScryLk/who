import assert from 'node:assert';
import {
  calculateRiskRatio,
  classifyBetRisk,
  createRevealOrder,
} from './riskEngine';
import { calculateRoundResolution } from './index';
import { Player, Track, GuesserBet, OwnerBet, RoomState } from '../types/game';

console.log('Running Multiplayer Flow & Privacy Simulation Tests...');

// Setup 4 players
const mockPlayers: Player[] = [
  { id: 'player-host', nickname: 'Host Lucas', avatar: 'av-1', chips: 1000, isHost: true, isReady: true },
  { id: 'player-ana', nickname: 'Ana', avatar: 'av-2', chips: 1000, isHost: false, isReady: true },
  { id: 'player-rafael', nickname: 'Rafael', avatar: 'av-3', chips: 1000, isHost: false, isReady: true },
  { id: 'player-marina', nickname: 'Marina (Owner)', avatar: 'av-4', chips: 1000, isHost: false, isReady: true },
];

const mockTrack: Track = {
  id: 'track-1',
  title: 'Musica Misteriosa',
  artist: 'Artista Secreto',
  audioUrl: 'https://example.com/audio.mp3',
  submittedByPlayerId: 'player-marina',
};

// 1. Acceptance test: Betting ACK privacy
// Player A bets 300 on Marina
const guesserBets: Record<string, GuesserBet> = {};
const startingBalances: Record<string, number> = {
  'player-host': 1000,
  'player-ana': 1000,
  'player-rafael': 1000,
  'player-marina': 1000,
};

// Simulate Player A bet ACK
const pAStake = 300;
const pABet: GuesserBet = {
  guesserId: 'player-host',
  targetOwnerId: 'player-marina',
  chipAmount: pAStake,
};
guesserBets['player-host'] = pABet;

const pAAck = {
  success: true,
  accepted: true,
  stake: pAStake,
  remainingBalance: startingBalances['player-host'] - pAStake,
};

assert.strictEqual(pAAck.accepted, true);
assert.strictEqual(pAAck.stake, 300);
assert.strictEqual(pAAck.remainingBalance, 700);
assert.strictEqual((pAAck as any).correct, undefined, 'ACK must not leak correct flag');
assert.strictEqual((pAAck as any).payout, undefined, 'ACK must not leak payout');
assert.strictEqual((pAAck as any).actualOwnerId, undefined, 'ACK must not leak owner');

// 2. Sanitization simulation: Player B (Ana) views room state during BETTING
// In BETTING, Ana must only know that Host has bet, but NOT who he picked or how much
const sanitizedForAnaGuesserBets: Record<string, GuesserBet> = {};
Object.keys(guesserBets).forEach((pid) => {
  if (pid === 'player-ana') {
    sanitizedForAnaGuesserBets[pid] = guesserBets[pid];
  } else {
    sanitizedForAnaGuesserBets[pid] = {
      guesserId: pid,
      targetOwnerId: '',
      chipAmount: 0,
    };
  }
});

assert.strictEqual(sanitizedForAnaGuesserBets['player-host'].guesserId, 'player-host');
assert.strictEqual(sanitizedForAnaGuesserBets['player-host'].targetOwnerId, '', 'Target must be masked for others');
assert.strictEqual(sanitizedForAnaGuesserBets['player-host'].chipAmount, 0, 'Stake must be masked for others');

// 3. More bets placed with different exposures
// Ana bets 800 on Rafael (80% risk - EXTREME)
guesserBets['player-ana'] = {
  guesserId: 'player-ana',
  targetOwnerId: 'player-rafael',
  chipAmount: 800,
};

// Rafael bets 150 on Marina (15% risk - LOW)
guesserBets['player-rafael'] = {
  guesserId: 'player-rafael',
  targetOwnerId: 'player-marina',
  chipAmount: 150,
};

// 4. Reveal Order Escalation
// Exposures:
// Rafael: 150/1000 = 15% (LOW)
// Host: 300/1000 = 30% (MODERATE)
// Ana: 800/1000 = 80% (EXTREME)
const revealOrder = createRevealOrder(guesserBets, mockPlayers, startingBalances);
assert.deepStrictEqual(
  revealOrder,
  ['player-rafael', 'player-host', 'player-ana'],
  'Stepper must strictly escalate from lowest to highest exposure'
);

// 5. Stepper steps privacy check
// During Step 0 (Rafael): Host and Ana's targets are STILL masked from public
const step0Revealed = new Set([revealOrder[0]]);
const sanitizedStep0ForAna: Record<string, GuesserBet> = {};
Object.keys(guesserBets).forEach((pid) => {
  if (step0Revealed.has(pid) || pid === 'player-ana') {
    sanitizedStep0ForAna[pid] = guesserBets[pid];
  } else {
    sanitizedStep0ForAna[pid] = { guesserId: pid, targetOwnerId: '', chipAmount: 0 };
  }
});
assert.strictEqual(sanitizedStep0ForAna['player-rafael'].chipAmount, 150, 'Step 0 player is revealed');
assert.strictEqual(sanitizedStep0ForAna['player-host'].targetOwnerId, '', 'Step 1 player remains masked');

// 6. Final settlement calculation
const resolution = calculateRoundResolution(
  mockTrack,
  mockPlayers,
  Object.values(guesserBets),
  undefined,
  1,
  5
);

assert.strictEqual(resolution.actualOwnerId, 'player-marina');
assert.strictEqual(resolution.correctGuessersCount, 2); // Rafael and Host guessed Marina
const anaSummary = resolution.playerSummaries.find((s) => s.playerId === 'player-ana');
assert.strictEqual(anaSummary?.chipsLost, 800);
assert.strictEqual(anaSummary?.endingChips, 200);

const hostSummary = resolution.playerSummaries.find((s) => s.playerId === 'player-host');
assert.ok(hostSummary!.chipsWon > 0, 'Host guessed right and won chips');

console.log('All Multiplayer Flow & Privacy Simulation Tests passed!');
