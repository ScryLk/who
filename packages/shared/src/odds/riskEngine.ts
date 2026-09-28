import { GuesserBet, Player } from '../types/game';

export type BetRiskLevel =
  | 'LOW'
  | 'MODERATE'
  | 'HIGH'
  | 'VERY_HIGH'
  | 'EXTREME'
  | 'ALL_IN'
  | 'INSUFFICIENT_FUNDS';

export interface BetRiskInfo {
  ratio: number;
  percentage: number;
  level: BetRiskLevel;
  label: string;
  color: string;
  description: string;
  isValid: boolean;
  canAfford: boolean;
  remainingBalance: number;
}

export interface BetValidationCheck {
  canAfford: boolean;
  remainingBalance: number;
  isValid: boolean;
  error?: string;
  code?: 'VALID' | 'INSUFFICIENT_CHIPS' | 'INVALID_BET';
}

/**
 * Calculates the financial risk ratio of a bet against a player's balance before the bet.
 * Formula: stake / balanceBeforeBet
 * Safely handles edge cases like zero balance, negative inputs, and all-in scenarios.
 */
export function calculateRiskRatio(stake: number, balanceBeforeBet: number): number {
  if (stake <= 0 || isNaN(stake)) {
    return 0;
  }
  if (balanceBeforeBet <= 0 || isNaN(balanceBeforeBet)) {
    // If the player had zero chips or invalid balance but attempted positive stake
    return stake > 0 ? 1.01 : 0;
  }
  const ratio = stake / balanceBeforeBet;
  return Math.max(0, ratio);
}

/**
 * Calculates remaining balance after a bet stake.
 */
export function calculateRemainingBalance(availableBalance: number, stake: number): number {
  return availableBalance - stake;
}

/**
 * Checks whether an incremental addition to the current bet can be afforded.
 */
export function canAffordBetIncrement(
  currentBet: number,
  increment: number,
  availableBalance: number
): boolean {
  return currentBet + increment <= availableBalance;
}

/**
 * Validates a proposed bet amount against available player balance.
 */
export function validateBetAgainstBalance(
  stake: number,
  availableBalance: number
): BetValidationCheck {
  if (stake <= 0 || isNaN(stake) || !Number.isInteger(stake)) {
    return {
      canAfford: false,
      remainingBalance: availableBalance,
      isValid: false,
      error: 'O valor da aposta deve ser um número inteiro maior que zero.',
      code: 'INVALID_BET',
    };
  }

  if (stake > availableBalance) {
    return {
      canAfford: false,
      remainingBalance: availableBalance - stake,
      isValid: false,
      error: `Saldo insuficiente. Máximo disponível: ${availableBalance} fichas.`,
      code: 'INSUFFICIENT_CHIPS',
    };
  }

  return {
    canAfford: true,
    remainingBalance: availableBalance - stake,
    isValid: true,
    code: 'VALID',
  };
}

/**
 * Classifies a risk ratio into official WHO? risk tiers.
 * Strictly communicates financial exposure or insufficient funds.
 */
export function classifyBetRisk(
  ratioOrStake: number,
  balanceBeforeBet?: number
): BetRiskInfo {
  let ratio: number;
  let stake: number;
  let balance: number;

  if (balanceBeforeBet !== undefined) {
    stake = ratioOrStake;
    balance = balanceBeforeBet;
    ratio = calculateRiskRatio(stake, balance);
  } else {
    ratio = ratioOrStake;
    balance = 1000;
    stake = Math.round(ratio * 1000);
  }

  const remainingBalance = balance - stake;
  const isOverBalance = stake > balance || ratio > 1.0;

  // Over balance check: INSUFFICIENT_FUNDS
  if (isOverBalance) {
    return {
      ratio,
      percentage: 100, // Visual gauge clamped to 100% max
      level: 'INSUFFICIENT_FUNDS',
      label: 'Saldo Insuficiente',
      color: '#EF4444', // Vermelho de aviso
      description: `Aposta excede o saldo disponível (${balance} fichas).`,
      isValid: false,
      canAfford: false,
      remainingBalance,
    };
  }

  // Exactly 100% commitment: ALL_IN
  if (stake === balance && balance > 0) {
    return {
      ratio: 1.0,
      percentage: 100,
      level: 'ALL_IN',
      label: 'All-In',
      color: '#F43F5E', // Rose nobre
      description: '100% do saldo total comprometido nesta rodada.',
      isValid: true,
      canAfford: true,
      remainingBalance: 0,
    };
  }

  const percentage = Math.round(Math.max(0, ratio) * 100);

  if (percentage < 20) {
    return {
      ratio,
      percentage,
      level: 'LOW',
      label: 'Baixo Risco',
      color: '#94A3B8', // Discreto / slate
      description: 'Compromete menos de 20% do saldo total da rodada.',
      isValid: true,
      canAfford: true,
      remainingBalance,
    };
  }

  if (percentage < 40) {
    return {
      ratio,
      percentage,
      level: 'MODERATE',
      label: 'Risco Moderado',
      color: '#38BDF8', // Azul tático
      description: 'Aposta comedida, mantendo ampla margem de segurança.',
      isValid: true,
      canAfford: true,
      remainingBalance,
    };
  }

  if (percentage < 60) {
    return {
      ratio,
      percentage,
      level: 'HIGH',
      label: 'Risco Alto',
      color: '#F59E0B', // Âmbar nobre WHO?
      description: 'Exposição relevante de quase metade das fichas disponíveis.',
      isValid: true,
      canAfford: true,
      remainingBalance,
    };
  }

  if (percentage < 80) {
    return {
      ratio,
      percentage,
      level: 'VERY_HIGH',
      label: 'Risco Muito Alto',
      color: '#F97316', // Laranja intenso
      description: 'Mais da metade do patrimônio comprometido nesta rodada.',
      isValid: true,
      canAfford: true,
      remainingBalance,
    };
  }

  // 80% to 99%
  return {
    ratio,
    percentage,
    level: 'EXTREME',
    label: 'Risco Extremo',
    color: '#EA580C', // Laranja escuro
    description: 'Quase todo o saldo comprometido nesta rodada.',
    isValid: true,
    canAfford: true,
    remainingBalance,
  };
}

/**
 * Returns comprehensive risk metrics given a stake and pre-bet balance.
 */
export function getBetRisk(params: { stake: number; balanceBeforeBet: number }): BetRiskInfo {
  return classifyBetRisk(params.stake, params.balanceBeforeBet);
}

/**
 * Builds an immutable, authoritative reveal order sorted by ascending financial exposure.
 * Bets with lowest financial exposure are presented first, escalating to the highest risk.
 * Never sorts by outcome, guess correctness, or secret game data.
 * Ties are broken deterministically by stake, then player seat position.
 */
export function createRevealOrder(
  guesserBets: Record<string, GuesserBet>,
  players: Player[],
  startingBalances?: Record<string, number>
): string[] {
  // Only include players who actually placed a guesser bet
  const bettingPlayerIds = Object.keys(guesserBets).filter((id) => {
    const bet = guesserBets[id];
    return bet && bet.chipAmount > 0;
  });

  return bettingPlayerIds.sort((idA, idB) => {
    const betA = guesserBets[idA];
    const betB = guesserBets[idB];

    const playerA = players.find((p) => p.id === idA);
    const playerB = players.find((p) => p.id === idB);

    const balanceA = startingBalances?.[idA] ?? playerA?.chips ?? 1000;
    const balanceB = startingBalances?.[idB] ?? playerB?.chips ?? 1000;

    const ratioA = calculateRiskRatio(betA.chipAmount, balanceA);
    const ratioB = calculateRiskRatio(betB.chipAmount, balanceB);

    // 1. Primary sort: Ascending risk ratio
    if (Math.abs(ratioA - ratioB) > 0.0001) {
      return ratioA - ratioB;
    }

    // 2. Secondary tie-breaker: Ascending absolute stake
    if (betA.chipAmount !== betB.chipAmount) {
      return betA.chipAmount - betB.chipAmount;
    }

    // 3. Tertiary tie-breaker: Deterministic player order in the room
    const indexA = players.findIndex((p) => p.id === idA);
    const indexB = players.findIndex((p) => p.id === idB);
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // 4. Final fallback: Lexicographical id comparison
    return idA.localeCompare(idB);
  });
}
