export interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  bettingTimeSeconds: number;
  startingChips: number;
  clipDurationSeconds: number;
  enableOwnerPrediction: boolean;
  enableVibeCombo: boolean;
  allowBots: boolean;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  maxPlayers: 8,
  rounds: 5,
  bettingTimeSeconds: 30,
  startingChips: 1000,
  clipDurationSeconds: 30,
  enableOwnerPrediction: true,
  enableVibeCombo: true,
  allowBots: true,
};

export type GamePhase =
  | 'LOBBY'
  | 'COUNTDOWN'
  | 'PREPARATION'
  | 'MUSIC_SELECTION'
  | 'BETTING'
  | 'BET_LOCKED'
  | 'REVEAL'
  | 'GAME_OVER';

export type RevealStage =
  | 'INTRO'
  | 'GUESSER_STEPPER'
  | 'OWNER_REVEAL'
  | 'OWNER_PREDICTION_REVEAL'
  | 'SETTLEMENT'
  | 'ROUND_SUMMARY';

export type SecondaryPredictionKind =
  | 'SPECIFIC_PLAYERS'
  | 'PLAYER_COUNT'
  | 'MORE_THAN'
  | 'FEWER_THAN'
  | 'NONE';

export type MusicProvider = 'preview' | 'youtube';

export interface Track {
  id: string;
  title: string;
  artist: string;
  albumArt?: string;
  audioUrl: string;
  genre?: string;
  submittedByPlayerId: string;
  provider?: MusicProvider;
  durationSeconds?: number;
  videoId?: string;
  channelTitle?: string;
  startTimeSeconds?: number;
  endTimeSeconds?: number;
  isVideo?: boolean;
  youtubeId?: string;
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
  settings: RoomSettings;
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
  revealStage?: RevealStage;
  revealIndex?: number;
  revealOrder?: string[];
  betLockedAt?: number;
  startingBalances?: Record<string, number>;
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
