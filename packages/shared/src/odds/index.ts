import {
  GuesserBet,
  ODDS_TABLE,
  OwnerBet,
  Player,
  PlayerRoundSummary,
  RoundResult,
  SecondaryPredictionKind,
  Track,
} from '../types/game';

export function calculateRoundResolution(
  track: Track,
  players: Player[],
  guesserBets: GuesserBet[],
  ownerBet: OwnerBet | undefined,
  roundNumber: number,
  totalRounds: number
): RoundResult {
  const actualOwnerId = track.submittedByPlayerId;

  // Guesser players count
  const guesserPlayers = players.filter((p) => p.id !== actualOwnerId);

  let correctGuessersCount = 0;

  // First pass: count correct guessers
  guesserBets.forEach((bet) => {
    if (bet.targetOwnerId === actualOwnerId) {
      correctGuessersCount += 1;
    }
  });

  // Helper to evaluate secondary prediction success
  function evaluateSecondary(
    kind: SecondaryPredictionKind | undefined,
    targets: string[] | undefined,
    expectedCount: number | undefined
  ): { success: boolean; multiplier: number } {
    if (!kind) return { success: false, multiplier: 1.0 };

    if (kind === 'NONE') {
      // 0 correct guessers in the room
      return {
        success: correctGuessersCount === 0,
        multiplier: ODDS_TABLE.secondaryNone, // 4.0x
      };
    }

    if (kind === 'PLAYER_COUNT') {
      // Exact headcount matched
      const exp = expectedCount ?? 1;
      return {
        success: correctGuessersCount === exp,
        multiplier: ODDS_TABLE.secondaryCount, // 3.0x
      };
    }

    if (kind === 'SPECIFIC_PLAYERS') {
      // All selected specific target players guessed correctly
      const t = targets || [];
      const allGuessed =
        t.length > 0 &&
        t.every((targetId) => {
          const b = guesserBets.find((gb) => gb.guesserId === targetId);
          return b && b.targetOwnerId === actualOwnerId;
        });

      return {
        success: allGuessed,
        multiplier: ODDS_TABLE.secondarySpecific, // 3.5x
      };
    }

    return { success: false, multiplier: 1.0 };
  }

  // Process guesser results
  const guesserResults = guesserBets.map((bet) => {
    const correctOwner = bet.targetOwnerId === actualOwnerId;
    const secEval = evaluateSecondary(bet.predictionKind, bet.targetPlayerIds, bet.expectedCount);

    let multiplier = 0;
    if (correctOwner && secEval.success) {
      multiplier = secEval.multiplier; // 3.5x, 4.0x, or 3.0x Combo!
    } else if (correctOwner) {
      multiplier = ODDS_TABLE.guesserOwnerOnly; // 2.0x
    }

    const chipsWon = Math.floor(bet.chipAmount * multiplier);

    return {
      guesserId: bet.guesserId,
      targetOwnerId: bet.targetOwnerId,
      correctOwner,
      secondarySuccess: secEval.success,
      betAmount: bet.chipAmount,
      multiplier,
      chipsWon,
    };
  });

  // Evaluate Track Owner's bet
  let ownerBetSuccess = false;
  let ownerMultiplier = 0;
  const ownerBetAmount = ownerBet?.chipAmount || 0;

  if (ownerBet) {
    const secEval = evaluateSecondary(
      ownerBet.predictionKind,
      ownerBet.targetPlayerIds,
      ownerBet.expectedCount
    );
    ownerBetSuccess = secEval.success;
    ownerMultiplier = secEval.multiplier;
  }

  const ownerChipsWon = ownerBetSuccess ? Math.floor(ownerBetAmount * ownerMultiplier) : 0;

  // Build per-player chip changes summary
  const playerSummaries: PlayerRoundSummary[] = players.map((player) => {
    let chipsWon = 0;
    let chipsLost = 0;
    const details: string[] = [];

    if (player.id === actualOwnerId) {
      if (ownerBet) {
        chipsLost += ownerBet.chipAmount;
        if (ownerBetSuccess) {
          chipsWon += ownerChipsWon;
          details.push(
            `Previsão de Dono CORRETA! Ganhou +${ownerChipsWon} fichas (${ownerMultiplier}x)`
          );
        } else {
          details.push(`Previsão incorreta. Perdeu ${ownerBet.chipAmount} fichas.`);
        }
      } else {
        details.push('Não fez aposta de previsão de dono.');
      }
    } else {
      const playerBet = guesserBets.find((b) => b.guesserId === player.id);
      if (playerBet) {
        chipsLost += playerBet.chipAmount;
        const res = guesserResults.find((r) => r.guesserId === player.id);
        if (res && res.chipsWon > 0) {
          chipsWon += res.chipsWon;
          if (res.secondarySuccess) {
            details.push(
              `COMBO ACERTOU! (Dono + Previsão) Ganhou +${res.chipsWon} fichas (${res.multiplier}x)`
            );
          } else {
            details.push(`Acertou o Dono! Ganhou +${res.chipsWon} fichas (${res.multiplier}x)`);
          }
        } else {
          details.push(`Aposta incorreta. Perdeu ${playerBet.chipAmount} fichas.`);
        }
      } else {
        details.push('Não apostou nesta rodada.');
      }
    }

    const startingChips = player.chips;
    const netChange = chipsWon - chipsLost;
    const endingChips = Math.max(0, startingChips + netChange);

    return {
      playerId: player.id,
      nickname: player.nickname,
      startingChips,
      endingChips,
      chipsWon,
      chipsLost,
      netChange,
      details,
    };
  });

  return {
    roundNumber,
    totalRounds,
    track,
    actualOwnerId,
    correctGuessersCount,
    totalGuessersCount: guesserPlayers.length,
    ownerBetSuccess,
    ownerMultiplier,
    ownerChipsWon,
    guesserBetResults: guesserResults,
    playerSummaries,
  };
}
