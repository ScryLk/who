import {
  Bet,
  BetCalculationResult,
  BetStatus,
  BetValidationResult,
  EngineConfig,
  PlayerBalanceAdjustment,
  RoundBettingState,
} from '../types/betting';

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  calculationMode: 'PARI_MUTUEL',
  minBetAmount: 10,
  maxBetAmount: 5000,
  houseEdgeRate: 0.05, // 5% house edge
  minOdds: 1.1,
  maxOdds: 10.0,
  rolloverPolicy: 'ROLLOVER_TO_NEXT_ROUND',
  consecutiveStreakMultiplier: 1.1,
  difficultyBonusMultiplier: 1.25,
};

export class DynamicBettingEngine {
  private config: EngineConfig;

  constructor(config?: Partial<EngineConfig>) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
  }

  public getConfig(): EngineConfig {
    return { ...this.config };
  }

  /**
   * Initializes a fresh betting state for a round.
   */
  public createRoundState(
    roundId: string,
    availableOptionIds: string[],
    rolloverFromPreviousRound = 0,
    roundRiskMultiplier = 1.0
  ): RoundBettingState {
    const poolPerOption: Record<string, number> = {};
    availableOptionIds.forEach((optId) => {
      poolPerOption[optId] = 0;
    });

    const state: RoundBettingState = {
      roundId,
      status: 'OPEN',
      bets: [],
      totalPot: 0,
      poolPerOption,
      currentOdds: {},
      rolloverFromPreviousRound: Math.max(0, Math.floor(rolloverFromPreviousRound)),
      houseEdgeRate: this.config.houseEdgeRate,
      roundRiskMultiplier: Math.max(0.5, roundRiskMultiplier),
    };

    state.currentOdds = this.calculateOdds(state, availableOptionIds);
    return state;
  }

  /**
   * Validates a proposed bet against balance, min/max limits, and integer constraints.
   */
  public validateBet(
    playerChips: number,
    amount: number,
    overrideConfig?: Partial<EngineConfig>
  ): BetValidationResult {
    const cfg = overrideConfig ? { ...this.config, ...overrideConfig } : this.config;

    if (amount === undefined || amount === null || isNaN(amount)) {
      return { valid: false, reason: 'Valor de aposta é obrigatório.' };
    }

    if (amount <= 0) {
      return { valid: false, reason: 'O valor da aposta deve ser maior que zero.' };
    }

    if (!Number.isInteger(amount)) {
      return { valid: false, reason: 'Apostas devem ser feitas em fichas inteiras sem decimais.' };
    }

    if (amount < cfg.minBetAmount) {
      return { valid: false, reason: `Aposta mínima permitida é de ${cfg.minBetAmount} fichas.` };
    }

    if (amount > cfg.maxBetAmount) {
      return { valid: false, reason: `Aposta máxima permitida é de ${cfg.maxBetAmount} fichas.` };
    }

    if (amount > playerChips) {
      return { valid: false, reason: `Saldo insuficiente. Você possui ${playerChips} fichas.` };
    }

    return { valid: true, sanitizedAmount: amount };
  }

  /**
   * Calculates dynamic odds for all available options in real time.
   */
  public calculateOdds(
    state: RoundBettingState,
    availableOptionIds: string[],
    overrideConfig?: Partial<EngineConfig>
  ): Record<string, number> {
    const cfg = overrideConfig ? { ...this.config, ...overrideConfig } : this.config;
    const odds: Record<string, number> = {};

    const effectiveTotalPot = state.totalPot + state.rolloverFromPreviousRound;
    const netPot = effectiveTotalPot * (1 - cfg.houseEdgeRate);

    if (cfg.calculationMode === 'PARI_MUTUEL') {
      availableOptionIds.forEach((optId) => {
        const optionPool = state.poolPerOption[optId] || 0;

        if (optionPool <= 0) {
          // Unbet option receives maximum starting odds
          odds[optId] = cfg.maxOdds;
        } else {
          const rawOdds = netPot / optionPool;
          const roundedOdds = Math.round(rawOdds * 100) / 100;
          odds[optId] = Math.min(cfg.maxOdds, Math.max(cfg.minOdds, roundedOdds));
        }
      });
    } else {
      // DYNAMIC_RISK Mode: Incorporates round risk multipliers
      availableOptionIds.forEach((optId) => {
        const optionPool = state.poolPerOption[optId] || 0;
        const poolRatio = state.totalPot > 0 ? optionPool / state.totalPot : 0.2;
        const baseOdds = 1.0 + (1.0 - poolRatio) * 3.0;

        const riskAdjustedOdds = baseOdds * state.roundRiskMultiplier;
        const roundedOdds = Math.round(riskAdjustedOdds * 100) / 100;

        odds[optId] = Math.min(cfg.maxOdds, Math.max(cfg.minOdds, roundedOdds));
      });
    }

    return odds;
  }

  /**
   * Places a validated bet, updates pools, total pot, and recalculates odds in real time.
   */
  public placeBet(
    state: RoundBettingState,
    betInput: {
      id: string;
      playerId: string;
      targetOptionId: string;
      amount: number;
      playerChips: number;
    },
    overrideConfig?: Partial<EngineConfig>
  ): { state: RoundBettingState; bet: Bet | null; validation: BetValidationResult } {
    if (state.status !== 'OPEN') {
      return {
        state,
        bet: null,
        validation: { valid: false, reason: 'Rodada de apostas fechada ou já resolvida.' },
      };
    }

    const validation = this.validateBet(betInput.playerChips, betInput.amount, overrideConfig);
    if (!validation.valid || !validation.sanitizedAmount) {
      return { state, bet: null, validation };
    }

    const sanitizedAmount = validation.sanitizedAmount;
    const currentOddsForOption = state.currentOdds[betInput.targetOptionId] || this.config.minOdds;

    const bet: Bet = {
      id: betInput.id,
      playerId: betInput.playerId,
      targetOptionId: betInput.targetOptionId,
      amount: sanitizedAmount,
      oddsAtPlacement: currentOddsForOption,
      timestamp: Date.now(),
      status: 'PENDING',
    };

    // Update state immutable pattern / state mutation
    const updatedPools = { ...state.poolPerOption };
    updatedPools[betInput.targetOptionId] = (updatedPools[betInput.targetOptionId] || 0) + sanitizedAmount;

    const updatedState: RoundBettingState = {
      ...state,
      bets: [...state.bets, bet],
      totalPot: state.totalPot + sanitizedAmount,
      poolPerOption: updatedPools,
    };

    // Recalculate odds in real time for all options
    const availableOptionIds = Object.keys(updatedPools);
    updatedState.currentOdds = this.calculateOdds(updatedState, availableOptionIds, overrideConfig);

    return { state: updatedState, bet, validation };
  }

  /**
   * Resolves the round bets, distributes payouts, handles rollover, edge cases & refunds.
   */
  public resolveRound(
    state: RoundBettingState,
    winningOptionIds: string[],
    playerStartingChipsMap: Record<string, number>,
    overrideConfig?: Partial<EngineConfig>
  ): BetCalculationResult {
    const cfg = overrideConfig ? { ...this.config, ...overrideConfig } : this.config;

    // Handle CANCELED state or explicitly empty winning options refund request
    if (state.status === 'CANCELED') {
      return this.refundRound(state, playerStartingChipsMap, 'Rodada cancelada. Apostas devolvidas.');
    }

    const winningOptionSet = new Set(winningOptionIds);
    let winningPoolTotal = 0;
    winningOptionIds.forEach((optId) => {
      winningPoolTotal += state.poolPerOption[optId] || 0;
    });

    const playerAdjustments: Record<string, PlayerBalanceAdjustment> = {};

    // Initialize player summary maps
    Object.keys(playerStartingChipsMap).forEach((pId) => {
      playerAdjustments[pId] = {
        playerId: pId,
        startingChips: playerStartingChipsMap[pId],
        endingChips: playerStartingChipsMap[pId],
        chipsBet: 0,
        chipsWon: 0,
        chipsRefunded: 0,
        netChange: 0,
        details: [],
      };
    });

    // Account for chips bet per player
    state.bets.forEach((bet) => {
      if (!playerAdjustments[bet.playerId]) {
        playerAdjustments[bet.playerId] = {
          playerId: bet.playerId,
          startingChips: 1000,
          endingChips: 1000,
          chipsBet: 0,
          chipsWon: 0,
          chipsRefunded: 0,
          netChange: 0,
          details: [],
        };
      }
      playerAdjustments[bet.playerId].chipsBet += bet.amount;
    });

    // EDGE CASE 1: NO WINNERS (Pote sem vencedores)
    if (winningPoolTotal <= 0) {
      if (cfg.rolloverPolicy === 'REFUND_ALL') {
        return this.refundRound(state, playerStartingChipsMap, 'Nenhum vencedor. Apostas estornadas.');
      }

      let rolloverAmount = 0;
      let houseProfit = 0;

      if (cfg.rolloverPolicy === 'ROLLOVER_TO_NEXT_ROUND') {
        rolloverAmount = state.totalPot + state.rolloverFromPreviousRound;
        houseProfit = 0;
      } else {
        houseProfit = state.totalPot;
        rolloverAmount = 0;
      }

      const betSummaries = state.bets.map((b) => ({
        betId: b.id,
        playerId: b.playerId,
        targetOptionId: b.targetOptionId,
        amount: b.amount,
        odds: b.oddsAtPlacement,
        status: 'LOST' as BetStatus,
        payout: 0,
      }));

      // Calculate player ending balances (lost their bet amount)
      Object.values(playerAdjustments).forEach((adj) => {
        adj.endingChips = Math.max(0, adj.startingChips - adj.chipsBet);
        adj.netChange = -adj.chipsBet;
        if (adj.chipsBet > 0) {
          adj.details.push(`Aposta de ${adj.chipsBet} fichas não acumulou prêmio nesta rodada.`);
        }
      });

      return {
        roundId: state.roundId,
        totalPot: state.totalPot,
        winningOptions: winningOptionIds,
        winningPoolTotal: 0,
        totalPayoutDistributed: 0,
        houseProfit,
        rolloverAmount,
        isRefunded: false,
        playerAdjustments,
        betSummaries,
      };
    }

    // NORMAL & MULTIPLE WINNERS CASO
    const effectivePot = state.totalPot + state.rolloverFromPreviousRound;
    const netDistributionPot = Math.floor(effectivePot * (1 - cfg.houseEdgeRate));

    let totalPayoutDistributed = 0;
    const betSummaries = state.bets.map((bet) => {
      const isWinner = winningOptionSet.has(bet.targetOptionId);

      if (!isWinner) {
        return {
          betId: bet.id,
          playerId: bet.playerId,
          targetOptionId: bet.targetOptionId,
          amount: bet.amount,
          odds: bet.oddsAtPlacement,
          status: 'LOST' as BetStatus,
          payout: 0,
        };
      }

      // Calculate payout dynamically based on pari-mutuel ratio or placement odds
      let payout = 0;
      if (cfg.calculationMode === 'PARI_MUTUEL') {
        const betShareRatio = bet.amount / winningPoolTotal;
        payout = Math.floor(betShareRatio * netDistributionPot);
      } else {
        payout = Math.floor(bet.amount * bet.oddsAtPlacement);
      }

      totalPayoutDistributed += payout;
      playerAdjustments[bet.playerId].chipsWon += payout;

      return {
        betId: bet.id,
        playerId: bet.playerId,
        targetOptionId: bet.targetOptionId,
        amount: bet.amount,
        odds: bet.oddsAtPlacement,
        status: 'WON' as BetStatus,
        payout,
      };
    });

    // Update ending chips per player safely
    Object.values(playerAdjustments).forEach((adj) => {
      adj.netChange = adj.chipsWon - adj.chipsBet;
      adj.endingChips = Math.max(0, adj.startingChips + adj.netChange);
      if (adj.chipsWon > 0) {
        adj.details.push(`Ganhou ${adj.chipsWon} fichas na rodada (Saldo líquido: ${adj.netChange >= 0 ? '+' : ''}${adj.netChange}).`);
      } else if (adj.chipsBet > 0) {
        adj.details.push(`Perdeu ${adj.chipsBet} fichas na rodada.`);
      }
    });

    const houseProfit = Math.max(0, state.totalPot - totalPayoutDistributed);

    return {
      roundId: state.roundId,
      totalPot: state.totalPot,
      winningOptions: winningOptionIds,
      winningPoolTotal,
      totalPayoutDistributed,
      houseProfit,
      rolloverAmount: 0,
      isRefunded: false,
      playerAdjustments,
      betSummaries,
    };
  }

  /**
   * Handles round refunds (e.g. ties or canceled rounds).
   */
  public refundRound(
    state: RoundBettingState,
    playerStartingChipsMap: Record<string, number>,
    reason = 'Rodada estornada.'
  ): BetCalculationResult {
    const playerAdjustments: Record<string, PlayerBalanceAdjustment> = {};

    Object.keys(playerStartingChipsMap).forEach((pId) => {
      playerAdjustments[pId] = {
        playerId: pId,
        startingChips: playerStartingChipsMap[pId],
        endingChips: playerStartingChipsMap[pId],
        chipsBet: 0,
        chipsWon: 0,
        chipsRefunded: 0,
        netChange: 0,
        details: [reason],
      };
    });

    state.bets.forEach((bet) => {
      if (!playerAdjustments[bet.playerId]) {
        playerAdjustments[bet.playerId] = {
          playerId: bet.playerId,
          startingChips: 1000,
          endingChips: 1000,
          chipsBet: 0,
          chipsWon: 0,
          chipsRefunded: 0,
          netChange: 0,
          details: [reason],
        };
      }
      playerAdjustments[bet.playerId].chipsBet += bet.amount;
      playerAdjustments[bet.playerId].chipsRefunded += bet.amount;
    });

    const betSummaries = state.bets.map((b) => ({
      betId: b.id,
      playerId: b.playerId,
      targetOptionId: b.targetOptionId,
      amount: b.amount,
      odds: b.oddsAtPlacement,
      status: 'REFUNDED' as BetStatus,
      payout: b.amount,
    }));

    return {
      roundId: state.roundId,
      totalPot: state.totalPot,
      winningOptions: [],
      winningPoolTotal: 0,
      totalPayoutDistributed: state.totalPot,
      houseProfit: 0,
      rolloverAmount: 0,
      isRefunded: true,
      playerAdjustments,
      betSummaries,
    };
  }
}
