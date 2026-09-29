import { SecondaryPredictionKind } from '../types/game';

export interface ExpectedCountBounds {
  min: number;
  max: number;
  defaultVal: number;
  isAvailable: boolean;
}

export function requiresExpectedCount(kind?: SecondaryPredictionKind): boolean {
  return kind === 'PLAYER_COUNT' || kind === 'MORE_THAN' || kind === 'FEWER_THAN';
}

export function requiresTargetPlayers(kind?: SecondaryPredictionKind): boolean {
  return kind === 'SPECIFIC_PLAYERS';
}

export function getExpectedCountBounds(
  kind: SecondaryPredictionKind,
  eligibleGuesserCount: number
): ExpectedCountBounds {
  const safeEligible = Math.max(1, eligibleGuesserCount);

  switch (kind) {
    case 'PLAYER_COUNT': {
      // 1 up to all eligible guessers (0 is represented by NONE)
      const min = 1;
      const max = safeEligible;
      return {
        min,
        max,
        defaultVal: Math.min(1, max),
        isAvailable: true,
      };
    }

    case 'MORE_THAN': {
      // X must allow at least one outcome > X (so X < safeEligible)
      // If eligible is 1, MORE_THAN is impossible (cannot be > 1 when max is 1)
      const isAvailable = safeEligible > 1;
      const min = 1;
      const max = Math.max(1, safeEligible - 1);
      return {
        min,
        max,
        defaultVal: 1,
        isAvailable,
      };
    }

    case 'FEWER_THAN': {
      // "Fewer than 1" is 0, which is semantically NONE.
      // Therefore, FEWER_THAN starts at 2 (meaning 0 or 1).
      // If eligible is 1, FEWER_THAN 2 means 0 or 1, which covers all outcomes (trivial/redundant).
      const isAvailable = safeEligible >= 2;
      const min = 2;
      const max = Math.max(2, safeEligible);
      return {
        min,
        max,
        defaultVal: Math.min(min, max),
        isAvailable,
      };
    }

    default:
      return { min: 1, max: 1, defaultVal: 1, isAvailable: false };
  }
}

export function clampExpectedCount(
  kind: SecondaryPredictionKind,
  value: number,
  eligibleGuesserCount: number
): number {
  const bounds = getExpectedCountBounds(kind, eligibleGuesserCount);
  const intVal = Math.floor(value);
  if (isNaN(intVal)) return bounds.defaultVal;
  return Math.max(bounds.min, Math.min(bounds.max, intVal));
}

export function getPredictionDescription(
  kind: SecondaryPredictionKind,
  expectedCount?: number,
  targetNames?: string[]
): string {
  switch (kind) {
    case 'PLAYER_COUNT': {
      const count = expectedCount ?? 1;
      return `Exatamente ${count} ${count === 1 ? 'jogador' : 'jogadores'}`;
    }
    case 'MORE_THAN': {
      const count = expectedCount ?? 1;
      return `Mais de ${count} ${count === 1 ? 'jogador' : 'jogadores'}`;
    }
    case 'FEWER_THAN': {
      const count = expectedCount ?? 2;
      return `Menos de ${count} ${count === 1 ? 'jogador' : 'jogadores'}`;
    }
    case 'SPECIFIC_PLAYERS': {
      if (!targetNames || targetNames.length === 0) {
        return 'Nenhum jogador selecionado';
      }
      return targetNames.join(', ');
    }
    case 'NONE':
      return 'Nenhum jogador vai acertar (0)';
    default:
      return '';
  }
}

export interface NormalizedOwnerPrediction {
  predictionKind: SecondaryPredictionKind;
  expectedCount?: number;
  targetPlayerIds?: string[];
  chipAmount: number;
}

export function normalizeOwnerPrediction(
  input: {
    predictionKind: SecondaryPredictionKind;
    expectedCount?: number;
    targetPlayerIds?: string[];
    chipAmount: number;
  },
  eligibleGuesserCount: number
): NormalizedOwnerPrediction {
  const kind = input.predictionKind;
  const chipAmount = Math.max(0, Math.floor(input.chipAmount || 0));

  if (requiresExpectedCount(kind)) {
    const clamped = clampExpectedCount(kind, input.expectedCount ?? 1, eligibleGuesserCount);
    return {
      predictionKind: kind,
      expectedCount: clamped,
      targetPlayerIds: undefined,
      chipAmount,
    };
  }

  if (kind === 'SPECIFIC_PLAYERS') {
    const rawTargets = Array.isArray(input.targetPlayerIds) ? input.targetPlayerIds : [];
    const uniqueTargets = Array.from(new Set(rawTargets.filter((id) => typeof id === 'string' && id.trim())));
    return {
      predictionKind: kind,
      expectedCount: undefined,
      targetPlayerIds: uniqueTargets,
      chipAmount,
    };
  }

  // NONE or unknown
  return {
    predictionKind: 'NONE',
    expectedCount: undefined,
    targetPlayerIds: undefined,
    chipAmount,
  };
}

export function validateOwnerPrediction(
  input: {
    predictionKind: SecondaryPredictionKind;
    expectedCount?: number;
    targetPlayerIds?: string[];
    chipAmount: number;
    availableBalance: number;
  },
  eligibleGuesserCount: number,
  eligiblePlayerIds?: string[]
): { valid: boolean; error?: string } {
  if (input.chipAmount < 0) {
    return { valid: false, error: 'Aposta em fichas invalida.' };
  }

  if (input.chipAmount > input.availableBalance) {
    return {
      valid: false,
      error: `Saldo insuficiente. Disponivel: ${input.availableBalance} fichas.`,
    };
  }

  const kind = input.predictionKind;

  if (requiresExpectedCount(kind)) {
    const bounds = getExpectedCountBounds(kind, eligibleGuesserCount);
    if (!bounds.isAvailable) {
      return {
        valid: false,
        error: `A categoria ${kind} nao e possivel com ${eligibleGuesserCount} jogadores elegiveis.`,
      };
    }

    if (
      input.expectedCount === undefined ||
      isNaN(input.expectedCount) ||
      !Number.isInteger(input.expectedCount)
    ) {
      return { valid: false, error: 'Informe uma quantidade inteira valida.' };
    }

    if (input.expectedCount < bounds.min || input.expectedCount > bounds.max) {
      return {
        valid: false,
        error: `Quantidade fora do limite permitido (${bounds.min} a ${bounds.max}).`,
      };
    }
  } else if (kind === 'SPECIFIC_PLAYERS') {
    if (!input.targetPlayerIds || input.targetPlayerIds.length === 0) {
      return { valid: false, error: 'Selecione ao menos um jogador especifico.' };
    }

    if (eligiblePlayerIds && eligiblePlayerIds.length > 0) {
      const validSet = new Set(eligiblePlayerIds);
      const invalid = input.targetPlayerIds.some((id) => !validSet.has(id));
      if (invalid) {
        return { valid: false, error: 'Lista de jogadores contem participantes invalidos.' };
      }
    }
  }

  return { valid: true };
}
