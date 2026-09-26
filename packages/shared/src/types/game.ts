export type GameMode = 'classic' | 'turbo' | 'epic';

export type GamePhase =
  | 'LOBBY'
  | 'COUNTDOWN'
  | 'MUSIC_SELECTION'
  | 'BETTING'
  | 'REVEAL'
  | 'GAME_OVER';

export type SecondaryPredictionKind =
  | 'SPECIFIC_PLAYERS'
  | 'PLAYER_COUNT'
  | 'MORE_THAN'
  | 'FEWER_THAN'
  | 'NONE';

export interface Track {
  id: string;
  title: string;
  artist: string;
  albumArt?: string;
  audioUrl: string;
  genre?: string;
  submittedByPlayerId: string;
  isVideo?: boolean;
  youtubeId?: string;
  startTimeSeconds?: number;
}

export interface Player {
  id: string;
  nickname: string;
  avatar: string;
  chips: number;
  isHost: boolean;
  isBot?: boolean;
  isReady: boolean;
  selectedTrack?: Track;
}

export interface GuesserBet {
  guesserId: string;
  targetOwnerId: string;
  predictionKind?: SecondaryPredictionKind;
  targetPlayerIds?: string[];
  expectedCount?: number;
  chipAmount: number;
}

export interface OwnerBet {
  ownerId: string;
  predictionKind: SecondaryPredictionKind;
  targetPlayerIds?: string[];
  expectedCount?: number;
  chipAmount: number;
}

export interface PlayerRoundSummary {
  playerId: string;
  nickname: string;
  startingChips: number;
  endingChips: number;
  chipsWon: number;
  chipsLost: number;
  netChange: number;
  details: string[];
}

export interface RoundResult {
  roundNumber: number;
  totalRounds: number;
  track: Track;
  actualOwnerId: string;
  correctGuessersCount: number;
  totalGuessersCount: number;
  ownerBetSuccess: boolean;
  ownerMultiplier: number;
  ownerChipsWon: number;
  guesserBetResults: {
    guesserId: string;
    targetOwnerId: string;
    correctOwner: boolean;
    secondarySuccess: boolean;
    betAmount: number;
    multiplier: number;
    chipsWon: number;
  }[];
  playerSummaries: PlayerRoundSummary[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface RoomOptions {
  turnDurationSeconds?: number;
  bettingDurationSeconds?: number;
  startingChips?: number;
  genreFilter?: 'all' | 'pop' | 'rock' | 'funk' | 'mpb' | 'international' | 'video_only';
}

export interface RoomState {
  code: string;
  hostId: string;
  mode: GameMode;
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  roundDurationSeconds: number;
  timeRemainingSeconds: number;
  turnIndex?: number;
  currentTurnPlayerId?: string;
  turnTimeRemainingSeconds?: number;
  players: Player[];
  submittedTracks: Track[];
  currentTrack?: Track;
  guesserBets: Record<string, GuesserBet>;
  ownerBet?: OwnerBet;
  lastRoundResult?: RoundResult;
  chatMessages: ChatMessage[];
  options?: RoomOptions;
}

export interface OddsInfo {
  guesserOwnerOnly: number;
  secondaryNone: number;
  secondarySpecific: number;
  secondaryCount: number;
}

export const ODDS_TABLE: OddsInfo = {
  guesserOwnerOnly: 2.0,
  secondaryNone: 4.0,
  secondarySpecific: 3.5,
  secondaryCount: 3.0,
};
