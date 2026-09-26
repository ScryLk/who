import { DynamicBettingEngine } from './dynamicBettingEngine';

function runTests() {
  console.log('Running DynamicBettingEngine Unit Tests...\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failedTests++;
    }
  }

  const engine = new DynamicBettingEngine({
    minBetAmount: 10,
    maxBetAmount: 1000,
    houseEdgeRate: 0.05, // 5%
    minOdds: 1.1,
    maxOdds: 10.0,
    rolloverPolicy: 'ROLLOVER_TO_NEXT_ROUND',
  });

  // TEST 1: Initialization & Initial Odds
  console.log('Test Group 1: Initialization & Odds Calculation');
  const options = ['player-1', 'player-2', 'player-3', 'player-4'];
  let state = engine.createRoundState('round-1', options);

  assert(state.totalPot === 0, 'Total pot starts at 0');
  assert(state.status === 'OPEN', 'Round status starts as OPEN');
  assert(state.currentOdds['player-1'] === 10.0, 'Unbet option gets max odds (10.0x)');

  // TEST 2: Bet Validation
  console.log('\nTest Group 2: Bet Validation & Bounds Checking');
  const validCheck = engine.validateBet(1000, 100);
  assert(validCheck.valid === true, 'Valid bet 100 with balance 1000 passes');

  const negativeCheck = engine.validateBet(1000, -50);
  assert(negativeCheck.valid === false, 'Negative bet fails validation');

  const decimalCheck = engine.validateBet(1000, 50.5);
  assert(decimalCheck.valid === false, 'Decimal bet fails validation');

  const minCheck = engine.validateBet(1000, 5);
  assert(minCheck.valid === false, 'Bet below min limit (10) fails validation');

  const maxCheck = engine.validateBet(10000, 2000);
  assert(maxCheck.valid === false, 'Bet above max limit (1000) fails validation');

  const balanceCheck = engine.validateBet(50, 100);
  assert(balanceCheck.valid === false, 'Bet exceeding player balance fails validation');

  // TEST 3: Real-Time Odds Updates on Bet Placement
  console.log('\nTest Group 3: Real-Time Odds & Pot Updates');
  const res1 = engine.placeBet(state, {
    id: 'bet-1',
    playerId: 'p1',
    targetOptionId: 'player-2',
    amount: 100,
    playerChips: 1000,
  });
  state = res1.state;

  assert(res1.validation.valid === true, 'Player 1 places 100 on player-2');
  assert(state.totalPot === 100, 'Total pot updated to 100');
  assert(state.poolPerOption['player-2'] === 100, 'player-2 pool updated to 100');

  const res2 = engine.placeBet(state, {
    id: 'bet-2',
    playerId: 'p2',
    targetOptionId: 'player-3',
    amount: 300,
    playerChips: 1000,
  });
  state = res2.state;

  assert(state.totalPot === 400, 'Total pot updated to 400');
  assert(state.poolPerOption['player-3'] === 300, 'player-3 pool updated to 300');
  assert(state.currentOdds['player-2'] < 10.0, 'player-2 odds decrease dynamically as pot grows');

  // TEST 4: Round Resolution (Single Winner)
  console.log('\nTest Group 4: Round Resolution (Single Winner)');
  const playerBalances = {
    p1: 1000,
    p2: 1000,
    p3: 1000,
  };

  const resultSingle = engine.resolveRound(state, ['player-2'], playerBalances);

  assert(resultSingle.winningPoolTotal === 100, 'Winning pool total is 100 (player-2 pool)');
  assert(resultSingle.isRefunded === false, 'Round is not refunded');
  assert(resultSingle.playerAdjustments['p1'].chipsWon > 0, 'Winner p1 receives payout');
  assert(resultSingle.playerAdjustments['p2'].chipsWon === 0, 'Loser p2 receives 0 payout');
  assert(
    Number.isInteger(resultSingle.playerAdjustments['p1'].endingChips),
    'Ending chips balance is an exact integer without floating decimals'
  );

  // TEST 5: Edge Case — No Winners (Rollover Policy)
  console.log('\nTest Group 5: Edge Case — No Winners (Rollover)');
  let stateNoWinner = engine.createRoundState('round-2', options);
  stateNoWinner = engine.placeBet(stateNoWinner, {
    id: 'bet-nw1',
    playerId: 'p1',
    targetOptionId: 'player-1',
    amount: 200,
    playerChips: 1000,
  }).state;

  const resultNoWinner = engine.resolveRound(stateNoWinner, ['player-4'], playerBalances);

  assert(resultNoWinner.winningPoolTotal === 0, 'Winning pool total is 0');
  assert(resultNoWinner.rolloverAmount === 200, 'Pori-Mutuel pot 200 rolls over to next round');
  assert(resultNoWinner.houseProfit === 0, 'House profit is 0 on rollover');

  // TEST 6: Edge Case — Round Cancellation & Refund
  console.log('\nTest Group 6: Edge Case — Round Cancellation & Refund');
  let stateCanceled = engine.createRoundState('round-3', options);
  stateCanceled = engine.placeBet(stateCanceled, {
    id: 'bet-c1',
    playerId: 'p1',
    targetOptionId: 'player-1',
    amount: 150,
    playerChips: 1000,
  }).state;

  stateCanceled.status = 'CANCELED';

  const resultCanceled = engine.resolveRound(stateCanceled, [], playerBalances);

  assert(resultCanceled.isRefunded === true, 'Canceled round is flagged as refunded');
  assert(resultCanceled.playerAdjustments['p1'].chipsRefunded === 150, 'p1 gets 100% bet refunded (150)');
  assert(resultCanceled.playerAdjustments['p1'].endingChips === 1000, 'p1 ending chips equals starting chips (1000)');

  // TEST SUMMARY
  console.log(`\n========================================`);
  console.log(`Test Results: ${passedTests} PASSED, ${failedTests} FAILED.`);
  console.log(`========================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
