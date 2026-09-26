export type BetStatus = 'PENDING' | 'WON' | 'LOST' | 'REFUNDED';

export type OddsCalculationMode = 'PARI_MUTUEL' | 'DYNAMIC_RISK';

export type RolloverPolicy = 'ROLLOVER_TO_NEXT_ROUND' | 'HOUSE_RETENTION' | 'REFUND_ALL';

export interface EngineConfig {
  calculationMode: OddsCalculationMode;
  minBetAmount: number;
  maxBetAmount: number;
  houseEdgeRate: number; // e.g., 0.05 for 5% house margin
  minOdds: number; // e.g., 1.10
  maxOdds: number; // e.g., 10.00
  rolloverPolicy: RolloverPolicy;
  consecutiveStreakMultiplier?: number;
  difficultyBonusMultiplier?: number;
}

export interface Bet {
  id: string;
  playerId: string;
  targetOptionId: string;
  amount: number;
  oddsAtPlacement: number;
  timestamp: number;
  status: BetStatus;
}

export interface RoundBettingState {
  roundId: string;
  status: 'OPEN' | 'CLOSED' | 'RESOLVED' | 'CANCELED';
  bets: Bet[];
  totalPot: number;
  poolPerOption: Record<string, number>;
  currentOdds: Record<string, number>;
  rolloverFromPreviousRound: number;
  houseEdgeRate: number;
  roundRiskMultiplier: number;
}

export interface BetValidationResult {
  valid: boolean;
  reason?: string;
  sanitizedAmount?: number;
}

export interface PlayerBalanceAdjustment {
  playerId: string;
  startingChips: number;
  endingChips: number;
  chipsBet: number;
  chipsWon: number;
  chipsRefunded: number;
  netChange: number;
  details: string[];
}

export interface BetCalculationResult {
  roundId: string;
  totalPot: number;
  winningOptions: string[];
  winningPoolTotal: number;
  totalPayoutDistributed: number;
  houseProfit: number;
  rolloverAmount: number;
  isRefunded: boolean;
  playerAdjustments: Record<string, PlayerBalanceAdjustment>;
  betSummaries: {
    betId: string;
    playerId: string;
    targetOptionId: string;
    amount: number;
    odds: number;
    status: BetStatus;
    payout: number;
  }[];
}
