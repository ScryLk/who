import assert from 'node:assert';
import {
  calculateRiskRatio,
  classifyBetRisk,
  getBetRisk,
  createRevealOrder,
  validateBetAgainstBalance,
  canAffordBetIncrement,
  calculateRemainingBalance,
} from './riskEngine';
import { GuesserBet, Player } from '../types/game';

console.log('Running riskEngine unit tests...');

// 1. Math calculation tests
assert.strictEqual(calculateRiskRatio(100, 1000), 0.1, '100 / 1000 must equal 0.1 (10%)');
assert.strictEqual(calculateRiskRatio(300, 1000), 0.3, '300 / 1000 must equal 0.3 (30%)');
assert.strictEqual(calculateRiskRatio(600, 1000), 0.6, '600 / 1000 must equal 0.6 (60%)');
assert.strictEqual(calculateRiskRatio(1000, 1000), 1.0, '1000 / 1000 must equal 1.0 (100%)');

// 2. Edge cases
assert.strictEqual(calculateRiskRatio(0, 1000), 0, 'Stake 0 should have risk 0');
assert.strictEqual(calculateRiskRatio(-50, 1000), 0, 'Negative stake should have risk 0');
assert.ok(calculateRiskRatio(500, 0) > 1.0, 'Balance 0 with positive stake should have risk > 1.0 (over balance)');
assert.ok(calculateRiskRatio(500, -100) > 1.0, 'Negative balance should have risk > 1.0');
assert.strictEqual(calculateRiskRatio(1200, 1000), 1.2, 'Stake > balance should calculate correctly');

// 3. Risk classification tiers
const lowRisk = classifyBetRisk(0.1);
assert.strictEqual(lowRisk.level, 'LOW');
assert.strictEqual(lowRisk.percentage, 10);
assert.strictEqual(lowRisk.label, 'Baixo Risco');
assert.strictEqual(lowRisk.isValid, true);
assert.strictEqual(lowRisk.canAfford, true);

const modRisk = classifyBetRisk(0.3);
assert.strictEqual(modRisk.level, 'MODERATE');
assert.strictEqual(modRisk.percentage, 30);
assert.strictEqual(modRisk.label, 'Risco Moderado');

const highRisk = classifyBetRisk(0.45);
assert.strictEqual(highRisk.level, 'HIGH');
assert.strictEqual(highRisk.percentage, 45);
assert.strictEqual(highRisk.label, 'Risco Alto');

const veryHighRisk = classifyBetRisk(0.65);
assert.strictEqual(veryHighRisk.level, 'VERY_HIGH');
assert.strictEqual(veryHighRisk.percentage, 65);
assert.strictEqual(veryHighRisk.label, 'Risco Muito Alto');

// 80% to 99% is EXTREME (valid)
const extremeRisk = classifyBetRisk(0.9);
assert.strictEqual(extremeRisk.level, 'EXTREME');
assert.strictEqual(extremeRisk.percentage, 90);
assert.strictEqual(extremeRisk.label, 'Risco Extremo');
assert.strictEqual(extremeRisk.isValid, true);
assert.strictEqual(extremeRisk.canAfford, true);

// Exactly 100% is ALL_IN (valid)
const allInRisk = classifyBetRisk(1000, 1000);
assert.strictEqual(allInRisk.level, 'ALL_IN');
assert.strictEqual(allInRisk.percentage, 100);
assert.strictEqual(allInRisk.label, 'All-In');
assert.strictEqual(allInRisk.isValid, true);
assert.strictEqual(allInRisk.canAfford, true);
assert.strictEqual(allInRisk.remainingBalance, 0);

// Above 100% is INSUFFICIENT_FUNDS (invalid, NOT extreme risk)
const overRisk = classifyBetRisk(500, 400);
assert.strictEqual(overRisk.level, 'INSUFFICIENT_FUNDS');
assert.strictEqual(overRisk.percentage, 100); // Visual gauge clamped to 100%
assert.strictEqual(overRisk.label, 'Saldo Insuficiente');
assert.strictEqual(overRisk.isValid, false);
assert.strictEqual(overRisk.canAfford, false);
assert.strictEqual(overRisk.remainingBalance, -100);

// 4. Boundary thresholds
assert.strictEqual(classifyBetRisk(0.19).level, 'LOW');
assert.strictEqual(classifyBetRisk(0.20).level, 'MODERATE');
assert.strictEqual(classifyBetRisk(0.39).level, 'MODERATE');
assert.strictEqual(classifyBetRisk(0.40).level, 'HIGH');
assert.strictEqual(classifyBetRisk(0.59).level, 'HIGH');
assert.strictEqual(classifyBetRisk(0.60).level, 'VERY_HIGH');
assert.strictEqual(classifyBetRisk(0.79).level, 'VERY_HIGH');
assert.strictEqual(classifyBetRisk(0.80).level, 'EXTREME');
assert.strictEqual(classifyBetRisk(0.99).level, 'EXTREME');

// 5. getBetRisk helper
const helperResult = getBetRisk({ stake: 600, balanceBeforeBet: 1000 });
assert.strictEqual(helperResult.level, 'VERY_HIGH');
assert.strictEqual(helperResult.percentage, 60);

// 6. Reveal order: Ascending financial exposure progression
const mockPlayers: Player[] = [
  { id: 'p1', nickname: 'Lucas', avatar: 'a1', chips: 1000, isHost: true, isReady: true },
  { id: 'p2', nickname: 'Marina', avatar: 'a2', chips: 1000, isHost: false, isReady: true },
  { id: 'p3', nickname: 'Rafael', avatar: 'a3', chips: 900, isHost: false, isReady: true },
  { id: 'p4', nickname: 'Ana', avatar: 'a4', chips: 1000, isHost: false, isReady: true },
];

const mockBets: Record<string, GuesserBet> = {
  p1: { guesserId: 'p1', targetOwnerId: 'p2', chipAmount: 100 }, // 10%
  p2: { guesserId: 'p2', targetOwnerId: 'p4', chipAmount: 250 }, // 25%
  p3: { guesserId: 'p3', targetOwnerId: 'p1', chipAmount: 500 }, // 500 / 900 = 55.5%
  p4: { guesserId: 'p4', targetOwnerId: 'p3', chipAmount: 800 }, // 80%
};

const order = createRevealOrder(mockBets, mockPlayers);
assert.deepStrictEqual(order, ['p1', 'p2', 'p3', 'p4'], 'Order must progress from lowest to highest exposure');

// 7. Deterministic tie-breaker with identical ratio and stake
const tiedBets: Record<string, GuesserBet> = {
  p2: { guesserId: 'p2', targetOwnerId: 'p1', chipAmount: 200 },
  p1: { guesserId: 'p1', targetOwnerId: 'p2', chipAmount: 200 },
};
// p1 comes before p2 in mockPlayers list
const tiedOrder = createRevealOrder(tiedBets, mockPlayers);
assert.deepStrictEqual(tiedOrder, ['p1', 'p2'], 'Ties must be broken deterministically by player list index');

// 8. 12-player test
const twelvePlayers: Player[] = Array.from({ length: 12 }, (_, i) => ({
  id: `user-${i + 1}`,
  nickname: `Player ${i + 1}`,
  avatar: `av-${i + 1}`,
  chips: 1000,
  isHost: i === 0,
  isReady: true,
}));

const twelveBets: Record<string, GuesserBet> = {};
// Shuffle stakes randomly from 50 to 950
[300, 100, 800, 50, 600, 200, 950, 400, 150, 700, 250, 500].forEach((stake, i) => {
  twelveBets[`user-${i + 1}`] = {
    guesserId: `user-${i + 1}`,
    targetOwnerId: 'user-1',
    chipAmount: stake,
  };
});

const twelveOrder = createRevealOrder(twelveBets, twelvePlayers);
assert.strictEqual(twelveOrder.length, 12, 'Must include all 12 players');
// Validate strictly non-decreasing stakes
for (let i = 0; i < twelveOrder.length - 1; i++) {
  const currentStake = twelveBets[twelveOrder[i]].chipAmount;
  const nextStake = twelveBets[twelveOrder[i + 1]].chipAmount;
  assert.ok(currentStake <= nextStake, `Exposure must be monotonic: ${currentStake} <= ${nextStake}`);
}

// 9. Balance Validation & Increment Rules (Domain Requirements)
// 9.1 calculateRemainingBalance
assert.strictEqual(calculateRemainingBalance(400, 100), 300, '400 - 100 must be 300');
assert.strictEqual(calculateRemainingBalance(400, 400), 0, '400 - 400 must be 0');
assert.strictEqual(calculateRemainingBalance(400, 500), -100, '400 - 500 must be -100');

// 9.2 canAffordBetIncrement
assert.strictEqual(canAffordBetIncrement(0, 500, 400), false, '0 + 500 cannot be afforded with balance 400');
assert.strictEqual(canAffordBetIncrement(0, 200, 400), true, '0 + 200 can be afforded with balance 400');
assert.strictEqual(canAffordBetIncrement(200, 200, 400), true, '200 + 200 can be afforded with balance 400 (All-in)');
assert.strictEqual(canAffordBetIncrement(200, 500, 400), false, '200 + 500 cannot be afforded with balance 400');
assert.strictEqual(canAffordBetIncrement(400, 50, 400), false, '400 + 50 cannot be afforded when balance is 400');
assert.strictEqual(canAffordBetIncrement(0, 50, 0), false, 'Cannot afford any increment with balance 0');

// 9.3 validateBetAgainstBalance
const validBet = validateBetAgainstBalance(400, 400);
assert.strictEqual(validBet.canAfford, true);
assert.strictEqual(validBet.isValid, true);
assert.strictEqual(validBet.remainingBalance, 0);
assert.strictEqual(validBet.code, 'VALID');

const unaffordableBet = validateBetAgainstBalance(500, 400);
assert.strictEqual(unaffordableBet.canAfford, false);
assert.strictEqual(unaffordableBet.isValid, false);
assert.strictEqual(unaffordableBet.remainingBalance, -100);
assert.strictEqual(unaffordableBet.code, 'INSUFFICIENT_CHIPS');

const zeroBet = validateBetAgainstBalance(0, 400);
assert.strictEqual(zeroBet.canAfford, false);
assert.strictEqual(zeroBet.isValid, false);
assert.strictEqual(zeroBet.code, 'INVALID_BET');

const negativeBet = validateBetAgainstBalance(-50, 400);
assert.strictEqual(negativeBet.canAfford, false);
assert.strictEqual(negativeBet.isValid, false);
assert.strictEqual(negativeBet.code, 'INVALID_BET');

const zeroBalanceBet = validateBetAgainstBalance(100, 0);
assert.strictEqual(zeroBalanceBet.canAfford, false);
assert.strictEqual(zeroBalanceBet.isValid, false);
assert.strictEqual(zeroBalanceBet.code, 'INSUFFICIENT_CHIPS');

// 9.4 Extreme vs Insufficient Funds distinction
const extreme80 = classifyBetRisk(800, 1000);
assert.strictEqual(extreme80.level, 'EXTREME');
assert.strictEqual(extreme80.isValid, true);
assert.strictEqual(extreme80.canAfford, true);

const over401 = classifyBetRisk(401, 400);
assert.strictEqual(over401.level, 'INSUFFICIENT_FUNDS');
assert.strictEqual(over401.isValid, false);
assert.strictEqual(over401.canAfford, false);

console.log('All riskEngine tests passed successfully!');
